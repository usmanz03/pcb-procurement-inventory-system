import { db } from "@/lib/server/db";
import { fail } from "@/lib/server/http";
import { verifyAudit } from "@/lib/server/repo";
import { currentVersion } from "@/lib/server/runtime";

/* GET /api/audit/verify — recompute the SHA-256 hash chain over every audit record */
export async function GET() {
  try {
    await currentVersion();
    return Response.json(await verifyAudit((await db()).query));
  } catch (e) {
    return fail(e);
  }
}
