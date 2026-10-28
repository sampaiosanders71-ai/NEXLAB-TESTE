import { g as React, S as ReactDOM, Ln as supabase } from "./nexlab-runtime-vendor.js?v=app-beta-0-26-82-ajuda-historicos-interface";
const CATEGORIES = { operational: [["projects", "Projetos"], ["teams", "Equipes"], ["asset_changes", "Altera\xE7\xF5es de patrim\xF4nio"], ["asset_movements", "Movimenta\xE7\xF5es de patrim\xF4nio"], ["asset_maintenance", "Manuten\xE7\xF5es conclu\xEDdas"], ["stock", "Movimenta\xE7\xF5es de estoque"], ["bookings", "Reservas e reuni\xF5es"], ["feedback", "Feedbacks"], ["users", "V\xEDnculos de usu\xE1rios"], ["permissions", "Permiss\xF5es"], ["reports", "Exporta\xE7\xF5es de relat\xF3rios"], ["activities", "Atividades operacionais"]], technical: [["system", "Eventos do sistema"], ["errors", "Ocorr\xEAncias de erros"], ["cron", "Execu\xE7\xF5es conclu\xEDdas de rotinas"]] };
const DEFAULT_CATEGORY = { projetos: "projects", planejamentos: "projects", equipes: "teams", inventario: "asset_movements", estoque: "stock", patrimonio: "asset_movements", reserva: "bookings", feedback: "feedback", participantes: "users", permissoes: "permissions", relatorios: "reports" };
const dateText = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Data indispon\xEDvel" : d.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
};
async function rpc(name, payload) {
  const { data, error } = await supabase.rpc(name, payload);
  if (error) throw error;
  if (!data?.ok) throw Error("N\xE3o foi poss\xEDvel concluir a opera\xE7\xE3o.");
  return data;
}
function HistoryIcon({ name, className = "" }) {
  const paths = { shield: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" }), /* @__PURE__ */ React.createElement("path", { d: "m8 12 3 3 5-6" })), search: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("circle", { cx: "10.5", cy: "10.5", r: "6.5" }), /* @__PURE__ */ React.createElement("path", { d: "m16 16 4 4" })), inbox: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("path", { d: "M4 5h16l2 12v3H2v-3L4 5Z" }), /* @__PURE__ */ React.createElement("path", { d: "M2 14h6l2 3h4l2-3h6" })), database: /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("ellipse", { cx: "10", cy: "5", rx: "7", ry: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M3 5v12c0 4 14 4 14 0V5M3 11c0 4 14 4 14 0" }), /* @__PURE__ */ React.createElement("path", { d: "M17 14h6m-5 0v7h4v-7" })), close: /* @__PURE__ */ React.createElement("path", { d: "m6 6 12 12M18 6 6 18" }) };
  return /* @__PURE__ */ React.createElement("svg", { className, width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true" }, paths[name] || paths.shield);
}
function HistoryView({ dialogRef, close, busy, mode, setMode, group, switchGroup, category, setCategory, search, setSearch, before, setBefore, notice, error, confirmation, setConfirmation, analysis, selected, setSelected, reason, setReason, word, setWord, cancel, execute, categoryLabel, selectionBox, all, loading, data, current, pages, page, setPage, load, analyze }) {
  return /* @__PURE__ */ React.createElement("dialog", { ref: dialogRef, className: "nxl-history-dialog", "data-history-group": group, "aria-label": "Gerenciar hist\xF3ricos e limpeza manual", onCancel: (e) => {
    e.preventDefault();
    close();
  }, onClick: (e) => {
    if (e.target === e.currentTarget) close();
  } }, /* @__PURE__ */ React.createElement("header", null, /* @__PURE__ */ React.createElement("h2", null, "Hist\xF3ricos e limpeza manual"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-label": "Fechar gerenciamento de hist\xF3ricos", onClick: close, disabled: busy }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "close" }))), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-body" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-topbar" }, /* @__PURE__ */ React.createElement("nav", { className: "nxl-history-tabs", "aria-label": "Ferramentas de manuten\xE7\xE3o" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": mode === "history", onClick: () => setMode("history"), disabled: busy || !!confirmation }, "Hist\xF3ricos"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": mode === "cleanup", onClick: () => setMode("cleanup"), disabled: busy || !!confirmation }, "Registros exclu\xEDdos")), mode === "history" && !confirmation && /* @__PURE__ */ React.createElement("div", { className: "nxl-history-tabs nxl-history-groups", role: "group", "aria-label": "Tipo de hist\xF3rico" }, /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": group === "operational", onClick: () => switchGroup("operational") }, "Operacionais"), /* @__PURE__ */ React.createElement("button", { type: "button", "aria-pressed": group === "technical", onClick: () => switchGroup("technical") }, "T\xE9cnicos"))), notice && /* @__PURE__ */ React.createElement("p", { className: "nxl-history-success", role: "status" }, notice), error && /* @__PURE__ */ React.createElement("p", { className: "nxl-history-error", role: "alert" }, error), confirmation ? /* @__PURE__ */ React.createElement("section", { className: "nxl-history-confirm", "aria-label": "Confirmar exclus\xE3o manual" }, /* @__PURE__ */ React.createElement("h3", null, confirmation === "cleanup" ? "Confirmar limpeza dos res\xEDduos?" : "Excluir os hist\xF3ricos selecionados?"), /* @__PURE__ */ React.createElement("p", null, confirmation === "cleanup" ? `${analysis.total} refer\xEAncias de registros j\xE1 exclu\xEDdos e ${analysis.related_history} registros relacionados de hist\xF3rico foram identificados.` : `${selected.length} registros de \u201C${categoryLabel}\u201D ser\xE3o exclu\xEDdos permanentemente. Os registros dos m\xF3dulos continuam preservados.`), confirmation === "delete" && /* @__PURE__ */ React.createElement("label", null, "Motivo da exclus\xE3o", /* @__PURE__ */ React.createElement("textarea", { "aria-label": "Motivo da exclus\xE3o", value: reason, onChange: (e) => setReason(e.target.value), minLength: 10, maxLength: 300, disabled: busy, placeholder: "Descreva o motivo, com pelo menos 10 caracteres" })), /* @__PURE__ */ React.createElement("label", null, "Digite ", confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR", " para confirmar", /* @__PURE__ */ React.createElement("input", { "aria-label": "Digite " + (confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR") + " para confirmar", value: word, onChange: (e) => setWord(e.target.value), autoComplete: "off", disabled: busy })), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-actions" }, /* @__PURE__ */ React.createElement("button", { type: "button", ref: cancel, onClick: () => setConfirmation(null), disabled: busy }, "Cancelar"), /* @__PURE__ */ React.createElement("button", { className: "is-danger", type: "button", onClick: execute, disabled: busy || word !== (confirmation === "cleanup" ? "LIMPAR" : "EXCLUIR") || confirmation === "delete" && reason.trim().length < 10 }, busy ? "Excluindo\u2026" : confirmation === "cleanup" ? "Limpar res\xEDduos" : "Excluir selecionados"))) : mode === "history" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-filters" }, /* @__PURE__ */ React.createElement("label", null, "Hist\xF3rico", /* @__PURE__ */ React.createElement("select", { "aria-label": "Hist\xF3rico", value: category, onChange: (e) => setCategory(e.target.value) }, CATEGORIES[group].map(([id, label]) => /* @__PURE__ */ React.createElement("option", { key: id, value: id }, label)))), /* @__PURE__ */ React.createElement("label", null, "Pesquisar", /* @__PURE__ */ React.createElement("span", { className: "nxl-history-search" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "search" }), /* @__PURE__ */ React.createElement("input", { type: "search", value: search, onChange: (e) => setSearch(e.target.value), placeholder: "Pesquisar no hist\xF3rico" }))), /* @__PURE__ */ React.createElement("label", null, "At\xE9 o dia", /* @__PURE__ */ React.createElement("input", { type: "date", value: before, onChange: (e) => setBefore(e.target.value) }))), /* @__PURE__ */ React.createElement("p", { className: "nxl-history-note" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "shield" }), /* @__PURE__ */ React.createElement("span", null, group === "technical" ? "A sele\xE7\xE3o t\xE9cnica \xE9 independente da operacional. A auditoria de seguran\xE7a \xE9 protegida contra exclus\xE3o. Rotinas em execu\xE7\xE3o ficam preservadas." : "A exclus\xE3o remove apenas os hist\xF3ricos selecionados. Manuten\xE7\xF5es em andamento ficam preservadas.")), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-selection" }, /* @__PURE__ */ React.createElement("label", null, /* @__PURE__ */ React.createElement("input", { ref: selectionBox, type: "checkbox", checked: all, disabled: loading || !data.rows.length, onChange: (e) => setSelected(e.target.checked ? data.rows.map(({ id, fingerprint }) => ({ id, fingerprint })) : []) }), "Selecionar esta p\xE1gina"), /* @__PURE__ */ React.createElement("button", { className: "is-danger", type: "button", disabled: !selected.length || loading, onClick: () => setConfirmation("delete") }, "Excluir selecionados (", selected.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "nxl-history-list", "aria-busy": loading }, loading ? /* @__PURE__ */ React.createElement("p", { className: "nxl-history-empty", role: "status" }, "Carregando hist\xF3ricos\u2026") : data.rows.length ? data.rows.map((row) => /* @__PURE__ */ React.createElement("label", { key: row.id, className: "nxl-history-row" }, /* @__PURE__ */ React.createElement("input", { type: "checkbox", "aria-label": "Selecionar hist\xF3rico " + row.id, checked: selected.some((s) => s.id === row.id), onChange: (e) => setSelected((rows) => e.target.checked ? [...rows, { id: row.id, fingerprint: row.fingerprint }] : rows.filter((s) => s.id !== row.id)) }), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-row-copy" }, /* @__PURE__ */ React.createElement("strong", null, row.title), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-meta" }, row.summary && /* @__PURE__ */ React.createElement("small", { className: "nxl-history-summary", title: String(row.summary) }, row.summary), /* @__PURE__ */ React.createElement("span", { className: "nxl-history-id" }, "Refer\xEAncia: ", row.id))), /* @__PURE__ */ React.createElement("time", { dateTime: row.at || void 0 }, dateText(row.at)))) : /* @__PURE__ */ React.createElement("div", { className: "nxl-history-empty" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "inbox" }), /* @__PURE__ */ React.createElement("p", null, "Nenhum hist\xF3rico encontrado neste filtro."))), /* @__PURE__ */ React.createElement("footer", null, /* @__PURE__ */ React.createElement("span", null, data.total, " registros \xB7 P\xE1gina ", current, " de ", pages), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current <= 1 || loading, onClick: () => {
    setSelected([]);
    setPage(page - 1);
  } }, "Anterior"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: current >= pages || loading, onClick: () => {
    setSelected([]);
    setPage(page + 1);
  } }, "Pr\xF3xima"), /* @__PURE__ */ React.createElement("button", { type: "button", disabled: loading, onClick: () => load() }, "Atualizar lista")))) : /* @__PURE__ */ React.createElement("section", { className: "nxl-history-cleanup" }, /* @__PURE__ */ React.createElement("div", { className: "nxl-history-cleanup-heading" }, /* @__PURE__ */ React.createElement("h3", null, /* @__PURE__ */ React.createElement("span", { className: "nxl-history-cleanup-icon" }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "database" })), "Limpeza de registros j\xE1 exclu\xEDdos"), /* @__PURE__ */ React.createElement("button", { type: "button", className: "is-primary", disabled: busy, onClick: analyze }, /* @__PURE__ */ React.createElement(HistoryIcon, { name: "search" }), busy ? "Analisando\u2026" : "Analisar res\xEDduos de exclus\xE3o")), analysis && /* @__PURE__ */ React.createElement("div", { className: "nxl-history-analysis" }, /* @__PURE__ */ React.createElement("h4", null, analysis.total ? "Res\xEDduos identificados" : "Nenhum res\xEDduo remov\xEDvel encontrado"), /* @__PURE__ */ React.createElement("dl", null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Refer\xEAncias de links"), /* @__PURE__ */ React.createElement("dd", null, analysis.links)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Reservas sem registro de origem"), /* @__PURE__ */ React.createElement("dd", null, analysis.bookings)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("dt", null, "Hist\xF3ricos relacionados"), /* @__PURE__ */ React.createElement("dd", null, analysis.related_history))), /* @__PURE__ */ React.createElement("p", null, "At\xE9 ", analysis.batch_limit, " refer\xEAncias por opera\xE7\xE3o. Arquivados com registro de origem, registros ativos, arquivos do Storage e auditoria de seguran\xE7a ficam preservados."), /* @__PURE__ */ React.createElement("button", { type: "button", className: "is-danger", disabled: !analysis.total || busy, onClick: () => setConfirmation("cleanup") }, "Limpar res\xEDduos identificados (", analysis.total, ")")))));
}

