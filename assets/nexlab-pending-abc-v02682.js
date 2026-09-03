/* NEXLAB 0.26.82 - Pendencias / Meu Dia - etapas A-G. */
import { g as React, o as jsxRuntime, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-pendencias-meu-dia-fg";
import { Do as ModuleHeader, Qn as loadPendingCenter, Jn as isPendingItem, Vn as readableError } from "./nexlab-runtime-shared.js?v=app-beta-0-26-82-pendencias-meu-dia-fg";

const { Fragment, jsx, jsxs } = jsxRuntime;
const PAGE_SIZE = 8;

const TYPE_LABELS = {
  assigned_task: "Tarefa",
  reservation: "Aprovação",
  profile_request: "Cadastro",
  feedback: "Feedback",
  overdue_project: "Projeto",
  asset_attention: "Patrimônio",
  meeting: "Reunião",
  meeting_invitation: "Reunião",
  communication_mention: "Menção",
  official_reply: "Resposta oficial"
};

const TYPE_MARKS = {
  assigned_task: "T",
  reservation: "A",
  profile_request: "C",
  feedback: "F",
  overdue_project: "P",
  asset_attention: "PT",
  meeting: "R",
  meeting_invitation: "R",
  communication_mention: "@",
  official_reply: "↩"
};

const PRIORITY_LABELS = {
  critica: "Urgente",
  alta: "Alta prioridade",
  media: "Atenção",
  baixa: "Normal"
};

function todayKey() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dateKey(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
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
  return ({ presencial: "Presencial", online: "Online", hibrido: "Híbrida" })[String(value || "").toLowerCase()] || "Reunião";
}

function validHttpUrl(value) {
  try { const url = new URL(String(value || "")); return ["http:", "https:"].includes(url.protocol) ? url.toString() : null; } catch { return null; }
}

function scheduleOpenOriginRecord(recordId) {
  const id = String(recordId || "");
  if (!id) return;
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    const selector = `[data-nexlab-record-id="${globalThis.CSS?.escape ? CSS.escape(id) : id.replace(/["\\]/g, "")}"]`;
    const candidates = Array.from(document.querySelectorAll(selector));
    const card = candidates.find(node => node instanceof HTMLElement && node.offsetParent !== null) || candidates[0];
    if (card) {
      const buttons = Array.from(card.querySelectorAll("button"));
      const details = buttons.find(button => /ver detalhes|detalhes/i.test(String(button.textContent || button.getAttribute("aria-label") || button.title || "")));
      if (details) details.click();
      else if (card instanceof HTMLButtonElement || card.getAttribute("role") === "button") card.click();
      window.clearInterval(timer);
      return;
    }
    if (attempts >= 30) window.clearInterval(timer);
  }, 180);
}


function normalizeMeetingRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const needsResponse = Boolean(row?.needs_response);
    const reconfirm = Boolean(row?.needs_reconfirmation);
    const time = formatTime(row?.inicio);
    const date = formatDate(row?.inicio);
    const mode = formatMeetingMode(row?.formato);
    const where = row?.location_name || (row?.formato === "online" ? "Link da reunião" : null);
    const description = [row?.is_today ? (time ? `Hoje às ${time}` : "Hoje") : [date, time].filter(Boolean).join(" às "), mode, where].filter(Boolean).join(" • ");
    const participantStatus = String(row?.participant_status || "").toLowerCase();
    const statusLabel = reconfirm ? "Reconfirmação necessária" : needsResponse ? "Aguardando resposta" : participantStatus === "indeciso" ? "Participação indecisa" : participantStatus === "confirmado" ? "Participação confirmada" : row?.is_organizer ? "Você organiza esta reunião" : "Reunião próxima";
    return {
      id: `meeting-${row?.meeting_id || row?.booking_id}`,
      kind: needsResponse ? "meeting_invitation" : "meeting",
      title: row?.title || "Reunião",
      description: description || row?.description || "Compromisso de reunião",
      priority: reconfirm || needsResponse ? "alta" : row?.is_today ? "media" : "baixa",
      date: row?.inicio || null,
      createdAt: row?.inicio || null,
      ownerId: row?.organizer_id || null,
      ownerName: row?.organizer_name || null,
      statusLabel,
      navigationTarget: "reserva",
      metadata: {
        recordId: row?.meeting_id || row?.booking_id, bookingId: row?.booking_id || null,
        startAt: row?.inicio || null, endAt: row?.fim || null, format: row?.formato || null, locationName: row?.location_name || null,
        onlineLink: validHttpUrl(row?.link_online), organizerId: row?.organizer_id || null, participantStatus,
        invitationRevision: row?.invitation_revision || null, respondedRevision: row?.responded_revision || null,
        needsResponse, needsReconfirmation: reconfirm, canRespond: Boolean(row?.can_respond), isOrganizer: Boolean(row?.is_organizer), isParticipant: Boolean(row?.is_participant)
      }
    };
  });
}

