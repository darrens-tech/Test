/* =====================================================================
   WAREHOUSE TERMINAL  –  Frontend Application
   ===================================================================== */

'use strict';

const API = 'api.php';

/* ---- State machine ------------------------------------------------- */
const S = Object.freeze({
  STANDBY:        'standby',
  PRODUCT_FOUND:  'product_found',
  SELECT_ORDER:   'select_order',   // ingoing: choose which borrowing order
  CONFIRMING:     'confirming',
  SUCCESS:        'success',
  ERROR:          'error',
});

const app = {
  state:          S.STANDBY,
  product:        null,
  direction:      null,   // 'outgoing' | 'ingoing'
  faceImage:      null,   // base64 data-URL
  selectedOrder:  null,   // id
  scanCooldown:   false,
  videoStream:    null,
  scanRaf:        null,
  scanCanvas:     null,
  scanCtx:        null,
  resetTimer:     null,
  usbBuffer:      '',
  usbTimer:       null,
};

/* ---- DOM refs ------------------------------------------------------- */
const el = id => document.getElementById(id);

const dom = {};
const DOM_IDS = [
  'videoFeed', 'cameraNoAccess', 'camBadge', 'faceThumbWrap', 'faceThumbImg',
  'scanOverlay',
  'manualInput',
  // status/action panel children
  'statusCard', 'dirCard', 'ordersCard', 'confirmCard',
  'statusBody', 'ordersListEl', 'confirmBtn', 'confirmBtnText',
  // dashboard
  'statActive', 'statOut', 'statIn', 'statTotal',
  'dashOrdersTbody',
  // products
  'productsGrid',
];

function initDom() {
  DOM_IDS.forEach(id => { dom[id] = el(id); });
}

/* =====================================================================
   CLOCK
   ===================================================================== */
function initClock() {
  const t = el('clockTime');
  const d = el('clockDate');
  const tick = () => {
    const n = new Date();
    t.textContent = n.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    d.textContent = n.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };
  tick();
  setInterval(tick, 1000);
}

/* =====================================================================
   TABS
   ===================================================================== */
function initTabs() {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      el('tab-' + target).classList.add('active');
      if (target === 'dashboard') loadDashboard();
      if (target === 'products')  loadProducts();
    });
  });
}

/* =====================================================================
   CAMERA
   ===================================================================== */
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
    app.videoStream = stream;
    dom.videoFeed.srcObject = stream;
    await dom.videoFeed.play();
    dom.cameraNoAccess.classList.add('hidden');

    // Prepare off-screen canvas for QR scanning
    app.scanCanvas = document.createElement('canvas');
    app.scanCtx    = app.scanCanvas.getContext('2d', { willReadFrequently: true });

    dom.videoFeed.addEventListener('loadedmetadata', startQRLoop, { once: true });
  } catch (err) {
    console.warn('Camera unavailable:', err);
    dom.cameraNoAccess.classList.remove('hidden');
  }
}

function captureFace() {
  if (!dom.videoFeed.srcObject || !dom.videoFeed.videoWidth) return null;
  const c = document.createElement('canvas');
  c.width  = 320;
  c.height = 240;
  c.getContext('2d').drawImage(dom.videoFeed, 0, 0, 320, 240);
  return c.toDataURL('image/jpeg', 0.82);
}

/* =====================================================================
   QR SCANNING LOOP  (requestAnimationFrame)
   ===================================================================== */
function startQRLoop() {
  const loop = () => {
    if (app.state === S.STANDBY && !app.scanCooldown && dom.videoFeed.videoWidth) {
      const vw = dom.videoFeed.videoWidth;
      const vh = dom.videoFeed.videoHeight;
      app.scanCanvas.width  = vw;
      app.scanCanvas.height = vh;
      app.scanCtx.drawImage(dom.videoFeed, 0, 0, vw, vh);
      try {
        const imgData = app.scanCtx.getImageData(0, 0, vw, vh);
        const code = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'dontInvert' });
        if (code && code.data) handleQRDetected(code.data);
      } catch (_) { /* ignore frame decode errors */ }
    }
    app.scanRaf = requestAnimationFrame(loop);
  };
  app.scanRaf = requestAnimationFrame(loop);
}

/* =====================================================================
   USB / KEYBOARD SCANNER  (acts as a keyboard wedge)
   ===================================================================== */
