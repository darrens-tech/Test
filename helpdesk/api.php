<?php
/**
 * Customer Helpdesk – REST API
 *
 * JSON responses; action via ?action=<name>.
 * export_xlsx streams a binary .xlsx instead of JSON.
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/qiscus.php';
require_once __DIR__ . '/ai.php';
require_once __DIR__ . '/xlsx.php';

$action = $_GET['action'] ?? '';

try {
    $db = new Database();

    match ($action) {
        'stats'          => respond(['success' => true, 'stats' => $db->getStats(),
                                     'mode' => syncMode($db)]),
        'products'       => respond(['success' => true, 'products' => $db->getAllProducts(),
                                     'categories' => $db->getProductCategories()]),
        'tickets'        => handleTickets($db),
        'sync'           => handleSync($db),
        'report'         => handleReport($db),
        'clusters'       => handleClusters($db),
        'cluster_status' => handleClusterStatus($db),
        'draft_email'    => handleDraftEmail($db),
        'export_xlsx'    => handleExport($db),
        'image'          => handleImage(),
        'settings_get'   => handleSettingsGet($db),
        'settings_save'  => handleSettingsSave($db),
        'reset'          => handleReset($db),
        default          => respond(['success' => false, 'error' => 'Unknown action: ' . $action]),
    };
} catch (Throwable $e) {
    respond(['success' => false, 'error' => $e->getMessage()]);
}

// ---------------------------------------------------------------- helpers

function respond(array $data): void
{
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function filtersFromRequest(): array
{
    return [
        'date_from'        => $_GET['date_from'] ?? '',
        'date_to'          => $_GET['date_to'] ?? '',
        'product_id'       => $_GET['product_id'] ?? '',
        'category'         => $_GET['category'] ?? '',
        'problem_category' => $_GET['problem_category'] ?? '',
        'severity'         => $_GET['severity'] ?? '',
        'q'                => $_GET['q'] ?? '',
    ];
}

function syncMode(Database $db): array
{
    $qiscus = new QiscusClient($db->getSetting('qiscus_app_id'), $db->getSetting('qiscus_secret_key'));
    $ai     = new AiEngine($db->getSetting('anthropic_api_key'));
    return [
        'qiscus' => $qiscus->isConfigured() ? 'live' : 'demo',
        'ai'     => $ai->hasAi() ? 'claude' : 'keyword-fallback',
    ];
}

// ---------------------------------------------------------------- handlers

function handleTickets(Database $db): void
{
    $tickets = $db->getTickets(filtersFromRequest());
    $images  = $db->getTicketImages(array_column($tickets, 'id'));
    foreach ($tickets as &$t) {
        $t['images'] = $images[$t['id']] ?? [];
    }
    respond(['success' => true, 'tickets' => $tickets, 'count' => count($tickets)]);
}

/**
 * Pull tickets from Qiscus (or the demo generator), classify each new one
 * with AI (product match + problem taxonomy) and fold it into a
 * recurring-problem cluster.
 */
function handleSync(Database $db): void
{
    $qiscus = new QiscusClient(
        $db->getSetting('qiscus_app_id'),
        $db->getSetting('qiscus_secret_key'),
        $db->getSetting('qiscus_base_url') ?: 'https://multichannel.qiscus.com'
    );
    $ai       = new AiEngine($db->getSetting('anthropic_api_key'));
    $products = $db->getAllProducts();
    $imageDir = __DIR__ . '/data/images';

    $raw      = $qiscus->fetchTickets();
    $imported = 0;
    $skipped  = 0;
    $errors   = [];

    foreach ($raw as $ticket) {
        if ($db->ticketExists($ticket['source_id'])) {
            $skipped++;
            continue;
        }
        try {
            $cls = $ai->classify($ticket, $products);

            $clusterId = null;
            if ($cls['product_id'] !== null) {
                $product = null;
                foreach ($products as $p) {
                    if ((int) $p['id'] === $cls['product_id']) {
                        $product = $p;
                        break;
                    }
                }
                $clusterId = $db->assignCluster(
                    $cls['product_id'],
                    $cls['problem_category'],
                    $cls['summary'],
                    $ticket['subject'] . ' ' . $ticket['message'] . ' ' . $cls['summary'],
                    Database::tokenize(($product['name'] ?? '') . ' ' . ($product['sku'] ?? '')),
                    $cls['severity'],
                    $ticket['created_at']
                );
            }

            $ticketId = $db->insertTicket([
                'source_id'        => $ticket['source_id'],
                'customer_name'    => $ticket['customer_name'],
                'customer_email'   => $ticket['customer_email'] ?? null,
                'subject'          => $ticket['subject'],
                'message'          => $ticket['message'],
                'created_at'       => $ticket['created_at'],
                'product_id'       => $cls['product_id'],
                'match_confidence' => $cls['match_confidence'],
                'match_method'     => $cls['match_method'],
                'problem_category' => $cls['problem_category'],
                'severity'         => $cls['severity'],
                'summary'          => $cls['summary'],
                'cluster_id'       => $clusterId,
            ]);

            foreach ($ticket['images'] as $i => $img) {
                if (!empty($img['file']) && is_file($img['file'])) {
                    $name = strtolower($ticket['source_id']) . '-' . ($i + 1) . '.'
                          . pathinfo($img['file'], PATHINFO_EXTENSION);
                    copy($img['file'], "$imageDir/$name");
                } else {
                    $name = QiscusClient::makeDemoImage($imageDir, $ticket['source_id'], $i, $img['label']);
                }
                $db->addTicketImage($ticketId, $name, $img['label'] ?? '');
            }
            $imported++;
        } catch (Throwable $e) {
            $errors[] = $ticket['source_id'] . ': ' . $e->getMessage();
        }
    }

    respond([
        'success'  => true,
        'imported' => $imported,
        'skipped'  => $skipped,
        'errors'   => $errors,
        'mode'     => syncMode($db),
    ]);
}

