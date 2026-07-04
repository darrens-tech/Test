<?php
/**
 * AI enrichment layer.
 *
 * classify()   maps a raw ticket to a PIM product + problem taxonomy.
 *              Uses the Claude API (structured outputs) when an Anthropic API
 *              key is configured; otherwise falls back to a deterministic
 *              keyword matcher so the system works standalone.
 * draftEmail() writes a supplier-facing quality report email (AI or template).
 *
 * The Claude API is called over raw cURL because this project is
 * intentionally dependency-free (no composer), matching the rest of the repo.
 */
class AiEngine
{
    public const PROBLEM_CATEGORIES = [
        'manufacturing-defect', 'malfunction', 'damage-in-transit',
        'missing-parts', 'wear-and-tear', 'usability', 'other',
    ];
    public const SEVERITIES = ['low', 'medium', 'high', 'critical'];

    private ?string $apiKey;

    public function __construct(?string $anthropicApiKey)
    {
        $this->apiKey = $anthropicApiKey ?: null;
    }

    public function hasAi(): bool
    {
        return $this->apiKey !== null;
    }

    // ------------------------------------------------------------------ classification
    /**
     * @param array $ticket   [subject, message]
     * @param array $products PIM rows
     * @return array [product_id|null, match_confidence, match_method,
     *                problem_category, severity, summary]
     */
    public function classify(array $ticket, array $products): array
    {
        if ($this->hasAi()) {
            try {
                return $this->classifyWithClaude($ticket, $products);
            } catch (Throwable $e) {
                error_log('Claude classification failed, using fallback: ' . $e->getMessage());
            }
        }
        return $this->classifyWithKeywords($ticket, $products);
    }

    private function classifyWithClaude(array $ticket, array $products): array
    {
        $catalog = array_map(fn($p) => [
            'id'       => (int) $p['id'],
            'sku'      => $p['sku'],
            'name'     => $p['name'],
            'category' => $p['category'],
            'keywords' => $p['keywords'],
        ], $products);

        $schema = [
            'type'       => 'object',
            'properties' => [
                'product_id'       => ['type' => ['integer', 'null'],
                                       'description' => 'id of the matching PIM product, or null if none fits'],
                'confidence'       => ['type' => 'number', 'description' => '0..1 match confidence'],
                'problem_category' => ['type' => 'string', 'enum' => self::PROBLEM_CATEGORIES],
                'severity'         => ['type' => 'string', 'enum' => self::SEVERITIES],
                'summary'          => ['type' => 'string',
                                       'description' => 'one short normalized sentence describing the technical problem, no customer names'],
            ],
            'required'             => ['product_id', 'confidence', 'problem_category', 'severity', 'summary'],
            'additionalProperties' => false,
        ];

        $body = [
            'model'      => 'claude-opus-4-8',
            'max_tokens' => 1024,
            'system'     => 'You classify customer support tickets for a tool distributor. '
                          . 'Match each ticket to the correct product from the PIM catalog, '
                          . 'categorize the technical problem, rate its severity, and write a short '
                          . 'normalized problem summary (in English) suitable for grouping duplicate issues.',
            'output_config' => ['format' => ['type' => 'json_schema', 'schema' => $schema]],
            'messages'   => [[
                'role'    => 'user',
                'content' => "PIM catalog (JSON):\n" . json_encode($catalog, JSON_UNESCAPED_UNICODE)
                           . "\n\nTicket subject: {$ticket['subject']}\nTicket message:\n{$ticket['message']}",
            ]],
        ];

        $resp = $this->anthropicRequest($body);

        if (($resp['stop_reason'] ?? '') === 'refusal') {
            throw new RuntimeException('Claude refused the classification request');
        }

        $text = null;
        foreach ($resp['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                $text = $block['text'];
                break;
            }
        }
        $out = json_decode($text ?? '', true);
        if (!is_array($out)) {
            throw new RuntimeException('Claude returned non-JSON classification');
        }

        $productId = $out['product_id'] ?? null;
        $validIds  = array_column($catalog, 'id');
        if ($productId !== null && !in_array((int) $productId, $validIds, true)) {
            $productId = null;
        }
        return [
            'product_id'       => $productId !== null ? (int) $productId : null,
            'match_confidence' => round(max(0, min(1, (float) ($out['confidence'] ?? 0))), 2),
            'match_method'     => 'ai',
            'problem_category' => in_array($out['problem_category'] ?? '', self::PROBLEM_CATEGORIES, true)
                                  ? $out['problem_category'] : 'other',
            'severity'         => in_array($out['severity'] ?? '', self::SEVERITIES, true)
                                  ? $out['severity'] : 'low',
            'summary'          => trim((string) ($out['summary'] ?? '')) ?: substr($ticket['message'], 0, 90),
        ];
    }

