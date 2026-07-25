import { createClient } from "@supabase/supabase-js";
import { admin } from "../../../lib/supabaseAdmin";
export const dynamic = "force-dynamic";

// GET /api/client-context?id=<workspaceId>
// Allowed if caller is super admin OR the project lead of that client.
export async function GET(req) {
  const token = (req.headers.get("authorization") || "").replace("Bearer ", "").trim();
  if (!token) return Response.json({ error: "Not allowed" }, { status: 403 });
  const asUser = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user } } = await asUser.auth.getUser();
  if (!user) return Response.json({ error: "Not allowed" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return Response.json({ error: "Missing client" }, { status: 400 });

  const { data: prof } = await asUser.from("profiles").select("side,is_super_admin").eq("id", user.id).single();
  if (prof?.side !== "agency") return Response.json({ error: "Not allowed" }, { status: 403 });

  const db = admin();
  const { data: ws } = await db.from("workspaces").select("id,name,phase,onboarding_complete,discovery_complete,project_lead_id").eq("id", id).single();
  if (!ws) return Response.json({ error: "Client not found" }, { status: 404 });

  const allowed = prof.is_super_admin || ws.project_lead_id === user.id;
  if (!allowed) return Response.json({ error: "You are not the project lead for this client" }, { status: 403 });

  const { data: services } = await db.from("client_services").select("department,service_label,service_key").eq("workspace_id", id);
  return Response.json({ workspace: ws, services: services || [] });
}