function normalizeApprovalRows(rows) {
  return (Array.isArray(rows) ? rows : []).map(row => {
    const kind = row?.kind === "profile_request" ? "profile_request" : "reservation";
    const recordId = row?.id || row?.record_id || row?.booking_id;
    return {
      id: `${kind === "profile_request" ? "profile" : "reservation"}-${recordId}`,
      kind,
      title: row?.title || (kind === "profile_request" ? "Solicitação de perfil" : "Solicitação de reserva"),
      description: row?.description || "Solicitação aguardando sua decisão.",
      priority: row?.is_overdue ? "critica" : "alta",
      date: row?.date || row?.created_at || null,
      createdAt: row?.created_at || row?.date || null,
      ownerId: row?.owner_id || null,
      ownerName: row?.owner_name || null,
      statusLabel: row?.status_label || "Aguardando aprovação",
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
  return (Array.isArray(rows) ? rows : []).map(row => {
    const kind = row?.kind === "official_reply" ? "official_reply" : "communication_mention";
    const entityType = String(row?.entity_type || "").toLowerCase();
    const recordId = row?.entity_id || null;
    const actorName = row?.actor_name || null;
    const destination = entityType === "team" ? "equipes" : "projetos";
    return {
      id: `communication-${row?.notification_id || recordId || Math.random().toString(36).slice(2)}`,
      kind,
      title: row?.title || (kind === "official_reply" ? "Seu comentário recebeu uma resposta" : "Você foi mencionado"),
      description: row?.message || (entityType === "team" ? "Abra a conversa da equipe para responder." : "Abra os comentários do projeto para responder."),
      priority: String(row?.priority || "alta").toLowerCase() === "normal" ? "media" : "alta",
      date: null,
      createdAt: row?.created_at || null,
      ownerId: row?.actor_id || null,
      ownerName: actorName,
      statusLabel: kind === "official_reply" ? "Resposta ainda não lida" : "Menção ainda não lida",
      navigationTarget: destination,
      metadata: {
        notificationId: row?.notification_id || null,
        recordId, entityType, contentId: row?.content_id || null,
        communicationEvent: row?.communication_event || null,
        openSection: row?.open_section || (entityType === "team" ? "conversation" : "comments")
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
  if (isMeeting(item)) return item.description || "Reunião que exige sua atenção";
  if (isCommunication(item)) return item.description || "Comunicação direta que pode exigir sua resposta";
  return item.description || "Registro que exige sua atenção";
}

function emptyCopy(tab) {
  if (tab === "tasks") return ["Nenhuma tarefa pendente", "As tarefas atribuídas a você aparecerão aqui."];
  if (tab === "meetings") return ["Nenhuma reunião exige atenção", "Convites e compromissos que precisam de resposta aparecerão aqui."];
  if (tab === "approvals") return ["Nenhuma aprovação pendente", "Não existem solicitações aguardando sua decisão."];
  if (tab === "overdue") return ["Nenhum item atrasado", "Você não possui obrigações vencidas em aberto."];
  return ["Seu dia está em ordem", "Você não possui ações pendentes para agora."];
}

function PendingCard({ item, busy, profile, canApprove, onOpen, onComplete, onReservation, onProfile, onFeedback, onMeetingResponse, onMeetingLink }) {
  const overdue = isOverdue(item);
  const today = isToday(item);
  const responsible = String(item.ownerId || "") === String(profile?.id || "");
  const formattedDate = formatDate(item.date);
  const receivedDate = isCommunication(item) ? formatDate(item.createdAt) : null;
  const receivedTime = isCommunication(item) ? formatTime(item.createdAt) : null;
  const urgency = overdue ? "Atrasado" : today && isTask(item) ? "Vence hoje" : PRIORITY_LABELS[item.priority] || "Pendente";

  return jsxs("article", {
    className: `nexlab-myday-card${overdue ? " is-overdue" : ""}${today ? " is-today" : ""}`,
    "data-nexlab-pending-kind": item.kind,
    "data-nexlab-pending-id": item.id,
    children: [
      jsx("span", { className: `nexlab-myday-card__mark kind-${item.kind}`, "aria-hidden": "true", children: TYPE_MARKS[item.kind] || "!" }),
      jsxs("div", {
        className: "nexlab-myday-card__body",
        children: [
          jsxs("div", {
            className: "nexlab-myday-card__labels",
            children: [
              jsx("span", { children: TYPE_LABELS[item.kind] || "Pendência" }),
              jsx("span", { className: overdue ? "is-danger" : today ? "is-warning" : "", children: urgency })
            ]
          }),
          jsx("h3", { children: item.title || "Item sem título" }),
          jsx("p", { children: contextualText(item) }),
          jsxs("div", {
            className: "nexlab-myday-card__meta",
            children: [
              item.ownerName ? jsxs("span", { children: [isMeeting(item) ? "Organizador: " : isCommunication(item) ? "De: " : "Responsável: ", jsx("strong", { children: item.ownerName })] }) : null,
              formattedDate ? jsxs("span", { children: [isMeeting(item) ? "Quando: " : overdue ? "Venceu em " : "Prazo: ", jsx("strong", { children: isMeeting(item) && formatTime(item.metadata?.startAt) ? `${formattedDate}, ${formatTime(item.metadata.startAt)}` : formattedDate })] }) : null,
              receivedDate ? jsxs("span", { children: ["Recebida: ", jsx("strong", { children: `${receivedDate}${receivedTime ? `, ${receivedTime}` : ""}` })] }) : null,
              item.statusLabel ? jsx("span", { children: item.statusLabel }) : null
            ]
          })
        ]
      }),
      jsxs("div", {
        className: "nexlab-myday-card__actions",
        children: [
          isTask(item) && responsible ? jsx("button", {
            type: "button",
            disabled: busy,
            className: "nexlab-myday-action is-complete",
            onClick: () => onComplete(item),
            children: busy ? "Concluindo..." : "Concluir"
          }) : null,
          isMeeting(item) && item.metadata?.needsResponse && item.metadata?.canRespond ? jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-secondary", onClick: () => onMeetingResponse(item, "recusado"), children: "Recusar" }),
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-undecided", onClick: () => onMeetingResponse(item, "indeciso"), children: "Indeciso" }),
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-primary", onClick: () => onMeetingResponse(item, "confirmado"), children: item.metadata?.needsReconfirmation ? "Reconfirmar" : "Confirmar" })
            ]
          }) : null,
          isMeeting(item) && item.metadata?.onlineLink && !item.metadata?.needsResponse ? jsx("button", { type: "button", className: "nexlab-myday-action is-link", onClick: () => onMeetingLink(item), children: "Abrir link" }) : null,
          item.kind === "reservation" && canApprove && item.metadata?.canApprove ? jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-secondary", onClick: () => onReservation(item, "recusada"), children: "Recusar" }),
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-primary", onClick: () => onReservation(item, "aprovada"), children: "Aprovar" })
            ]
          }) : null,
          item.kind === "profile_request" && canApprove && item.metadata?.canApprove ? jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-secondary", onClick: () => onProfile(item, false), children: "Recusar" }),
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-primary", onClick: () => onProfile(item, true), children: "Aprovar" })
            ]
          }) : null,
          item.kind === "feedback" && canApprove ? jsxs(Fragment, {
            children: [
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-secondary", onClick: () => onFeedback(item, "archive"), children: "Arquivar" }),
              jsx("button", { type: "button", disabled: busy, className: "nexlab-myday-action is-primary", onClick: () => onFeedback(item, "resolve"), children: "Resolver" })
            ]
          }) : null,
          jsx("button", { type: "button", className: "nexlab-myday-action is-open", onClick: () => onOpen(item), children: isCommunication(item) ? (item.metadata?.entityType === "team" ? "Abrir conversa" : "Abrir comentário") : "Abrir" })
        ]
      })
    ]
  });
}