function initUSBScanner() {
  document.addEventListener('keydown', e => {
    // Ignore if focus is inside an input / textarea / select
    const tag = e.target.tagName;
    if ((tag === 'INPUT' && e.target !== dom.manualInput) ||
         tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (e.key === 'Enter') {
      const buf = app.usbBuffer.trim();
      if (buf.length > 2) handleQRDetected(buf);
      app.usbBuffer = '';
      return;
    }
    if (e.key.length === 1) app.usbBuffer += e.key;

    clearTimeout(app.usbTimer);
    app.usbTimer = setTimeout(() => { app.usbBuffer = ''; }, 200);
  });

  // Manual input (type & press Enter or click SCAN button)
  dom.manualInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && dom.manualInput.value.trim()) {
      handleQRDetected(dom.manualInput.value.trim());
      dom.manualInput.value = '';
    }
  });
  el('btnManualScan').addEventListener('click', () => {
    const v = dom.manualInput.value.trim();
    if (v) { handleQRDetected(v); dom.manualInput.value = ''; }
  });
}

/* =====================================================================
   QR DETECTED  –  look up product
   ===================================================================== */
async function handleQRDetected(qrData) {
  if (app.scanCooldown || app.state !== S.STANDBY) return;
  app.scanCooldown = true;

  // Capture face at the moment of scan
  app.faceImage = captureFace();
  if (app.faceImage) {
    dom.faceThumbImg.src        = app.faceImage;
    dom.faceThumbWrap.style.display = 'block';
  }

  beep(1800, 80);
  setCamBadge('scanning', 'READING…');

  try {
    const res  = await apiFetch('POST', 'scan', { qr_code: qrData });
    if (res.success) {
      app.product      = res.product;
      app.state        = S.PRODUCT_FOUND;
      setCamBadge('found', 'PRODUCT FOUND');
      renderProductFound(res.active_orders_count);
      beep(1100, 120);
    } else {
      setCamBadge('error', 'NOT FOUND');
      renderError('Product not found', qrData);
      autoReset(3500);
    }
  } catch (err) {
    setCamBadge('error', 'NET ERROR');
    renderError('Network error', err.message);
    autoReset(3000);
  }
}

/* =====================================================================
   DIRECTION SELECTION
   ===================================================================== */
function handleDirection(dir) {
  if (app.state !== S.PRODUCT_FOUND) return;
  app.direction = dir;

  if (dir === 'ingoing') {
    loadAndShowOrders();
  } else {
    app.state = S.CONFIRMING;
    renderConfirm();
  }
}

async function loadAndShowOrders() {
  showOrdersCard('<div class="status-idle"><div class="idle-text" style="color:var(--cyan)">LOADING ORDERS…</div></div>');

  try {
    const res = await apiFetch('GET', 'product_orders', { product_id: app.product.id });
    if (res.success && res.orders.length > 0) {
      app.state = S.SELECT_ORDER;
      renderOrderList(res.orders);
    } else {
      renderError('No active borrowing orders for this product', '');
      autoReset(3500);
    }
  } catch (err) {
    renderError('Error loading orders', err.message);
    autoReset(3000);
  }
}

function selectOrder(orderId) {
  app.selectedOrder = orderId;
  document.querySelectorAll('.order-item').forEach(item => {
    item.classList.toggle('selected', parseInt(item.dataset.oid) === orderId);
  });
  app.state = S.CONFIRMING;
  renderConfirm();
}

/* =====================================================================
   CONFIRM / EXECUTE
   ===================================================================== */
async function confirmAction() {
  dom.confirmBtn.disabled     = true;
  dom.confirmBtnText.textContent = 'PROCESSING…';

  try {
    if (app.direction === 'outgoing') {
      await doCheckout();
    } else {
      await doReturn();
    }
  } catch (err) {
    renderError('Transaction failed', err.message);
    autoReset(3000);
  }
}

async function doCheckout() {
  const body = { product_id: app.product.id };
  if (app.faceImage) body.face_image = app.faceImage;

  const res = await apiFetch('POST', 'checkout', body);
  if (res.success) {
    renderSuccess('📤', 'CHECKED OUT', `Borrowing Order #${res.order_id} created`, 'orange');
    autoReset(5000);
  } else {
    renderError(res.error || 'Checkout failed', '');
    autoReset(3500);
  }
}

async function doReturn() {
  const res = await apiFetch('POST', 'return', { order_id: app.selectedOrder });
  if (res.success) {
    renderSuccess('📥', 'RETURNED', 'Item successfully returned to warehouse', 'green');
    autoReset(5000);
  } else {
    renderError(res.error || 'Return failed', '');
    autoReset(3500);
  }
}

/* =====================================================================
   RENDER HELPERS
   ===================================================================== */
