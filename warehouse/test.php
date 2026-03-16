<!DOCTYPE html>
<html>
<head>
  <title>Warehouse – Diagnostics</title>
  <style>
    body { font-family: monospace; background: #0d1117; color: #e6edf3; padding: 30px; }
    h2 { color: #58a6ff; }
    .ok  { color: #3fb950; }
    .err { color: #f85149; }
    .warn{ color: #d29922; }
    table { border-collapse: collapse; margin-top: 20px; width: 100%; max-width: 700px; }
    td, th { padding: 8px 14px; border: 1px solid #30363d; text-align: left; }
    th { background: #161b22; color: #8b949e; font-size: 11px; letter-spacing: 1px; }
    .test-qr { margin-top: 20px; }
    input { background: #161b22; border: 1px solid #30363d; color: #e6edf3; padding: 6px 10px; font-family: monospace; font-size: 14px; width: 300px; }
    button { background: #238636; border: none; color: #fff; padding: 7px 16px; cursor: pointer; font-family: monospace; margin-left: 8px; }
    pre { background: #161b22; border: 1px solid #30363d; padding: 14px; font-size: 12px; overflow-x: auto; }
  </style>
</head>
<body>
<h2>⬡ Warehouse Terminal — Diagnostics</h2>

<?php
require_once __DIR__ . '/db.php';

$checks = [];

// 1. PHP version
$checks[] = [
  'label' => 'PHP Version',
  'ok'    => version_compare(PHP_VERSION, '7.4', '>='),
  'value' => PHP_VERSION,
];

// 2. PDO SQLite
$checks[] = [
  'label' => 'PDO SQLite extension',
  'ok'    => extension_loaded('pdo_sqlite'),
  'value' => extension_loaded('pdo_sqlite') ? 'Loaded' : 'MISSING — enable pdo_sqlite in php.ini',
];

// 3. Data dir writable
$dataDir = __DIR__ . '/data';
$checks[] = [
  'label' => 'data/ directory writable',
  'ok'    => is_writable($dataDir) || (!is_dir($dataDir) && is_writable(__DIR__)),
  'value' => is_dir($dataDir) ? (is_writable($dataDir) ? 'Writable (' . $dataDir . ')' : 'NOT writable') : 'Will be created',
];

// 4. Uploads dir
$upDir = __DIR__ . '/uploads/faces';
$checks[] = [
  'label' => 'uploads/faces/ writable',
  'ok'    => is_writable($upDir) || (!is_dir($upDir) && is_writable(__DIR__)),
  'value' => is_dir($upDir) ? (is_writable($upDir) ? 'Writable' : 'NOT writable') : 'Will be created on first use',
];

// 5. Database connection
$dbOk = false;
$dbMsg = '';
$products = [];
try {
  $db = new Database();
  $products = $db->getAllProducts();
  $dbOk  = true;
  $dbMsg = count($products) . ' products found';
} catch (Throwable $e) {
  $dbMsg = 'ERROR: ' . $e->getMessage();
}
$checks[] = [
  'label' => 'Database connection',
  'ok'    => $dbOk,
  'value' => $dbMsg,
];

// 6. API self-test
$apiUrl = 'http://localhost' . (isset($_SERVER['SERVER_PORT']) && $_SERVER['SERVER_PORT'] != 80 ? ':' . $_SERVER['SERVER_PORT'] : '') . dirname($_SERVER['REQUEST_URI']) . '/api.php?action=stats';
$checks[] = [
  'label' => 'Detected base URL',
  'ok'    => true,
  'value' => 'http://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/',
];
?>

<table>
  <tr><th>Check</th><th>Result</th></tr>
  <?php foreach ($checks as $c): ?>
  <tr>
    <td><?= htmlspecialchars($c['label']) ?></td>
    <td class="<?= $c['ok'] ? 'ok' : 'err' ?>">
      <?= $c['ok'] ? '✓ ' : '✗ ' ?><?= htmlspecialchars($c['value']) ?>
    </td>
  </tr>
  <?php endforeach; ?>
</table>

<?php if ($dbOk && $products): ?>
<h2 style="margin-top:30px">Products in database</h2>
<table>
  <tr><th>ID</th><th>Name</th><th>SKU</th><th>QR Code</th><th>Category</th></tr>
  <?php foreach ($products as $p): ?>
  <tr>
    <td><?= $p['id'] ?></td>
    <td><?= htmlspecialchars($p['name']) ?></td>
    <td style="color:#58a6ff"><?= htmlspecialchars($p['sku']) ?></td>
    <td style="color:#3fb950"><?= htmlspecialchars($p['qr_code']) ?></td>
    <td><?= htmlspecialchars($p['category']) ?></td>
  </tr>
  <?php endforeach; ?>
</table>
<?php endif; ?>

<div class="test-qr" style="margin-top:30px">
  <h2>Test QR Scan API</h2>
  <p style="color:#8b949e;font-size:12px">Enter any QR code value from the table above and click Test:</p>
  <input type="text" id="qrInput" value="QR-TL-001" />
  <button onclick="testScan()">Test Scan</button>
  <pre id="apiResult" style="margin-top:12px;display:none"></pre>
</div>

<p style="margin-top:30px">
  <a href="index.php" style="color:#58a6ff">← Back to Terminal</a>
</p>

<script>
async function testScan() {
  const qr = document.getElementById('qrInput').value;
  const pre = document.getElementById('apiResult');
  pre.style.display = 'block';
  pre.textContent = 'Calling api.php?action=scan ...';
  try {
    const fd = new FormData();
    fd.append('qr_code', qr);
    const res = await fetch('api.php?action=scan', { method: 'POST', body: fd });
    const json = await res.json();
    pre.textContent = JSON.stringify(json, null, 2);
    pre.style.color = json.success ? '#3fb950' : '#f85149';
  } catch(e) {
    pre.textContent = 'ERROR: ' + e.message;
    pre.style.color = '#f85149';
  }
}
</script>
</body>
</html>
