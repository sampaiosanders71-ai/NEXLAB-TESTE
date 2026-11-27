function accountExpired(profile:any):boolean{return Boolean(profile?.is_test_account)&&(!profile.temporary_until||!Number.isFinite(Date.parse(profile.temporary_until))||Date.parse(profile.temporary_until)<=Date.now());}
import { createClient } from "npm:@supabase/supabase-js@2";
import { inspectVapid } from "./vapid.ts";
import { beginRun, finishRun, saveProviderHealth } from "./telemetry.ts";
import { loadSettings, processQueue } from "./worker.ts";

const FALLBACK_VERSION = "0.26.82";
const EMAIL_MODE = "suspended";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const appUrl = Deno.env.get("NEXLAB_APP_URL") ?? "";
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = (Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com").trim();
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
const vapid = inspectVapid(publicKey, privateKey, vapidSubject);

function currentEdgeVersion(): number {
  const deploymentId = Deno.env.get("DENO_DEPLOYMENT_ID") ?? "";
  const match = deploymentId.match(/_(\d+)$/);
  return match ? Number(match[1]) : 0;
}
const EDGE_VERSION = currentEdgeVersion();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;
    const parts = [value.message, value.details, value.hint, value.code].filter(Boolean).map(String);
    if (parts.length) return parts.join(" | ").slice(0, 1800);
    try { return JSON.stringify(value).slice(0, 1800); } catch { }
  }
  return String(error ?? "Falha desconhecida").slice(0, 1800);
}

async function retrySafe<T>(task: () => Promise<T>, attempts = 3): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try { return await task(); } catch (error) { last = error; if (i + 1 < attempts) await sleep(180 * (i + 1)); }
  }
  throw last;
}

async function currentRuntimeVersion(): Promise<string> {
  try {
    return await retrySafe(async () => {
      const { data, error } = await admin.from("nexlab_app_versions").select("version").eq("release_status", "beta").order("installed_at", { ascending: false }).order("version", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data?.version ? String(data.version) : FALLBACK_VERSION;
    });
  } catch { return FALLBACK_VERSION; }
}

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json; charset=utf-8" } });

async function consumeInvocation(id: string) {
  if (!id) return false;
  const waits = [0, 120, 320, 700];
  for (const wait of waits) {
    if (wait) await sleep(wait);
    const { data, error } = await admin.from("nexlab_worker_invocations").update({ used_at: new Date().toISOString() })
      .eq("id", id).eq("worker_name", "notification-delivery-worker").is("used_at", null)
      .gt("expires_at", new Date().toISOString()).select("id").maybeSingle();
    if (!error && data) return true;
  }
  return false;
}

async function authorize(request: Request, body: Record<string, unknown>) {
  if (await consumeInvocation(String(body.invocation_id ?? ""))) return { mode: "worker", userId: null, admin: true };
  const authorization = request.headers.get("Authorization") ?? "";
  if (!authorization.toLowerCase().startsWith("bearer ")) return null;
  const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) return null;
  const { data: profile } = await admin.from("profiles").select("role,ativo,is_test_account,temporary_until").eq("id", user.id).maybeSingle();
  if (!profile || accountExpired(profile) || profile.ativo === false) return null;
  return { mode: "user", userId: user.id, admin: ["admin", "administrador"].includes(String(profile.role ?? "").toLowerCase()) };
}

async function updateProviderHealth() {
  await retrySafe(async () => {
    await saveProviderHealth(admin, "push", "web-push", vapid.configured, vapid.valid, false,
      !vapid.configured ? "not_configured" : vapid.valid ? "configured" : "invalid",
      { publicBytes: vapid.publicBytes, privateBytes: vapid.privateBytes, publicFormat: vapid.publicFormat, privateFormat: vapid.privateFormat, pairMatches: vapid.pairMatches, reason: vapid.reason });
    await saveProviderHealth(admin, "email", "none", false, true, false, "suspended",
      { reason: "Canal suspenso por decisão administrativa.", affects_readiness: false, external_channel_active: false });
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return response({ error: "Método não permitido.", version: FALLBACK_VERSION, edgeVersion: EDGE_VERSION }, 405);
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const auth = await authorize(request, body);
  if (!auth) return response({ error: "Não autorizado.", version: FALLBACK_VERSION, edgeVersion: EDGE_VERSION }, 401);
  const VERSION = await currentRuntimeVersion();
  const action = String(body.action ?? "process");

  try {
    const settings = await loadSettings(admin);
    await updateProviderHealth();

    if (action === "health") {
      if (!auth.admin) return response({ error: "Apenas Administradores podem consultar o diagnóstico.", version: VERSION, edgeVersion: EDGE_VERSION }, 403);
      return response({ ok: true, version: VERSION, edgeVersion: EDGE_VERSION, emailMode: EMAIL_MODE,
        providers: { push: { configured: vapid.configured, valid: vapid.valid, pairMatches: vapid.pairMatches, publicBytes: vapid.publicBytes, privateBytes: vapid.privateBytes, publicFormat: vapid.publicFormat, privateFormat: vapid.privateFormat, reason: vapid.reason }, email: { status: "suspended", configured: false, operational: false, affectsReadiness: false } },
        settings, checkedAt: new Date().toISOString() });
    }
    if (action === "admin_process" && !auth.admin) return response({ error: "Apenas Administradores podem processar toda a fila.", version: VERSION, edgeVersion: EDGE_VERSION }, 403);

    const runId = crypto.randomUUID();
    try {
      await beginRun(admin, runId, auth.mode, action, VERSION, EDGE_VERSION);
      const result = await processQueue(admin, auth, settings, runId, vapid, vapidSubject, appUrl);
      const degraded = result.providerBlocked || result.retried > 0 || result.terminal > 0;
      await finishRun(admin, runId, degraded ? "degraded" : "success", { selected: result.selected, sent: result.sent, skipped: result.skipped, retried: result.retried, terminal: result.terminal, overdueDetected: result.overdueDetected }, result.providerError);
      const meaningful = degraded || result.selected > 0 || result.sent > 0 || result.skipped > 0 || result.retried > 0 || result.terminal > 0 || result.overdueDetected > 0;
      if ((auth.mode === "worker" || auth.admin) && meaningful) {
        await admin.from("nexlab_system_events").insert({ event_type: "notification_worker_run", severity: degraded ? "warning" : "success",
          message: result.providerBlocked ? "Worker executado, mas o Web Push está bloqueado pelo provedor." : "Worker de notificações executado com atividade relevante.",
          details: { version: VERSION, edgeVersion: EDGE_VERSION, runId, emailMode: EMAIL_MODE, ...result }, actor_id: auth.userId });
      }
      return response({ ok: true, version: VERSION, edgeVersion: EDGE_VERSION, runId, mode: auth.mode, emailMode: EMAIL_MODE, settings, ...result });
    } catch (error) {
      const message = errorText(error);
      try { await finishRun(admin, runId, "failed", {}, message); } catch { }
      return response({ ok: false, version: VERSION, edgeVersion: EDGE_VERSION, runId, error: message }, 500);
    }
  } catch (error) {
    return response({ ok: false, version: VERSION, edgeVersion: EDGE_VERSION, runId: null, error: errorText(error) }, 500);
  }
});

