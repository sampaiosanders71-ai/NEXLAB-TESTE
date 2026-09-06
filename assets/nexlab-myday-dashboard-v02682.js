/* NEXLAB Beta 0.26.82 — Dashboard isolado: apresentação e Meu Dia sem alterar o runtime global. */
import { Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-notificacoes-runtime-corrigido";

const CARD_ID = "nexlab-myday-dashboard-summary-v02682";
const STYLE_ID = "nexlab-dashboard-isolated-style-v02682";
let refreshTimer = null;
let lastSignature = "";
let pageObserver = null;
let mainObserver = null;
let layoutTimer = null;

function navigate(tabId, pendingTab = "") {
  if (pendingTab) try { sessionStorage.setItem("nexlab.pending.active-tab", pendingTab); } catch {}
  try {
    globalThis.dispatchEvent(new CustomEvent("nexlab:navigate-record", {
      detail: { tabId, id: "", entityType: tabId === "pendencias" ? "my_day" : "dashboard_shortcut", groupLabel: tabId === "pendencias" ? "Meu Dia" : "Dashboard", source: "dashboard-isolated" }
    }));
  } catch {}
}

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
body[data-nexlab-page="dashboard"] .nexlab-dashboard-overview>.module-shell.nexlab-dashboard-isolated-v02682,
body[data-nexlab-page="dashboard"] .nexlab-dashboard-overview .module-shell.nexlab-dashboard-isolated-v02682{
  display:flex!important;flex-direction:column!important;gap:18px!important;min-width:0!important;
}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-legacy-hero-v02682{display:none!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-top-row-v02682{
  order:1;display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,280px);gap:16px;align-items:stretch;min-width:0;
}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-summary{
  margin:0!important;min-height:126px!important;display:grid!important;grid-template-columns:minmax(160px,1fr) auto auto!important;gap:18px!important;align-items:center!important;
  padding:18px 20px!important;border:1px solid #dbe4ef!important;border-radius:18px!important;background:rgba(255,255,255,.96)!important;
  box-shadow:0 4px 18px rgba(15,35,65,.035)!important;
}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-copy{min-width:0!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-copy h2{margin:0!important;color:#08234b!important;font-size:1.02rem!important;font-weight:900!important;line-height:1.2!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stats{display:flex!important;gap:9px!important;align-items:stretch!important;flex-wrap:nowrap!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat{
  min-width:92px!important;min-height:70px!important;display:grid!important;place-content:center!important;gap:3px!important;padding:10px 12px!important;
  border:1px solid #e0e7f0!important;border-radius:14px!important;background:#fff!important;color:#16335c!important;text-align:center!important;cursor:pointer!important;
}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat strong{font-size:1.05rem!important;font-weight:900!important;line-height:1!important;color:#071f48!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat span{font-size:.66rem!important;font-weight:800!important;color:#60718a!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat.is-danger{border-color:#fecaca!important;background:#fff7f7!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat.is-danger strong{color:#dc2626!important}
body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-open{
  min-height:44px!important;padding:0 17px!important;border:0!important;border-radius:12px!important;background:#082b5f!important;color:#fff!important;font-size:.72rem!important;font-weight:900!important;white-space:nowrap!important;cursor:pointer!important;
}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-v02682{
  min-height:126px;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:14px;align-items:center;padding:18px;
  border:1px solid #dbe4ef;border-radius:18px;background:rgba(255,255,255,.96);box-shadow:0 4px 18px rgba(15,35,65,.035);
}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-copy-v02682{min-width:0}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-label-v02682{display:block;margin-bottom:7px;color:#6980a0;font-size:.63rem;font-weight:900;text-transform:uppercase;letter-spacing:.055em}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-value-v02682{display:flex;align-items:center;gap:8px;color:#0b2a63;font-size:.85rem;font-weight:900}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-dot-v02682{width:8px;height:8px;border-radius:999px;background:#84cc16;box-shadow:0 0 0 4px rgba(132,204,22,.12)}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-date-v02682{min-width:58px;display:grid;place-items:center;padding:10px 8px;border:1px solid #dfe7f1;border-radius:13px;background:#f8fbff;color:#0b2a63}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-date-v02682 strong{font-size:1.1rem;line-height:1;font-weight:900}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-date-v02682 span{margin-top:4px;font-size:.62rem;font-weight:900;text-transform:uppercase}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-summary-grid-v02682{order:2!important;gap:12px!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-summary-grid-v02682>button{min-height:86px!important;padding:15px!important;border-radius:16px!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-operational-v02682{order:3!important;gap:16px!important}
body[data-nexlab-page="dashboard"] .dashboard-teams-v02650{order:4!important;margin-top:0!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-hide-subtitle-v02682{display:none!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-feed-header p{display:none!important}
body[data-nexlab-page="dashboard"] .nexlab-dashboard-switcher{margin-bottom:16px!important}
@media(max-width:980px){
  body[data-nexlab-page="dashboard"] .nexlab-dashboard-top-row-v02682{grid-template-columns:minmax(0,1fr) 220px}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-summary{grid-template-columns:1fr!important;gap:13px!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stats{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;width:100%!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat{min-width:0!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-open{width:100%!important}
}
@media(max-width:720px){
  body[data-nexlab-page="dashboard"] .nexlab-dashboard-top-row-v02682{grid-template-columns:1fr!important}
  body[data-nexlab-page="dashboard"] .nexlab-dashboard-status-v02682{min-height:auto!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stats{grid-template-columns:repeat(3,minmax(0,1fr))!important}
  body[data-nexlab-page="dashboard"] .nexlab-dashboard-summary-grid-v02682{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  body[data-nexlab-page="dashboard"] .nexlab-dashboard-operational-v02682{grid-template-columns:1fr!important}
}
@media(max-width:420px){
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-summary{padding:15px!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat{padding:9px 6px!important}
  body[data-nexlab-page="dashboard"] .nexlab-myday-dashboard-stat span{font-size:.6rem!important}
}
@media(prefers-reduced-motion:reduce){body[data-nexlab-page="dashboard"] *{scroll-behavior:auto!important}}
`;
  document.head.appendChild(style);
}

function findOverviewShell() {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return null;
  return document.querySelector("#nexlab-main-content .nexlab-dashboard-overview > .module-shell")
    || document.querySelector("#nexlab-main-content .nexlab-dashboard-overview .module-shell")
    || document.querySelector("main .nexlab-dashboard-overview > .module-shell");
}

function extractStatus(hero) {
  if (!hero) return "—";
  const labels = [...hero.querySelectorAll("span")];
  const marker = labels.find(el => el.textContent?.trim().toLowerCase() === "status do lab");
  const parent = marker?.parentElement;
  if (parent) {
    const candidates = [...parent.querySelectorAll("span")]
      .map(el => el.textContent?.trim() || "")
      .filter(text => text && text.toLowerCase() !== "status do lab");
    if (candidates.length) return candidates[candidates.length - 1];
  }
  const raw = hero.innerText || "";
  const match = raw.match(/Status do Lab\s*\n?\s*([^\n]+)/i);
  return match?.[1]?.trim() || "—";
}

function ensureTopRow(shell, hero) {
  let row = shell.querySelector(":scope > .nexlab-dashboard-top-row-v02682");
  if (!row) {
    row = document.createElement("section");
    row.className = "nexlab-dashboard-top-row-v02682";
    row.setAttribute("aria-label", "Resumo do Dashboard");
    shell.prepend(row);
  }
  let status = row.querySelector(".nexlab-dashboard-status-v02682");
  if (!status) {
    status = document.createElement("aside");
    status.className = "nexlab-dashboard-status-v02682";
    row.append(status);
  }
  const now = new Date();
  const value = extractStatus(hero);
  status.innerHTML = `<div class="nexlab-dashboard-status-copy-v02682"><span class="nexlab-dashboard-status-label-v02682">Status do Lab</span><strong class="nexlab-dashboard-status-value-v02682"><i class="nexlab-dashboard-status-dot-v02682" aria-hidden="true"></i><span></span></strong></div><div class="nexlab-dashboard-status-date-v02682"><strong>${now.getDate()}</strong><span>${now.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span></div>`;
  status.querySelector(".nexlab-dashboard-status-value-v02682 span").textContent = value;
  return row;
}

function markSubtitleNodes(shell) {
  const patterns = [
    /^Visão geral da estrutura/i,
    /^Acompanhamento de projetos/i,
    /^Histórico recente de operações/i,
    /^Acompanhe seus projetos/i,
    /^Painel operacional para o perfil/i
  ];
  shell.querySelectorAll("p").forEach(node => {
    const text = node.textContent?.trim() || "";
    if (patterns.some(pattern => pattern.test(text))) node.classList.add("nexlab-dashboard-hide-subtitle-v02682");
  });
}

function enhanceLayout() {
  injectStyles();
  const shell = findOverviewShell();
  if (!shell) return false;
  shell.classList.add("nexlab-dashboard-isolated-v02682");
  const children = [...shell.children];
  const hero = children.find(el => el.textContent?.includes("Status do Lab") && (el.querySelector("h1") || el.textContent?.includes("Olá,")));
  if (hero) hero.classList.add("nexlab-dashboard-legacy-hero-v02682");
  const row = ensureTopRow(shell, hero);
  const myDay = document.getElementById(CARD_ID);
  if (myDay && myDay.parentElement !== row) row.prepend(myDay);

  const currentChildren = [...shell.children].filter(el => el !== row && el !== hero);
  const summary = currentChildren.find(el => {
    const text = el.textContent || "";
    return el.tagName === "DIV" && el.querySelectorAll(":scope > button").length >= 3 && /equipes|projetos|reuniões|pendências/i.test(text);
  });
  if (summary) summary.classList.add("nexlab-dashboard-summary-grid-v02682");

  const operational = currentChildren.find(el => /Ações recomendadas/i.test(el.textContent || ""));
  if (operational) operational.classList.add("nexlab-dashboard-operational-v02682");

  const teams = shell.querySelector(":scope > .dashboard-teams-v02650");
  if (teams) teams.classList.add("nexlab-dashboard-teams-isolated-v02682");
  markSubtitleNodes(shell);
  return true;
}

function createStat(label, value, tab, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `nexlab-myday-dashboard-stat${danger ? " is-danger" : ""}`;
  button.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
  button.addEventListener("click", () => navigate("pendencias", tab));
  return button;
}

function render(summary) {
  const shell = findOverviewShell();
  if (!shell) return false;
  let card = document.getElementById(CARD_ID);
  if (!card) {
    card = document.createElement("section");
    card.id = CARD_ID;
    card.className = "nexlab-myday-dashboard-summary";
    card.setAttribute("aria-labelledby", `${CARD_ID}-title`);
  }

  const tasks = Number(summary?.tasks || 0);
  const meetings = Number(summary?.meetings || 0);
  const overdue = Number(summary?.overdue || 0);
  const signature = [tasks, meetings, overdue].join(":");
  if (card.dataset.signature !== signature) {
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
    stats.append(
      createStat("Tarefas", tasks, "tasks"),
      createStat("Reuniões", meetings, "meetings"),
      createStat("Atrasados", overdue, "overdue", overdue > 0)
    );
    const action = document.createElement("button");
    action.type = "button";
    action.className = "nexlab-myday-dashboard-open";
    action.textContent = "Abrir Meu Dia →";
    action.addEventListener("click", () => navigate("pendencias", "overview"));
    card.append(copy, stats, action);
    lastSignature = signature;
  }
  enhanceLayout();
  return true;
}

function renderUnavailable() {
  const shell = findOverviewShell();
  if (!shell) return;
  render({ tasks: "—", meetings: "—", overdue: "—" });
  const card = document.getElementById(CARD_ID);
  if (!card) return;
  card.querySelectorAll(".nexlab-myday-dashboard-stat strong").forEach(node => node.textContent = "—");
}

async function loadSummary() {
  if (document.body?.dataset?.nexlabPage !== "dashboard") return;
  if (!findOverviewShell()) return;
  try {
    const { data, error } = await supabase.rpc("nexlab_get_my_day_summary_v1", { p_horizon_days: 7 });
    if (error || !data?.ok) throw error || new Error("Resumo indisponível");
    render(data);
  } catch {
    if (!lastSignature) renderUnavailable();
    else enhanceLayout();
  }
}

function schedule(delay = 120) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => { void loadSummary(); }, delay);
}

function scheduleLayout(delay = 60) {
  clearTimeout(layoutTimer);
  layoutTimer = setTimeout(() => { try { enhanceLayout(); } catch {} }, delay);
}

function observeMainContent() {
  if (mainObserver) return;
  const main = document.getElementById("nexlab-main-content");
  if (!main) return;
  mainObserver = new MutationObserver(() => {
    if (document.body?.dataset?.nexlabPage === "dashboard") {
      scheduleLayout(50);
      schedule(120);
    }
  });
  mainObserver.observe(main, { childList: true, subtree: true });
}

function startObservers() {
  injectStyles();
  if (!document.body || pageObserver) return;
  pageObserver = new MutationObserver(records => {
    if (!records.some(record => record.type === "attributes" && record.attributeName === "data-nexlab-page")) return;
    observeMainContent();
    if (document.body?.dataset?.nexlabPage === "dashboard") { scheduleLayout(30); schedule(90); }
  });
  pageObserver.observe(document.body, { attributes: true, attributeFilter: ["data-nexlab-page"] });
  observeMainContent();
  if (document.body?.dataset?.nexlabPage === "dashboard") { scheduleLayout(30); schedule(120); }
}

globalThis.addEventListener("nexlab:myday-updated", event => {
  if (document.body?.dataset?.nexlabPage === "dashboard" && event?.detail) render(event.detail);
});
globalThis.addEventListener("nexlab:network-status", () => schedule(250));
globalThis.addEventListener("nexlab:application-ready", () => { scheduleLayout(40); schedule(120); });
globalThis.addEventListener("popstate", () => { scheduleLayout(50); schedule(100); });
globalThis.addEventListener("hashchange", () => { scheduleLayout(50); schedule(100); });

document.readyState === "loading"
  ? document.addEventListener("DOMContentLoaded", startObservers, { once: true })
  : startObservers();
