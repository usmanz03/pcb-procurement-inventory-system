import { ACTION_TAB } from "@/lib/engine";

/* GET /api/openapi — OpenAPI 3.1 description of the integration surface */
export function GET() {
  const role = { name: "x-pcb-role", in: "header", required: true, schema: { type: "string", enum: ["director", "committee", "cfo", "storekeeper", "auditor"] }, description: "Authenticated role (SSO claim in production)" };
  return Response.json({
    openapi: "3.1.0",
    info: { title: "PCB Procurement & Inventory API", version: "1.0.0", description: "REST interface for PCB's procurement, inventory, custody and finance modules. Every write is authorised by role, executed in a PostgreSQL transaction and written to the hash-chained audit log." },
    servers: [{ url: "/" }],
    paths: {
      "/api/state": { get: { summary: "Current state of every module", parameters: [{ name: "since", in: "query", schema: { type: "integer" }, description: "Return only a version marker if unchanged" }, { name: "after", in: "query", schema: { type: "integer" }, description: "Include audit events after this id" }], responses: { 200: { description: "State snapshot with version" } } } },
      "/api/action": {
        post: {
          summary: "Execute a business transaction", parameters: [role],
          requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["name", "args"], properties: { name: { type: "string", enum: Object.keys(ACTION_TAB) }, args: { type: "array", items: {} }, clientId: { type: "string" } } } } } },
          responses: { 200: { description: "Committed; returns result, new version and state" }, 422: { description: "Rejected by a business rule (segregation of duties, PPRA gate, budget, tolerance…)" } },
        },
      },
      "/api/finance/handoff": { get: { summary: "ERP data contract: one record per GRN passed to Finance", responses: { 200: { description: "pcb.finance.handoff/v1 records" } } } },
      "/api/audit": { get: { summary: "Search the activity log", parameters: [{ name: "q", in: "query", schema: { type: "string" } }, { name: "limit", in: "query", schema: { type: "integer" } }, { name: "id", in: "query", schema: { type: "integer" }, description: "Return one record with before/after values" }], responses: { 200: { description: "Audit records" } } } },
      "/api/audit/verify": { get: { summary: "Recompute the SHA-256 hash chain", responses: { 200: { description: "{ ok, count, head, brokenAt? }" } } } },
      "/api/system": { get: { summary: "Database health and table statistics", responses: { 200: { description: "Engine, latency, table sizes" } } } },
    },
    "x-actions": ACTION_TAB,
  });
}
