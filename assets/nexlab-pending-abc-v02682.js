import {readMarketingPending} from "./nexlab-marketing-pending-v02682.js?v=app-beta-0-26-82-teste-resumos-pendencias";
import { g as React, o as jsxRuntime, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-teste-resumos-pendencias";
import { Do as ModuleHeader, Qn as loadPendingCenter, Jn as isPendingItem, Vn as readableError } from "./nexlab-runtime-shared.js?v=app-beta-0-26-82-teste-resumos-pendencias";
const { Fragment, jsx, jsxs } = jsxRuntime;
const PAGE_SIZE = 8;
const TYPE_LABELS = {
  marketing_campaign: "Marketing",
  assigned_task: "Tarefa",
  reservation: "Aprova\xE7\xE3o",
  profile_request: "Cadastro",
  feedback: "Feedback",
  overdue_project: "Projeto",
  asset_attention: "Patrim\xF4nio",
  meeting: "Reuni\xE3o",
  meeting_invitation: "Reuni\xE3o",
  communication_mention: "Men\xE7\xE3o",
  official_reply: "Resposta oficial"
};
const TYPE_MARKS = {
  marketing_campaign: "M",
  assigned_task: "T",
  reservation: "A",
  profile_request: "C",
  feedback: "F",
  overdue_project: "P",
  asset_attention: "PT",
  meeting: "R",
  meeting_invitation: "R",
  communication_mention: "@",
  official_reply: "\u21A9"
};
const PRIORITY_LABELS = {
  critica: "Urgente",
  alta: "Alta prioridade",
  media: "Aten\xE7\xE3o",
  baixa: "Normal"
};
function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(/* @__PURE__ */ new Date());
}
function dateKey(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  if (!match) return null;
  if (String(value).includes("T")) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Fortaleza", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed);
  }
  return match[1];
}
function formatDate(value) {
  const key = dateKey(value);
  if (!key) return null;
  const [year, month, day] = key.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");
}
function formatTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" });
}
function formatMeetingMode(value) {
  return { presencial: "Presencial", online: "Online", hibrido: "H\xEDbrida" }[String(value || "").toLowerCase()] || "Reuni\xE3o";
}
function validHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}
function scheduleOpenOriginRecord(recordId) {
  const id = String(recordId || "");
  if (!id) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const selector = `[data-nexlab-record-id="${globalThis.CSS?.escape ? CSS.escape(id) : id.replace(/["\\]/g, "")}"]`;
    const candidates = Array.from(document.querySelectorAll(selector));
    const card = candidates.find((node) => node instanceof HTMLElement && node.offsetParent !== null) || candidates[0];
    if (card) {
      const buttons = Array.from(card.querySelectorAll("button"));
      const details = buttons.find((button) => /ver detalhes|detalhes/i.test(String(button.textContent || button.getAttribute("aria-label") || button.title || "")));
      if (details) details.click();
      else if (card instanceof HTMLButtonElement || card.getAttribute("role") === "button") card.click();
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 30) window.clearInterval(timer);
  }, 180);
}
function normalizeMeetingRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const needsResponse = Boolean(row?.needs_response);
    const reconfirm = Boolean(row?.needs_reconfirmation);
    const time = formatTime(row?.inicio);
    const date = formatDate(row?.inicio);
    const mode = formatMeetingMode(row?.formato);
    const where = row?.location_name || (row?.formato === "online" ? "Link da reuni\xE3o" : null);
    const description = [row?.is_today ? time ? `Hoje \xE0s ${time}` : "Hoje" : [date, time].filter(Boolean).join(" \xE0s "), mode, where].filter(Boolean).join(" \u2022 ");
    const participantStatus = String(row?.participant_status || "").toLowerCase();
    const statusLabel = reconfirm ? "Reconfirma\xE7\xE3o necess\xE1ria" : needsResponse ? "Aguardando resposta" : participantStatus === "indeciso" ? "Participa\xE7\xE3o indecisa" : participantStatus === "confirmado" ? "Participa\xE7\xE3o confirmada" : row?.is_organizer ? "Voc\xEA organiza esta reuni\xE3o" : "Reuni\xE3o pr\xF3xima";
    return {
      id: `meeting-${row?.meeting_id || row?.booking_id}`,
      kind: needsResponse ? "meeting_invitation" : "meeting",
      title: row?.title || "Reuni\xE3o",
      description: description || row?.description || "Compromisso de reuni\xE3o",
      priority: reconfirm || needsResponse ? "alta" : row?.is_today ? "media" : "baixa",
      date: row?.inicio || null,
      createdAt: row?.inicio || null,
      ownerId: row?.organizer_id || null,
      ownerName: row?.organizer_name || null,
      statusLabel,
      navigationTarget: "reserva",
      metadata: {
        recordId: row?.meeting_id || row?.booking_id,
        bookingId: row?.booking_id || null,
        startAt: row?.inicio || null,
        endAt: row?.fim || null,
        format: row?.formato || null,
        locationName: row?.location_name || null,
        onlineLink: validHttpUrl(row?.link_online),
        organizerId: row?.organizer_id || null,
        participantStatus,
        invitationRevision: row?.invitation_revision || null,
        respondedRevision: row?.responded_revision || null,
        needsResponse,
        needsReconfirmation: reconfirm,
        canRespond: Boolean(row?.can_respond),
        isOrganizer: Boolean(row?.is_organizer),
        isParticipant: Boolean(row?.is_participant)
      }
    };
  });
}
function normalizeApprovalRows(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const kind = row?.kind === "profile_request" ? "profile_request" : "reservation";
    const recordId = row?.id || row?.record_id || row?.booking_id;
    return {
      id: `${kind === "profile_request" ? "profile" : "reservation"}-${recordId}`,
      kind,
      title: row?.title || (kind === "profile_request" ? "Solicita\xE7\xE3o de perfil" : "Solicita\xE7\xE3o de reserva"),
      description: row?.description || "Solicita\xE7\xE3o aguardando sua decis\xE3o.",
      priority: row?.is_overdue ? "critica" : "alta",
      date: row?.date || null,
      createdAt: row?.created_at || row?.date || null,
      ownerId: row?.owner_id || null,
      ownerName: row?.owner_name || null,
      statusLabel: row?.status_label || "Aguardando aprova\xE7\xE3o",
      navigationTarget: row?.navigation_target || (kind === "profile_request" ? "participantes" : "reserva"),
      metadata: {
        recordId,
        bookingId: row?.booking_id || null,
        approvalType: row?.approval_type || (kind === "profile_request" ? "profile" : "reservation"),
        isOverdue: Boolean(row?.is_overdue),
        canApprove: true,
        requiresRejectionReason: Boolean(row?.requires_rejection_reason)
      }
    };
  });
}
function normalizeCommunicationRows(rows) {
  return (Array.isArray(rows) ? rows : []).filter((row) => String(row?.entity_type || "").toLowerCase() !== "team").map((row) => {
    const kind = row?.kind === "official_reply" ? "official_reply" : "communication_mention";
    const entityType = String(row?.entity_type || "").toLowerCase();
    const recordId = row?.entity_id || null;
    const actorName = row?.actor_name || null;
    const destination = "projetos";
    return {
      id: `communication-${row?.notification_id || recordId || Math.random().toString(36).slice(2)}`,
      kind,
      title: row?.title || (kind === "official_reply" ? "Seu coment\xE1rio recebeu uma resposta" : "Voc\xEA foi mencionado"),
      description: row?.message || "Abra os coment\xE1rios do projeto para responder.",
      priority: String(row?.priority || "alta").toLowerCase() === "normal" ? "media" : "alta",
      date: null,
      createdAt: row?.created_at || null,
      ownerId: row?.actor_id || null,
      ownerName: actorName,
      statusLabel: kind === "official_reply" ? "Resposta ainda n\xE3o lida" : "Men\xE7\xE3o ainda n\xE3o lida",
      navigationTarget: destination,
      metadata: {
        notificationId: row?.notification_id || null,
        recordId,
        entityType,
        contentId: row?.content_id || null,
        communicationEvent: row?.communication_event || null,
        openSection: row?.open_section || "comments"
      }
    };
  });
}
function isTask(item) {
  return item?.kind === "assigned_task";
}
function isMeeting(item) {
  return item?.kind === "meeting" || item?.kind === "meeting_invitation";
}
function isApproval(item) {
  return item?.kind === "reservation" || item?.kind === "profile_request";
}
function isCommunication(item) {
  return item?.kind === "communication_mention" || item?.kind === "official_reply";
}
function isOverdue(item) {
  if (item?.metadata?.isOverdue) return true;
  if (item?.kind === "overdue_project") return true;
  const key = dateKey(item?.date);
  return Boolean(key && key < todayKey() && isTask(item));
}
function isToday(item) {
  if (isCommunication(item)) return false;
  return dateKey(item?.date) === todayKey();
}
function tabMatches(item, tab) {
  if (tab === "tasks") return isTask(item);
  if (tab === "meetings") return isMeeting(item);
  if (tab === "approvals") return isApproval(item);
  if (tab === "overdue") return isOverdue(item);
  return true;
}
function contextualText(item) {
  if (isTask(item)) {
    if (item.metadata?.originType === "team") return item.description || "Tarefa vinculada a uma equipe";
    return item.description || "Tarefa vinculada a um projeto";
  }
  if (isMeeting(item)) return item.description || "Reuni\xE3o que exige sua aten\xE7\xE3o";
  if (isCommunication(item)) return item.description || "Comunica\xE7\xE3o direta que pode exigir sua resposta";
  return item.description || "Registro que exige sua aten\xE7\xE3o";
}
function emptyCopy(tab) {
  if (tab === "tasks") return ["Nenhuma tarefa pendente", "As tarefas atribu\xEDdas a voc\xEA aparecer\xE3o aqui."];
  if (tab === "meetings") return ["Nenhuma reuni\xE3o exige aten\xE7\xE3o", "Convites e compromissos que precisam de resposta aparecer\xE3o aqui."];
  if (tab === "approvals") return ["Nenhuma aprova\xE7\xE3o pendente", "N\xE3o existem solicita\xE7\xF5es aguardando sua decis\xE3o."];
  if (tab === "overdue") return ["Nenhum item atrasado", "Voc\xEA n\xE3o possui obriga\xE7\xF5es vencidas em aberto."];
  return ["Seu dia est\xE1 em ordem", "Voc\xEA n\xE3o possui a\xE7\xF5es pendentes para agora."];
}
const ICON_PATHS = { search: "M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0", calendar: "M4 5h16v16H4ZM8 2v6m8-6v6M4 10h16M8 14h2m4 0h2m-8 3h2", clock: "M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", alert: "m12 3 10 18H2Zm0 5v6m0 3h.01", check: "m8 12 3 3 6-7M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0", folder: "M3 5h6l2 3h10v13H3Z", document: "M5 2h10l5 5v15H5Zm10 0v6h5M8 13h8m-8 4h6", shield: "m12 2 8 4v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6", down: "m6 9 6 6 6-6", up: "m6 15 6-6 6 6", left: "m14 6-6 6 6 6", right: "m9 6 6 6-6 6", more: "M12 4h.01M12 12h.01M12 20h.01", filter: "M3 5h18l-7 8v7l-4-2v-5Z", close: "m6 6 12 12M6 18 18 6", refresh: "M20 7v5h-5M4 17v-5h5m-5 0a8 8 0 0 1 14-6l2 1m0 5a8 8 0 0 1-14 6l-2-1" };
ICON_PATHS.refresh="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8 M21 3v5h-5 M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16 M8 16H3v5";
function Icon({ name, className = "" }) {
  return /* @__PURE__ */ React.createElement("svg", { className, viewBox: "0 0 24 24", "aria-hidden": "true" }, /* @__PURE__ */ React.createElement("path", { d: ICON_PATHS[name] || ICON_PATHS.document }));
}
const GROUPS = { late: { title: "Atrasados", metric: "Atrasados", hint: "Resolva primeiro o que j\xE1 passou do prazo.", icon: "alert", badge: "Atrasado" }, today: { title: "Hoje", metric: "Vence hoje", hint: "Itens com prazo ou compromisso para hoje.", icon: "clock", badge: "Vence hoje" }, soon: { title: "Pr\xF3ximos", metric: "Pr\xF3ximos 7 dias", hint: "Compromissos e prazos dos pr\xF3ximos 7 dias.", icon: "calendar", badge: "Pr\xF3ximo" }, later: { title: "Mais adiante", metric: "Depois de 7 dias", hint: "Pend\xEAncias com prazo a partir da pr\xF3xima semana.", icon: "check", badge: "No prazo" }, other: { title: "Aguardando sua a\xE7\xE3o", hint: "Registros sem prazo definido que precisam de aten\xE7\xE3o.", icon: "document", badge: "Aguardando a\xE7\xE3o" } };
function calendarAfter(key, days) {
  const d = /* @__PURE__ */ new Date(key + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function itemGroup(item) {
  if (isOverdue(item)) return "late";
  const key = dateKey(item.date);
  if (!key || isCommunication(item)) return "other";
  if (key === todayKey()) return "today";
  return key > todayKey() && key <= calendarAfter(todayKey(), 7) ? "soon" : "later";
}
function actualPriority(item) {
  return item.metadata?.taskPriority || { critica: "urgente", alta: "alta", media: "normal", baixa: "baixa" }[item.priority] || "normal";
}
function fullDate(value) {
  const key = dateKey(value);
  return key ? key.split("-").reverse().join("/") : "Sem prazo definido";
}
function mayApprove(item, caps) {
  return Boolean(item.metadata?.canApprove && (item.kind === "reservation" ? caps?.reservations : item.kind === "profile_request" ? caps?.profiles : false));
}
const dedupe = (rows) => [...new Map(rows.filter(Boolean).map((item) => [String(item.id), item])).values()];
function enrichBase(response) {
  const assets = new Map((response.assets || []).map(a=>[String(a.id),a]));
  const source = new Map((response.tasks || []).map((t) => [String(t.id), t]));
  return (response.items || []).map((item) => {
    if(item.kind==="asset_attention"){const a=assets.get(String(item.metadata?.recordId));return {...item,metadata:{...item.metadata,assetCode:a?.codigo_patrimonial||null}};}
    const raw = source.get(String(item.metadata?.recordId));
    return !isTask(item) || !raw ? item : { ...item, metadata: { ...item.metadata, taskPriority: raw.priority || null, taskStatus: raw.status || null, taskDescription: raw.description || null, originName: raw.team_name || raw.project_name || null } };
  });
}
async function allPending(profile, isCurrent) {
  let response = await loadPendingCenter(profile, { page: 1, pageSize: 25 });
  let items = enrichBase(response), warnings = [...response.warnings || []], page = 1;
  while (response.pagination?.has_more) {
    if (!isCurrent()) return null;
    const next = await loadPendingCenter(profile, { page: ++page, pageSize: 25 });
    const merged = dedupe([...items, ...enrichBase(next)]);
    if (merged.length === items.length && next.pagination?.has_more) throw new Error("O carregamento das pr\xF3ximas p\xE1ginas n\xE3o avan\xE7ou. Tente atualizar as pend\xEAncias.");
    items = merged;
    warnings.push(...next.warnings || []);
    response = { ...next, partial: response.partial || next.partial };
  }
  return { ...response, items, warnings };
}
export async function readPendingSnapshot(current, isCurrent = () => true) {
const results = await Promise.allSettled([allPending(current, isCurrent), supabase.rpc("nexlab_get_my_day_meetings_v1", { p_horizon_days: 7 }), supabase.rpc("nexlab_get_my_day_approvals_v1"), supabase.rpc("nexlab_get_my_day_communication_v1", { p_limit: 20 }), readMarketingPending(supabase,current,todayKey(),isCurrent)]);
if (!isCurrent()) return;
const [base, meetings, approvals, communication, marketing] = results;
if (results.every((r) => r.status === "rejected" || r.value?.error || r.value?.skipped)) throw new Error("N\xE3o foi poss\xEDvel consultar as fontes de pend\xEAncias.");
const response = base.status === "fulfilled" && base.value ? base.value : { items: [], warnings: [], partial: true };
const warnings = [...response.warnings || []].filter((w) => ["tarefas", "tarefas_equipes", "projetos", "patrimonio", "feedbacks"].includes(String(w?.source || w || "").toLowerCase()));
if (base.status === "rejected") warnings.push({ source: "pendencias", label: "Pendências e alertas" });
const valid = (r) => r.status === "fulfilled" && !r.value?.error && r.value?.data?.ok;
let meetingItems = [], approvalItems = [], communicationItems = [], caps = { resolved: true, hasAny: false, reservations: false, profiles: false };
if (valid(meetings)) meetingItems = normalizeMeetingRows(meetings.value.data.meetings);
else warnings.push({ source: "reunioes", label: "Reuni\xF5es" });
if (valid(approvals)) {
  approvalItems = normalizeApprovalRows(approvals.value.data.approvals);
  const c = approvals.value.data.capabilities || {};
  caps = { resolved: true, hasAny: Boolean(c.has_any), reservations: Boolean(c.reservations), profiles: Boolean(c.profiles) };
} else warnings.push({ source: "aprovacoes", label: "Aprova\xE7\xF5es" });
if (valid(communication)) communicationItems = normalizeCommunicationRows(communication.value.data.items);
else warnings.push({ source: "comunicacao", label: "Men\xE7\xF5es e respostas" });
const baseItems = (response.items || []).filter((item) => isTask(item) || ["overdue_project", "asset_attention", "feedback"].includes(item.kind));
let marketingItems=[];
if(marketing.status==="fulfilled") marketingItems=(marketing.value.items||[]).map(item=>({...item,ownerName:item.ownerName||(response.responsibles||[]).find(p=>String(p.id)===String(item.ownerId))?.nome||null}));
else warnings.push({source:"marketing",label:"Marketing"});
let items2 = dedupe([...baseItems, ...meetingItems, ...approvalItems, ...communicationItems,...marketingItems]).filter(isPendingItem);
const missingCodes=items2.filter(item=>item.kind==="asset_attention"&&!item.metadata?.assetCode).map(item=>String(item.metadata?.recordId||""));
if(missingCodes.length&&current.effective_permissions?.includes("module_patrimonio")){
 try{const result=await supabase.from("assets").select("id,codigo_patrimonial").in("id",missingCodes);if(!result.error&&Array.isArray(result.data)){const codes=new Map(result.data.map(a=>[String(a.id),a.codigo_patrimonial]));items2=items2.map(item=>item.kind!=="asset_attention"?item:{...item,metadata:{...item.metadata,assetCode:item.metadata?.assetCode||codes.get(String(item.metadata?.recordId))||null}});}}catch{}
}
if(!isCurrent())return;
const summary = { tasks: items2.filter(isTask).length, meetings: items2.filter(isMeeting).length, approvals: items2.filter(isApproval).length, overdue: items2.filter(isOverdue).length };
  return {ownerId:current.id,items:items2,warnings,partial:Boolean(response.partial || warnings.length),approvalCapabilities:caps,summary};
}
export async function readPendingCount(profile, {signal} = {}) {
  const snapshot=await readPendingSnapshot(profile,()=>!signal?.aborted);
  if(signal?.aborted) throw signal.reason || new DOMException('Atualização encerrada.','AbortError');
  if(snapshot.partial) throw new Error('O servidor não confirmou todas as fontes de pendências.');
  return snapshot.items.length;
}
function ItemActions({ item, busy, profile, caps, onComplete, onMeetingResponse, onMeetingLink, onReservation, onProfile, onFeedback, onOpen, onDetail, detailed = false }) {
  const responsible = String(item.ownerId || "") === String(profile?.id || "");
  return /* @__PURE__ */ React.createElement(React.Fragment, null, isTask(item) && responsible && /* @__PURE__ */ React.createElement("button", { type: "button", className: "action complete", disabled: busy, onClick: () => onComplete(item) }, /* @__PURE__ */ React.createElement(Icon, { name: "check" }), busy ? "Concluindo\u2026" : "Concluir"), isMeeting(item) && item.metadata?.needsResponse && item.metadata?.canRespond && /* @__PURE__ */ React.createElement(React.Fragment, null, detailed && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "action open", disabled: busy, onClick: () => onMeetingResponse(item, "recusado") }, "Recusar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "action open", disabled: busy, onClick: () => onMeetingResponse(item, "indeciso") }, "Indeciso")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "action confirm", disabled: busy, onClick: () => onMeetingResponse(item, "confirmado") }, /* @__PURE__ */ React.createElement(Icon, { name: "check" }), item.metadata?.needsReconfirmation ? "Reconfirmar" : "Confirmar")), isMeeting(item) && item.metadata?.onlineLink && !item.metadata?.needsResponse && /* @__PURE__ */ React.createElement("button", { type: "button", className: "action confirm", onClick: () => onMeetingLink(item) }, "Abrir link"), isApproval(item) && mayApprove(item, caps) && (detailed ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "action open", disabled: busy, onClick: () => item.kind === "reservation" ? onReservation(item, "recusada") : onProfile(item, false) }, "Recusar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "action complete", disabled: busy, onClick: () => item.kind === "reservation" ? onReservation(item, "aprovada") : onProfile(item, true) }, /* @__PURE__ */ React.createElement(Icon, { name: "check" }), "Aprovar")) : /* @__PURE__ */ React.createElement("button", { type: "button", className: "action review", disabled: busy, onClick: () => onDetail(item) }, /* @__PURE__ */ React.createElement(Icon, { name: "shield" }), "Analisar")), item.kind === "feedback" && caps?.hasAny && detailed && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { type: "button", className: "action open", disabled: busy, onClick: () => onFeedback(item, "archive") }, "Arquivar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "action complete", disabled: busy, onClick: () => onFeedback(item, "resolve") }, "Resolver")), /* @__PURE__ */ React.createElement("button", { type: "button", className: "action open", onClick: () => onOpen(item) }, /* @__PURE__ */ React.createElement(Icon, { name: "folder" }), isCommunication(item) ? "Abrir coment\xE1rio" : detailed ? "Abrir registro" : "Abrir"));
}
const PENDING_MODULE_ICONS={"package":[["path",{"d":"M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z","key":"1a0edw"}],["path",{"d":"M12 22V12","key":"d0xqtd"}],["polyline",{"points":"3.29 7 12 12 20.71 7","key":"ousv84"}],["path",{"d":"m7.5 4.27 9 5.15","key":"1c824w"}]],"megaphone":[["path",{"d":"M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z","key":"q8bfy3"}],["path",{"d":"M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14","key":"1853fq"}],["path",{"d":"M8 6v8","key":"15ugcq"}]],"folder-kanban":[["path",{"d":"M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z","key":"1fr9dc"}],["path",{"d":"M8 10v4","key":"tgpxqk"}],["path",{"d":"M12 10v2","key":"hh53o1"}],["path",{"d":"M16 10v6","key":"1d6xys"}]],"network":[["rect",{"x":"16","y":"16","width":"6","height":"6","rx":"1","key":"4q2zg0"}],["rect",{"x":"2","y":"16","width":"6","height":"6","rx":"1","key":"8cvhb9"}],["rect",{"x":"9","y":"2","width":"6","height":"6","rx":"1","key":"1egb70"}],["path",{"d":"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3","key":"1jsf9p"}],["path",{"d":"M12 12V8","key":"2874zd"}]],"users":[["path",{"d":"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2","key":"1yyitq"}],["path",{"d":"M16 3.128a4 4 0 0 1 0 7.744","key":"16gr8j"}],["path",{"d":"M22 21v-2a4 4 0 0 0-3-3.87","key":"kshegd"}],["circle",{"cx":"9","cy":"7","r":"4","key":"nufk8"}]],"calendar-clock":[["path",{"d":"M16 14v2.2l1.6 1","key":"fo4ql5"}],["path",{"d":"M16 2v4","key":"4m81vk"}],["path",{"d":"M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5","key":"1osxxc"}],["path",{"d":"M3 10h5","key":"r794hk"}],["path",{"d":"M8 2v4","key":"1cmpym"}],["circle",{"cx":"16","cy":"16","r":"6","key":"qoo3c4"}]],"message-square-text":[["path",{"d":"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z","key":"18887p"}],["path",{"d":"M7 11h10","key":"1twpyw"}],["path",{"d":"M7 15h6","key":"d9of3u"}],["path",{"d":"M7 7h8","key":"af5zfr"}]],"file-text":[["path",{"d":"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z","key":"1rqfz7"}],["path",{"d":"M14 2v4a2 2 0 0 0 2 2h4","key":"tnqrlb"}],["path",{"d":"M10 9H8","key":"b1mrlr"}],["path",{"d":"M16 13H8","key":"t4e002"}],["path",{"d":"M16 17H8","key":"z1uh3a"}]],"calendar-days":[["path",{"d":"M8 2v4","key":"1cmpym"}],["path",{"d":"M16 2v4","key":"4m81vk"}],["rect",{"width":"18","height":"18","x":"3","y":"4","rx":"2","key":"1hopcy"}],["path",{"d":"M3 10h18","key":"8toen8"}],["path",{"d":"M8 14h.01","key":"6423bh"}],["path",{"d":"M12 14h.01","key":"1etili"}],["path",{"d":"M16 14h.01","key":"1gbofw"}],["path",{"d":"M8 18h.01","key":"lrp35t"}],["path",{"d":"M12 18h.01","key":"mhygvu"}],["path",{"d":"M16 18h.01","key":"kzsmim"}]],"calendar-range":[["rect",{"width":"18","height":"18","x":"3","y":"4","rx":"2","key":"1hopcy"}],["path",{"d":"M16 2v4","key":"4m81vk"}],["path",{"d":"M3 10h18","key":"8toen8"}],["path",{"d":"M8 2v4","key":"1cmpym"}],["path",{"d":"M17 14h-6","key":"bkmgh3"}],["path",{"d":"M13 18H7","key":"bb0bb7"}],["path",{"d":"M7 14h.01","key":"1qa3f1"}],["path",{"d":"M17 18h.01","key":"1bdyru"}]],"inbox":[["polyline",{"points":"22 12 16 12 14 15 10 15 8 12 2 12","key":"o97t9d"}],["path",{"d":"M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z","key":"oot6mr"}]]};
const PENDING_MODULES={
 patrimonio:{label:'Patrimônio',icon:'package'},marketing:{label:'Marketing',icon:'megaphone'},projetos:{label:'Projetos',icon:'folder-kanban'},equipes:{label:'Equipes',icon:'network'},usuarios:{label:'Usuários',icon:'users'},reservas:{label:'Reservas e Reuniões',icon:'calendar-clock'},feedback:{label:'Feedback',icon:'message-square-text'},mural:{label:'Mural Interno',icon:'file-text'},eventos:{label:'Eventos',icon:'calendar-days'},agenda:{label:'Agenda',icon:'calendar-range'},outros:{label:'Pendência',icon:'inbox'}
};
function pendingModuleKey(item){if(item.kind==='marketing_campaign')return 'marketing';if(item.kind==='asset_attention')return 'patrimonio';if(isTask(item))return item.metadata?.originType==='team'?'equipes':'projetos';if(isMeeting(item)||item.kind==='reservation')return 'reservas';if(item.kind==='profile_request')return 'usuarios';const key={participantes:'usuarios',reserva:'reservas',inventario:'patrimonio'}[item.navigationTarget]||item.navigationTarget;return PENDING_MODULES[key]?key:'outros';}
function PendingModuleIcon({item}){const name=PENDING_MODULES[pendingModuleKey(item)].icon;return React.createElement('svg',{viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true},...(PENDING_MODULE_ICONS[name]||PENDING_MODULE_ICONS.inbox).map(([tag,attrs],i)=>React.createElement(tag,{...attrs,key:i})));}
function PendingTabs({tabs,activeTab,onChange}){
 const el=React.createElement;
 const activate=(event,id)=>{onChange(id);const menu=event.currentTarget.closest('details');if(menu)menu.open=false;};
 const keydown=e=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;e.preventDefault();const buttons=[...e.currentTarget.parentElement.querySelectorAll('button[role="tab"]')].filter(b=>b.getClientRects().length);const current=buttons.indexOf(e.currentTarget);const next=e.key==='Home'?0:e.key==='End'?buttons.length-1:(current+(e.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;buttons[next]?.click();buttons[next]?.focus();};
 const extra=tabs.slice(2),selected=extra.find(t=>t.id===activeTab);
 return el('div',{className:'tabs',role:'tablist','aria-label':'Tipo de pendência'},...tabs.map((tab,i)=>el('button',{type:'button',key:tab.id,className:'tab '+(i>1?'tab-extra ':'')+(activeTab===tab.id?'active':''),role:'tab','aria-selected':activeTab===tab.id,tabIndex:activeTab===tab.id?0:-1,'data-tab':tab.id,onClick:e=>activate(e,tab.id),onKeyDown:keydown},tab.label,el('span',{className:'count'},tab.count))),extra.length>0&&el('details',{className:'tab-more'},el('summary',{'aria-label':selected?'Categoria: '+selected.label+'. Outras categorias':'Outras categorias',className:selected?'active':''},selected?.label||'Mais',el(Icon,{name:'down'})),el('div',{className:'tab-more-options',role:'menu'},...extra.map(tab=>el('button',{key:tab.id,type:'button',role:'menuitem','aria-current':activeTab===tab.id?'page':undefined,onClick:e=>activate(e,tab.id)},tab.label,el('span',{className:'count'},tab.count))))));
}
function PendingSortSelect({value,onChange,className='sort-select'}){return React.createElement('select',{className,'aria-label':'Ordenar pendências',value,onChange:e=>onChange(e.target.value)},...[['deadline','Prazo mais próximo'],['recent','Mais recentes'],['priority','Maior prioridade'],['title','Título A–Z']].map(([value,label])=>React.createElement('option',{key:value,value},label)));}
function PendingRow({item,busy,...props}){
 const el=React.createElement,key=itemGroup(item),group=GROUPS[key],module=pendingModuleKey(item),info=PENDING_MODULES[module],formatted=formatDate(item.date);
 const asset=item.kind==='asset_attention',damaged=asset&&Number(item.metadata?.damaged)>0,maintenance=asset&&!damaged&&Number(item.metadata?.maintenance)>0;
 const status=damaged?'Danificado':maintenance?'Em manutenção':group.badge;
 const context=item.kind==='marketing_campaign'?item.metadata?.channel:item.metadata?.originName||'';
 const workflow=isTask(item)||isMeeting(item)||isApproval(item);
 return el('article',{className:'record '+key+(formatted?' has-date':'')+(workflow?' has-workflow':''),'data-nexlab-pending-id':item.id,'data-nexlab-pending-kind':item.kind,'data-module':module,'data-status':damaged?'damaged':maintenance?'maintenance':key},
  el('div',{className:'type-icon'},el(PendingModuleIcon,{item})),
  el('div',{className:'record-info'},el('div',{className:'record-top'},el('span',{className:'type-label'},info.label),asset&&item.metadata?.assetCode&&el('span',{className:'asset-code'},item.metadata.assetCode)),el('h3',null,el('button',{type:'button',className:'record-title',onClick:()=>props.onDetail(item)},item.title||'Item sem título')),(context||formatted)&&el('p',{className:'record-meta'},formatted&&el('span',{className:'mobile-date'},formatted,context?' · ':''),context)),
  el('span',{className:'status record-status'},status),
  formatted&&el('div',{className:'datebox due'},el(Icon,{name:'calendar'}),el('strong',null,formatted)),
  el('div',{className:'record-actions'},el(ItemActions,{item,busy,...props}),el('details',{className:'row-more'},el('summary',{'aria-label':'Mais opções de '+item.title},el(Icon,{name:'more'})),el('div',{className:'row-menu'},el('button',{type:'button',onClick:event=>{event.currentTarget.closest('details').open=false;props.onDetail(item);}},el(Icon,{name:'document'}),'Ver detalhes')))));
}

function PendingDetail({ item, onClose, ...props }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!item) return;
    const dialog = ref.current, previous = document.activeElement, overflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [item?.id]);
  if (!item) return null;
  const finish = (fn) => (...args) => {
    ref.current?.close();
    onClose();
    fn(...args);
  };
  const group = GROUPS[itemGroup(item)];
  return /* @__PURE__ */ React.createElement("dialog", { ref, className: "pending-dialog", onCancel: onClose, onClose, onClick: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, "aria-labelledby": "pending-detail-title" }, /* @__PURE__ */ React.createElement("div", { className: "drawer" }, /* @__PURE__ */ React.createElement("div", { className: "drawer-head" }, /* @__PURE__ */ React.createElement("h2", null, "Detalhes da pend\xEAncia"), /* @__PURE__ */ React.createElement("button", { className: "icon-btn", type: "button", "aria-label": "Fechar detalhes", onClick: onClose }, /* @__PURE__ */ React.createElement(Icon, { name: "close" }))), /* @__PURE__ */ React.createElement("div", { className: "drawer-body" }, /* @__PURE__ */ React.createElement("p", { className: "drawer-type" }, TYPE_LABELS[item.kind] || "Pend\xEAncia"), /* @__PURE__ */ React.createElement("h3", { className: "drawer-title", id: "pending-detail-title" }, item.title), /* @__PURE__ */ React.createElement("span", { className: "detail-tag " + itemGroup(item) }, group.badge), /* @__PURE__ */ React.createElement("dl", { className: "detail-list" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Respons\xE1vel"), /* @__PURE__ */ React.createElement("dd", null, item.ownerName || "N\xE3o informado")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Prazo"), /* @__PURE__ */ React.createElement("dd", null, fullDate(item.date), isMeeting(item) && formatTime(item.metadata?.startAt) ? " \xB7 " + formatTime(item.metadata.startAt) : "")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Prioridade"), /* @__PURE__ */ React.createElement("dd", null, { urgente: "Urgente", alta: "Alta", normal: "Normal", baixa: "Baixa" }[actualPriority(item)])), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Situa\xE7\xE3o"), /* @__PURE__ */ React.createElement("dd", null, item.statusLabel || "Pendente"))), /* @__PURE__ */ React.createElement("section", { className: "detail-section" }, /* @__PURE__ */ React.createElement("h3", null, "Informa\xE7\xF5es"), /* @__PURE__ */ React.createElement("p", null, item.metadata?.taskDescription || contextualText(item)))), /* @__PURE__ */ React.createElement("div", { className: "drawer-footer" }, /* @__PURE__ */ React.createElement(ItemActions, { item, ...props, detailed: true, onComplete: finish(props.onComplete), onMeetingResponse: finish(props.onMeetingResponse), onMeetingLink: finish(props.onMeetingLink), onReservation: finish(props.onReservation), onProfile: finish(props.onProfile), onFeedback: finish(props.onFeedback), onOpen: finish(props.onOpen) }))));
}
function PendingModuleAE({ profile, addToast, onNavigate, onCountChange }) {
  const [state, setState] = React.useState({ ownerId: profile?.id, items: [], warnings: [], partial: false, approvalCapabilities: { resolved: false, hasAny: false, reservations: false, profiles: false } });
  const [activeTab, setActiveTab] = React.useState(() => {
    try {
      return sessionStorage.getItem("nexlab.pending.active-tab") || "overview";
    } catch {
      return "overview";
    }
  });
  const [loading, setLoading] = React.useState(true), [refreshing, setRefreshing] = React.useState(false), [busyId, setBusyId] = React.useState(null), [error, setError] = React.useState(null);
  const [query, setQuery] = React.useState(""), [priority, setPriority] = React.useState("all"), [period, setPeriod] = React.useState("all"), [sort, setSort] = React.useState("deadline"), [page, setPage] = React.useState(1), [collapsed, setCollapsed] = React.useState({}), [filtersOpen, setFiltersOpen] = React.useState(false), [selectedId, setSelectedId] = React.useState(null);
  const [moduleFilter,setModuleFilter]=React.useState("all");
  const [pageSize,setPageSize]=React.useState(()=>globalThis.matchMedia?.("(max-width:640px)").matches?4:8);
  React.useEffect(()=>{const media=matchMedia("(max-width:640px)");const update=()=>setPageSize(media.matches?4:8);media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  const requestId = React.useRef(0), profileRef = React.useRef(profile), callbacks = React.useRef({ addToast, onCountChange }), filterRef = React.useRef(null), busyRef = React.useRef(false);
  profileRef.current = profile;
  callbacks.current = { addToast, onCountChange };
  const canApprove = Boolean(state.approvalCapabilities.hasAny);
  const refresh = React.useCallback(async ({ notify = false } = {}) => {
    const token = ++requestId.current, isCurrent = () => token === requestId.current;
    notify ? setRefreshing(true) : setLoading(true);
    try {
      const current = profileRef.current;
      const sessionResult = window.nexlabAuthSessionWithTimeout ? await window.nexlabAuthSessionWithTimeout(supabase.auth, 4500) : await supabase.auth.getSession();
      if (!isCurrent()) return;
      if (!current?.id || String(sessionResult?.data?.session?.user?.id || "") !== String(current.id)) throw new Error("Sua sess\xE3o expirou. Entre novamente para consultar as pend\xEAncias.");
      const snapshot = await readPendingSnapshot(current, isCurrent);
      if (!isCurrent()) return;
      setState(snapshot);
      setError(null);
      if (!snapshot.partial) callbacks.current.onCountChange?.(snapshot.items.length);
      try { globalThis.dispatchEvent(new CustomEvent("nexlab:myday-updated", { detail: {...snapshot.summary,approvalCapabilities:snapshot.approvalCapabilities} })); } catch {}
    } catch (cause) {
      if (!isCurrent()) return;
      const message = readableError(cause, "N\xE3o foi poss\xEDvel carregar as pend\xEAncias.");
      setError(message);
      if (notify) callbacks.current.addToast?.(message, "err");
    } finally {
      if (isCurrent()) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profile?.id, profile?.role, profile?.effective_permissions]);
  React.useEffect(() => {
    setState({ ownerId: profile?.id, items: [], warnings: [], partial: false, approvalCapabilities: { resolved: false, hasAny: false, reservations: false, profiles: false } });
    setSelectedId(null);
    setPage(1);
    setQuery("");
    setPriority("all");
    setPeriod("all");
    setModuleFilter("all");
    refresh();
    return () => {
      requestId.current++;
    };
  }, [profile?.id, refresh]);
  React.useEffect(() => {
    try {
      sessionStorage.setItem("nexlab.pending.active-tab", activeTab);
    } catch {
    }
  }, [activeTab]);
  React.useEffect(() => {
    if (!profile?.id) return;
    let timer;
    const unsubscribe = globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.subscribe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => refresh({ notify: true }), 450);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe?.();
    };
  }, [profile?.id, refresh]);
  React.useEffect(() => {
    if (state.approvalCapabilities.resolved && !canApprove && activeTab === "approvals") setActiveTab("overview");
  }, [activeTab, canApprove, state.approvalCapabilities.resolved]);
  React.useEffect(() => {
    const click = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFiltersOpen(false);
      document.querySelectorAll(".nxl-pending details[open]").forEach((d) => {
        if (!d.contains(e.target)) d.open = false;
      });
    };
    const key = (e) => {
      if (e.key === "Escape") {
        setFiltersOpen(false);
        document.querySelectorAll(".nxl-pending details[open]").forEach((d) => d.open = false);
      }
    };
    document.addEventListener("pointerdown", click);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", click);
      document.removeEventListener("keydown", key);
    };
  }, []);
  const items = state.ownerId === profile?.id ? state.items : [];
  const counts = React.useMemo(() => Object.fromEntries(Object.keys(GROUPS).map((key) => [key, items.filter((item) => itemGroup(item) === key).length])), [items]);
  const visible = React.useMemo(() => items.filter((item) => tabMatches(item, activeTab) && (moduleFilter==="all"||pendingModuleKey(item)===moduleFilter) && (period === "all" || itemGroup(item) === period) && (priority === "all" || actualPriority(item) === priority) && [item.title, item.description, item.ownerName, item.metadata?.originName, item.metadata?.assetCode].filter(Boolean).join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase())).sort((a, b) => {
    if (sort === "title") return String(a.title).localeCompare(String(b.title), "pt-BR");
    if (sort === "recent") return String(b.createdAt || "").localeCompare(String(a.createdAt || "")) || String(a.id).localeCompare(String(b.id));
    if (sort === "priority") {
      const ranks = { urgente: 0, alta: 1, normal: 2, baixa: 3 };
      const d = ranks[actualPriority(a)] - ranks[actualPriority(b)];
      if (d) return d;
    }
    return String(dateKey(a.date) || "9999").localeCompare(String(dateKey(b.date) || "9999")) || String(a.id).localeCompare(String(b.id));
  }), [items, activeTab, period, priority, query, sort, moduleFilter]);
  React.useEffect(() => setPage(1), [activeTab, query, priority, period, sort, moduleFilter, pageSize]);
  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize)), currentPage = Math.min(page, totalPages), start = (currentPage - 1) * pageSize, shown = visible.slice(start, start + pageSize);
  const detail = items.find((item) => item.id === selectedId);
  const runAction = React.useCallback(async (item, action) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusyId(item.id);
    try {
      await action();
      await refresh({ notify: false });
    } catch (cause) {
      addToast?.(readableError(cause, "N\xE3o foi poss\xEDvel atualizar esta pend\xEAncia."), "err");
    } finally {
      busyRef.current = false;
      setBusyId(null);
    }
  }, [busyId, refresh, addToast]);
  const completeTask = (item) => runAction(item, async () => {
    if (String(item.ownerId || "") !== String(profile?.id || "")) throw new Error("Somente o respons\xE1vel pode concluir esta tarefa.");
    const taskId = String(item.metadata?.recordId || "");
    const originType = String(item.metadata?.originType || "project");
    const teamId = String(item.metadata?.teamId || "");
    const projectId = String(item.metadata?.projectId || "");
    if (!taskId || (originType === "team" ? !teamId : !projectId)) throw new Error("A tarefa n\xE3o possui origem v\xE1lida.");
    const result = originType === "team" ? await supabase.rpc("nexlab_manage_team_task_v1", { p_team_id: teamId, p_action: "complete", p_task_id: taskId, p_title: null, p_description: null, p_responsible_id: null, p_deadline: null, p_priority: null, p_status: null }) : await supabase.rpc("nexlab_manage_project_task_v2690", { p_project_id: projectId, p_action: "toggle", p_task_id: taskId, p_title: null, p_responsible_id: null, p_done: true });
    if (result.error) throw result.error;
    if (!result.data?.ok) throw new Error("O servidor n\xE3o confirmou a conclus\xE3o da tarefa.");
    addToast?.("Tarefa conclu\xEDda.", "ok");
  });
  const respondMeeting = (item, response) => runAction(item, async () => {
    let note = null;
    if (response === "recusado") {
      note = await globalThis.nexlabMeetingDeclinePrompt?.();
      if (note == null && typeof globalThis.nexlabMeetingDeclinePrompt === "function") return;
    }
    const meetingId = item.metadata?.recordId;
    if (!meetingId) throw new Error("A reuni\xE3o n\xE3o possui origem v\xE1lida.");
    const { data, error: rpcError } = await supabase.rpc("nexlab_respond_meeting_invitation_v263042", { p_meeting_id: meetingId, p_response: response, p_response_note: note || null });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor n\xE3o confirmou a resposta ao convite.");
    addToast?.(response === "confirmado" ? item.metadata?.needsReconfirmation ? "Participa\xE7\xE3o reconfirmada." : "Participa\xE7\xE3o confirmada." : response === "indeciso" ? "Participa\xE7\xE3o marcada como indecisa." : "Recusa registrada.", "ok");
  });
  const openMeetingLink = (item) => {
    const link = validHttpUrl(item.metadata?.onlineLink);
    if (!link) return addToast?.("Esta reuni\xE3o n\xE3o possui um link v\xE1lido.", "info");
    window.open(link, "_blank", "noopener,noreferrer");
  };
  const reviewReservation = (item, decision) => runAction(item, async () => {
    let reason = null;
    if (decision === "recusada") {
      reason = await globalThis.nexlabPrompt?.("Explique por que a solicita\xE7\xE3o n\xE3o pode ser aprovada.", { title: "Recusar reserva", confirmLabel: "Confirmar recusa", minLength: 5, maxLength: 500 });
      if (reason == null) return;
    } else {
      const confirmed = globalThis.nexlabConfirm ? await globalThis.nexlabConfirm("Aprovar esta solicita\xE7\xE3o de reserva? A decis\xE3o ser\xE1 aplicada ao registro original.", { title: "Aprovar reserva", confirmLabel: "Aprovar", cancelLabel: "Cancelar" }) : globalThis.confirm("Aprovar esta solicita\xE7\xE3o de reserva?");
      if (!confirmed) return;
    }
    const { data, error: rpcError } = await supabase.rpc("nexlab_review_reservation_v26160", { p_reservation_id: item.metadata?.recordId, p_decision: decision, p_reason: reason, p_expected_status: "pendente" });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor n\xE3o confirmou a decis\xE3o.");
    addToast?.(decision === "aprovada" ? "Reserva aprovada." : "Reserva recusada.", "ok");
  });
  const reviewProfile = (item, approved) => runAction(item, async () => {
    let reason = null;
    if (!approved) {
      reason = await globalThis.nexlabPrompt?.("Explique por que a solicita\xE7\xE3o de v\xEDnculo n\xE3o pode ser aprovada.", { title: "Recusar solicita\xE7\xE3o", confirmLabel: "Confirmar recusa", minLength: 5, maxLength: 500 });
      if (reason == null) return;
    } else {
      const confirmed = globalThis.nexlabConfirm ? await globalThis.nexlabConfirm("Aprovar esta solicita\xE7\xE3o de perfil? O v\xEDnculo ser\xE1 atualizado imediatamente.", { title: "Aprovar perfil", confirmLabel: "Aprovar", cancelLabel: "Cancelar" }) : globalThis.confirm("Aprovar esta solicita\xE7\xE3o de perfil?");
      if (!confirmed) return;
    }
    const { error: rpcError } = await supabase.rpc("nexlab_review_profile_request_v02652", { p_target_user_id: item.ownerId, p_approved: approved, p_reason: approved ? null : reason });
    if (rpcError) throw rpcError;
    addToast?.(approved ? "Perfil aprovado." : "Solicita\xE7\xE3o recusada.", "ok");
  });
  const manageFeedback = (item, action) => runAction(item, async () => {
    const { data, error: rpcError } = await supabase.rpc("nexlab_manage_feedback_v2690", { p_feedback_id: item.metadata?.recordId, p_action: action, p_responsible_id: null, p_expected_status: item.metadata?.status || null });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor n\xE3o confirmou a atualiza\xE7\xE3o.");
    addToast?.(action === "resolve" ? "Feedback resolvido." : "Feedback arquivado.", "ok");
  });
  const openItem = async (item) => {
    if(item.kind==="marketing_campaign"){
      try{sessionStorage.setItem("nexlabMarketingPendingTarget",JSON.stringify({id:item.metadata?.recordId,ownerId:profileRef.current?.id,createdAt:Date.now()}));}catch{}
      onNavigate?.("marketing");return;
    }
    if (item.kind === "asset_attention") {
      const id = String(item.metadata?.recordId || "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return addToast?.("O alerta não possui um patrimônio válido.", "err");
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("nexlabTab", "inventario");
        url.searchParams.set("nexlabInventory", "assets");
        url.searchParams.delete("nexlabItem");
        url.searchParams.set("nexlabAssetDetail", id);
        window.history.pushState({ ...window.history.state, nexlabTab: "inventario", nexlabInventoryPage: null }, "", url);
      } catch (cause) {
        addToast?.("Não foi possível abrir o patrimônio. Tente novamente.", "err");
        return;
      }
      onNavigate?.("patrimonio");
      return;
    }
    if (isCommunication(item)) {
      const notificationId = String(item.metadata?.notificationId || "");
      const recordId = String(item.metadata?.recordId || "");
      const entityType = String(item.metadata?.entityType || "");
      try {
        sessionStorage.setItem("nexlabNotificationTarget", JSON.stringify({ notificationId, tab: item.navigationTarget, entityId: recordId, entityType, source: "my-day" }));
        if (entityType === "project" && recordId) sessionStorage.setItem("nexlabProjectTarget", JSON.stringify({ id: recordId, source: "my-day" }));
      } catch {
      }
      if (notificationId) {
        try {
          const result = await supabase.rpc("mark_notification_read", { notification_id: notificationId });
          if (result.error) throw result.error;
        } catch (cause) {
          console.warn("NEXLAB Meu Dia: n\xE3o foi poss\xEDvel marcar a comunica\xE7\xE3o como lida.", cause);
        }
      }
      onNavigate?.(item.navigationTarget);
      scheduleOpenOriginRecord(recordId);
      return;
    }
    if (item.navigationTarget === "reserva" && item.metadata?.recordId) {
      try {
        sessionStorage.setItem("nexlabBookingTarget", JSON.stringify({ kind: isMeeting(item) ? "meeting" : "reservation", id: String(item.metadata.recordId) }));
      } catch {
      }
    }
    if (isTask(item) && item.metadata?.originType === "team") {
      try {
        sessionStorage.setItem("nexlabTeamTaskTarget", JSON.stringify({ teamId: String(item.metadata?.teamId || ""), taskId: String(item.metadata?.recordId || ""), createdAt: Date.now() }));
      } catch {
      }
    }
    if (isTask(item) && item.metadata?.originType !== "team") {
      try {
        sessionStorage.setItem("nexlabProjectTarget", JSON.stringify({ id: String(item.metadata?.projectId || item.metadata?.recordId || ""), source: "my-day" }));
      } catch {
      }
    }
    onNavigate?.(item.navigationTarget);
  };
  const tabs = [{ id: "overview", label: "Vis\xE3o geral", count: items.length }, { id: "tasks", label: "Tarefas", count: items.filter(isTask).length }, { id: "meetings", label: "Reuni\xF5es", count: items.filter(isMeeting).length }, canApprove ? { id: "approvals", label: "Aprova\xE7\xF5es", count: items.filter(isApproval).length } : null, { id: "overdue", label: "Atrasados", count: counts.late }].filter(Boolean);
  const cardProps = { profile, caps: state.approvalCapabilities, onOpen: openItem, onDetail: (item) => setSelectedId(item.id), onComplete: completeTask, onReservation: reviewReservation, onProfile: reviewProfile, onFeedback: manageFeedback, onMeetingResponse: respondMeeting, onMeetingLink: openMeetingLink };
  const resetFilters = () => {
    setQuery("");
    setPriority("all");
    setPeriod("all");
    setModuleFilter("all");
    setPage(1);
  };
  const pageNumbers = [.../* @__PURE__ */ new Set([1, currentPage - 1, currentPage, currentPage + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  return /* @__PURE__ */ React.createElement("div", { className: "module-shell nxl-pending nxl-pending-approved" }, /* @__PURE__ */ React.createElement(ModuleHeader, { title: "Central de Pend\xEAncias", description: void 0, actions: /* @__PURE__ */ React.createElement("button", { type: "button", className: "refresh " + (refreshing ? "spinning" : ""), disabled: refreshing || loading, onClick: () => refresh({ notify: true }), "aria-label": refreshing ? "Atualizando pend\xEAncias" : "Atualizar pend\xEAncias" }, /* @__PURE__ */ React.createElement(Icon, { name: "refresh" }), /* @__PURE__ */ React.createElement("span", null, refreshing ? "Atualizando\u2026" : "Atualizar")) }), /* @__PURE__ */ React.createElement("section", { className: "overview", "aria-label": "Resumo das pend\xEAncias" }, /* @__PURE__ */ React.createElement("div", { className: "overview-copy" }, /* @__PURE__ */ React.createElement("div", { className: "eyebrow" }, "Meu dia"), /* @__PURE__ */ React.createElement("h2", null, "Resumo das pendências")), /* @__PURE__ */ React.createElement("div", { className: "metrics" }, Object.entries(GROUPS).filter(([key]) => key !== "other").map(([key, g]) => /* @__PURE__ */ React.createElement("button", { type: "button", className: "metric " + key + (period === key ? " selected" : ""), key, onClick: () => {
    setPeriod(period === key ? "all" : key);
    setActiveTab("overview");
  }, "aria-pressed": period === key, "aria-label": counts[key] + " " + g.metric }, /* @__PURE__ */ React.createElement(Icon, { name: g.icon }), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("strong", null, loading ? "\u2014" : counts[key]), /* @__PURE__ */ React.createElement("small", null, g.metric)), /* @__PURE__ */ React.createElement(Icon, { name: "right", className: "chevron" }))))), /* @__PURE__ */ React.createElement("div", { className: "toolbar" }, React.createElement(PendingTabs,{tabs,activeTab,onChange:setActiveTab}), /* @__PURE__ */ React.createElement("div", { className: "tools" }, /* @__PURE__ */ React.createElement("label", { className: "searchbox" }, /* @__PURE__ */ React.createElement(Icon, { name: "search" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: query, placeholder: "Buscar pend\xEAncias\u2026", "aria-label": "Buscar pend\xEAncias", onChange: (e) => setQuery(e.target.value) })), /* @__PURE__ */ React.createElement("div", { className: "filter-wrap", ref: filterRef }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "tool-btn " + (priority !== "all" || period !== "all" || moduleFilter !== "all" ? "on" : ""), "aria-expanded": filtersOpen, "aria-controls": "pending-filters", onClick: () => setFiltersOpen(!filtersOpen) }, /* @__PURE__ */ React.createElement(Icon, { name: "filter" }), "Filtros"), filtersOpen && /* @__PURE__ */ React.createElement("div", { className: "filter-panel", id: "pending-filters" }, /* @__PURE__ */ React.createElement("h3", null, "Filtrar pend\xEAncias"), React.createElement("label",{htmlFor:"pending-module"},"Módulo"),React.createElement("select",{id:"pending-module",value:moduleFilter,onChange:e=>setModuleFilter(e.target.value)},React.createElement("option",{value:"all"},"Todos os módulos"),...[...new Set(items.map(pendingModuleKey))].sort().map(key=>React.createElement("option",{key,value:key},PENDING_MODULES[key].label))),React.createElement(PendingSortSelect,{value:sort,onChange:setSort,className:"sort-in-filters"}),/* @__PURE__ */ React.createElement("label", { htmlFor: "pending-priority" }, "Prioridade"), /* @__PURE__ */ React.createElement("select", { id: "pending-priority", value: priority, onChange: (e) => setPriority(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Todas as prioridades"), /* @__PURE__ */ React.createElement("option", { value: "urgente" }, "Urgente"), /* @__PURE__ */ React.createElement("option", { value: "alta" }, "Alta"), /* @__PURE__ */ React.createElement("option", { value: "normal" }, "Normal"), /* @__PURE__ */ React.createElement("option", { value: "baixa" }, "Baixa")), /* @__PURE__ */ React.createElement("label", { htmlFor: "pending-period" }, "Prazo"), /* @__PURE__ */ React.createElement("select", { id: "pending-period", value: period, onChange: (e) => setPeriod(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "all" }, "Todos os prazos"), Object.entries(GROUPS).map(([key, g]) => /* @__PURE__ */ React.createElement("option", { key, value: key }, g.metric || "Sem prazo definido"))), /* @__PURE__ */ React.createElement("div", { className: "filter-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", onClick: resetFilters }, "Limpar"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "apply", onClick: () => setFiltersOpen(false) }, "Aplicar")))), /* @__PURE__ */ React.createElement("select", { className: "sort-select", "aria-label": "Ordenar pend\xEAncias", value: sort, onChange: (e) => setSort(e.target.value) }, /* @__PURE__ */ React.createElement("option", { value: "deadline" }, "Prazo mais pr\xF3ximo"), /* @__PURE__ */ React.createElement("option", { value: "recent" }, "Mais recentes"), /* @__PURE__ */ React.createElement("option", { value: "priority" }, "Maior prioridade"), /* @__PURE__ */ React.createElement("option", { value: "title" }, "T\xEDtulo A\u2013Z")))), (error || state.warnings.length > 0) && /* @__PURE__ */ React.createElement("div", { className: "pending-warning", role: "status" }, /* @__PURE__ */ React.createElement("strong", null, error ? "Pend\xEAncias n\xE3o atualizadas" : "Carregamento parcial"), /* @__PURE__ */ React.createElement("p", null, error || "Fontes temporariamente indispon\xEDveis: " + state.warnings.map((w) => w?.label || w?.source || String(w)).join(", ") + ". Os contadores refletem os dados dispon\xEDveis."), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: () => refresh({ notify: true }) }, "Tentar novamente")), (query || priority !== "all" || period !== "all" || moduleFilter !== "all") && /* @__PURE__ */ React.createElement("div", { className: "active-context" }, /* @__PURE__ */ React.createElement("span", null, visible.length, " resultado", visible.length === 1 ? "" : "s", period !== "all" ? " \xB7 " + (GROUPS[period].metric || "Sem prazo definido") : ""), /* @__PURE__ */ React.createElement("button", { type: "button", onClick: resetFilters }, "Limpar filtros")), loading ? /* @__PURE__ */ React.createElement("div", { className: "empty", role: "status" }, /* @__PURE__ */ React.createElement("div", { className: "empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "clock" })), /* @__PURE__ */ React.createElement("h2", null, "Carregando suas pend\xEAncias\u2026")) : visible.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "empty", role: "status" }, /* @__PURE__ */ React.createElement("div", { className: "empty-icon" }, /* @__PURE__ */ React.createElement(Icon, { name: "check" })), /* @__PURE__ */ React.createElement("h2", null, query || priority !== "all" || period !== "all" || moduleFilter !== "all" ? "Nenhuma pend\xEAncia encontrada" : error || state.partial ? "Pendências não confirmadas" : emptyCopy(activeTab)[0]), /* @__PURE__ */ React.createElement("p", null, query || priority !== "all" || period !== "all" || moduleFilter !== "all" ? "Tente outro termo ou ajuste os filtros para ver mais resultados." : error || state.partial ? "Não foi possível consultar todas as fontes. Atualize para tentar novamente." : emptyCopy(activeTab)[1]), (query || priority !== "all" || period !== "all" || moduleFilter !== "all") && /* @__PURE__ */ React.createElement("button", { type: "button", className: "reset-view", onClick: resetFilters }, "Limpar filtros")) : /* @__PURE__ */ React.createElement("div", { className: "pending-sections", "aria-label": "Lista de pend\xEAncias" }, Object.entries(GROUPS).map(([key, g]) => {
    const rows = shown.filter((item) => itemGroup(item) === key);
    if (!rows.length) return null;
    const total = visible.filter((item) => itemGroup(item) === key).length;
    return /* @__PURE__ */ React.createElement("section", { key, className: "group " + key + (collapsed[key] ? " collapsed" : "") }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "group-heading", "aria-expanded": !collapsed[key], "aria-controls": "pending-group-" + key, onClick: () => setCollapsed((old) => ({ ...old, [key]: !old[key] })) }, /* @__PURE__ */ React.createElement(Icon, { name: "down" }), /* @__PURE__ */ React.createElement(Icon, { name: g.icon, className: "group-icon" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", null, g.title)), /* @__PURE__ */ React.createElement("span", { className: "group-count" }, rows.length === total ? total : rows.length + " de " + total, " pend\xEAncia", total === 1 ? "" : "s"), /* @__PURE__ */ React.createElement("span", { className: "group-collapse" }, /* @__PURE__ */ React.createElement(Icon, { name: collapsed[key] ? "down" : "up" }))), /* @__PURE__ */ React.createElement("div", { className: "records", id: "pending-group-" + key, hidden: Boolean(collapsed[key]) }, rows.map((item) => /* @__PURE__ */ React.createElement(PendingRow, { key: item.id, item, busy: busyId === item.id, ...cardProps }))));
  })), !loading && visible.length > 0 && /* @__PURE__ */ React.createElement("nav", { className: "pagination", "aria-label": "Pagina\xE7\xE3o das pend\xEAncias" }, /* @__PURE__ */ React.createElement("span", null, "Mostrando ", /* @__PURE__ */ React.createElement("strong", null, start + 1, "\u2013", Math.min(start + pageSize, visible.length)), " de ", /* @__PURE__ */ React.createElement("strong", null, visible.length), " pend\xEAncias"), /* @__PURE__ */ React.createElement("div", { className: "page-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", className: "page-btn", disabled: currentPage === 1, "aria-label": "P\xE1gina anterior", onClick: () => setPage(currentPage - 1) }, /* @__PURE__ */ React.createElement(Icon, { name: "left" })), pageNumbers.map((n, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: n }, i > 0 && n - pageNumbers[i - 1] > 1 && /* @__PURE__ */ React.createElement("span", { "aria-hidden": "true" }, "\u2026"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "page-btn " + (n === currentPage ? "current" : ""), "aria-label": "P\xE1gina " + n, "aria-current": n === currentPage ? "page" : void 0, onClick: () => setPage(n) }, n))), /* @__PURE__ */ React.createElement("button", { type: "button", className: "page-btn", disabled: currentPage === totalPages, "aria-label": "Pr\xF3xima p\xE1gina", onClick: () => setPage(currentPage + 1) }, /* @__PURE__ */ React.createElement(Icon, { name: "right" })))), /* @__PURE__ */ React.createElement(PendingDetail, { item: detail, onClose: () => setSelectedId(null), busy: busyId === detail?.id, ...cardProps }));
}
export {
  PendingModuleAE as default
};
