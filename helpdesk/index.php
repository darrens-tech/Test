<?php /* Customer Helpdesk — Qiscus × PIM × AI quality console */ ?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Helpdesk — Quality Console</title>
<link rel="stylesheet" href="assets/helpdesk.css">
</head>
<body>

<header class="masthead">
    <div class="masthead-title">
        <span class="red-block"></span>
        <h1>HELP<em>DESK</em></h1>
    </div>
    <div class="masthead-meta">
        <div class="meta-line">Customer Quality Console</div>
        <div class="meta-line">Qiscus <span class="x">&times;</span> PIM <span class="x">&times;</span> AI</div>
        <div class="meta-line" id="mode-line">&nbsp;</div>
    </div>
    <div class="masthead-stats" id="masthead-stats"></div>
    <div class="masthead-actions">
        <button class="btn btn-solid" id="btn-sync">SYNC TICKETS</button>
        <div class="sync-note" id="sync-note"></div>
    </div>
</header>

<nav class="tabs" id="tabs">
    <button class="tab active" data-tab="tickets"><span>01</span>Tickets</button>
    <button class="tab" data-tab="report"><span>02</span>Report</button>
    <button class="tab" data-tab="rnd"><span>03</span>R&amp;D Dashboard</button>
    <button class="tab" data-tab="products"><span>04</span>Products / PIM</button>
    <button class="tab" data-tab="settings"><span>05</span>Settings</button>
</nav>

<!-- shared filter bar (tickets + report) -->
<section class="filterbar" id="filterbar">
    <div class="filter">
        <label>From</label>
        <input type="date" id="f-date-from">
    </div>
    <div class="filter">
        <label>To</label>
        <input type="date" id="f-date-to">
    </div>
    <div class="filter">
        <label>Product type</label>
        <select id="f-category"><option value="">All types</option></select>
    </div>
    <div class="filter">
        <label>Product</label>
        <select id="f-product"><option value="">All products</option></select>
    </div>
    <div class="filter">
        <label>Problem</label>
        <select id="f-problem">
            <option value="">All problems</option>
            <option>manufacturing-defect</option>
            <option>malfunction</option>
            <option>damage-in-transit</option>
            <option>missing-parts</option>
            <option>wear-and-tear</option>
            <option>usability</option>
            <option>other</option>
        </select>
    </div>
    <div class="filter">
        <label>Severity</label>
        <select id="f-severity">
            <option value="">All</option>
            <option>critical</option><option>high</option>
            <option>medium</option><option>low</option>
        </select>
    </div>
    <div class="filter grow">
        <label>Search</label>
        <input type="text" id="f-q" placeholder="Customer, message…">
    </div>
    <div class="filter">
        <label>&nbsp;</label>
        <button class="btn" id="btn-clear-filters">CLEAR</button>
    </div>
    <div class="filter actions">
        <label>&nbsp;</label>
        <div class="filter-actions">
            <button class="btn btn-red" id="btn-export">EXCEL RECAP ↓</button>
            <button class="btn" id="btn-email">DRAFT SUPPLIER EMAIL</button>
        </div>
    </div>
</section>

<main>
    <section class="panel active" id="panel-tickets">
        <div class="panel-head">
            <h2><span class="idx">01</span> Tickets</h2>
            <div class="panel-sub" id="tickets-count"></div>
        </div>
        <div id="tickets-list" class="tickets-list"></div>
    </section>

    <section class="panel" id="panel-report">
        <div class="panel-head">
            <h2><span class="idx">02</span> Problem Report</h2>
            <div class="panel-sub" id="report-sub"></div>
        </div>
        <div id="report-body"></div>
    </section>

    <section class="panel" id="panel-rnd">
        <div class="panel-head">
            <h2><span class="idx">03</span> R&amp;D — Recurring Technical Problems</h2>
            <div class="panel-sub">Unique problems detected by AI clustering. A problem becomes
                <strong>recurring</strong> at&nbsp;<span class="red">3+ occurrences</span>.</div>
        </div>
        <div class="rnd-controls">
            <label class="check"><input type="checkbox" id="rnd-all"> show non-recurring (singletons) too</label>
        </div>
        <div id="rnd-list"></div>
    </section>

    <section class="panel" id="panel-products">
        <div class="panel-head">
            <h2><span class="idx">04</span> Products — PIM Catalog</h2>
            <div class="panel-sub" id="products-sub"></div>
        </div>
        <div id="products-list"></div>
    </section>

    <section class="panel" id="panel-settings">
        <div class="panel-head">
            <h2><span class="idx">05</span> Settings</h2>
            <div class="panel-sub">Credentials are stored locally in SQLite. Leave Qiscus fields
                empty to run on the built-in demo dataset.</div>
        </div>
        <form id="settings-form" class="settings-form" onsubmit="return false;">
            <div class="settings-group">
                <h3>Qiscus Multichannel</h3>
                <label>App ID
                    <input type="text" id="s-qiscus-app-id" autocomplete="off" placeholder="e.g. mycompany-abc123">
                </label>
                <label>Secret key
                    <input type="password" id="s-qiscus-secret" autocomplete="off" placeholder="Qiscus-Secret-Key">
                </label>
                <label>Base URL <span class="hint">(default multichannel.qiscus.com)</span>
                    <input type="text" id="s-qiscus-url" autocomplete="off" placeholder="https://multichannel.qiscus.com">
                </label>
            </div>
            <div class="settings-group">
                <h3>Anthropic (AI classification)</h3>
                <label>API key <span class="hint">(empty = keyword fallback matcher)</span>
                    <input type="password" id="s-anthropic-key" autocomplete="off" placeholder="sk-ant-…">
                </label>
                <div class="settings-note">With a key configured, tickets are matched to PIM products,
                categorized and summarized by Claude; supplier emails are AI-drafted.</div>
            </div>
            <div class="settings-actions">
                <button class="btn btn-solid" id="btn-save-settings">SAVE SETTINGS</button>
                <button class="btn btn-danger" id="btn-reset">RESET TICKET DATA</button>
            </div>
        </form>
    </section>
</main>

<!-- email drafts modal -->
<div class="modal-backdrop" id="email-modal" hidden>
    <div class="modal">
        <div class="modal-head">
            <h3>SUPPLIER EMAIL DRAFTS</h3>
            <button class="modal-close" id="email-close">&times;</button>
        </div>
        <div class="modal-body" id="email-body"></div>
    </div>
</div>

<!-- ticket image lightbox -->
<div class="modal-backdrop" id="img-modal" hidden>
    <div class="modal modal-img">
        <div class="modal-head">
            <h3 id="img-caption">PHOTO</h3>
            <button class="modal-close" id="img-close">&times;</button>
        </div>
        <div class="modal-body"><img id="img-full" src="" alt=""></div>
    </div>
</div>

<div class="toast" id="toast" hidden></div>

<footer class="colophon">
    <div>CUSTOMER HELPDESK — QUALITY CONSOLE</div>
    <div>TICKETS VIA QISCUS · PRODUCT MATCHING VIA PIM + AI · RECAPS FOR SUPPLIERS · CLUSTERS FOR R&amp;D</div>
</footer>

<script src="assets/helpdesk.js"></script>
</body>
</html>
