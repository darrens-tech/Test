/* Customer Helpdesk — front-end controller */
(() => {
    'use strict';

    const $  = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const state = {
        tab: 'tickets',
        products: [],
        categories: [],
    };

    // ---------------------------------------------------------------- api
    async function api(action, params = {}, post = null) {
        const qs = new URLSearchParams({ action, ...params });
        const opts = {};
        if (post) {
            opts.method = 'POST';
            opts.body = new URLSearchParams(post);
        }
        const res  = await fetch('api.php?' + qs.toString(), opts);
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'API error');
        return json;
    }

    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    let toastTimer;
    function toast(msg) {
        const el = $('#toast');
        el.textContent = msg;
        el.hidden = false;
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { el.hidden = true; }, 3200);
    }

    // ---------------------------------------------------------------- filters
    function currentFilters() {
        return {
            date_from:        $('#f-date-from').value,
            date_to:          $('#f-date-to').value,
            category:         $('#f-category').value,
            product_id:       $('#f-product').value,
            problem_category: $('#f-problem').value,
            severity:         $('#f-severity').value,
            q:                $('#f-q').value.trim(),
        };
    }

    function filterQuery() {
        const f = currentFilters();
        return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== ''));
    }

    function describeFilters() {
        const f = currentFilters();
        const bits = [];
        if (f.date_from) bits.push('from ' + f.date_from);
        if (f.date_to) bits.push('to ' + f.date_to);
        if (f.category) bits.push(f.category);
        if (f.product_id) {
            const p = state.products.find((x) => String(x.id) === f.product_id);
            if (p) bits.push(p.sku);
        }
        if (f.problem_category) bits.push(f.problem_category);
        if (f.severity) bits.push(f.severity);
        if (f.q) bits.push('“' + f.q + '”');
        return bits.length ? bits.join(' · ') : 'all records';
    }

    // ---------------------------------------------------------------- masthead
    async function loadStats() {
        try {
            const { stats, mode } = await api('stats');
            $('#masthead-stats').innerHTML = `
                <div class="mstat"><div class="n">${stats.total_tickets}</div><div class="l">Tickets</div></div>
                <div class="mstat"><div class="n ${stats.critical ? 'alert' : ''}">${stats.critical}</div><div class="l">High / Crit</div></div>
                <div class="mstat"><div class="n ${stats.recurring ? 'alert' : ''}">${stats.recurring}</div><div class="l">Recurring</div></div>
                <div class="mstat"><div class="n">${stats.products}</div><div class="l">Products</div></div>`;
            $('#mode-line').innerHTML =
                `Source: <b>${mode.qiscus === 'live' ? 'Qiscus live' : 'demo data'}</b> — ` +
                `AI: <b>${mode.ai === 'claude' ? 'Claude' : 'keyword fallback'}</b>`;
            $('#sync-note').textContent = stats.last_sync
                ? 'Last sync ' + stats.last_sync : 'Not synced yet — press sync';
        } catch (e) {
            toast('Stats failed: ' + e.message);
        }
    }

    // ---------------------------------------------------------------- tickets
    async function loadTickets() {
        const box = $('#tickets-list');
        box.innerHTML = '<div class="empty">Loading…</div>';
        try {
            const { tickets } = await api('tickets', filterQuery());
            $('#tickets-count').textContent =
                tickets.length + ' ticket(s) — ' + describeFilters();
            if (!tickets.length) {
                box.innerHTML = '<div class="empty">No tickets. Press <b>SYNC TICKETS</b> to pull from Qiscus (or load the demo set).</div>';
                return;
            }
            box.innerHTML = tickets.map(ticketRow).join('');
        } catch (e) {
            box.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`;
        }
    }

    function ticketRow(t) {
        const thumbs = (t.images || []).map((img) =>
            `<img src="api.php?action=image&file=${encodeURIComponent(img.filename)}"
                  alt="${esc(img.caption)}" title="${esc(img.caption)}"
                  data-caption="${esc(img.caption)}" class="thumb">`).join('');
        const product = t.product_name
            ? `<div class="name">${esc(t.product_name)}</div>
               <div class="sku-line">${esc(t.sku)} · ${esc(t.product_category)}</div>
               <div class="conf">${esc(t.match_method)} · ${(Number(t.match_confidence) * 100).toFixed(0)}%</div>`
            : '<div class="unmatched">Unmatched</div>';
        return `
        <article class="ticket">
            <div class="t-date">${esc((t.created_at || '').slice(0, 10))}
                <span class="src">${esc(t.source_id)}</span></div>
            <div class="t-customer">${esc(t.customer_name)}
                <span class="email">${esc(t.customer_email || '')}</span></div>
            <div class="t-body">
                <div class="subject">${esc(t.subject)}</div>
                <div class="message">${esc(t.message)}</div>
                ${t.summary ? `<div class="summary"><b>AI —</b> ${esc(t.summary)}</div>` : ''}
                ${thumbs ? `<div class="t-thumbs">${thumbs}</div>` : ''}
            </div>
            <div class="t-product">${product}</div>
            <div class="t-tags">
                <span class="tag sev-${esc(t.severity)}">${esc(t.severity || 'n/a')}</span>
                <span class="tag">${esc(t.problem_category || 'unclassified')}</span>
            </div>
        </article>`;
    }

    // ---------------------------------------------------------------- report
    async function loadReport() {
        const box = $('#report-body');
        box.innerHTML = '<div class="empty">Loading…</div>';
        try {
            const { report } = await api('report', filterQuery());
            $('#report-sub').textContent = describeFilters();
            const total = report.by_severity.reduce((a, r) => a + Number(r.n), 0);
            if (!total) {
                box.innerHTML = '<div class="empty">No data for this filter.</div>';
                return;
            }
            box.innerHTML = `
                <div class="report-grid">
                    <div class="report-block wide">${timeline(report.timeline)}</div>
                    <div class="report-block">${bars('Problems by product', report.by_product,
                        (r) => `${esc(r.label || 'Unmatched')} <small>${esc(r.sku || '')}</small>`)}</div>
                    <div class="report-block">${bars('By product type', report.by_category)}</div>
                    <div class="report-block">${bars('By problem category', report.by_problem)}</div>
                    <div class="report-block">${bars('By severity', report.by_severity)}</div>
                </div>`;
        } catch (e) {
            box.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`;
        }
    }

    function bars(title, rows, labelFn) {
        if (!rows || !rows.length) return `<h3>${esc(title)}</h3><div class="empty">No data</div>`;
        const max = Math.max(...rows.map((r) => Number(r.n)));
        const html = rows.map((r) => {
            const n = Number(r.n);
            const pct = max ? Math.max(2, (n / max) * 100) : 0;
            return `<div class="brow ${n === max ? 'top' : ''}">
                <div class="lbl" title="${esc(r.label)}">${labelFn ? labelFn(r) : esc(r.label)}</div>
                <div class="track"><div class="bar" style="width:${pct}%"></div></div>
                <div class="val">${n}</div>
            </div>`;
        }).join('');
        return `<h3>${esc(title)}</h3>${html}`;
    }

    function timeline(rows) {
        if (!rows || !rows.length) return '<h3>Tickets per week</h3><div class="empty">No data</div>';
        const max = Math.max(...rows.map((r) => Number(r.n)));
        const cols = rows.map((r) => {
            const n = Number(r.n);
            const h = max ? Math.max(3, (n / max) * 108) : 3;
            return `<div class="tl-col ${n === max ? 'top' : ''}" title="week of ${esc(r.week_start)}: ${n} ticket(s)">
                <div class="n">${n}</div>
                <div class="bar" style="height:${h}px"></div>
                <div class="w">${esc(r.week_start ? r.week_start.slice(5) : r.label)}</div>
            </div>`;
        }).join('');
        return `<h3>Tickets per week</h3><div class="timeline">${cols}</div>`;
    }

    // ---------------------------------------------------------------- R&D
    async function loadClusters() {
        const box = $('#rnd-list');
        box.innerHTML = '<div class="empty">Loading…</div>';
        const min = $('#rnd-all').checked ? 1 : 3;
        try {
            const { clusters } = await api('clusters', { min });
            if (!clusters.length) {
                box.innerHTML = '<div class="empty">No recurring problems detected yet.</div>';
                return;
            }
            box.innerHTML = clusters.map(clusterCard).join('');
            $$('.status-select').forEach((sel) => {
                sel.addEventListener('change', async () => {
                    try {
                        await api('cluster_status', {}, { id: sel.dataset.id, status: sel.value });
                        toast('Cluster marked ' + sel.value);
                        loadClusters();
                        loadStats();
                    } catch (e) { toast(e.message); }
                });
            });
        } catch (e) {
            box.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`;
        }
    }

    function clusterCard(c) {
        const recurring = Number(c.occurrences) >= 3;
        const occ = (c.tickets || []).slice(0, 6).map((t) =>
            `<div><span class="d">${esc((t.created_at || '').slice(0, 10))}</span>${esc(t.summary)}</div>`).join('');
        const more = (c.tickets || []).length > 6
            ? `<div><span class="d"></span>… ${(c.tickets.length - 6)} more</div>` : '';
        return `
        <article class="cluster ${recurring ? 'recurring' : ''}">
            <div class="count">
                <div class="n">${c.occurrences}</div>
                <div class="l">${recurring ? 'recurring' : 'occurrence' + (c.occurrences > 1 ? 's' : '')}</div>
            </div>
            <div>
                <div class="title">${esc(c.title)}</div>
                <div class="meta"><b>${esc(c.product_name)}</b> · ${esc(c.sku)} · ${esc(c.product_category)}
                    · ${esc(c.problem_category)} · max severity <b>${esc(c.max_severity)}</b></div>
                <div class="occurrences">${occ}${more}</div>
            </div>
            <div class="supplier">
                <div class="l">Supplier</div>
                <div class="v">${esc(c.supplier_name || '—')}</div>
                <div class="e">${esc(c.supplier_email || '')}</div>
                <div class="span-dates" style="margin-top:8px">
                    ${esc((c.first_seen || '').slice(0, 10))} → ${esc((c.last_seen || '').slice(0, 10))}</div>
            </div>
            <div class="actions">
                <span class="status-pill ${esc(c.status)}">${esc(c.status)}</span>
                <select class="status-select" data-id="${c.id}">
                    ${['open', 'investigating', 'resolved'].map((s) =>
                        `<option value="${s}" ${s === c.status ? 'selected' : ''}>${s}</option>`).join('')}
                </select>
            </div>
        </article>`;
    }

    // ---------------------------------------------------------------- products
    async function loadProducts() {
        const box = $('#products-list');
        try {
            const { products } = await api('products');
            $('#products-sub').textContent = products.length + ' products in catalog';
            box.innerHTML = `
            <table class="ptable">
                <thead><tr><th>SKU</th><th>Product</th><th>Type</th><th>Supplier</th><th>Contact</th><th>Match keywords</th></tr></thead>
                <tbody>${products.map((p) => `
                    <tr>
                        <td class="sku">${esc(p.sku)}</td>
                        <td>${esc(p.name)}</td>
                        <td class="cat">${esc(p.category)}</td>
                        <td>${esc(p.supplier_name || '')}</td>
                        <td class="sup-email">${esc(p.supplier_email || '')}</td>
                        <td class="sup-email">${esc(p.keywords || '')}</td>
                    </tr>`).join('')}
                </tbody>
            </table>`;
        } catch (e) {
            box.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`;
        }
    }

    async function loadProductFilters() {
        const { products, categories } = await api('products');
        state.products = products;
        state.categories = categories;
        $('#f-category').innerHTML = '<option value="">All types</option>' +
            categories.map((c) => `<option>${esc(c)}</option>`).join('');
        rebuildProductSelect();
    }

    function rebuildProductSelect() {
        const cat = $('#f-category').value;
        const list = state.products.filter((p) => !cat || p.category === cat);
        $('#f-product').innerHTML = '<option value="">All products</option>' +
            list.map((p) => `<option value="${p.id}">${esc(p.sku)} — ${esc(p.name)}</option>`).join('');
    }

    // ---------------------------------------------------------------- settings
    async function loadSettings() {
        try {
            const { settings } = await api('settings_get');
            $('#s-qiscus-app-id').value = settings.qiscus_app_id;
            $('#s-qiscus-secret').value = settings.qiscus_secret_key;
            $('#s-qiscus-url').value = settings.qiscus_base_url;
            $('#s-anthropic-key').value = settings.anthropic_api_key;
        } catch (e) { toast(e.message); }
    }

    async function saveSettings() {
        try {
            await api('settings_save', {}, {
                qiscus_app_id:     $('#s-qiscus-app-id').value,
                qiscus_secret_key: $('#s-qiscus-secret').value,
                qiscus_base_url:   $('#s-qiscus-url').value,
                anthropic_api_key: $('#s-anthropic-key').value,
            });
            toast('Settings saved');
            loadStats();
            loadSettings();
        } catch (e) { toast('Save failed: ' + e.message); }
    }

    // ---------------------------------------------------------------- actions
    async function syncTickets() {
        const btn = $('#btn-sync');
        btn.disabled = true;
        btn.textContent = 'SYNCING…';
        try {
            const r = await api('sync');
            toast(`Sync done — ${r.imported} imported, ${r.skipped} already known` +
                  (r.errors.length ? `, ${r.errors.length} errors` : ''));
            if (r.errors.length) console.warn('Sync errors:', r.errors);
            await refreshCurrent();
            await loadStats();
        } catch (e) {
            toast('Sync failed: ' + e.message);
        } finally {
            btn.disabled = false;
            btn.textContent = 'SYNC TICKETS';
        }
    }

    function exportXlsx() {
        const qs = new URLSearchParams({ action: 'export_xlsx', ...filterQuery() });
        window.location.href = 'api.php?' + qs.toString();
        toast('Generating Excel recap…');
    }

    async function draftEmails() {
        const modal = $('#email-modal');
        const body  = $('#email-body');
        modal.hidden = false;
        body.innerHTML = '<div class="empty">Drafting emails…</div>';
        try {
            const { drafts } = await api('draft_email', filterQuery());
            if (!drafts.length) {
                body.innerHTML = '<div class="empty">No supplier-linked tickets in this filter.</div>';
                return;
            }
            body.innerHTML = drafts.map((d, i) => `
                <div class="draft">
                    <div class="draft-head">
                        <div class="to">${esc(d.supplier_name)}<small>${esc(d.supplier_email)}</small></div>
                        <div class="n">${d.ticket_count} complaint(s)</div>
                    </div>
                    <div class="draft-subject">${esc(d.subject)}</div>
                    <div class="draft-body">${esc(d.body)}</div>
                    <div class="draft-actions">
                        <a class="btn btn-red" href="${d.mailto}">OPEN IN MAIL CLIENT</a>
                        <button class="btn copy-draft" data-i="${i}">COPY TEXT</button>
                        <span class="draft-method">drafted by ${esc(d.method)}</span>
                    </div>
                </div>`).join('');
            $$('.copy-draft').forEach((b) => b.addEventListener('click', () => {
                const d = drafts[Number(b.dataset.i)];
                navigator.clipboard.writeText(`To: ${d.supplier_email}\nSubject: ${d.subject}\n\n${d.body}`)
                    .then(() => toast('Draft copied'));
            }));
        } catch (e) {
            body.innerHTML = `<div class="empty">Error: ${esc(e.message)}</div>`;
        }
    }

    async function resetData() {
        if (!confirm('Delete all synced tickets, images and clusters? The PIM catalog is kept.')) return;
        try {
            await api('reset');
            toast('Ticket data cleared');
            await refreshCurrent();
            await loadStats();
        } catch (e) { toast(e.message); }
    }

    // ---------------------------------------------------------------- tabs & wiring
    function showTab(tab) {
        state.tab = tab;
        $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        $$('.panel').forEach((p) => p.classList.toggle('active', p.id === 'panel-' + tab));
        $('#filterbar').hidden = !(tab === 'tickets' || tab === 'report');
        refreshCurrent();
    }

    function refreshCurrent() {
        switch (state.tab) {
            case 'tickets':  return loadTickets();
            case 'report':   return loadReport();
            case 'rnd':      return loadClusters();
            case 'products': return loadProducts();
            case 'settings': return loadSettings();
        }
    }

    function wire() {
        $$('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

        let debounce;
        ['#f-date-from', '#f-date-to', '#f-category', '#f-product', '#f-problem', '#f-severity']
            .forEach((sel) => $(sel).addEventListener('change', () => {
                if (sel === '#f-category') rebuildProductSelect();
                refreshCurrent();
            }));
        $('#f-q').addEventListener('input', () => {
            clearTimeout(debounce);
            debounce = setTimeout(refreshCurrent, 350);
        });
        $('#btn-clear-filters').addEventListener('click', () => {
            ['#f-date-from', '#f-date-to', '#f-category', '#f-product', '#f-problem', '#f-severity', '#f-q']
                .forEach((sel) => { $(sel).value = ''; });
            rebuildProductSelect();
            refreshCurrent();
        });

        $('#btn-sync').addEventListener('click', syncTickets);
        $('#btn-export').addEventListener('click', exportXlsx);
        $('#btn-email').addEventListener('click', draftEmails);
        $('#email-close').addEventListener('click', () => { $('#email-modal').hidden = true; });
        $('#email-modal').addEventListener('click', (e) => {
            if (e.target === $('#email-modal')) $('#email-modal').hidden = true;
        });

        $('#rnd-all').addEventListener('change', loadClusters);
        $('#btn-save-settings').addEventListener('click', saveSettings);
        $('#btn-reset').addEventListener('click', resetData);

        // image lightbox (delegated)
        document.addEventListener('click', (e) => {
            const img = e.target.closest('.t-thumbs img');
            if (img) {
                $('#img-full').src = img.src;
                $('#img-caption').textContent = (img.dataset.caption || 'PHOTO').toUpperCase();
                $('#img-modal').hidden = false;
            }
        });
        $('#img-close').addEventListener('click', () => { $('#img-modal').hidden = true; });
        $('#img-modal').addEventListener('click', (e) => {
            if (e.target === $('#img-modal')) $('#img-modal').hidden = true;
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                $('#email-modal').hidden = true;
                $('#img-modal').hidden = true;
            }
        });
    }

    // ---------------------------------------------------------------- boot
    (async function boot() {
        wire();
        try { await loadProductFilters(); } catch (e) { toast(e.message); }
        await loadStats();
        showTab('tickets');
    })();
})();
