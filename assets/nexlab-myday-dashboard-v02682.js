/* NEXLAB 0.26.82 — Meu Dia no Dashboard — Etapa E. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-dashboard-finalizado";

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
  return document.querySelector("#nexlab-main-content .nexlab-dashboard-ab-shell") || document.querySelector("main .nexlab-dashboard-ab-shell");
}

function findDashboardSlot() {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return null;
  return document.getElementById("nexlab-dashboard-myday-slot");
}

function render(summary) {
  const shell = findDashboardShell();
  const slot = findDashboardSlot();
  if (!shell || !slot) return false;
  let card = document.getElementById(CARD_ID);
  if (!card) {
    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "nexlab-myday-dashboard-summary";
    card.setAttribute("aria-labelledby", `${CARD_ID}-title`);
  }
  if (card.parentElement !== slot) slot.replaceChildren(card);

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
  const title = document.createElement("h2");
  title.id = `${CARD_ID}-title`;
  title.textContent = "Meu Dia";
  copy.append(title);

  const stats = document.createElement("div");
  stats.className = "nexlab-myday-dashboard-stats";
  stats.append(createStat("Tarefas", tasks, "tasks"), createStat("Reuniões", meetings, "meetings"), createStat("Atrasados", overdue, "overdue", overdue > 0));

  const action = document.createElement("button");
  action.type = "button";
  action.className = "nexlab-myday-dashboard-open";
  action.innerHTML = "Abrir Meu Dia <span aria-hidden=\"true\">→</span>";
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

let pageObserver = null;
let mainObserver = null;

function dashboardShellChanged(records = []) {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return false;
  return records.some(record => {
    if (record.type !== "childList") return false;
    return [...record.addedNodes, ...record.removedNodes].some(node => {
      if (!(node instanceof Element)) return false;
      return node.matches?.(".module-shell") || Boolean(node.querySelector?.(".module-shell"));
    });
  });
}

function observeMainContent() {
  if (mainObserver) return;
  const main = document.getElementById("nexlab-main-content");
  if (!main) return;
  mainObserver = new MutationObserver(records => {
    if (dashboardShellChanged(records)) schedule(120);
  });
  mainObserver.observe(main, { childList: true });
}

function startObservers() {
  if (!document.body || pageObserver) return;
  pageObserver = new MutationObserver(records => {
    const pageChanged = records.some(record => record.type === "attributes" && record.attributeName === "data-nexlab-page");
    if (!pageChanged) return;
    observeMainContent();
    if (document.body?.dataset?.nexlabPage === "dashboard") schedule(100);
  });
  pageObserver.observe(document.body, { attributes: true, attributeFilter: ["data-nexlab-page"] });
  observeMainContent();
}

globalThis.addEventListener("nexlab:myday-updated", event => {
  if (document.body?.dataset?.nexlabPage === "dashboard" && event?.detail) render(event.detail);
});
globalThis.addEventListener("nexlab:network-status", () => schedule(250));
globalThis.addEventListener("popstate", () => schedule(100));
globalThis.addEventListener("hashchange", () => schedule(100));

document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", () => { startObservers(); schedule(300); }, { once: true }) : (startObservers(), schedule(300));