function handleReport(Database $db): void
{
    respond(['success' => true, 'report' => $db->getReport(filtersFromRequest())]);
}

function handleClusters(Database $db): void
{
    $min      = max(1, (int) ($_GET['min'] ?? 3));
    $clusters = $db->getClusters($min);
    foreach ($clusters as &$c) {
        $c['tickets'] = $db->getClusterTickets((int) $c['id']);
    }
    respond(['success' => true, 'clusters' => $clusters, 'min' => $min]);
}

function handleClusterStatus(Database $db): void
{
    $id     = (int) ($_POST['id'] ?? 0);
    $status = $_POST['status'] ?? '';
    if (!$id || !in_array($status, ['open', 'investigating', 'resolved'], true)) {
        respond(['success' => false, 'error' => 'Invalid cluster id or status']);
    }
    $db->setClusterStatus($id, $status);
    respond(['success' => true]);
}

/**
 * Groups the filtered tickets by supplier and drafts one quality-claim
 * email per supplier (AI-written when a key is configured).
 */
function handleDraftEmail(Database $db): void
{
    $filters = filtersFromRequest();
    $tickets = $db->getTickets($filters);
    $ai      = new AiEngine($db->getSetting('anthropic_api_key'));

    $bySupplier = [];
    foreach ($tickets as $t) {
        if (empty($t['supplier_email'])) {
            continue;
        }
        $bySupplier[$t['supplier_email']]['name']      = $t['supplier_name'];
        $bySupplier[$t['supplier_email']]['tickets'][] = $t;
    }

    $only = $_GET['supplier_email'] ?? '';
    $range = ['date_from' => $filters['date_from'], 'date_to' => $filters['date_to']];

    $drafts = [];
    foreach ($bySupplier as $email => $grp) {
        if ($only && $only !== $email) {
            continue;
        }
        $draft    = $ai->draftEmail(['name' => $grp['name'], 'email' => $email], $grp['tickets'], $range);
        $drafts[] = [
            'supplier_name'  => $grp['name'],
            'supplier_email' => $email,
            'ticket_count'   => count($grp['tickets']),
            'subject'        => $draft['subject'],
            'body'           => $draft['body'],
            'method'         => $draft['method'],
            'mailto'         => 'mailto:' . rawurlencode($email)
                              . '?subject=' . rawurlencode($draft['subject'])
                              . '&body=' . rawurlencode($draft['body']),
        ];
    }

    respond(['success' => true, 'drafts' => $drafts]);
}

/**
 * Streams an .xlsx recap of the filtered tickets, grouped by product,
 * with the customers' photos embedded next to each complaint.
 */