    private function anthropicRequest(array $body): array
    {
        $ch = curl_init('https://api.anthropic.com/v1/messages');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_TIMEOUT        => 120,
            CURLOPT_POSTFIELDS     => json_encode($body, JSON_UNESCAPED_UNICODE),
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'x-api-key: ' . $this->apiKey,
                'anthropic-version: 2023-06-01',
            ],
        ]);
        $raw  = curl_exec($ch);
        $err  = curl_error($ch);
        $code = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);

        if ($raw === false) {
            throw new RuntimeException("Anthropic API unreachable: $err");
        }
        $json = json_decode($raw, true);
        if ($code >= 400 || !is_array($json)) {
            $msg = $json['error']['message'] ?? substr((string) $raw, 0, 300);
            throw new RuntimeException("Anthropic API error HTTP $code: $msg");
        }
        return $json;
    }

    // ------------------------------------------------------------------ keyword fallback
    private function classifyWithKeywords(array $ticket, array $products): array
    {
        $text = strtolower($ticket['subject'] . ' ' . $ticket['message']);

        // product match: SKU hit is decisive, otherwise score name/keyword tokens
        $best      = null;
        $bestScore = 0;
        foreach ($products as $p) {
            $score = 0;
            if (str_contains($text, strtolower($p['sku']))) {
                $score += 10;
            }
            foreach (Database::tokenize($p['name']) as $tok) {
                if (str_contains($text, $tok)) {
                    $score += 2;
                }
            }
            foreach (array_filter(array_map('trim', explode(',', strtolower($p['keywords'] ?? '')))) as $kw) {
                if ($kw !== '' && str_contains($text, $kw)) {
                    $score += 3;
                }
            }
            if ($score > $bestScore) {
                $bestScore = $score;
                $best      = $p;
            }
        }

        $category = $this->guessProblemCategory($text);
        $severity = $this->guessSeverity($text);

        return [
            'product_id'       => $best ? (int) $best['id'] : null,
            'match_confidence' => $best ? round(min(1, $bestScore / 12), 2) : 0.0,
            'match_method'     => 'keyword',
            'problem_category' => $category,
            'severity'         => $severity,
            'summary'          => $this->extractSummary($ticket),
        ];
    }

    private function guessProblemCategory(string $text): string
    {
        $rules = [
            'missing-parts'        => ['missing', 'incomplete', 'not included', 'kurang', 'empty slots', 'no instruction manual', 'no manual'],
            'damage-in-transit'    => ['in transit', 'shipping', 'crushed box', 'dent', 'packaging damaged', 'arrived broken', 'arrived bent', 'damaged during'],
            'manufacturing-defect' => ['wobble', 'runout', 'out of the box', 'from new', 'from first use', 'brittle', 'stitching', 'seam', 'dim', 'faint', 'redup', 'goyang'],
            'wear-and-tear'        => ['after light use', 'worn', 'wore out', 'came apart'],
            'usability'            => ['how do i', 'how to', 'warranty card', 'register'],
            'malfunction'          => ['not working', 'does not', 'will not', 'won\'t', 'wont', 'stopped', 'overheat', 'smoke', 'burning', 'dead', 'not charging', 'refuse', 'faulty', 'hard to start', 'hard start', 'susah', 'tidak bisa', 'leak', 'wrong', 'weak', 'stuck', 'dies', 'shuts down'],
        ];
        foreach ($rules as $cat => $needles) {
            foreach ($needles as $n) {
                if (str_contains($text, $n)) {
                    return $cat;
                }
            }
        }
        return 'other';
    }

    private function guessSeverity(string $text): string
    {
        foreach (['smoke', 'fire', 'burned my', 'shock', 'melted', 'dangerous'] as $n) {
            if (str_contains($text, $n)) {
                return 'critical';
            }
        }
        foreach (['dead', 'not charging', 'will not start', 'won\'t start', 'not working', 'overheat',
                  'burning', 'refund', 'unusable', 'broke', 'broken', 'snapped', 'leak'] as $n) {
            if (str_contains($text, $n)) {
                return 'high';
            }
        }
        foreach (['wobble', 'wrong', 'weak', 'dim', 'faint', 'missing', 'incomplete', 'stuck',
                  'noise', 'pressure', 'hard to start', 'susah'] as $n) {
            if (str_contains($text, $n)) {
                return 'medium';
            }
        }
        return 'low';
    }

    private function extractSummary(array $ticket): string
    {
        // first informative sentence of the message, trimmed
        $msg = preg_replace('/\s+/', ' ', trim($ticket['message']));
        $sentences = preg_split('/(?<=[.!?])\s+/', $msg) ?: [$msg];
        $summary = $sentences[0] ?? $msg;
        if (mb_strlen($summary) > 110) {
            $summary = mb_substr($summary, 0, 107) . '...';
        }
        return $summary;
    }

    // ------------------------------------------------------------------ supplier email
    /**
     * Drafts a quality-report email to one supplier.
     *
     * @param array $supplier ['name','email']
     * @param array $tickets  filtered tickets for that supplier's products
     * @param array $range    ['date_from','date_to']
     */
    public function draftEmail(array $supplier, array $tickets, array $range): array
    {
        $subject = sprintf(
            'Quality report — %d customer complaint%s regarding your products (%s)',
            count($tickets), count($tickets) === 1 ? '' : 's',
            trim(($range['date_from'] ?? '') . ' – ' . ($range['date_to'] ?: date('Y-m-d')), ' –')
        );

        if ($this->hasAi()) {
            try {
                return ['subject' => $subject, 'body' => $this->draftEmailWithClaude($supplier, $tickets, $range), 'method' => 'ai'];
            } catch (Throwable $e) {
                error_log('Claude email drafting failed, using template: ' . $e->getMessage());
            }
        }
        return ['subject' => $subject, 'body' => $this->draftEmailTemplate($supplier, $tickets, $range), 'method' => 'template'];
    }

    private function draftEmailWithClaude(array $supplier, array $tickets, array $range): string
    {
        $lines = array_map(fn($t) => [
            'date'     => substr($t['created_at'], 0, 10),
            'product'  => $t['product_name'],
            'sku'      => $t['sku'],
            'problem'  => $t['problem_category'],
            'severity' => $t['severity'],
            'summary'  => $t['summary'],
        ], $tickets);

        $body = [
            'model'      => 'claude-opus-4-8',
            'max_tokens' => 2048,
            'system'     => 'You write professional, firm but courteous B2B quality-claim emails from '
                          . 'a tool distributor to its supplier. Plain text only, no markdown. '
                          . 'Group complaints by product, state counts, highlight recurring defects, '
                          . 'request root-cause analysis and corrective action with a response deadline of 14 days. '
                          . 'Mention that photos of the affected units are attached in the Excel recap. '
                          . 'Sign as "Quality Assurance Team". Keep it under 350 words.',
            'messages'   => [[
                'role'    => 'user',
                'content' => "Supplier: {$supplier['name']}\nPeriod: " . ($range['date_from'] ?: 'start of records') . ' to '
                           . ($range['date_to'] ?: date('Y-m-d'))
                           . "\nComplaints (JSON):\n" . json_encode($lines, JSON_UNESCAPED_UNICODE),
            ]],
        ];

        $resp = $this->anthropicRequest($body);
        if (($resp['stop_reason'] ?? '') === 'refusal') {
            throw new RuntimeException('Claude refused the email drafting request');
        }
        foreach ($resp['content'] ?? [] as $block) {
            if (($block['type'] ?? '') === 'text') {
                return trim($block['text']);
            }
        }
        throw new RuntimeException('Claude returned empty email draft');
    }

    private function draftEmailTemplate(array $supplier, array $tickets, array $range): string
    {
        $byProduct = [];
        foreach ($tickets as $t) {
            $byProduct[$t['sku'] . ' ' . $t['product_name']][] = $t;
        }

        $period = ($range['date_from'] ?: 'the start of records') . ' to ' . ($range['date_to'] ?: date('Y-m-d'));
        $out  = "Dear {$supplier['name']} team,\n\n";
        $out .= "During the period $period we received " . count($tickets)
              . " customer complaint(s) concerning products supplied by you. A detailed recap, "
              . "including photos of the affected units, is attached as an Excel file.\n\n";
        $out .= "Summary by product:\n";
        foreach ($byProduct as $label => $ts) {
            $out .= "\n- $label: " . count($ts) . " complaint(s)\n";
            $cats = array_count_values(array_column($ts, 'problem_category'));
            arsort($cats);
            foreach ($cats as $cat => $n) {
                $out .= "    • $cat: $n\n";
            }
            $worst = null;
            foreach ($ts as $t) {
                if (!$worst || Database::severityRank($t['severity']) > Database::severityRank($worst['severity'])) {
                    $worst = $t;
                }
            }
            if ($worst) {
                $out .= "    Example: \"{$worst['summary']}\" ({$worst['severity']})\n";
            }
        }
        $out .= "\nWe ask you to investigate the root cause of the above issues and provide a "
              . "corrective action plan within 14 days. Please also confirm how affected units "
              . "under warranty will be handled (replacement or credit).\n\n"
              . "We value our partnership and expect your usual prompt attention to quality matters.\n\n"
              . "Best regards,\nQuality Assurance Team";
        return $out;
    }
}
