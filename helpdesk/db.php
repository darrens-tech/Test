<?php
/**
 * Customer Helpdesk - Database Layer (SQLite)
 *
 * Tables:
 *   settings       key/value store (Qiscus + Anthropic credentials, mode)
 *   products       PIM catalog (with supplier info)
 *   tickets        synced from Qiscus, enriched by AI classification
 *   ticket_images  attachments belonging to tickets
 *   clusters       recurring-problem groups for the R&D dashboard
 */
class Database
{
    private PDO $pdo;

    public function __construct()
    {
        $dataDir = __DIR__ . '/data';
        if (!is_dir($dataDir)) {
            mkdir($dataDir, 0755, true);
        }
        if (!is_dir($dataDir . '/images')) {
            mkdir($dataDir . '/images', 0755, true);
        }

        $dbPath   = $dataDir . '/helpdesk.db';
        $firstRun = !file_exists($dbPath);

        $this->pdo = new PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->pdo->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

        $this->migrate();

        if ($firstRun) {
            $this->seedProducts();
        }
    }

    public function pdo(): PDO
    {
        return $this->pdo;
    }

    // ------------------------------------------------------------------ schema
    private function migrate(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS settings (
                key   TEXT PRIMARY KEY,
                value TEXT
            );

            CREATE TABLE IF NOT EXISTS products (
                id             INTEGER PRIMARY KEY AUTOINCREMENT,
                sku            TEXT UNIQUE NOT NULL,
                name           TEXT NOT NULL,
                category       TEXT NOT NULL DEFAULT 'General',
                supplier_name  TEXT,
                supplier_email TEXT,
                keywords       TEXT,
                created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS tickets (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                source_id        TEXT UNIQUE NOT NULL,
                channel          TEXT DEFAULT 'qiscus',
                customer_name    TEXT,
                customer_email   TEXT,
                subject          TEXT,
                message          TEXT,
                status           TEXT DEFAULT 'open',
                created_at       DATETIME NOT NULL,
                product_id       INTEGER,
                match_confidence REAL,
                match_method     TEXT,
                problem_category TEXT,
                severity         TEXT,
                summary          TEXT,
                cluster_id       INTEGER,
                synced_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (product_id) REFERENCES products(id),
                FOREIGN KEY (cluster_id) REFERENCES clusters(id)
            );

            CREATE TABLE IF NOT EXISTS ticket_images (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                ticket_id INTEGER NOT NULL,
                filename  TEXT NOT NULL,
                caption   TEXT,
                FOREIGN KEY (ticket_id) REFERENCES tickets(id)
            );

            CREATE TABLE IF NOT EXISTS clusters (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id       INTEGER NOT NULL,
                problem_category TEXT NOT NULL,
                title            TEXT,
                tokens           TEXT,
                occurrences      INTEGER DEFAULT 0,
                max_severity     TEXT DEFAULT 'low',
                status           TEXT DEFAULT 'open',
                first_seen       DATETIME,
                last_seen        DATETIME,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE INDEX IF NOT EXISTS idx_tickets_created ON tickets(created_at);
            CREATE INDEX IF NOT EXISTS idx_tickets_product ON tickets(product_id);
        ");
    }

    // ------------------------------------------------------------------ PIM seed
    private function seedProducts(): void
    {
        $rows = [
            // sku, name, category, supplier, supplier email, keywords
            ['PD-800',  'Impact Drill 13mm PD-800',      'Power Tools', 'PT Surya Teknik',      'purchasing@suryateknik.co.id', 'drill,bor,impact,chuck,mata bor'],
            ['AG-115',  'Angle Grinder 4.5" AG-115',     'Power Tools', 'PT Surya Teknik',      'purchasing@suryateknik.co.id', 'grinder,gerinda,disc,potong'],
            ['CS-185',  'Circular Saw 7" CS-185',        'Power Tools', 'PT Surya Teknik',      'purchasing@suryateknik.co.id', 'saw,circular,blade,gergaji'],
            ['CD-12V',  'Cordless Drill 12V CD-12V',     'Power Tools', 'Hangzhou Toolmax Co.', 'sales@toolmax-hz.cn',          'cordless,battery,baterai,charger,drill'],
            ['IW-450',  'Impact Wrench 1/2" IW-450',     'Power Tools', 'Hangzhou Toolmax Co.', 'sales@toolmax-hz.cn',          'impact wrench,socket,baut'],
            ['WP-100',  'Water Pump 100W WP-100',        'Machinery',   'CV Mesin Jaya',        'order@mesinjaya.id',           'pump,pompa,air,water'],
            ['GEN-2K',  'Gasoline Generator 2kW GEN-2K', 'Machinery',   'CV Mesin Jaya',        'order@mesinjaya.id',           'generator,genset,engine,mesin'],
            ['AC-25L',  'Air Compressor 25L AC-25L',     'Machinery',   'CV Mesin Jaya',        'order@mesinjaya.id',           'compressor,kompresor,tank,angin'],
            ['TW-150',  'Torque Wrench 1/2" TW-150',     'Hand Tools',  'Taiwan Grip Tools',    'export@griptools.tw',          'torque,kunci momen,wrench'],
            ['SS-108',  'Socket Set 108pcs SS-108',      'Hand Tools',  'Taiwan Grip Tools',    'export@griptools.tw',          'socket,kunci sok,set,ratchet'],
            ['MT-D01',  'Digital Multimeter MT-D01',     'Measuring',   'Shenzhen MeasurePro',  'sales@measurepro.cn',          'multimeter,meter,voltage,tester'],
            ['LL-360',  'Laser Level 360 LL-360',        'Measuring',   'Shenzhen MeasurePro',  'sales@measurepro.cn',          'laser,level,line,waterpass'],
            ['SH-PRO',  'Safety Helmet Pro SH-PRO',      'Safety',      'PT Proteksi Prima',    'cs@proteksiprima.co.id',       'helmet,helm,safety,proyek'],
            ['WG-L',    'Welding Gloves L WG-L',         'Safety',      'PT Proteksi Prima',    'cs@proteksiprima.co.id',       'gloves,sarung tangan,welding,las'],
        ];
        $stmt = $this->pdo->prepare(
            'INSERT INTO products (sku, name, category, supplier_name, supplier_email, keywords) VALUES (?,?,?,?,?,?)'
        );
        foreach ($rows as $r) {
            $stmt->execute($r);
        }
    }

    // ------------------------------------------------------------------ settings
    public function getSetting(string $key, ?string $default = null): ?string
    {
        $stmt = $this->pdo->prepare('SELECT value FROM settings WHERE key = ?');
        $stmt->execute([$key]);
        $v = $stmt->fetchColumn();
        return $v === false ? $default : $v;
    }

    public function setSetting(string $key, ?string $value): void
    {
        $this->pdo->prepare(
            'INSERT INTO settings (key, value) VALUES (?,?)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value'
        )->execute([$key, $value]);
    }

    // ------------------------------------------------------------------ products
    public function getAllProducts(): array
    {
        return $this->pdo->query('SELECT * FROM products ORDER BY category, name')->fetchAll();
    }

    public function getProductCategories(): array
    {
        return $this->pdo->query('SELECT DISTINCT category FROM products ORDER BY category')
            ->fetchAll(PDO::FETCH_COLUMN);
    }

    // ------------------------------------------------------------------ tickets
    public function ticketExists(string $sourceId): bool
    {
        $stmt = $this->pdo->prepare('SELECT 1 FROM tickets WHERE source_id = ?');
        $stmt->execute([$sourceId]);
        return (bool) $stmt->fetchColumn();
    }

    public function insertTicket(array $t): int
    {
        $this->pdo->prepare(
            'INSERT INTO tickets (source_id, channel, customer_name, customer_email, subject, message,
                                  status, created_at, product_id, match_confidence, match_method,
                                  problem_category, severity, summary, cluster_id)
             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'
        )->execute([
            $t['source_id'], $t['channel'] ?? 'qiscus', $t['customer_name'], $t['customer_email'] ?? null,
            $t['subject'], $t['message'], $t['status'] ?? 'open', $t['created_at'],
            $t['product_id'], $t['match_confidence'], $t['match_method'],
            $t['problem_category'], $t['severity'], $t['summary'], $t['cluster_id'],
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public function addTicketImage(int $ticketId, string $filename, string $caption = ''): void
    {
        $this->pdo->prepare('INSERT INTO ticket_images (ticket_id, filename, caption) VALUES (?,?,?)')
            ->execute([$ticketId, $filename, $caption]);
    }

    /**
     * Filterable ticket list. Filters: date_from, date_to (Y-m-d),
     * product_id, category (product type), problem_category, severity, q.
     */
    public function getTickets(array $f = [], int $limit = 500): array
    {
        [$where, $params] = $this->buildTicketFilter($f);
        $stmt = $this->pdo->prepare(
            "SELECT t.*, p.name AS product_name, p.sku, p.category AS product_category,
                    p.supplier_name, p.supplier_email,
                    (SELECT COUNT(*) FROM ticket_images ti WHERE ti.ticket_id = t.id) AS image_count
             FROM tickets t LEFT JOIN products p ON t.product_id = p.id
             $where ORDER BY t.created_at DESC LIMIT $limit"
        );
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function getTicketImages(array $ticketIds): array
    {
        if (!$ticketIds) {
            return [];
        }
        $in   = implode(',', array_fill(0, count($ticketIds), '?'));
        $stmt = $this->pdo->prepare("SELECT * FROM ticket_images WHERE ticket_id IN ($in)");
        $stmt->execute(array_values($ticketIds));
        $out = [];
        foreach ($stmt->fetchAll() as $img) {
            $out[$img['ticket_id']][] = $img;
        }
        return $out;
    }

    private function buildTicketFilter(array $f): array
    {
        $where  = [];
        $params = [];
        if (!empty($f['date_from'])) {
            $where[]  = "DATE(t.created_at) >= ?";
            $params[] = $f['date_from'];
        }
        if (!empty($f['date_to'])) {
            $where[]  = "DATE(t.created_at) <= ?";
            $params[] = $f['date_to'];
        }
        if (!empty($f['product_id'])) {
            $where[]  = "t.product_id = ?";
            $params[] = (int) $f['product_id'];
        }
        if (!empty($f['category'])) {
            $where[]  = "p.category = ?";
            $params[] = $f['category'];
        }
        if (!empty($f['problem_category'])) {
            $where[]  = "t.problem_category = ?";
            $params[] = $f['problem_category'];
        }
        if (!empty($f['severity'])) {
            $where[]  = "t.severity = ?";
            $params[] = $f['severity'];
        }
        if (!empty($f['q'])) {
            $where[]  = "(t.message LIKE ? OR t.subject LIKE ? OR t.customer_name LIKE ?)";
            $like     = '%' . $f['q'] . '%';
            array_push($params, $like, $like, $like);
        }
        return [$where ? 'WHERE ' . implode(' AND ', $where) : '', $params];
    }

    // ------------------------------------------------------------------ report
    public function getReport(array $f = []): array
    {
        [$where, $params] = $this->buildTicketFilter($f);

        $run = function (string $sql) use ($params) {
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        };

        $base = "FROM tickets t LEFT JOIN products p ON t.product_id = p.id $where";

        return [
            'by_product' => $run(
                "SELECT p.name AS label, p.sku, p.category, COUNT(*) AS n,
                        SUM(CASE WHEN t.severity IN ('high','critical') THEN 1 ELSE 0 END) AS severe
                 $base GROUP BY t.product_id ORDER BY n DESC"
            ),
            'by_category' => $run(
                "SELECT COALESCE(p.category,'Unmatched') AS label, COUNT(*) AS n $base
                 GROUP BY p.category ORDER BY n DESC"
            ),
            'by_problem' => $run(
                "SELECT COALESCE(t.problem_category,'unclassified') AS label, COUNT(*) AS n $base
                 GROUP BY t.problem_category ORDER BY n DESC"
            ),
            'by_severity' => $run(
                "SELECT COALESCE(t.severity,'n/a') AS label, COUNT(*) AS n $base
                 GROUP BY t.severity ORDER BY n DESC"
            ),
            'timeline' => $run(
                "SELECT STRFTIME('%Y-W%W', t.created_at) AS label, MIN(DATE(t.created_at)) AS week_start,
                        COUNT(*) AS n $base GROUP BY label ORDER BY label"
            ),
        ];
    }

    public function getStats(): array
    {
        $q = fn(string $sql) => (int) $this->pdo->query($sql)->fetchColumn();
        return [
            'total_tickets'   => $q("SELECT COUNT(*) FROM tickets"),
            'open_tickets'    => $q("SELECT COUNT(*) FROM tickets WHERE status = 'open'"),
            'critical'        => $q("SELECT COUNT(*) FROM tickets WHERE severity IN ('high','critical')"),
            'recurring'       => $q("SELECT COUNT(*) FROM clusters WHERE occurrences >= 3 AND status != 'resolved'"),
            'products'        => $q("SELECT COUNT(*) FROM products"),
            'last_sync'       => $this->pdo->query("SELECT MAX(synced_at) FROM tickets")->fetchColumn() ?: null,
        ];
    }

    // ------------------------------------------------------------------ clusters (R&D)
    public function getClusters(int $minOccurrences = 1): array
    {
        return $this->pdo->query(
            "SELECT c.*, p.name AS product_name, p.sku, p.category AS product_category,
                    p.supplier_name, p.supplier_email
             FROM clusters c JOIN products p ON c.product_id = p.id
             WHERE c.occurrences >= $minOccurrences
             ORDER BY c.occurrences DESC, c.last_seen DESC"
        )->fetchAll();
    }

    public function getClusterTickets(int $clusterId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT t.id, t.source_id, t.customer_name, t.created_at, t.severity, t.summary
             FROM tickets t WHERE t.cluster_id = ? ORDER BY t.created_at DESC"
        );
        $stmt->execute([$clusterId]);
        return $stmt->fetchAll();
    }

    public function setClusterStatus(int $clusterId, string $status): void
    {
        $this->pdo->prepare('UPDATE clusters SET status = ? WHERE id = ?')
            ->execute([$status, $clusterId]);
    }

    /**
     * Assign a ticket to a recurring-problem cluster.
     *
     * Clusters live per product; a ticket joins the best-overlapping existing
     * cluster of that product, otherwise a new one is created. Product-name
     * tokens are excluded from the comparison (every ticket for a product
     * mentions the product), and a matching problem category lowers the
     * required text similarity. Returns the cluster id.
     */
    public function assignCluster(int $productId, string $problemCategory, string $title,
                                  string $clusterText, array $excludeTokens,
                                  string $severity, string $createdAt): int
    {
        $exclude = array_map([self::class, 'stem'], $excludeTokens);
        $tokens  = array_values(array_diff(self::tokenize($clusterText), $exclude));

        $stmt = $this->pdo->prepare('SELECT * FROM clusters WHERE product_id = ?');
        $stmt->execute([$productId]);

        $best = null;
        $bestScore = 0.0;
        foreach ($stmt->fetchAll() as $c) {
            $cTokens = array_filter(explode(' ', $c['tokens'] ?? ''));
            $score   = self::overlap($tokens, $cTokens);
            $needed  = ($c['problem_category'] === $problemCategory) ? 0.10 : 0.30;
            if ($score >= $needed && $score > $bestScore) {
                $bestScore = $score;
                $best      = $c;
            }
        }

        if ($best) {
            $merged = array_slice(array_unique(array_merge(
                array_filter(explode(' ', $best['tokens'] ?? '')), $tokens
            )), 0, 60);
            $this->pdo->prepare(
                "UPDATE clusters SET occurrences = occurrences + 1, tokens = ?,
                        max_severity = CASE WHEN ? > CASE max_severity
                            WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END
                            THEN ? ELSE max_severity END,
                        first_seen = MIN(first_seen, ?), last_seen = MAX(last_seen, ?)
                 WHERE id = ?"
            )->execute([
                implode(' ', $merged),
                self::severityRank($severity), $severity,
                $createdAt, $createdAt, $best['id'],
            ]);
            return (int) $best['id'];
        }

        $this->pdo->prepare(
            'INSERT INTO clusters (product_id, problem_category, title, tokens, occurrences,
                                   max_severity, first_seen, last_seen)
             VALUES (?,?,?,?,1,?,?,?)'
        )->execute([
            $productId, $problemCategory, $title, implode(' ', $tokens),
            $severity, $createdAt, $createdAt,
        ]);
        return (int) $this->pdo->lastInsertId();
    }

    public static function severityRank(string $s): int
    {
        return match ($s) {
            'critical' => 4,
            'high'     => 3,
            'medium'   => 2,
            default    => 1,
        };
    }

    public static function tokenize(string $text): array
    {
        $stop = ['the','a','an','is','are','was','were','my','our','your','it','its','and','or','of',
                 'to','in','on','for','with','not','no','has','have','had','this','that','after',
                 'when','but','very','saya','yang','dan','di','ke','ini','itu','tidak','bisa','sudah'];
        $words = preg_split('/[^a-z0-9]+/', strtolower($text), -1, PREG_SPLIT_NO_EMPTY);
        $words = array_filter($words, fn($w) => strlen($w) > 2 && !in_array($w, $stop, true));
        return array_values(array_unique(array_map([self::class, 'stem'], $words)));
    }

    /** Crude suffix stripper so overheats/overheating/overheat compare equal. */
    public static function stem(string $w): string
    {
        if (strlen($w) > 5 && str_ends_with($w, 'ing')) {
            $w = substr($w, 0, -3);
        } elseif (strlen($w) > 4 && (str_ends_with($w, 'ed') || str_ends_with($w, 'es'))) {
            $w = substr($w, 0, -2);
        } elseif (strlen($w) > 3 && str_ends_with($w, 's')) {
            $w = substr($w, 0, -1);
        }
        if (strlen($w) > 4 && str_ends_with($w, 'e')) {
            $w = substr($w, 0, -1);
        }
        return $w;
    }

    /** Overlap coefficient: |A ∩ B| / min(|A|,|B|). */
    public static function overlap(array $a, array $b): float
    {
        if (!$a || !$b) {
            return 0.0;
        }
        $i = count(array_intersect($a, $b));
        return $i / min(count($a), count($b));
    }

    // ------------------------------------------------------------------ maintenance
    public function clearTickets(): void
    {
        $this->pdo->exec('DELETE FROM ticket_images; DELETE FROM tickets; DELETE FROM clusters;');
        foreach (glob(__DIR__ . '/data/images/*.png') ?: [] as $f) {
            @unlink($f);
        }
    }
}