function handleExport(Database $db): void
{
    $filters = filtersFromRequest();
    $tickets = $db->getTickets($filters, 2000);
    $images  = $db->getTicketImages(array_column($tickets, 'id'));
    $imgDir  = __DIR__ . '/data/images';

    $wb = new XlsxWriter();
    //             A date  B ticket C customer D problem  E sev  F description G summary H photos I photos2
    $wb->setColWidths([11, 12, 20, 20, 10, 46, 40, 19, 19]);

    $wb->addRow(['PROBLEM RECAP — CUSTOMER HELPDESK'], 1, 22);
    $periodBits = array_filter([
        $filters['date_from'] ? 'from ' . $filters['date_from'] : '',
        $filters['date_to'] ? 'to ' . $filters['date_to'] : '',
        $filters['category'] ? 'type: ' . $filters['category'] : '',
        $filters['problem_category'] ? 'problem: ' . $filters['problem_category'] : '',
    ]);
    $wb->addRow(['Generated ' . date('Y-m-d H:i')
               . ($periodBits ? ' — ' . implode(', ', $periodBits) : ' — all records')
               . ' — ' . count($tickets) . ' ticket(s)']);
    $wb->addRow();

    // group by product
    $groups = [];
    foreach ($tickets as $t) {
        $key = $t['product_name'] ?? 'Unmatched tickets';
        $groups[$key][] = $t;
    }

    foreach ($groups as $productName => $rows) {
        $first = $rows[0];
        $label = strtoupper($productName)
               . (!empty($first['sku']) ? '  [' . $first['sku'] . ']' : '')
               . (!empty($first['supplier_name']) ? '  — SUPPLIER: ' . $first['supplier_name'] : '')
               . '  — ' . count($rows) . ' COMPLAINT(S)';
        $r = $wb->addRow([['v' => $label, 's' => 3]], 3, 16);
        $wb->merge($r, 0, $r, 8);

        $wb->addRow([
            ['v' => 'DATE', 's' => 2], ['v' => 'TICKET', 's' => 2], ['v' => 'CUSTOMER', 's' => 2],
            ['v' => 'PROBLEM TYPE', 's' => 2], ['v' => 'SEVERITY', 's' => 2],
            ['v' => 'CUSTOMER MESSAGE', 's' => 2], ['v' => 'AI SUMMARY', 's' => 2],
            ['v' => 'PHOTO 1', 's' => 2], ['v' => 'PHOTO 2', 's' => 2],
        ], 2, 14);

        foreach ($rows as $t) {
            $tImages   = array_slice($images[$t['id']] ?? [], 0, 2);
            $hasImages = count($tImages) > 0;
            $r = $wb->addRow([
                ['v' => substr($t['created_at'], 0, 10), 's' => 6],
                ['v' => $t['source_id'], 's' => 6],
                ['v' => $t['customer_name'], 's' => 6],
                ['v' => $t['problem_category'], 's' => 6],
                ['v' => strtoupper((string) $t['severity']), 's' => 6],
                ['v' => $t['message'], 's' => 4],
                ['v' => $t['summary'], 's' => 4],
                ['v' => '', 's' => 6],
                ['v' => '', 's' => 6],
            ], 6, $hasImages ? 78 : null);

            foreach ($tImages as $i => $img) {
                $path = $imgDir . '/' . basename($img['filename']);
                $wb->addImage($path, $r, 7 + $i, 128, 96);
            }
        }
        $wb->addRow();
    }

    $tmp = tempnam(sys_get_temp_dir(), 'xlsx');
    $wb->save($tmp);

    $fname = 'problem-recap-' . date('Ymd-Hi') . '.xlsx';
    header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    header('Content-Disposition: attachment; filename="' . $fname . '"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp);
    unlink($tmp);
    exit;
}

function handleImage(): void
{
    $file = basename($_GET['file'] ?? '');
    $path = __DIR__ . '/data/images/' . $file;
    if ($file === '' || !is_file($path)) {
        http_response_code(404);
        exit('Not found');
    }
    header('Content-Type: image/png');
    header('Cache-Control: max-age=86400');
    readfile($path);
    exit;
}

function handleSettingsGet(Database $db): void
{
    $mask = fn(?string $v) => $v ? str_repeat('•', 8) . substr($v, -4) : '';
    respond([
        'success'  => true,
        'settings' => [
            'qiscus_app_id'     => $db->getSetting('qiscus_app_id') ?? '',
            'qiscus_secret_key' => $mask($db->getSetting('qiscus_secret_key')),
            'qiscus_base_url'   => $db->getSetting('qiscus_base_url') ?? '',
            'anthropic_api_key' => $mask($db->getSetting('anthropic_api_key')),
        ],
        'mode' => syncMode($db),
    ]);
}

function handleSettingsSave(Database $db): void
{
    foreach (['qiscus_app_id', 'qiscus_secret_key', 'qiscus_base_url', 'anthropic_api_key'] as $key) {
        if (!isset($_POST[$key])) {
            continue;
        }
        $val = trim($_POST[$key]);
        if (str_contains($val, '••')) {
            continue; // masked placeholder — unchanged
        }
        $db->setSetting($key, $val === '' ? null : $val);
    }
    respond(['success' => true, 'mode' => syncMode($db)]);
}

function handleReset(Database $db): void
{
    $db->clearTickets();
    respond(['success' => true]);
}