function PendingSection({ title, hint, items, busyId, ...cardProps }) {
  if (!items.length) return null;
  return jsxs("section", {
    className: "nexlab-myday-section",
    children: [
      jsxs("header", {
        children: [
          jsxs("div", { children: [jsx("h2", { children: title }), hint ? jsx("p", { children: hint }) : null] }),
          jsx("span", { children: items.length })
        ]
      }),
      jsx("div", { className: "nexlab-myday-list", children: items.map(item => jsx(PendingCard, { item, busy: busyId === item.id, ...cardProps }, item.id)) })
    ]
  });
}

export default function PendingModuleAE({ profile, addToast, onNavigate, onCountChange }) {
  const [state, setState] = React.useState({
    items: [], warnings: [], partial: false,
    metrics: { total: 0, decisions: 0, alerts: 0, tasks: 0, meetings: 0, approvals: 0, overdue: 0, urgent: 0 },
    approvalCapabilities: { resolved: false, hasAny: false, reservations: false, profiles: false },
    summary: { tasks: 0, meetings: 0, approvals: 0, overdue: 0 },
    pagination: { page: 1, page_size: PAGE_SIZE, total: 0, has_more: false }
  });
  const [activeTab, setActiveTab] = React.useState(() => {
    try { return sessionStorage.getItem("nexlab.pending.active-tab") || "overview"; } catch { return "overview"; }
  });
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [busyId, setBusyId] = React.useState(null);
  const [error, setError] = React.useState(null);
  const requestId = React.useRef(0);
  const canApprove = Boolean(state.approvalCapabilities?.hasAny);

  const refresh = React.useCallback(async ({ notify = false, page = 1, append = false } = {}) => {
    const currentRequest = ++requestId.current;
    append || notify ? setRefreshing(true) : setLoading(true);
    try {
      const [baseResult, meetingsResult, approvalsResult, summaryResult, communicationResult] = await Promise.allSettled([
        loadPendingCenter(profile, { page, pageSize: PAGE_SIZE }),
        supabase.rpc("nexlab_get_my_day_meetings_v1", { p_horizon_days: 7 }),
        supabase.rpc("nexlab_get_my_day_approvals_v1"),
        supabase.rpc("nexlab_get_my_day_summary_v1", { p_horizon_days: 7 }),
        supabase.rpc("nexlab_get_my_day_communication_v1", { p_limit: 20 })
      ]);
      if (currentRequest !== requestId.current) return;
      if ([baseResult, meetingsResult, approvalsResult, summaryResult, communicationResult].every(result => result.status === "rejected")) throw baseResult.reason;

      const fallback = { items: [], warnings: [], partial: false, metrics: { total: 0, decisions: 0, alerts: 0, tasks: 0, meetings: 0, approvals: 0, overdue: 0, urgent: 0 }, pagination: { page, page_size: PAGE_SIZE, total: 0, has_more: false } };
      const response = baseResult.status === "fulfilled" ? baseResult.value : fallback;
      const warnings = [...(response.warnings || [])].filter(warning => ["tarefas", "tarefas_equipes", "projetos"].includes(String(warning?.source || warning || "").toLowerCase()));
      if (baseResult.status === "rejected") warnings.push({ source: "pendencias", label: "Tarefas e prazos" });

      let meetingItems = [];
      if (meetingsResult.status === "fulfilled" && !meetingsResult.value?.error && meetingsResult.value?.data?.ok) {
        meetingItems = normalizeMeetingRows(meetingsResult.value.data.meetings);
      } else if (meetingsResult.status === "rejected" || meetingsResult.value?.error) {
        warnings.push({ source: "reunioes", label: "Reuniões" });
      }

      let approvalItems = [];
      let approvalCapabilities = { resolved: true, hasAny: false, reservations: false, profiles: false };
      if (approvalsResult.status === "fulfilled" && !approvalsResult.value?.error && approvalsResult.value?.data?.ok) {
        approvalItems = normalizeApprovalRows(approvalsResult.value.data.approvals);
        const caps = approvalsResult.value.data.capabilities || {};
        approvalCapabilities = { resolved: true, hasAny: Boolean(caps.has_any), reservations: Boolean(caps.reservations), profiles: Boolean(caps.profiles) };
      } else if (approvalsResult.status === "rejected" || approvalsResult.value?.error) {
        warnings.push({ source: "aprovacoes", label: "Aprovações" });
      }

      let communicationItems = [];
      if (communicationResult.status === "fulfilled" && !communicationResult.value?.error && communicationResult.value?.data?.ok) {
        communicationItems = normalizeCommunicationRows(communicationResult.value.data.items);
      } else if (communicationResult.status === "rejected" || communicationResult.value?.error) {
        warnings.push({ source: "comunicacao", label: "Menções e respostas" });
      }

      let summary = { tasks: 0, meetings: meetingItems.length, approvals: approvalItems.length, overdue: 0 };
      if (summaryResult.status === "fulfilled" && !summaryResult.value?.error && summaryResult.value?.data?.ok) {
        summary = {
          tasks: Number(summaryResult.value.data.tasks || 0),
          meetings: Number(summaryResult.value.data.meetings || 0),
          approvals: Number(summaryResult.value.data.approvals || 0),
          overdue: Number(summaryResult.value.data.overdue || 0)
        };
      }

      const dedupe = values => [...new Map((values || []).filter(Boolean).map(item => [String(item.id), item])).values()];
      const basePersonalItems = (response.items || []).filter(item => {
        if (isApproval(item) || item?.kind === "feedback" || item?.kind === "asset_attention") return false;
        if (item?.kind === "overdue_project" && String(item.ownerId || "") !== String(profile?.id || "")) return false;
        return isTask(item) || item?.kind === "overdue_project";
      });
      const mergedItems = dedupe([...basePersonalItems, ...meetingItems, ...approvalItems, ...communicationItems]);
      const loadedOverdue = mergedItems.filter(isOverdue).length;
      if (!summary.overdue) summary.overdue = loadedOverdue;
      const next = {
        ...response,
        items: mergedItems,
        warnings,
        partial: Boolean(response.partial || warnings.length),
        approvalCapabilities,
        summary,
        metrics: { ...(response.metrics || {}), total: mergedItems.length, tasks: summary.tasks, meetings: summary.meetings, approvals: summary.approvals, overdue: summary.overdue },
        pagination: { ...(response.pagination || fallback.pagination), total: Math.max(mergedItems.length, Number(response.pagination?.total || 0)) }
      };
      setError(null);
      setState(previous => {
        if (!append) return next;
        return { ...next, items: dedupe([...(previous.items || []), ...next.items]) };
      });
      onCountChange?.(Number(next.metrics?.total ?? next.items.length));
      try { globalThis.dispatchEvent(new CustomEvent("nexlab:myday-updated", { detail: { ...summary, approvalCapabilities } })); } catch {}
    } catch (cause) {
      if (currentRequest !== requestId.current) return;
      const message = readableError(cause, "Não foi possível carregar as pendências.");
      setError(message);
      if (notify) addToast?.(message, "err");
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [profile, addToast, onCountChange]);

  React.useEffect(() => { refresh(); }, [refresh]);
  React.useEffect(() => {
    try { sessionStorage.setItem("nexlab.pending.active-tab", activeTab); } catch {}
  }, [activeTab]);
  React.useEffect(() => {
    if (!profile?.id) return undefined;
    let timer = null;
    const subscription = globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => refresh(), 450);
    });
    return () => { if (timer) clearTimeout(timer); subscription?.(); };
  }, [profile?.id, refresh]);
  React.useEffect(() => {
    if (state.approvalCapabilities?.resolved && !canApprove && activeTab === "approvals") setActiveTab("overview");
  }, [activeTab, canApprove, state.approvalCapabilities?.resolved]);

  const items = React.useMemo(() => (state.items || []).filter(isPendingItem), [state.items]);
  const visible = React.useMemo(() => items.filter(item => tabMatches(item, activeTab)), [items, activeTab]);
  const taskCount = Number(state.summary?.tasks ?? state.metrics?.tasks ?? items.filter(isTask).length);
  const meetingCount = Number(state.summary?.meetings ?? items.filter(isMeeting).length);
  const approvalCount = Number(state.summary?.approvals ?? items.filter(isApproval).length);
  const overdueCount = Number(state.summary?.overdue ?? items.filter(isOverdue).length);

  const groups = React.useMemo(() => {
    const overdue = visible.filter(isOverdue);
    const today = visible.filter(item => !isOverdue(item) && isToday(item));
    const waitingRank = item => isMeeting(item) ? 1 : isApproval(item) ? 2 : isCommunication(item) ? 3 : 4;
    const waiting = visible.filter(item => !isOverdue(item) && !isToday(item) && (isApproval(item) || isMeeting(item) || isCommunication(item) || item.kind === "feedback")).sort((a,b) => waitingRank(a)-waitingRank(b) || new Date(b.createdAt || 0)-new Date(a.createdAt || 0));
    const upcoming = visible.filter(item => !isOverdue(item) && !isToday(item) && !waiting.includes(item) && dateKey(item.date));
    const other = visible.filter(item => !overdue.includes(item) && !today.includes(item) && !waiting.includes(item) && !upcoming.includes(item));
    return { overdue, today, waiting, upcoming, other };
  }, [visible]);

  const runAction = React.useCallback(async (item, action) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      await action();
      await refresh({ notify: false });
    } catch (cause) {
      addToast?.(readableError(cause, "Não foi possível atualizar esta pendência."), "err");
    } finally {
      setBusyId(null);
    }
  }, [busyId, refresh, addToast]);

  const completeTask = item => runAction(item, async () => {
    if (String(item.ownerId || "") !== String(profile?.id || "")) throw new Error("Somente o responsável pode concluir esta tarefa.");
    const taskId = String(item.metadata?.recordId || "");
    const originType = String(item.metadata?.originType || "project");
    const teamId = String(item.metadata?.teamId || "");
    const projectId = String(item.metadata?.projectId || "");
    if (!taskId || (originType === "team" ? !teamId : !projectId)) throw new Error("A tarefa não possui origem válida.");
    const result = originType === "team"
      ? await supabase.rpc("nexlab_manage_team_task_v1", { p_team_id: teamId, p_action: "complete", p_task_id: taskId, p_title: null, p_description: null, p_responsible_id: null, p_deadline: null, p_priority: null, p_status: null })
      : await supabase.rpc("nexlab_manage_project_task_v2690", { p_project_id: projectId, p_action: "toggle", p_task_id: taskId, p_title: null, p_responsible_id: null, p_done: true });
    if (result.error) throw result.error;
    if (!result.data?.ok) throw new Error("O servidor não confirmou a conclusão da tarefa.");
    addToast?.("Tarefa concluída.", "ok");
  });

  const respondMeeting = (item, response) => runAction(item, async () => {
    let note = null;
    if (response === "recusado") {
      note = await globalThis.nexlabMeetingDeclinePrompt?.();
      if (note == null && typeof globalThis.nexlabMeetingDeclinePrompt === "function") return;
    }
    const meetingId = item.metadata?.recordId;
    if (!meetingId) throw new Error("A reunião não possui origem válida.");
    const { data, error: rpcError } = await supabase.rpc("nexlab_respond_meeting_invitation_v263042", { p_meeting_id: meetingId, p_response: response, p_response_note: note || null });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor não confirmou a resposta ao convite.");
    addToast?.(response === "confirmado" ? (item.metadata?.needsReconfirmation ? "Participação reconfirmada." : "Participação confirmada.") : response === "indeciso" ? "Participação marcada como indecisa." : "Recusa registrada.", "ok");
  });

  const openMeetingLink = item => {
    const link = validHttpUrl(item.metadata?.onlineLink);
    if (!link) return addToast?.("Esta reunião não possui um link válido.", "info");
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const reviewReservation = (item, decision) => runAction(item, async () => {
    let reason = null;
    if (decision === "recusada") {
      reason = await globalThis.nexlabPrompt?.("Explique por que a solicitação não pode ser aprovada.", { title: "Recusar reserva", confirmLabel: "Confirmar recusa", minLength: 5, maxLength: 500 });
      if (reason == null) return;
    } else {
      const confirmed = globalThis.nexlabConfirm ? await globalThis.nexlabConfirm("Aprovar esta solicitação de reserva? A decisão será aplicada ao registro original.", { title: "Aprovar reserva", confirmLabel: "Aprovar", cancelLabel: "Cancelar" }) : globalThis.confirm("Aprovar esta solicitação de reserva?");
      if (!confirmed) return;
    }
    const { data, error: rpcError } = await supabase.rpc("nexlab_review_reservation_v26160", { p_reservation_id: item.metadata?.recordId, p_decision: decision, p_reason: reason, p_expected_status: "pendente" });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor não confirmou a decisão.");
    addToast?.(decision === "aprovada" ? "Reserva aprovada." : "Reserva recusada.", "ok");
  });

  const reviewProfile = (item, approved) => runAction(item, async () => {
    let reason = null;
    if (!approved) {
      reason = await globalThis.nexlabPrompt?.("Explique por que a solicitação de vínculo não pode ser aprovada.", { title: "Recusar solicitação", confirmLabel: "Confirmar recusa", minLength: 5, maxLength: 500 });
      if (reason == null) return;
    } else {
      const confirmed = globalThis.nexlabConfirm ? await globalThis.nexlabConfirm("Aprovar esta solicitação de perfil? O vínculo será atualizado imediatamente.", { title: "Aprovar perfil", confirmLabel: "Aprovar", cancelLabel: "Cancelar" }) : globalThis.confirm("Aprovar esta solicitação de perfil?");
      if (!confirmed) return;
    }
    const { error: rpcError } = await supabase.rpc("nexlab_review_profile_request_v02652", { p_target_user_id: item.ownerId, p_approved: approved, p_reason: approved ? null : reason });
    if (rpcError) throw rpcError;
    addToast?.(approved ? "Perfil aprovado." : "Solicitação recusada.", "ok");
  });

  const manageFeedback = (item, action) => runAction(item, async () => {
    const { data, error: rpcError } = await supabase.rpc("nexlab_manage_feedback_v2690", { p_feedback_id: item.metadata?.recordId, p_action: action, p_responsible_id: null, p_expected_status: item.metadata?.status || null });
    if (rpcError) throw rpcError;
    if (!data?.ok) throw new Error("O servidor não confirmou a atualização.");
    addToast?.(action === "resolve" ? "Feedback resolvido." : "Feedback arquivado.", "ok");
  });

  const openItem = async item => {
    if (isCommunication(item)) {
      const notificationId = String(item.metadata?.notificationId || "");
      const recordId = String(item.metadata?.recordId || "");
      const entityType = String(item.metadata?.entityType || "");
      try {
        sessionStorage.setItem("nexlabNotificationTarget", JSON.stringify({ notificationId, tab: item.navigationTarget, entityId: recordId, entityType, source: "my-day" }));
        if (entityType === "project" && recordId) sessionStorage.setItem("nexlabProjectTarget", JSON.stringify({ id: recordId, source: "my-day" }));
      } catch {}
      if (notificationId) {
        try { const result = await supabase.rpc("mark_notification_read", { notification_id: notificationId }); if (result.error) throw result.error; } catch (cause) { console.warn("NEXLAB Meu Dia: não foi possível marcar a comunicação como lida.", cause); }
      }
      onNavigate?.(item.navigationTarget);
      scheduleOpenOriginRecord(recordId);
      return;
    }
    if (item.navigationTarget === "reserva" && item.metadata?.recordId) {
      try { sessionStorage.setItem("nexlabBookingTarget", JSON.stringify({ kind: item.kind === "meeting" ? "meeting" : "reservation", id: String(item.metadata.recordId) })); } catch {}
    }
    if (isTask(item) && item.metadata?.originType === "team") {
      try { sessionStorage.setItem("nexlabTeamTaskTarget", JSON.stringify({ teamId: String(item.metadata?.teamId || ""), taskId: String(item.metadata?.recordId || ""), createdAt: Date.now() })); } catch {}
    }
    onNavigate?.(item.navigationTarget);
  };

  const tabs = [
    { id: "overview", label: "Visão Geral", count: items.length },
    { id: "tasks", label: "Tarefas", count: taskCount },
    { id: "meetings", label: "Reuniões", count: meetingCount },
    canApprove ? { id: "approvals", label: "Aprovações", count: approvalCount } : null,
    { id: "overdue", label: "Atrasados", count: overdueCount, danger: overdueCount > 0 }
  ].filter(Boolean);
  const cardProps = { profile, canApprove, onOpen: openItem, onComplete: completeTask, onReservation: reviewReservation, onProfile: reviewProfile, onFeedback: manageFeedback, onMeetingResponse: respondMeeting, onMeetingLink: openMeetingLink };
  const renderSection = (title, hint, sectionItems) => jsx(PendingSection, { title, hint, items: sectionItems, busyId, ...cardProps });

  return jsxs("div", {
    className: "module-shell max-w-6xl nexlab-myday",
    children: [
      jsx(ModuleHeader, {
        eyebrow: "Fila de decisões e acompanhamento",
        title: "Central de Pendências",
        description: undefined,
        icon: jsx("span", { className: "nexlab-myday-header-icon", "aria-hidden": "true", children: "✓" }),
        actions: jsx("button", { type: "button", onClick: () => refresh({ notify: true }), disabled: refreshing, className: "nexlab-myday-refresh", children: refreshing ? "Atualizando..." : "Atualizar" })
      }),
      jsxs("section", {
        className: "nexlab-myday-intro",
        children: [
          jsxs("div", { children: [jsx("span", { children: "MEU DIA" }), jsx("h2", { children: "O que precisa da sua atenção" }), jsx("p", { children: "Tarefas, decisões e prazos reunidos sem duplicar os registros originais." })] }),
          overdueCount > 0 ? jsx("button", { type: "button", onClick: () => setActiveTab("overdue"), children: `${overdueCount} atrasado${overdueCount === 1 ? "" : "s"}` }) : jsx("span", { className: "nexlab-myday-intro__ok", children: "Sem atrasos" })
        ]
      }),
      jsx("div", {
        className: "nexlab-myday-tabs-wrap",
        children: jsx("div", {
          className: "nexlab-myday-tabs",
          role: "tablist",
          "aria-label": "Filtros de Pendências",
          children: tabs.map(tab => jsxs("button", {
            type: "button", role: "tab", "aria-selected": activeTab === tab.id,
            className: `${activeTab === tab.id ? "is-active" : ""}${tab.danger ? " has-danger" : ""}`,
            onClick: event => { setActiveTab(tab.id); event.currentTarget.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" }); },
            children: [tab.label, tab.count > 0 ? jsx("span", { children: tab.count }) : null]
          }, tab.id))
        })
      }),
      (error || state.warnings?.length) ? jsxs("div", {
        className: "nexlab-myday-warning", role: "status", "aria-live": "polite",
        children: [jsx("strong", { children: error ? "Pendências não atualizadas" : "Carregamento parcial" }), jsx("p", { children: error || `Fontes temporariamente indisponíveis: ${state.warnings.map(warning => warning?.label || warning?.source || String(warning)).join(", ")}. Os demais dados continuam visíveis.` }), jsx("button", { type: "button", onClick: () => refresh({ notify: true }), children: "Tentar novamente" })]
      }) : null,
      loading ? jsx("div", { className: "nexlab-myday-loading", role: "status", children: "Carregando seu dia..." }) : visible.length === 0 ? jsxs("div", {
        className: "nexlab-myday-empty", role: "status",
        children: [jsx("span", { "aria-hidden": "true", children: "✓" }), jsx("h2", { children: emptyCopy(activeTab)[0] }), jsx("p", { children: emptyCopy(activeTab)[1] })]
      }) : activeTab === "overview" ? jsxs("div", {
        className: "nexlab-myday-sections",
        children: [
          renderSection("Atrasados", "Resolva primeiro o que já passou do prazo.", groups.overdue),
          renderSection("Hoje", "Itens com prazo ou compromisso para hoje.", groups.today),
          renderSection("Aguardando sua ação", "Decisões e respostas pendentes.", groups.waiting),
          renderSection("Próximos dias", "Prazos futuros que merecem acompanhamento.", groups.upcoming),
          renderSection("Outras pendências", null, groups.other)
        ]
      }) : jsx("div", {
        className: "nexlab-myday-sections",
        children: renderSection(tabs.find(tab => tab.id === activeTab)?.label || "Pendências", null, visible)
      }),
      state.pagination?.has_more ? jsxs("div", {
        className: "nexlab-myday-more",
        children: [jsx("span", { children: `${items.length} de ${Number(state.pagination.total || items.length)} itens carregados` }), jsx("button", { type: "button", disabled: refreshing, onClick: () => refresh({ notify: true, page: Number(state.pagination.page || 1) + 1, append: true }), children: refreshing ? "Carregando..." : "Carregar mais" })]
      }) : null
    ]
  });
}
