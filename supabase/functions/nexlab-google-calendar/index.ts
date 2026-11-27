function accountExpired(profile:any):boolean{return Boolean(profile?.is_test_account)&&(!profile.temporary_until||!Number.isFinite(Date.parse(profile.temporary_until))||Date.parse(profile.temporary_until)<=Date.now());}
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const TIME_ZONE = "America/Fortaleza";
const GOOGLE_SCOPE = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

function namedKey(jsonName, legacyName) {
  try {
    const raw = Deno.env.get(jsonName);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.default) return String(parsed.default);
    }
  } catch {}
  return String(Deno.env.get(legacyName) || "");
}

const SERVICE_KEY = String(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || namedKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY"));
const PUBLISHABLE_KEY = String(Deno.env.get("SUPABASE_ANON_KEY") || namedKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY"));
const GOOGLE_CLIENT_ID = String(Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID") || "").trim();
const GOOGLE_CLIENT_SECRET = String(Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET") || "").trim();
const CALLBACK_URL = SUPABASE_URL ? `${SUPABASE_URL}/functions/v1/nexlab-google-calendar` : "";

const service = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "cache-control": "no-store",
};
const JSON_HEADERS = { ...CORS, "content-type": "application/json; charset=utf-8" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}
function safeMessage(error, fallback = "Erro inesperado.") {
  return String(error?.message || error || fallback).slice(0, 1600);
}
function b64url(bytes) {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return b64url(bytes);
}
async function sha256Hex(value) {
  const bytes = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function normalizeStatus(value) {
  return String(value || "").trim().toLocaleLowerCase("pt-BR");
}
function addDays(dateKey, days) {
  const [y, m, d] = String(dateKey).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}
function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function cleanTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function timedRange(dateKey, startRaw, endRaw) {
  const start = cleanTime(startRaw);
  if (!start) return null;
  const [sh, sm] = start.split(":").map(Number);
  let end = cleanTime(endRaw);
  let endDate = dateKey;
  if (!end) {
    let total = sh * 60 + sm + 60;
    if (total >= 1440) {
      total -= 1440;
      endDate = addDays(dateKey, 1);
    }
    end = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  } else {
    const [eh, em] = end.split(":").map(Number);
    if (eh * 60 + em <= sh * 60 + sm) endDate = addDays(dateKey, 1);
  }
  return {
    start: { dateTime: `${dateKey}T${start}:00`, timeZone: TIME_ZONE },
    end: { dateTime: `${endDate}T${end}:00`, timeZone: TIME_ZONE },
  };
}
function allDayRange(dateKey) {
  return { start: { date: dateKey }, end: { date: addDays(dateKey, 1) } };
}
function configured() {
  return Boolean(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && CALLBACK_URL && SERVICE_KEY && PUBLISHABLE_KEY);
}
function userClient(authHeader) {
  return createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
}
async function requireInternal(req) {
  const supplied = String(req.headers.get("x-nexlab-backup-secret") || "");
  if (!supplied) return false;
  const { data, error } = await service.rpc("nexlab_verify_backup_internal_secret_v1", { p_secret: supplied });
  if (error) throw error;
  return data === true;
}
async function requireUser(req) {
  const authHeader = String(req.headers.get("authorization") || "");
  const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return null;
  const { data, error } = await service.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  const { data: profile } = await service
    .from("profiles")
    .select("id,ativo,role_request_status,is_test_account,temporary_until")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile || accountExpired(profile) || profile.ativo === false) return null;
  if (!["approved", "auto_approved"].includes(String(profile.role_request_status || "approved"))) return null;
  return { id: data.user.id, token, authHeader, email: data.user.email || null };
}
function safeReturnUrl(value, origin) {
  try {
    const u = new URL(String(value || ""));
    const requestOrigin = String(origin || "");
    if (!["http:", "https:"].includes(u.protocol)) return "";
    if (!requestOrigin || u.origin !== requestOrigin) return "";
    u.hash = "";
    return u.toString();
  } catch {
    return "";
  }
}
function appendResult(url, result, message = "") {
  try {
    const out = new URL(url);
    out.searchParams.set("nexlabTab", "configuracoes");
    out.searchParams.set("nexlabSettings", "integrations");
    out.searchParams.set("googleCalendar", result);
    if (message) out.searchParams.set("googleCalendarMessage", message.slice(0, 240));
    return out.toString();
  } catch {
    return url;
  }
}
async function readRefreshToken(userId) {
  const { data, error } = await service.rpc("nexlab_google_read_refresh_token_v1", { p_user_id: userId });
  if (error) throw error;
  return String(data || "");
}
async function storeRefreshToken(userId, token) {
  const { data, error } = await service.rpc("nexlab_google_store_refresh_token_v1", {
    p_user_id: userId,
    p_refresh_token: token,
  });
  if (error) throw error;
  return String(data || "");
}
async function deleteRefreshToken(userId) {
  const { error } = await service.rpc("nexlab_google_delete_refresh_token_v1", { p_user_id: userId });
  if (error) throw error;
}
async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: CALLBACK_URL,
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || "O Google recusou a autorização.");
  return data;
}
async function refreshAccessToken(userId) {
  const refreshToken = await readRefreshToken(userId);
  if (!refreshToken) throw new Error("A conexão com o Google precisa ser refeita.");
  const body = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || "Não foi possível renovar o acesso ao Google Calendar.");
  return String(data.access_token);
}
async function googleUserInfo(accessToken) {
  const res = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return await res.json().catch(() => ({}));
}
async function googleFetch(accessToken, path, init = {}) {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  return { res, body, text };
}
async function googleEventId(userId, sourceType, sourceId) {
  const digest = await sha256Hex(`${userId}:${sourceType}:${sourceId}`);
  return `nl${digest.slice(0, 50)}`;
}
function buildDescription(item, label) {
  const base = String(item?.descricao || "").trim();
  const marker = `Origem: NexLab • ${label}`;
  return base ? `${base}\n\n${marker}` : marker;
}
async function normalizeAgenda(data, userId) {
  const items = [];
  for (const e of Array.isArray(data?.events) ? data.events : []) {
    if (!e?.id || !e?.data) continue;
    const range = timedRange(e.data, e.horario || e.hora, e.hora_fim) || allDayRange(e.data);
    items.push({
      sourceType: "event",
      sourceId: String(e.id),
      sourceDate: String(e.data),
      payload: {
        summary: String(e.titulo || "Evento NexLab"),
        description: buildDescription(e, "Evento"),
        location: e.local || undefined,
        ...range,
        extendedProperties: { private: { nexlab_source_type: "event", nexlab_source_id: String(e.id) } },
      },
    });
  }
  for (const e of Array.isArray(data?.meetings) ? data.meetings : []) {
    const status = normalizeStatus(e?.status || "agendada");
    if (!e?.id || !e?.data || e?.cancelada_em || ["cancelada", "cancelado", "cancelled"].includes(status)) continue;
    const range = timedRange(e.data, e.horario || e.hora, e.hora_fim) || allDayRange(e.data);
    items.push({
      sourceType: "meeting",
      sourceId: String(e.id),
      sourceDate: String(e.data),
      payload: {
        summary: String(e.titulo || e.title || "Reunião NexLab"),
        description: buildDescription(e, "Reunião"),
        location: e.local || undefined,
        ...range,
        extendedProperties: { private: { nexlab_source_type: "meeting", nexlab_source_id: String(e.id) } },
      },
    });
  }
  for (const e of Array.isArray(data?.reservations) ? data.reservations : []) {
    const status = normalizeStatus(e?.status || "");
    if (!e?.id || !e?.data || !["aprovada", "approved"].includes(status)) continue;
    const range = timedRange(e.data, e.hora_inicio, e.hora_fim) || allDayRange(e.data);
    items.push({
      sourceType: "reservation",
      sourceId: String(e.id),
      sourceDate: String(e.data),
      payload: {
        summary: String(e.titulo || e.finalidade || "Reserva NexLab"),
        description: buildDescription(e, "Reserva"),
        location: e.sala_nome || e.local || undefined,
        ...range,
        extendedProperties: { private: { nexlab_source_type: "reservation", nexlab_source_id: String(e.id) } },
      },
    });
  }
  for (const item of items) {
    item.googleEventId = await googleEventId(userId, item.sourceType, item.sourceId);
    item.sourceHash = await sha256Hex(JSON.stringify(item.payload));
  }
  return items;
}
async function upsertGoogleEvent(accessToken, calendarId, item, exists) {
  const encodedCalendar = encodeURIComponent(calendarId || "primary");
  const encodedEvent = encodeURIComponent(item.googleEventId);
  if (exists) {
    const updated = await googleFetch(accessToken, `/calendars/${encodedCalendar}/events/${encodedEvent}`, {
      method: "PUT",
      body: JSON.stringify(item.payload),
    });
    if (updated.res.ok) return "updated";
    if (updated.res.status !== 404 && updated.res.status !== 410) {
      throw new Error(updated.body?.error?.message || `Google Calendar retornou HTTP ${updated.res.status}.`);
    }
  }
  const created = await googleFetch(accessToken, `/calendars/${encodedCalendar}/events`, {
    method: "POST",
    body: JSON.stringify({ id: item.googleEventId, ...item.payload }),
  });
  if (created.res.ok) return "created";
  if (created.res.status === 409) {
    const retry = await googleFetch(accessToken, `/calendars/${encodedCalendar}/events/${encodedEvent}`, {
      method: "PUT",
      body: JSON.stringify(item.payload),
    });
    if (retry.res.ok) return "updated";
    throw new Error(retry.body?.error?.message || "Não foi possível atualizar um evento já existente no Google Calendar.");
  }
  throw new Error(created.body?.error?.message || `Google Calendar retornou HTTP ${created.res.status}.`);
}
async function deleteGoogleEvent(accessToken, calendarId, googleEventId) {
  const encodedCalendar = encodeURIComponent(calendarId || "primary");
  const encodedEvent = encodeURIComponent(googleEventId);
  const out = await googleFetch(accessToken, `/calendars/${encodedCalendar}/events/${encodedEvent}`, { method: "DELETE" });
  if (out.res.ok || out.res.status === 404 || out.res.status === 410) return true;
  throw new Error(out.body?.error?.message || `Não foi possível remover um evento antigo do Google Calendar (HTTP ${out.res.status}).`);
}
async function handleCallback(req) {
  const url = new URL(req.url);
  const state = String(url.searchParams.get("state") || "");
  const code = String(url.searchParams.get("code") || "");
  const googleError = String(url.searchParams.get("error") || "");
  if (!state) return new Response("Estado OAuth ausente.", { status: 400 });
  const stateHash = await sha256Hex(state);
  const { data: stateRow, error: stateError } = await service
    .from("nexlab_google_calendar_oauth_states")
    .delete()
    .eq("state_hash", stateHash)
    .select("user_id,return_url,expires_at")
    .maybeSingle();
  if (stateError || !stateRow) return new Response("Solicitação OAuth inválida ou já utilizada.", { status: 400 });
  const returnUrl = String(stateRow.return_url || "");
  if (new Date(stateRow.expires_at).getTime() < Date.now()) {
    return Response.redirect(appendResult(returnUrl, "error", "A autorização expirou. Tente novamente."), 303);
  }
  if (googleError) {
    return Response.redirect(appendResult(returnUrl, "cancelled", "A conexão com o Google Calendar foi cancelada."), 303);
  }
  if (!configured() || !code) {
    return Response.redirect(appendResult(returnUrl, "error", "A integração do Google Calendar ainda não está configurada no servidor."), 303);
  }
  try {
    const tokenData = await exchangeCode(code);
    const existingToken = tokenData.refresh_token ? "" : await readRefreshToken(stateRow.user_id).catch(() => "");
    const refreshToken = String(tokenData.refresh_token || existingToken || "");
    if (!refreshToken) throw new Error("O Google não forneceu um refresh token. Reconecte a conta e autorize novamente.");
    const secretId = await storeRefreshToken(stateRow.user_id, refreshToken);
    const info = await googleUserInfo(String(tokenData.access_token));
    const now = new Date().toISOString();
    const { error } = await service.from("nexlab_google_calendar_connections").upsert({
      user_id: stateRow.user_id,
      google_subject: info?.sub ? String(info.sub) : null,
      google_email: info?.email ? String(info.email) : null,
      calendar_id: "primary",
      refresh_secret_id: secretId || null,
      scopes: String(tokenData.scope || GOOGLE_SCOPE).split(/\s+/).filter(Boolean),
      status: "connected",
      last_error: null,
      connected_at: now,
      updated_at: now,
    }, { onConflict: "user_id" });
    if (error) throw error;
    return Response.redirect(appendResult(returnUrl, "connected"), 303);
  } catch (error) {
    await service.from("nexlab_google_calendar_connections").upsert({
      user_id: stateRow.user_id,
      status: "error",
      last_error: safeMessage(error),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" }).catch(() => {});
    return Response.redirect(appendResult(returnUrl, "error", safeMessage(error)), 303);
  }
}
async function handleAuthorize(req, user, body) {
  if (!configured()) return json({
    ok: false,
    error: "google_oauth_not_configured",
    message: "As credenciais OAuth do Google Calendar ainda não foram cadastradas no servidor.",
    callback_url: CALLBACK_URL,
  }, 503);
  const origin = String(req.headers.get("origin") || "");
  const returnUrl = safeReturnUrl(body?.return_url, origin);
  if (!returnUrl) return json({ ok: false, error: "invalid_return_url" }, 400);
  const state = randomState();
  const stateHash = await sha256Hex(state);
  const now = new Date();
  const expires = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  await service.from("nexlab_google_calendar_oauth_states").delete().lt("expires_at", now.toISOString());
  await service.from("nexlab_google_calendar_oauth_states").delete().eq("user_id", user.id);
  const { error } = await service.from("nexlab_google_calendar_oauth_states").insert({
    state_hash: stateHash,
    user_id: user.id,
    return_url: returnUrl,
    request_origin: origin || null,
    expires_at: expires,
  });
  if (error) throw error;
  const auth = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  auth.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  auth.searchParams.set("redirect_uri", CALLBACK_URL);
  auth.searchParams.set("response_type", "code");
  auth.searchParams.set("scope", GOOGLE_SCOPE);
  auth.searchParams.set("access_type", "offline");
  auth.searchParams.set("include_granted_scopes", "true");
  auth.searchParams.set("prompt", "consent");
  auth.searchParams.set("state", state);
  if (user.email) auth.searchParams.set("login_hint", user.email);
  return json({ ok: true, authorization_url: auth.toString(), callback_url: CALLBACK_URL });
}
async function handleStatus(user) {
  const { data, error } = await service
    .from("nexlab_google_calendar_connections")
    .select("google_email,calendar_id,status,last_sync_at,last_error,connected_at,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;
  return json({
    ok: true,
    configured: configured(),
    connected: Boolean(data && data.status === "connected"),
    connection: data || null,
    callback_url: CALLBACK_URL,
    scope: "calendar.events",
    direction: "nexlab_to_google",
  });
}
async function handleSync(user, body) {
  if (!configured()) return json({ ok: false, error: "google_oauth_not_configured" }, 503);
  const { data: connection, error: connectionError } = await service
    .from("nexlab_google_calendar_connections")
    .select("calendar_id,status")
    .eq("user_id", user.id)
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection || connection.status !== "connected") return json({ ok: false, error: "google_not_connected" }, 409);

  const accessToken = await refreshAccessToken(user.id);
  const start = todayKey();
  const requestedDays = Math.min(120, Math.max(30, Number(body?.range_days || 120)));
  const end = addDays(start, requestedDays);
  let agenda = null;
  let agendaError = null;
  if (body?.internal_user_context === true) {
    const result = await service.rpc("nexlab_get_agenda_range_for_user_internal_v1", {
      p_user_id: user.id,
      p_date_from: start,
      p_date_to: end,
    });
    agenda = result.data;
    agendaError = result.error;
  } else {
    const client = userClient(user.authHeader);
    const result = await client.rpc("nexlab_get_agenda_range_v263040", {
      p_date_from: start,
      p_date_to: end,
    });
    agenda = result.data;
    agendaError = result.error;
  }
  if (agendaError) throw agendaError;
  if (!agenda?.ok) throw new Error(agenda?.error || "A Agenda do NexLab não confirmou os dados para sincronização.");

  const items = await normalizeAgenda(agenda, user.id);
  const activeKeys = new Set(items.map((x) => `${x.sourceType}:${x.sourceId}`));
  const { data: maps, error: mapsError } = await service
    .from("nexlab_google_calendar_event_map")
    .select("source_type,source_id,source_date,google_event_id,source_hash")
    .eq("user_id", user.id)
    .gte("source_date", start)
    .lte("source_date", end);
  if (mapsError) throw mapsError;
  const mapByKey = new Map((maps || []).map((m) => [`${m.source_type}:${m.source_id}`, m]));

  const counters = { created: 0, updated: 0, unchanged: 0, deleted: 0, failed: 0 };
  const failures = [];
  for (const item of items) {
    const key = `${item.sourceType}:${item.sourceId}`;
    const previous = mapByKey.get(key);
    if (previous?.source_hash === item.sourceHash && previous?.google_event_id === item.googleEventId) {
      counters.unchanged++;
      continue;
    }
    try {
      const result = await upsertGoogleEvent(accessToken, connection.calendar_id || "primary", item, Boolean(previous));
      if (result === "created") counters.created++;
      else counters.updated++;
      const { error } = await service.from("nexlab_google_calendar_event_map").upsert({
        user_id: user.id,
        source_type: item.sourceType,
        source_id: item.sourceId,
        source_date: item.sourceDate,
        google_event_id: item.googleEventId,
        source_hash: item.sourceHash,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: "user_id,source_type,source_id" });
      if (error) throw error;
    } catch (error) {
      counters.failed++;
      failures.push({ source_type: item.sourceType, source_id: item.sourceId, error: safeMessage(error) });
    }
  }

  const status = agenda?.source_status || {};
  const canDeleteType = (type) => {
    const sourceName = type === "event" ? "events" : type === "meeting" ? "meetings" : "reservations";
    return String(status?.[sourceName] || "ok") !== "error";
  };
  for (const previous of maps || []) {
    const key = `${previous.source_type}:${previous.source_id}`;
    if (activeKeys.has(key) || !canDeleteType(previous.source_type)) continue;
    try {
      await deleteGoogleEvent(accessToken, connection.calendar_id || "primary", previous.google_event_id);
      await service.from("nexlab_google_calendar_event_map")
        .delete()
        .eq("user_id", user.id)
        .eq("source_type", previous.source_type)
        .eq("source_id", previous.source_id);
      counters.deleted++;
    } catch (error) {
      counters.failed++;
      failures.push({ source_type: previous.source_type, source_id: previous.source_id, error: safeMessage(error) });
    }
  }

  const now = new Date().toISOString();
  const lastError = failures.length ? `${failures.length} item(ns) não sincronizado(s).` : null;
  await service.from("nexlab_google_calendar_connections").update({
    status: "connected",
    last_sync_at: now,
    last_error: lastError,
    updated_at: now,
  }).eq("user_id", user.id);

  return json({
    ok: failures.length === 0,
    partial: failures.length > 0,
    range: { from: start, to: end },
    counters,
    failures: failures.slice(0, 10),
  }, failures.length ? 207 : 200);
}
async function handleDisconnect(user) {
  const token = await readRefreshToken(user.id).catch(() => "");
  if (token) {
    try {
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
      });
    } catch {}
  }
  await deleteRefreshToken(user.id).catch(() => {});
  await service.from("nexlab_google_calendar_event_map").delete().eq("user_id", user.id);
  await service.from("nexlab_google_calendar_oauth_states").delete().eq("user_id", user.id);
  await service.from("nexlab_google_calendar_connections").delete().eq("user_id", user.id);
  return json({ ok: true, disconnected: true, existing_google_events_preserved: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  const url = new URL(req.url);
  if (req.method === "GET" && (url.searchParams.has("code") || url.searchParams.has("state") || url.searchParams.has("error"))) {
    return await handleCallback(req);
  }
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  let body = {};
  try { body = await req.json(); } catch {}
  const action = String(body?.action || "status").toLowerCase();

  if (action === "sync_internal") {
    const userId = String(body?.user_id || "").trim();
    try {
      if (!(await requireInternal(req))) return json({ ok: false, error: "authentication_required" }, 401);
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return json({ ok: false, error: "invalid_user_id" }, 400);
      }
      const { data: profile, error: profileError } = await service
        .from("profiles")
        .select("id,ativo,role_request_status,is_test_account,temporary_until")
        .eq("id", userId)
        .maybeSingle();
      if (profileError) throw profileError;
      if (!profile || accountExpired(profile) || profile.ativo === false || !["approved","auto_approved"].includes(String(profile.role_request_status || "approved"))) {
        return json({ ok: false, error: "user_not_approved" }, 403);
      }
      return await handleSync(
        { id: userId, token: "", authHeader: "", email: null },
        { ...body, internal_user_context: true }
      );
    } catch (error) {
      const message = safeMessage(error);
      if (userId) {
        await service.from("nexlab_google_calendar_connections").update({
          status: "error",
          last_error: message,
          updated_at: new Date().toISOString(),
        }).eq("user_id", userId).catch(() => {});
      }
      return json({ ok: false, error: "request_failed", message }, 500);
    }
  }

  const user = await requireUser(req);
  if (!user) return json({ ok: false, error: "authentication_required" }, 401);

  try {
    if (action === "status") return await handleStatus(user);
    if (action === "authorize") return await handleAuthorize(req, user, body);
    if (action === "sync") return await handleSync(user, body);
    if (action === "disconnect") return await handleDisconnect(user);
    return json({ ok: false, error: "unknown_action" }, 400);
  } catch (error) {
    const message = safeMessage(error);
    if (action === "sync") {
      await service.from("nexlab_google_calendar_connections").update({
        status: "error",
        last_error: message,
        updated_at: new Date().toISOString(),
      }).eq("user_id", user.id).catch(() => {});
    }
    return json({ ok: false, error: "request_failed", message }, 500);
  }
});