function HistoryPanel({ initialMode, initialCategory, onClose }) {
  const [mode, setMode] = React.useState(initialMode), [group, setGroup] = React.useState(initialCategory === "system" ? "technical" : "operational"), [category, setCategory] = React.useState(initialCategory), [search, setSearch] = React.useState(""), [query, setQuery] = React.useState(""), [before, setBefore] = React.useState(""), [page, setPage] = React.useState(1), [data, setData] = React.useState({ rows: [], total: 0 }), [loading, setLoading] = React.useState(false), [error, setError] = React.useState(""), [selected, setSelected] = React.useState([]), [confirmation, setConfirmation] = React.useState(null), [reason, setReason] = React.useState(""), [word, setWord] = React.useState(""), [busy, setBusy] = React.useState(false), [notice, setNotice] = React.useState(""), [analysis, setAnalysis] = React.useState(null);
  const dialog = React.useRef(null), alive = React.useRef(true), sequence = React.useRef(0), lock = React.useRef(false), live = React.useRef(null), cancel = React.useRef(null), selectionBox = React.useRef(null);
  React.useEffect(() => {
    alive.current = true;
    dialog.current.showModal();
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, []);
  React.useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  React.useEffect(() => {
    setSelected([]);
    setConfirmation(null);
    setWord("");
    setReason("");
    setPage(1);
  }, [group, category, query, before, mode]);
  const load = React.useCallback(async (background = false) => {
    if (mode !== "history") return;
    const token = ++sequence.current;
    if (!background) setLoading(true);
    setError("");
    try {
      const next = await rpc("nexlab_history_maintenance_v02682", { p_action: "list", p_payload: { category, page, search: query, before } });
      if (!alive.current || token !== sequence.current) return;
      setData(next);
      if (!next.rows.length && page > 1) setPage(Math.max(1, Math.ceil(next.total / 25)));
    } catch (e) {
      if (alive.current && token === sequence.current) setError(e.message || "Falha ao carregar hist\xF3ricos.");
      if (background) throw e;
    } finally {
      if (alive.current && token === sequence.current) setLoading(false);
    }
  }, [mode, category, page, query, before]);
  React.useEffect(() => {
    load();
  }, [load]);
  live.current = { load, blocked: () => loading || lock.current || selected.length > 0 || !!confirmation };
  React.useEffect(() => {
    if (mode !== "history") return;
    return globalThis.__NEXLAB_REALTIME_CORE__?.watch?.(["nexlab_history_revision_v02682"], () => live.current.load(true), { scope: "manual-history-" + category, filters: { nexlab_history_revision_v02682: "category=eq." + category }, blocked: () => live.current.blocked() });
  }, [category, mode]);
  React.useEffect(() => {
    if (selectionBox.current) selectionBox.current.indeterminate = selected.length > 0 && selected.length < data.rows.length;
  }, [selected, data.rows]);
  React.useEffect(() => {
    if (confirmation) {
      setWord("");
      setReason("");
      requestAnimationFrame(() => cancel.current?.focus());
    }
  }, [confirmation]);
  const close = () => {
    if (lock.current) return;
    if (confirmation) {
      setConfirmation(null);
      return;
    }
    onClose();
  };
  const pages = Math.max(1, Math.ceil(data.total / 25)), current = Math.min(page, pages), all = data.rows.length > 0 && selected.length === data.rows.length;
  const switchGroup = (value) => {
    setGroup(value);
    setCategory(CATEGORIES[value][0][0]);
    setSearch("");
    setQuery("");
    setPage(1);
  };
  async function analyze() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const next = await rpc("nexlab_deleted_residue_maintenance_v02682", { p_execute: false });
      if (alive.current) setAnalysis(next);
    } catch (e) {
      if (alive.current) setError(e.message);
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function execute() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const next = confirmation === "cleanup" ? await rpc("nexlab_deleted_residue_maintenance_v02682", { p_execute: true, p_token: analysis.token, p_confirmation: word }) : await rpc("nexlab_history_maintenance_v02682", { p_action: "delete", p_payload: { category, rows: selected, reason, confirmation: word } });
      if (!alive.current) return;
      setNotice(confirmation === "cleanup" ? `${next.affected_rows} registros residuais removidos.` : `${next.deleted_count} registros de hist\xF3rico exclu\xEDdos.`);
      setConfirmation(null);
      setSelected([]);
      setAnalysis(null);
      await load();
      globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({ table: "team_history", eventType: "MANUAL_HISTORY_DELETE" });
      globalThis.dispatchEvent(new CustomEvent("nexlab:history-maintenance-completed", { detail: { category } }));
    } catch (e) {
      if (alive.current) setError(e.message || "N\xE3o foi poss\xEDvel excluir.");
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const categoryLabel = [...CATEGORIES.operational, ...CATEGORIES.technical].find(([k]) => k === category)?.[1] || category;
  return React.createElement(HistoryView, {dialogRef:dialog,close,busy,mode,setMode,group,switchGroup,category,setCategory,search,setSearch,before,setBefore,notice,error,confirmation,setConfirmation,analysis,selected,setSelected,reason,setReason,word,setWord,cancel,execute,categoryLabel,selectionBox,all,loading,data,current,pages,page,setPage,load,analyze});
}
function useHistoryMaintenance(profile, tab) {
  React.useEffect(() => {
    if (!profile?.id || !["admin", "administrador"].includes(String(profile.role).toLowerCase())) return;
    const main = document.querySelector("main");
    if (!main) return;
    const supported = DEFAULT_CATEGORY[tab] || ["atividades-sistema", "logs", "saude-sistema"].includes(tab);
    if (!supported) return;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = ReactDOM.createRoot(host);
    let trigger = null, frame = null;
    const close = () => {
      root.render(null);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
    const launch = (mode, category, event) => {
      event?.preventDefault();
      event?.stopPropagation();
      trigger = event?.currentTarget;
      root.render(/* @__PURE__ */ React.createElement(HistoryPanel, { key: Date.now(), initialMode: mode, initialCategory: category, onClose: close }));
    };
    function makeButton(mode, category, label) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "nxl-history-open";
      b.textContent = label;
      b.dataset.nexlabHistoryTool = "true";
      b.addEventListener("click", (e) => launch(mode, category, e));
      return b;
    }
    function bind() {
      frame = null;
      if (!main.isConnected) return;
      if (!main.querySelector(".nxl-history-toolbar")) {
        const bar = document.createElement("div");
        bar.className = "nxl-history-toolbar";
        bar.appendChild(makeButton("history", DEFAULT_CATEGORY[tab] || "system", "Gerenciar hist\xF3ricos"));
        if (["atividades-sistema", "logs", "saude-sistema"].includes(tab)) bar.appendChild(makeButton("cleanup", "system", "Limpeza de registros exclu\xEDdos"));
        main.prepend(bar);
      }
      for (const heading of main.querySelectorAll("h2,h3")) if (/histórico|históricos|movimentações/i.test(heading.textContent) && !heading.querySelector("[data-nexlab-history-tool]")) heading.appendChild(makeButton("history", DEFAULT_CATEGORY[tab] || "system", "Selecionar e excluir"));
    }
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(bind);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(main, { subtree: true, childList: true });
    bind();
    const updated = () => {
      globalThis.dispatchEvent(new CustomEvent("nexlab:retry-module", { detail: { module: tab } }));
    };
    globalThis.addEventListener("nexlab:history-maintenance-completed", updated);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
      root.unmount();
      host.remove();
      main.querySelectorAll(".nxl-history-toolbar,[data-nexlab-history-tool]").forEach((e) => e.remove());
      globalThis.removeEventListener("nexlab:history-maintenance-completed", updated);
    };
  }, [profile?.id, profile?.role, tab]);
}
export {
  useHistoryMaintenance
};
