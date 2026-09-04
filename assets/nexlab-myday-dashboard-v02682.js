/* NEXLAB 0.26.82 — Meu Dia no Dashboard — Etapa E. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-update-atomic-v1";

const CARD_ID = "nexlab-myday-dashboard-summary-v02682";
let refreshTimer = null;
let lastSignature = "";

function plural(value, singular, pluralWord) {
  return `${value} ${value === 1 ? singular : pluralWord}`;
}

function navigatePending(tab = "overview") {
  try { sessionStorage.setItem("nexlab.pending.active-tab", tab); } catch {}
  try {
    globalThis.dispatchEvent(new CustomEvent("nexlab:navigate-record", {
      detail: { tabId: "pendencias", id: "", entityType: "my_day", groupLabel: "Meu Dia", source: "dashboard-summary" }
    }));
  } catch {}
}

function createStat(label, value, tab, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `nexlab-myday-dashboard-stat${danger ? " is-danger" : ""}`;
  button.dataset.tab = tab;
  button.innerHTML = `<strong>${Number(value || 0)}</strong><span>${label}</span>`;
  button.addEventListener("click", () => navigatePending(tab));
  return button;
}

function findDashboardShell() {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return null;
  return document.querySelector("#nexlab-main-content .module-shell") || document.querySelector("main .module-shell");
}

function render(summary) {
  const shell = findDashboardShell();
  if (!shell) return false;
  let card = document.getElementById(CARD_ID);
  if (!card) {
    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "nexlab-myday-dashboard-summary";
    card.setAttribute("aria-labelledby", `${CARD_ID}-title`);
    const first = shell.firstElementChild;
    first?.after(card) || shell.prepend(card);
  }

  const tasks = Number(summary?.tasks || 0);
  const meetings = Number(summary?.meetings || 0);
  const approvals = Number(summary?.approvals || 0);
  const overdue = Number(summary?.overdue || 0);
  const canApprove = Boolean(summary?.approval_capabilities?.has_any ?? summary?.approvalCapabilities?.hasAny);
  const signature = [tasks, meetings, approvals, overdue, canApprove].join(":");
  if (card.dataset.signature === signature) return true;
  card.dataset.signature = signature;

  card.replaceChildren();
  const copy = document.createElement("div");
  copy.className = "nexlab-myday-dashboard-copy";
  const eyebrow = document.createElement("span");
  eyebrow.textContent = "MEU DIA";
  const title = document.createElement("h2");
  title.id = `${CARD_ID}-title`;
  title.textContent = "Resumo do que precisa da sua atenção";
  const description = document.createElement("p");
  const parts = [plural(tasks, "tarefa", "tarefas"), plural(meetings, "reunião", "reuniões")];
  if (canApprove) parts.push(plural(approvals, "aprovação", "aprovações"));
  description.textContent = `Hoje você tem ${parts.join(", ")}.${overdue > 0 ? ` ${plural(overdue, "item atrasado", "itens atrasados")}.` : " Nenhum item está atrasado."}`;
  copy.append(eyebrow, title, description);

  const stats = document.createElement("div");
  stats.className = "nexlab-myday-dashboard-stats";
  stats.append(createStat("Tarefas", tasks, "tasks"), createStat("Reuniões", meetings, "meetings"));
  if (canApprove) stats.append(createStat("Aprovações", approvals, "approvals"));
  stats.append(createStat("Atrasados", overdue, "overdue", overdue > 0));

  const action = document.createElement("button");
  action.type = "button";
  action.className = "nexlab-myday-dashboard-open";
  action.textContent = "Abrir Meu Dia";
  action.addEventListener("click", () => navigatePending("overview"));

  card.append(copy, stats, action);
  lastSignature = signature;
  return true;
}

async function loadSummary() {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return;
  const shell = findDashboardShell();
  if (!shell) return;
  try {
    const { data, error } = await supabase.rpc("nexlab_get_my_day_summary_v1", { p_horizon_days: 7 });
    if (error || !data?.ok) throw error || new Error("Resumo indisponível");
    render(data);
  } catch {
    const old = document.getElementById(CARD_ID);
    if (old && !lastSignature) old.remove();
  }
}

function schedule(delay = 120) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { void loadSummary(); }, delay);
}

const observer = new MutationObserver(() => {
  if (document.body?.dataset?.nexlabPage === "dashboard") schedule(100);
});
observer.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-nexlab-page"] });

globalThis.addEventListener("nexlab:myday-updated", event => {
  if (document.body?.dataset?.nexlabPage === "dashboard" && event?.detail) render(event.detail);
});
globalThis.addEventListener("nexlab:network-status", () => schedule(250));
globalThis.addEventListener("popstate", () => schedule(100));
globalThis.addEventListener("hashchange", () => schedule(100));

document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => schedule(300), { once: true }) : schedule(300);
