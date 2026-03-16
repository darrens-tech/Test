<?php
/**
 * Warehouse Terminal - Database Layer (SQLite)
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

        $dbPath  = $dataDir . '/warehouse.db';
        $firstRun = !file_exists($dbPath);

        $this->pdo = new PDO('sqlite:' . $dbPath);
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $this->pdo->exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');

        $this->migrate();

        if ($firstRun) {
            $this->seed();
        }
    }

    // ------------------------------------------------------------------ schema
    private function migrate(): void
    {
        $this->pdo->exec("
            CREATE TABLE IF NOT EXISTS products (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT    NOT NULL,
                sku         TEXT    UNIQUE NOT NULL,
                qr_code     TEXT    UNIQUE NOT NULL,
                description TEXT,
                category    TEXT    DEFAULT 'General',
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS borrowing_orders (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id  INTEGER NOT NULL,
                face_image  TEXT,
                status      TEXT    DEFAULT 'active',
                notes       TEXT,
                created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
                returned_at DATETIME,
                FOREIGN KEY (product_id) REFERENCES products(id)
            );

            CREATE TABLE IF NOT EXISTS transaction_log (
                id         INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id   INTEGER,
                product_id INTEGER NOT NULL,
                action     TEXT    NOT NULL,
                notes      TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        ");
    }

    // ------------------------------------------------------------------ seed
    private function seed(): void
    {
        $products = [
            ['Power Drill 18V',      'TL-001', 'QR-TL-001', 'Cordless power drill with 2 batteries',  'Power Tools'],
            ['Angle Grinder 4.5"',   'TL-002', 'QR-TL-002', '4.5 inch angle grinder 850W',            'Power Tools'],
            ['Jigsaw Corded',        'TL-003', 'QR-TL-003', 'Orbital jigsaw with dust blower',        'Power Tools'],
            ['Safety Harness Full',  'SF-001', 'QR-SF-001', 'Full body safety harness size L',        'Safety'],
            ['Hard Hat Yellow',      'SF-002', 'QR-SF-002', 'ANSI-approved hard hat, yellow',         'Safety'],
            ['Safety Goggles',       'SF-003', 'QR-SF-003', 'Anti-fog safety goggles',                'Safety'],
            ['Measuring Tape 5m',    'HT-001', 'QR-HT-001', 'Steel measuring tape 5 metres',          'Hand Tools'],
            ['Spirit Level 60cm',    'HT-002', 'QR-HT-002', 'Aluminium spirit level 60 cm',           'Hand Tools'],
            ['Torque Wrench 1/2"',   'HT-003', 'QR-HT-003', '1/2 inch torque wrench 20-150 Nm',      'Hand Tools'],
            ['Extension Cord 10m',   'EQ-001', 'QR-EQ-001', '10 m heavy-duty extension cord',        'Equipment'],
            ['Ladder Aluminium 6ft', 'EQ-002', 'QR-EQ-002', 'Aluminium step ladder 6 feet',          'Equipment'],
            ['Scaffolding Board',    'EQ-003', 'QR-EQ-003', 'Timber scaffolding board 3.9 m',        'Equipment'],
        ];

        $stmt = $this->pdo->prepare(
            'INSERT INTO products (name, sku, qr_code, description, category) VALUES (?,?,?,?,?)'
        );
        foreach ($products as $p) {
            $stmt->execute($p);
        }
    }

    // ------------------------------------------------------------------ products
    public function getProductByQR(string $qr): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM products WHERE qr_code = ?');
        $stmt->execute([$qr]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getAllProducts(): array
    {
        return $this->pdo->query('SELECT * FROM products ORDER BY category, name')->fetchAll();
    }

    // ------------------------------------------------------------------ orders
    public function createBorrowingOrder(int $productId, ?string $facePath, string $notes = ''): int
    {
        $this->pdo->prepare(
            'INSERT INTO borrowing_orders (product_id, face_image, notes) VALUES (?,?,?)'
        )->execute([$productId, $facePath, $notes]);

        $orderId = (int) $this->pdo->lastInsertId();

        $this->pdo->prepare(
            'INSERT INTO transaction_log (order_id, product_id, action, notes) VALUES (?,?,\'CHECKOUT\',?)'
        )->execute([$orderId, $productId, $notes]);

        return $orderId;
    }

    public function returnOrder(int $orderId): bool
    {
        $stmt = $this->pdo->prepare(
            "UPDATE borrowing_orders
             SET status = 'returned', returned_at = CURRENT_TIMESTAMP
             WHERE id = ? AND status = 'active'"
        );
        $stmt->execute([$orderId]);

        if ($stmt->rowCount() > 0) {
            $order = $this->getOrderById($orderId);
            $this->pdo->prepare(
                "INSERT INTO transaction_log (order_id, product_id, action) VALUES (?,?,'RETURN')"
            )->execute([$orderId, $order['product_id']]);
            return true;
        }
        return false;
    }

    public function getOrderById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM borrowing_orders WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    public function getActiveOrders(): array
    {
        return $this->pdo->query(
            "SELECT bo.*, p.name AS product_name, p.sku, p.category
             FROM borrowing_orders bo
             JOIN products p ON bo.product_id = p.id
             WHERE bo.status = 'active'
             ORDER BY bo.created_at DESC"
        )->fetchAll();
    }

    public function getActiveOrdersByProduct(int $productId): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT bo.*, p.name AS product_name, p.sku
             FROM borrowing_orders bo
             JOIN products p ON bo.product_id = p.id
             WHERE bo.product_id = ? AND bo.status = 'active'
             ORDER BY bo.created_at DESC"
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }

    public function getRecentTransactions(int $limit = 30): array
    {
        $stmt = $this->pdo->prepare(
            "SELECT tl.*, p.name AS product_name, p.sku
             FROM transaction_log tl
             JOIN products p ON tl.product_id = p.id
             ORDER BY tl.created_at DESC
             LIMIT ?"
        );
        $stmt->execute([$limit]);
        return $stmt->fetchAll();
    }

    // ------------------------------------------------------------------ stats
    public function getStats(): array
    {
        $q = fn(string $sql) => (int) $this->pdo->query($sql)->fetchColumn();
        return [
            'active_orders'          => $q("SELECT COUNT(*) FROM borrowing_orders WHERE status='active'"),
            'total_checkouts_today'  => $q("SELECT COUNT(*) FROM transaction_log WHERE action='CHECKOUT' AND DATE(created_at)=DATE('now')"),
            'total_returns_today'    => $q("SELECT COUNT(*) FROM transaction_log WHERE action='RETURN'   AND DATE(created_at)=DATE('now')"),
            'total_products'         => $q("SELECT COUNT(*) FROM products"),
        ];
    }
}
