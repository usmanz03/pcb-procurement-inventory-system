# PCB Procurement & Inventory Management System

PPRA-compliant procurement, stores, custody and asset lifecycle for the Pakistan Cricket Board, from demand to disposal.

**Live:** https://pcb-procurement.vercel.app
**Demo guide:** [DEMO_GUIDE.md](DEMO_GUIDE.md) covers module flows, the presentation script and likely questions.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 and sign in with any demo person (password `Pcb@2026`).

The database is PostgreSQL. With no configuration it runs an embedded PostgreSQL (PGlite) stored in `.data/pgdata`, created and seeded on first start. Set `DATABASE_URL` to use any PostgreSQL server instead; no code changes are needed.

## Structure

| Path | Purpose |
|---|---|
| `src/lib/engine.ts`, `src/lib/engine-stores.ts` | Business rules for every module, run on the server (authoritative) and in the browser (instant response) |
| `src/lib/server/` | Database access, schema, persistence with before/after values, hash-chained audit log, accounts |
| `src/app/api/` | Actions, state, audit, sign-in, finance hand-off, OpenAPI |
| `src/app/catalogue`, `demands`, `inventory` | Modules 0, 1 and 2 |
| `src/app/*` | Custody, vendors, sourcing, approvals, orders, finance, reports, trace, controls, commitment |
| `src/lib/seed.json` | Sample data loaded on first start and on demo reset |
| `src/lib/sow.ts` | Scope of Work requirements traceability |