function renderStandby() {
  clearTimeout(app.resetTimer);
  Object.assign(app, {
    state: S.STANDBY, product: null, direction: null,
    faceImage: null, selectedOrder: null, scanCooldown: false,
  });

  dom.faceThumbWrap.style.display = 'none';
  setCamBadge('scanning', 'SCANNING');

  dom.statusBody.innerHTML = `
    <div class="status-idle fade-in">
      <div class="idle-icon">📦</div>
      <div class="idle-text">READY TO SCAN</div>
      <div class="idle-hint">Scan a QR code or use USB barcode scanner</div>
    </div>`;

  dom.dirCard.classList.add('hidden');
  dom.ordersCard.classList.add('hidden');
  dom.confirmCard.classList.add('hidden');
}

function renderProductFound(activeCount) {
  const p = app.product;
  dom.statusBody.innerHTML = `
    <div class="fade-in">
      <div class="prod-name">${esc(p.name)}</div>
      <div class="prod-sku">${esc(p.sku)}</div>
      <div class="prod-desc">${esc(p.description || '—')}</div>
      <span class="prod-cat">${esc(p.category)}</span>
      ${activeCount > 0 ? `
        <div class="active-warn">
          <span>⚠</span>
          <span>${activeCount} active borrowing order${activeCount > 1 ? 's' : ''}</span>
        </div>` : ''}
    </div>`;

  dom.dirCard.classList.remove('hidden');
  dom.ordersCard.classList.add('hidden');
  dom.confirmCard.classList.add('hidden');
}

function showOrdersCard(inner) {
  dom.ordersCard.classList.remove('hidden');
  dom.ordersListEl.innerHTML = inner;
  dom.confirmCard.classList.add('hidden');
}

function renderOrderList(orders) {
  const rows = orders.map(o => `
    <div class="order-item" data-oid="${o.id}" onclick="selectOrder(${o.id})">
      <div class="order-avatar">
        ${o.face_image
          ? `<img src="${esc(o.face_image)}" alt="">`
          : '👤'}
      </div>
      <div class="order-meta">
        <div class="oid">ORDER #${o.id}</div>
        <div class="odt">${fmtDate(o.created_at)}</div>
      </div>
    </div>`).join('');
  showOrdersCard(`<div class="order-list">${rows}</div>`);
}

function renderConfirm() {
  dom.confirmCard.classList.remove('hidden');

  const isOut = app.direction === 'outgoing';
  dom.confirmBtn.className     = 'btn-confirm ' + (isOut ? 'btn-conf-out' : 'btn-conf-in');
  dom.confirmBtn.disabled      = false;
  dom.confirmBtnText.textContent = isOut ? '▶  CONFIRM CHECKOUT' : '↩  CONFIRM RETURN';
}

function renderSuccess(icon, title, sub, colour) {
  app.state = S.SUCCESS;
  const c = colour === 'orange' ? 'var(--orange)' : 'var(--green)';
  dom.statusBody.innerHTML = `
    <div class="result fade-in">
      <div class="result-icon">${icon}</div>
      <div class="result-title" style="color:${c}">${title}</div>
      <div class="result-sub">${sub}</div>
    </div>`;
  dom.dirCard.classList.add('hidden');
  dom.ordersCard.classList.add('hidden');
  dom.confirmCard.classList.add('hidden');
  setCamBadge('found', 'DONE');
  beep(880, 100);
  setTimeout(() => beep(1100, 120), 130);
}

function renderError(title, detail) {
  app.state = S.ERROR;
  dom.statusBody.innerHTML = `
    <div class="result fade-in">
      <div class="result-icon">⚠️</div>
      <div class="result-title" style="color:var(--red)">${esc(title)}</div>
      <div class="result-sub">${esc(detail)}</div>
    </div>`;
  dom.dirCard.classList.add('hidden');
  dom.ordersCard.classList.add('hidden');
  dom.confirmCard.classList.add('hidden');
  setCamBadge('error', 'ERROR');
}

function autoReset(ms) {
  clearTimeout(app.resetTimer);
  app.resetTimer = setTimeout(renderStandby, ms);
}

function cancelAction() {
  clearTimeout(app.resetTimer);
  renderStandby();
}

/* =====================================================================
   CAMERA BADGE
   ===================================================================== */
function setCamBadge(type, text) {
  dom.camBadge.className   = `cam-badge ${type}`;
  dom.camBadge.innerHTML   = `<span class="bd"></span>${text}`;
}

/* =====================================================================
   DASHBOARD
   ===================================================================== */
