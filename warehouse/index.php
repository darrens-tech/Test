<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Warehouse Terminal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/style.css">
</head>
<body>

<!-- =====================================================================
     HEADER
     ===================================================================== -->
<header class="header">

  <div class="header-logo">
    <!-- Warehouse box icon -->
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      <path d="M2 8l10-5 10 5v10l-10 5L2 18V8z"/>
      <polyline points="12 3 12 13"/>
      <polyline points="2 8 12 13 22 8"/>
    </svg>
    WAREHOUSE&nbsp;TERMINAL
  </div>

  <div class="header-center">
    <div id="clockTime" class="clock-time">00:00:00</div>
    <div id="clockDate" class="clock-date">—</div>
  </div>

  <div class="header-status">
    <span class="pulse-dot"></span>
    <span>SYSTEM ONLINE</span>
  </div>

</header>

<!-- =====================================================================
     NAV TABS
     ===================================================================== -->
<nav class="nav">
  <div class="nav-tab active" data-tab="terminal">⬡ Terminal</div>
  <div class="nav-tab"        data-tab="dashboard">◈ Dashboard</div>
  <div class="nav-tab"        data-tab="products">⬜ Products</div>
</nav>

<!-- =====================================================================
     MAIN
     ===================================================================== -->
<main class="main">

  <!-- ================================================================
       TERMINAL TAB
       ================================================================ -->
  <section id="tab-terminal" class="tab-content active">
    <div class="terminal-layout">

      <!-- Camera Panel -->
      <div class="camera-panel">

        <div class="panel-toolbar">
          <span class="panel-label">Camera / Scanner</span>
          <span id="camBadge" class="cam-badge scanning">
            <span class="bd"></span>SCANNING
          </span>
        </div>

        <div class="camera-wrap">
          <!-- Live video feed -->
          <video id="videoFeed" autoplay playsinline muted></video>

          <!-- QR scan overlay (corners + animated line) -->
          <div id="scanOverlay" class="scan-overlay">
            <div class="scan-box">
              <div class="scan-box-b"></div>
              <div class="scan-line"></div>
            </div>
            <div class="scan-hint">◀ POINT QR CODE HERE ▶</div>
          </div>

          <!-- Face capture thumbnail (shown after first scan) -->
          <div id="faceThumbWrap" class="face-thumb-wrap">
            <img id="faceThumbImg" src="" alt="Captured face">
            <div class="face-label">FACE</div>
          </div>

          <!-- Shown when camera permission is denied -->
          <div id="cameraNoAccess" class="no-camera hidden">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
            <p>Camera access denied or unavailable.<br>Use the USB barcode scanner or type a QR code below.</p>
          </div>
        </div>

        <!-- Manual / USB scanner input bar -->
        <div class="input-bar">
          <label for="manualInput">USB / MANUAL:</label>
          <input id="manualInput" class="scan-input" type="text"
                 placeholder="Scan or type QR code…" autocomplete="off" spellcheck="false">
          <button id="btnManualScan" class="btn-sm">SCAN</button>
        </div>

      </div><!-- /camera-panel -->

      <!-- ─────────────────────────────────────────────────────────────
           Right-side Action Panel
           ───────────────────────────────────────────────────────────── -->
      <div class="action-panel">

        <!-- Status / Product Info -->
        <div id="statusCard" class="a-card">
          <div class="a-card-head">Status</div>
          <div class="a-card-body" id="statusBody">
            <!-- Populated by JS -->
          </div>
        </div>

        <!-- Direction Buttons (hidden until product found) -->
        <div id="dirCard" class="a-card hidden">
          <div class="a-card-head">Select Direction</div>
          <div class="a-card-body">
            <div class="dir-grid">
              <button id="btnOut" class="btn-dir btn-out">
                <span class="btn-dir-icon">📤</span>
                OUTGOING<br><small style="font-size:9px;letter-spacing:1px">CREATE BORROW ORDER</small>
              </button>
              <button id="btnIn" class="btn-dir btn-in">
                <span class="btn-dir-icon">📥</span>
                INGOING<br><small style="font-size:9px;letter-spacing:1px">RETURN ITEM</small>
              </button>
            </div>
          </div>
        </div>

        <!-- Orders List (hidden until ingoing direction selected) -->
        <div id="ordersCard" class="a-card hidden">
          <div class="a-card-head">Select Borrowing Order to Return</div>
          <div class="a-card-body">
            <div id="ordersListEl" class="order-list">
              <!-- Populated by JS -->
            </div>
          </div>
        </div>

        <!-- Confirm / Cancel (hidden until ready to execute) -->
        <div id="confirmCard" class="a-card hidden">
          <div class="a-card-head">Confirm Action</div>
          <div class="a-card-body">
            <div class="confirm-area">
              <button id="confirmBtn" class="btn-confirm btn-conf-out">
                <span id="confirmBtnText">CONFIRM</span>
              </button>
              <button id="btnCancel" class="btn-cancel">✕ CANCEL</button>
            </div>
          </div>
        </div>

      </div><!-- /action-panel -->

    </div><!-- /terminal-layout -->
  </section>

  <!-- ================================================================
       DASHBOARD TAB
       ================================================================ -->
  <section id="tab-dashboard" class="tab-content">
    <div class="dashboard-layout">

      <!-- Stats -->
      <div class="stats-row">
        <div class="stat-card s-active">
          <div id="statActive" class="stat-val">—</div>
          <div class="stat-lbl">Active Orders</div>
        </div>
        <div class="stat-card s-out">
          <div id="statOut" class="stat-val">—</div>
          <div class="stat-lbl">Checkouts Today</div>
        </div>
        <div class="stat-card s-in">
          <div id="statIn" class="stat-val">—</div>
          <div class="stat-lbl">Returns Today</div>
        </div>
        <div class="stat-card s-products">
          <div id="statTotal" class="stat-val">—</div>
          <div class="stat-lbl">Total Products</div>
        </div>
      </div>

      <!-- Active borrowing orders table -->
      <div class="section-head">
        <span class="section-title">Active Borrowing Orders (not yet returned)</span>
        <button id="btnRefreshDash" class="btn-refresh">↻ Refresh</button>
      </div>

      <div class="tbl-wrap">
        <table>
          <thead>
            <tr>
              <th>Face</th>
              <th>Order</th>
              <th>Product</th>
              <th>Category</th>
              <th>Checked Out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody id="dashOrdersTbody">
            <tr><td colspan="7" class="empty">Loading…</td></tr>
          </tbody>
        </table>
      </div>

    </div>
  </section>

  <!-- ================================================================
       PRODUCTS TAB
       ================================================================ -->
  <section id="tab-products" class="tab-content">
    <div class="products-layout">
      <div class="products-head" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span>Product Catalogue — scan QR codes with the terminal</span>
        <button id="btnNewProduct" class="btn-sm" style="font-size:12px;padding:7px 18px">＋ New Product</button>
      </div>
      <div id="productsGrid" class="products-grid">
        <div style="color:var(--muted);font-size:12px">Loading products…</div>
      </div>
    </div>
  </section>

