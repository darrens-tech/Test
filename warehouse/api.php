<?php
/**
 * Warehouse Terminal – REST API
 *
 * All responses are JSON.
 * Actions are passed via GET ?action=<name>
 */

header('Content-Type: application/json; charset=utf-8');

// Prevent direct browser caching of API responses
header('Cache-Control: no-store');

require_once __DIR__ . '/db.php';

$action = $_GET['action'] ?? '';

try {
    $db = new Database();

    match ($action) {
        'scan'            => handleScan($db),
        'checkout'        => handleCheckout($db),
        'return'          => handleReturn($db),
        'orders'          => handleOrders($db),
        'product_orders'  => handleProductOrders($db),
        'stats'           => handleStats($db),
        'transactions'    => handleTransactions($db),
        'products'        => handleProducts($db),
        'create_product'  => handleCreateProduct($db),
        default           => respond(['success' => false, 'error' => 'Unknown action: ' . $action]),
    };
} catch (Throwable $e) {
    respond(['success' => false, 'error' => $e->getMessage()]);
}

// ------------------------------------------------------------------ handlers

function handleScan(Database $db): void
{
    $qr = trim($_POST['qr_code'] ?? '');
    if ($qr === '') {
        respond(['success' => false, 'error' => 'No QR code provided']);
        return;
    }

    $product = $db->getProductByQR($qr);
    if (!$product) {
        respond(['success' => false, 'error' => "Product not found for QR: $qr"]);
        return;
    }

    $activeOrders = $db->getActiveOrdersByProduct((int) $product['id']);
    respond([
        'success'             => true,
        'product'             => $product,
        'active_orders_count' => count($activeOrders),
    ]);
}

function handleCheckout(Database $db): void
{
    $productId  = (int) ($_POST['product_id'] ?? 0);
    $faceB64    = $_POST['face_image'] ?? '';
    $notes      = trim($_POST['notes'] ?? '');

    if ($productId <= 0) {
        respond(['success' => false, 'error' => 'Invalid product_id']);
        return;
    }

    $facePath = null;
    if ($faceB64 !== '' && str_starts_with($faceB64, 'data:image')) {
        $facePath = saveFaceImage($faceB64);
    }

    $orderId = $db->createBorrowingOrder($productId, $facePath, $notes);
    respond([
        'success'  => true,
        'order_id' => $orderId,
        'message'  => 'Borrowing order created',
    ]);
}

function handleReturn(Database $db): void
{
    $orderId = (int) ($_POST['order_id'] ?? 0);
    if ($orderId <= 0) {
        respond(['success' => false, 'error' => 'Invalid order_id']);
        return;
    }

    $ok = $db->returnOrder($orderId);
    if ($ok) {
        respond(['success' => true, 'message' => 'Item returned successfully']);
    } else {
        respond(['success' => false, 'error' => 'Order not found or already returned']);
    }
}

function handleOrders(Database $db): void
{
    respond(['success' => true, 'orders' => $db->getActiveOrders()]);
}

function handleProductOrders(Database $db): void
{
    $productId = (int) ($_GET['product_id'] ?? 0);
    if ($productId <= 0) {
        respond(['success' => false, 'error' => 'Invalid product_id']);
        return;
    }
    respond(['success' => true, 'orders' => $db->getActiveOrdersByProduct($productId)]);
}

function handleStats(Database $db): void
{
    respond(['success' => true, 'stats' => $db->getStats()]);
}

function handleTransactions(Database $db): void
{
    $limit = min((int) ($_GET['limit'] ?? 30), 100);
    respond(['success' => true, 'transactions' => $db->getRecentTransactions($limit)]);
}

function handleProducts(Database $db): void
{
    respond(['success' => true, 'products' => $db->getAllProducts()]);
}

function handleCreateProduct(Database $db): void
{
    $sku  = trim($_POST['sku']  ?? '');
    $name = trim($_POST['name'] ?? '');
    $desc = trim($_POST['description'] ?? '');
    $cat  = trim($_POST['category'] ?? 'General') ?: 'General';

    if ($sku === '' || $name === '') {
        respond(['success' => false, 'error' => 'Product ID and Name are required']);
        return;
    }

    // QR code = "QR-" + SKU (auto-generated, same pattern as seeded data)
    $qrCode = 'QR-' . strtoupper($sku);

    try {
        $id = $db->createProduct($sku, $name, $qrCode, $desc, $cat);
        respond(['success' => true, 'id' => $id, 'qr_code' => $qrCode]);
    } catch (Throwable $e) {
        // SQLite unique constraint = duplicate SKU
        if (str_contains($e->getMessage(), 'UNIQUE')) {
            respond(['success' => false, 'error' => "Product ID '$sku' already exists"]);
        } else {
            respond(['success' => false, 'error' => $e->getMessage()]);
        }
    }
}

// ------------------------------------------------------------------ helpers

function respond(array $data): void
{
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function saveFaceImage(string $base64Image): string
{
    $uploadDir = __DIR__ . '/uploads/faces/';
    if (!is_dir($uploadDir)) {
        mkdir($uploadDir, 0755, true);
    }

    // Strip data-URI prefix
    $imageData = preg_replace('/^data:image\/\w+;base64,/', '', $base64Image);
    $imageData = base64_decode($imageData);

    if ($imageData === false || strlen($imageData) < 100) {
        return '';
    }

    $filename = 'face_' . date('Ymd_His') . '_' . substr(uniqid(), -6) . '.jpg';
    file_put_contents($uploadDir . $filename, $imageData);

    return 'uploads/faces/' . $filename;
}
