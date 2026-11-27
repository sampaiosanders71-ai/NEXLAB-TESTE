function accountExpired(profile:any):boolean{return Boolean(profile?.is_test_account)&&(!profile.temporary_until||!Number.isFinite(Date.parse(profile.temporary_until))||Date.parse(profile.temporary_until)<=Date.now());}
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(SUPABASE_URL, ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeUsername(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9._-]+/g, "")
    .replace(/^\.+|\.+$/g, "");
}

async function sha256Text(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...hash].map((x) => x.toString(16).padStart(2, "0")).join("");
}

async function minimumDelay(startedAt: number, minimumMs = 420) {
  const elapsed = Date.now() - startedAt;
  if (elapsed < minimumMs) await new Promise((resolve) => setTimeout(resolve, minimumMs - elapsed));
}

async function record(usernameHash: string, success: boolean, reason: string) {
  try {
    await service.rpc("nexlab_record_username_login_event_v1", {
      p_username_hash: usernameHash,
      p_success: success,
      p_reason: reason,
    });
  } catch {
    // Telemetria nunca deve impedir autenticação.
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const startedAt = Date.now();
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    await minimumDelay(startedAt);
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  const action = String(body?.action || "login").trim().toLowerCase();
  const username = normalizeUsername(body?.username);

  if (action === "username_available") {
    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
      await minimumDelay(startedAt, 180);
      return json({ ok: true, available: false, error: "invalid_username" });
    }

    const { data: existing, error: lookupError } = await service
      .from("profiles")
      .select("id")
      .eq("username", username)
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      await minimumDelay(startedAt);
      return json({ ok: false, error: "temporarily_unavailable" }, 503);
    }

    await minimumDelay(startedAt, 180);
    return json({ ok: true, available: !existing });
  }

  if (action !== "login") {
    await minimumDelay(startedAt, 180);
    return json({ ok: false, error: "unsupported_action" }, 400);
  }

  const password = String(body?.password || "");
  const usernameHash = await sha256Text(username || "invalid");

  if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || password.length < 1 || password.length > 512) {
    await record(usernameHash, false, "invalid_input");
    await minimumDelay(startedAt);
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  const { data: limited, error: limitError } = await service.rpc("nexlab_username_login_rate_limited_v1", {
    p_username_hash: usernameHash,
  });
  if (limitError) {
    await minimumDelay(startedAt);
    return json({ ok: false, error: "temporarily_unavailable" }, 503);
  }
  if (limited === true) {
    await record(usernameHash, false, "rate_limited");
    await minimumDelay(startedAt);
    return json({ ok: false, error: "too_many_attempts" }, 429);
  }

  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id,email,ativo,is_test_account,temporary_until")
    .eq("username", username)
    .maybeSingle();

  if (profileError || !profile || accountExpired(profile) || profile.ativo === false) {
    await record(usernameHash, false, profile?.ativo === false ? "inactive_or_invalid" : "invalid_credentials");
    await minimumDelay(startedAt);
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  const { data, error } = await authClient.auth.signInWithPassword({
    email: String(profile.email),
    password,
  });

  if (error || !data?.session) {
    await record(usernameHash, false, "invalid_credentials");
    await minimumDelay(startedAt);
    return json({ ok: false, error: "invalid_credentials" }, 401);
  }

  await record(usernameHash, true, "success");
  await minimumDelay(startedAt, 300);
  return json({
    ok: true,
    username,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      expires_at: data.session.expires_at,
    },
    user: { id: data.user?.id || profile.id },
  });
});