</main><!-- /main -->

<!-- =====================================================================
     SCRIPTS
     Libraries loaded from CDN, then our app.
     ===================================================================== -->

<!-- =====================================================================
     CREATE PRODUCT MODAL
     ===================================================================== -->
<div id="modalOverlay" class="modal-overlay hidden">
  <div class="modal">
    <div class="modal-head">
      <span>New Product</span>
      <button id="btnModalClose" class="modal-close">✕</button>
    </div>
    <div class="modal-body">
      <div id="modalError" class="modal-error hidden"></div>

      <div class="field">
        <label>Product ID / SKU <span class="req">*</span></label>
        <input id="formProductId" type="text" placeholder="e.g. TL-005" autocomplete="off" spellcheck="false">
        <span class="field-hint">Unique identifier — will also be used as the QR code value</span>
      </div>

      <div class="field">
        <label>Product Name <span class="req">*</span></label>
        <input id="formProductName" type="text" placeholder="e.g. Cordless Screwdriver" autocomplete="off">
      </div>

      <div class="field">
        <label>Description</label>
        <input id="formProductDesc" type="text" placeholder="Optional description" autocomplete="off">
      </div>

      <div class="field">
        <label>Category</label>
        <input id="formProductCat" type="text" placeholder="e.g. Power Tools, Safety, Equipment…" autocomplete="off">
      </div>
    </div>
    <div class="modal-foot">
      <button id="btnCreateSubmit" class="btn-confirm btn-conf-in" style="padding:10px 24px;font-size:12px">Create Product</button>
      <button id="btnModalCancel" onclick="closeCreateProduct()" class="btn-cancel" style="padding:10px 16px">Cancel</button>
    </div>
  </div>
</div>

<!-- jsQR  – decode QR codes from camera frames -->
<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>

<!-- qrcode.js – generate QR images for the Products tab -->
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>

<!-- Application -->
<script src="assets/app.js"></script>

</body>
</html>