async function loadDashboard() {
  try {
    const [oRes, sRes] = await Promise.all([
      apiFetch('GET', 'orders'),
      apiFetch('GET', 'stats'),
    ]);

    if (sRes.success) {
      const s = sRes.stats;
      dom.statActive.textContent = s.active_orders;
      dom.statOut.textContent    = s.total_checkouts_today;
      dom.statIn.textContent     = s.total_returns_today;
      dom.statTotal.textContent  = s.total_products;
    }

    if (oRes.success) renderDashOrders(oRes.orders);
  } catch (err) {
    console.error('Dashboard error:', err);
  }
}

function renderDashOrders(orders) {
  if (!orders.length) {
    dom.dashOrdersTbody.innerHTML =
      '<tr><td colspan="7" class="empty">No active borrowing orders — all items returned ✓</td></tr>';
    return;
  }

  dom.dashOrdersTbody.innerHTML = orders.map(o => {
    const hrs = hoursAgo(o.created_at);
    const overdue = hrs > 24;
    return `
      <tr class="fade-in">
        <td>
          <div class="tbl-avatar">
            ${o.face_image ? `<img src="${esc(o.face_image)}" alt="">` : '👤'}
          </div>
        </td>
        <td style="color:var(--cyan)">#${o.id}</td>
        <td>
          <div style="font-weight:700;color:var(--text-hi)">${esc(o.product_name)}</div>
          <div style="font-size:10px;color:var(--muted)">${esc(o.sku)}</div>
        </td>
        <td><span class="badge badge-cat">${esc(o.category)}</span></td>
        <td style="font-size:11px;color:var(--muted)">${fmtDate(o.created_at)}</td>
        <td><span class="dur${overdue ? ' overdue' : ''}">${durStr(hrs)}</span></td>
        <td><span class="badge badge-active">ACTIVE</span></td>
      </tr>`;
  }).join('');
}

/* =====================================================================
   PRODUCTS TAB
   ===================================================================== */
async function loadProducts() {
  try {
    const res = await apiFetch('GET', 'products');
    if (res.success) renderProducts(res.products);
  } catch (err) {
    console.error('Products error:', err);
  }
}

function renderProducts(products) {
  dom.productsGrid.innerHTML = products.map(p => `
    <div class="prod-card">
      <div class="qr-box" id="qr${p.id}"></div>
      <div class="prod-card-name">${esc(p.name)}</div>
      <div class="prod-card-sku">${esc(p.sku)}</div>
      <div class="prod-card-qr">${esc(p.qr_code)}</div>
    </div>`).join('');

  products.forEach(p => {
    new QRCode(el(`qr${p.id}`), {
      text: p.qr_code,
      width: 116, height: 116,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M,
    });
  });
}

/* =====================================================================
   UTILITY FUNCTIONS
   ===================================================================== */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmtDate(str) {
  return new Date(str).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function hoursAgo(str) {
  return (Date.now() - new Date(str).getTime()) / 3_600_000;
}

function durStr(hrs) {
  if (hrs < 1)  return `${Math.floor(hrs * 60)}m ago`;
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* Tone feedback */
function beep(freq, dur) {
  try {
    const ac  = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ac.createOscillator();
    const gn  = ac.createGain();
    osc.connect(gn); gn.connect(ac.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gn.gain.setValueAtTime(0.25, ac.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur / 1000);
    osc.start(); osc.stop(ac.currentTime + dur / 1000);
  } catch (_) { /* audio context blocked */ }
}

/* Thin fetch wrapper */
async function apiFetch(method, action, data = {}) {
  const url = `${API}?action=${action}`;
  const opts = { method };

  if (method === 'POST') {
    // Build x-www-form-urlencoded, but stream face image separately to avoid
    // URLSearchParams truncation on very large base64 strings.
    const body = new FormData();
    for (const [k, v] of Object.entries(data)) body.append(k, v);
    opts.body = body;
  } else if (method === 'GET' && Object.keys(data).length) {
    const qs = new URLSearchParams(data);
    return fetch(`${url}&${qs}`).then(r => r.json());
  }

  const res = await fetch(url, opts);
  return res.json();
}

/* =====================================================================
   BOOT
   ===================================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initDom();
  initClock();
  initTabs();
  initCamera();
  initUSBScanner();
  renderStandby();

  // Direction buttons
  el('btnOut').addEventListener('click', () => handleDirection('outgoing'));
  el('btnIn').addEventListener('click',  () => handleDirection('ingoing'));

  // Confirm / Cancel
  dom.confirmBtn.addEventListener('click', confirmAction);
  el('btnCancel').addEventListener('click', cancelAction);

  // Dashboard refresh
  el('btnRefreshDash').addEventListener('click', loadDashboard);
});
