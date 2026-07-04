# Customer Helpdesk — Quality Console

A dependency-free PHP + SQLite helpdesk that pulls customer tickets from the
**Qiscus** Multichannel API, uses **AI to match each ticket to the correct
product in the PIM catalog**, and turns the result into actionable quality
tooling:

| # | Section | What it does |
|---|---------|--------------|
| 01 | **Tickets** | All synced tickets with AI product match, problem category, severity, summary and customer photos. Filterable by date, product type, product, problem, severity, free text. |
| 02 | **Report** | Problem report over the same filters: tickets per week, problems by product, by product type, by problem category, by severity. |
| 03 | **R&D Dashboard** | Unique recurring technical problems, detected by clustering similar complaints per product. 3+ occurrences = recurring. Status workflow: open → investigating → resolved. |
| 04 | **Products / PIM** | The product catalog with supplier names, emails and matching keywords. |
| 05 | **Settings** | Qiscus + Anthropic credentials. |

Plus two one-click deliverables (respecting the active filters):

- **Excel recap** — a real `.xlsx` (generated without any library) grouped by
  product, with the customers' **photos embedded** next to each complaint.
- **Supplier email drafts** — one quality-claim email per supplier covering
  the filtered complaints, with `mailto:` and copy-to-clipboard.

## Running

```
php -S 0.0.0.0:8000 -t helpdesk/
```

or drop the `helpdesk/` folder on any PHP 8.1+ host with the `pdo_sqlite`,
`zip`, `gd` and `curl` extensions (all standard). Open `index.php`,
press **SYNC TICKETS**.

## Deploying

This is a **PHP + SQLite** app, so it needs a host that runs PHP — it will **not**
run on static/JS-only platforms like Netlify or GitHub Pages (no PHP runtime,
read-only filesystem). A `Dockerfile` is included (PHP 8.3 + Apache with `gd`,
`zip`, `pdo_sqlite`, `curl`) that binds to `$PORT` and works as-is on any
container host:

**Railway** — New Project → Deploy from GitHub repo → set **Root Directory** to
`helpdesk` → it auto-detects the Dockerfile and deploys. Done.

**Render** — New → Web Service → connect repo → Runtime **Docker**, **Root
Directory** `helpdesk` → Create.

**Fly.io** — from the `helpdesk/` folder: `fly launch --copy-config --now`
(uses the bundled `fly.toml`).

**Any Docker host** —
```
docker build -t helpdesk helpdesk/
docker run -p 8080:8080 helpdesk      # http://localhost:8080
```

Set the Qiscus and Anthropic keys in **05 Settings** after the first load, or bake
them in via the host's environment and read them in `db.php`.

> **Filesystem note:** PaaS containers have an *ephemeral* filesystem — synced
> tickets, images and the SQLite file are wiped on redeploy/restart. The PIM
> catalog reseeds automatically and you re-press **SYNC** to repopulate. For
> durable data, attach a persistent volume at `/var/www/html/data` (see the
> commented block in `fly.toml`).

## Modes

The system runs fully standalone and upgrades itself as you add credentials
in **05 Settings**:

| Credential | Empty (default) | Configured |
|---|---|---|
| Qiscus App ID + Secret | Built-in demo dataset (42 realistic tickets with photos) | Pulls customer rooms + messages from the Qiscus Multichannel API |
| Anthropic API key | Deterministic keyword matcher (SKU/name/keyword scoring + heuristic taxonomy) | Claude (`claude-opus-4-8`) matches products, categorizes problems, writes normalized summaries and drafts the supplier emails |

## How the pieces fit

```
Qiscus API ──> sync ──> AI classify ──> ticket (product, problem, severity, summary)
 (or demo)                    │
                              └──> cluster per product (token overlap)
                                       └──> R&D dashboard (recurring ≥ 3)
tickets + filters ──> report / xlsx recap (embedded images) / supplier email drafts
```

- `db.php` — SQLite schema, PIM seed, filterable queries, clustering
- `qiscus.php` — Qiscus Multichannel client + demo dataset generator
- `ai.php` — Claude classification (structured outputs) + keyword fallback, email drafting
- `xlsx.php` — minimal OOXML writer with embedded images (no PhpSpreadsheet)
- `api.php` — JSON API (`?action=stats|tickets|sync|report|clusters|draft_email|export_xlsx|…`)
- `index.php` + `assets/` — Swiss editorial UI (black / white / red)

Ticket data, images and the SQLite file live under `data/` (web access
blocked via `.htaccess`; the PIM catalog is seeded on first run).
