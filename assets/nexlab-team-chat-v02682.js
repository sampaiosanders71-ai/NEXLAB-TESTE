(function(){
  'use strict';

  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-homologacao-consistente'});
  const REVISION=BUILD.revision;
  if(globalThis.__NEXLAB_TEAM_CHAT__?.revision===REVISION)return;

  const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const PANEL_SELECTOR='.team-details-v2680[data-nexlab-team-id]';
  const CONTENT_SELECTOR='.team-details-v2680__content';
  const HEADER_SELECTOR='.team-details-v2680__header';
  const WORKER_FALLBACK='https://nexlab-communication.sampaiosanders71.workers.dev';
  const PAGE_SIZE=30;
  const states=new WeakMap();
  const stateByTeamId=new Map();
  let profilesPromise=null;
  let observerScheduled=false;
  let pendingNotification=null;
  let notificationPromise=null;

  function client(){return globalThis.__NEXLAB_SUPABASE__||null;}
  function workerUrl(){return String(globalThis.__NEXLAB_CONFIG__?.endpoints?.communication||WORKER_FALLBACK).replace(/\/+$/,'');}
  function isUuid(value){return UUID_RE.test(String(value||''));}
  function clean(value,max=4000){return String(value??'').trim().slice(0,max);}
  function initials(name){return clean(name,80).split(/\s+/).filter(Boolean).slice(0,2).map(v=>v[0]?.toUpperCase()||'').join('')||'U';}
  function roleLabel(role){return ({admin:'Admin',administrador:'Admin',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'}[String(role||'').toLowerCase()]||'Usuário');}
  function formatDate(value){if(!value)return 'Agora';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value));}catch{return '—';}}
  function chatDayKey(value){try{const d=new Date(value);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}catch{return 'unknown';}}
  function chatDayLabel(value){try{const d=new Date(value),now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),target=new Date(d.getFullYear(),d.getMonth(),d.getDate()),days=Math.round((today-target)/86400000);if(days===0)return 'Hoje';if(days===1)return 'Ontem';return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short',year:d.getFullYear()!==now.getFullYear()?'numeric':undefined}).format(d).replace('.','');}catch{return 'Mensagens';}}

  function node(tag,className,text){const el=document.createElement(tag);if(className)el.className=className;if(text!=null)el.textContent=String(text);return el;}
  const TEAM_COLOR_VALUES_V02682=Object.freeze({blue:'#2563eb',orange:'#f97316',green:'#16a34a',purple:'#7c3aed',cyan:'#0891b2',pink:'#db2777',amber:'#d97706'});
  const TEAM_ICON_KEYS_V02682=new Set(['users','code-2','monitor-cog','megaphone','messages-square','palette','clipboard-list','briefcase-business','circle-dollar-sign','microscope','lightbulb','graduation-cap','calendar-days','target','chart-no-axes-combined','headset','files','badge-check','compass','settings']);
  function teamIdentity(state){const panel=state?.panel;const iconKey=TEAM_ICON_KEYS_V02682.has(String(panel?.dataset?.nexlabTeamIcon||''))?String(panel.dataset.nexlabTeamIcon):'users';const colorKey=TEAM_COLOR_VALUES_V02682[String(panel?.dataset?.nexlabTeamColor||'')]?String(panel.dataset.nexlabTeamColor):'blue';return {iconKey,colorKey,color:TEAM_COLOR_VALUES_V02682[colorKey],name:clean(panel?.dataset?.nexlabTeamName||'Equipe',120)||'Equipe'};}
  function teamIdentityIcon(state,size=26){const identity=teamIdentity(state);const icon=node('span','nexlab-team-chat-identity-icon-v02682');icon.setAttribute('aria-hidden','true');icon.style.width=`${size}px`;icon.style.height=`${size}px`;icon.style.setProperty('--nexlab-team-chat-icon-mask',`url(./assets/team-icons/${identity.iconKey}.svg?v=app-beta-0-26-82-homologacao-consistente)`);icon.style.setProperty('--nexlab-team-chat-accent',identity.color);return icon;}
  function profile(state,id){return state.profiles?.get?.(String(id))||null;}
  function profileName(state,id){return profile(state,id)?.nome||'Usuário';}

  function toast(message,type='info'){
    try{globalThis.dispatchEvent(new CustomEvent('nexlab:toast',{detail:{text:message,type}}));}catch{}
  }

  async function waitClient(timeout=12000){
    const started=Date.now();
    while(Date.now()-started<timeout){const c=client();if(c?.auth)return c;await new Promise(resolve=>setTimeout(resolve,80));}
    throw new Error('Cliente do NEXLAB não ficou disponível.');
  }

  async function session(){
    const c=await waitClient();
    const result=await c.auth.getSession();
    if(result?.error)throw result.error;
    const current=result?.data?.session||null;
    if(!current?.access_token)throw new Error('Sessão expirada. Entre novamente no NEXLAB.');
    return current;
  }

  async function api(path,options={},retry=true){
    const current=await session();
    const headers=new Headers(options.headers||{});
    headers.set('Authorization',`Bearer ${current.access_token}`);
    headers.set('Accept','application/json');
    if(options.body!=null&&!headers.has('Content-Type'))headers.set('Content-Type','application/json');
    let response;
    try{
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),15000);
      try{response=await fetch(workerUrl()+path,{...options,headers,signal:controller.signal,cache:'no-store'});}finally{clearTimeout(timer);}
    }catch(error){
      if(error?.name==='AbortError')throw new Error('O serviço de conversa demorou para responder.');
      throw new Error(navigator.onLine===false?'Sem conexão com a internet.':'Não foi possível acessar o serviço de conversa.');
    }
    if(response.status===401&&retry){try{await client()?.auth?.refreshSession?.();}catch{}return api(path,options,false);}
    let data=null;try{data=await response.json();}catch{}
    if(!response.ok){
      const code=String(data?.error||`http_${response.status}`);
      const messages={
        access_denied:'Você não possui acesso à conversa desta equipe.',
        invalid_or_expired_session:'Sua sessão expirou. Entre novamente.',
        team_not_found:'Esta equipe não está mais disponível.',
        invalid_mention_target:'Uma das pessoas mencionadas não possui acesso a esta conversa.',
        mention_validation_denied:'Não foi possível validar as menções.',
        text_too_long:'A mensagem excede o limite permitido.',
        text_required:'Digite uma mensagem antes de enviar.'
      };
      const error=new Error(messages[code]||'Não foi possível concluir a ação.');error.code=code;error.status=response.status;throw error;
    }
    return data;
  }

  async function loadProfiles(){
    if(profilesPromise)return profilesPromise;
    profilesPromise=(async()=>{
      const c=await waitClient();
      const {data,error}=await c.rpc('nexlab_list_profiles_visible_v26311');
      if(error)throw error;
      const map=new Map();for(const row of Array.isArray(data)?data:[]){if(row?.id)map.set(String(row.id),row);}return map;
    })().catch(error=>{profilesPromise=null;console.warn('NEXLAB team chat profiles',error);return new Map();});
    return profilesPromise;
  }

  async function loadAccess(state){
    if(state.accessLoading)return state.accessLoading;
    state.accessLoading=(async()=>{
      const c=await waitClient();
      const [{data,error},profiles,current]=await Promise.all([
        c.rpc('nexlab_get_communication_access_v1',{p_scope:'team',p_scope_id:state.teamId}),
        loadProfiles(),session()
      ]);
      if(error)throw error;
      state.access=Array.isArray(data)?data[0]:data;
      state.profiles=profiles;
      state.currentUserId=String(current.user?.id||'');
      syncNavigation(state);renderComposer(state);
      return state.access;
    })().catch(error=>{state.accessError=error;console.error('NEXLAB team chat access',error);syncNavigation(state);renderComposer(state);return null;}).finally(()=>{state.accessLoading=null;});
    return state.accessLoading;
  }

  function buildTabs(state){
    const nav=node('nav','nexlab-team-tabs-v055');nav.setAttribute('aria-label','Áreas da equipe');nav.setAttribute('role','tablist');
    const tabs=[['overview','Visão geral'],['tasks','Tarefas'],['links','Vínculos'],['conversation','Conversa']];
    for(const [key,label] of tabs){
      const button=node('button','nexlab-team-tab-v055',label);button.type='button';button.dataset.teamTab=key;button.setAttribute('role','tab');button.setAttribute('aria-selected','false');button.addEventListener('click',()=>activateTab(state,key));nav.appendChild(button);
    }
    return nav;
  }

  function buildConversationPanel(state){
    const section=node('section','nexlab-team-chat-v055');section.hidden=true;section.setAttribute('aria-label','Conversa da equipe');
    const head=node('header','nexlab-team-chat-head-v055');
    const identity=teamIdentity(state);const title=node('div','nexlab-team-chat-title-v02682');const copy=node('div','nexlab-team-chat-title-copy-v02682');copy.append(node('h3','', 'Conversa da equipe'),node('p','', identity.name));title.append(teamIdentityIcon(state,26),copy);
    const refresh=node('button','nexlab-team-chat-refresh-v055','Atualizar');refresh.type='button';refresh.addEventListener('click',()=>loadMessages(state,{force:true}));
    head.append(title,refresh);
    const notice=node('div','nexlab-team-chat-message-v055');notice.hidden=true;notice.setAttribute('role','status');
    const older=node('button','nexlab-team-chat-older-v055','Carregar mensagens anteriores');older.type='button';older.hidden=true;older.addEventListener('click',()=>loadOlder(state));
    const list=node('div','nexlab-team-chat-list-v055');list.setAttribute('aria-live','polite');
    const composer=node('div','nexlab-team-chat-composer-slot-v055');
    section.append(head,notice,older,list,composer);return section;
  }

  function buildTasksPanel(state){
    const section=node('section','nexlab-team-tasks-v056');section.hidden=true;section.setAttribute('aria-label','Tarefas da equipe');
    const head=node('header','nexlab-team-tasks-head-v056');
    const title=node('div');title.append(node('h3','', 'Tarefas da equipe'),node('p','', 'Ações atribuídas aos integrantes desta equipe.'));
    const actions=node('div','nexlab-team-tasks-head-actions-v056');
    const refresh=node('button','nexlab-team-task-refresh-v056','Atualizar');refresh.type='button';refresh.addEventListener('click',()=>loadTeamTasks(state,{force:true}));
    const create=node('button','nexlab-team-task-create-v056','+ Tarefa');create.type='button';create.hidden=true;create.addEventListener('click',()=>showTaskForm(state));
    actions.append(refresh,create);head.append(title,actions);
    const notice=node('div','nexlab-team-task-message-v056');notice.hidden=true;notice.setAttribute('role','status');
    const form=node('div','nexlab-team-task-form-slot-v056');form.hidden=true;
    const list=node('div','nexlab-team-task-list-v056');list.setAttribute('aria-live','polite');
    section.append(head,notice,form,list);return section;
  }

  function buildTeamWorkspace(tasks,chat){
    const workspace=node('div','nexlab-team-workspace-v057');workspace.hidden=true;workspace.setAttribute('aria-label','Área de trabalho da equipe');workspace.append(tasks,chat);return workspace;
  }

  function setTaskMessage(state,message,type='info'){
    const box=state.tasksPanel?.querySelector('.nexlab-team-task-message-v056');if(!box)return;
    box.hidden=!message;box.className=`nexlab-team-task-message-v056 is-${type}`;box.textContent=message||'';
  }

  function formatTaskDay(value){if(!value)return 'Sem prazo';try{return new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(`${value}T12:00:00`));}catch{return String(value);}}
  function taskPriorityLabel(value){return ({baixa:'Baixa',normal:'Normal',alta:'Alta',urgente:'Urgente'}[String(value||'').toLowerCase()]||'Normal');}
  function taskStatusLabel(value){return ({pendente:'Pendente',em_andamento:'Em andamento',concluida:'Concluída',cancelada:'Cancelada'}[String(value||'').toLowerCase()]||'Pendente');}
  function isTaskOverdue(task){if(!task?.deadline||['concluida','cancelada'].includes(String(task.status||'')))return false;const today=new Date();today.setHours(0,0,0,0);const due=new Date(`${task.deadline}T00:00:00`);return Number.isFinite(due.getTime())&&due<today;}

  function bindTaskRealtime(state){
    if(state.taskRealtimeUnsubscribe)return;
    const subscribe=globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.subscribe;
    if(typeof subscribe!=='function')return;
    state.taskRealtimeUnsubscribe=subscribe(detail=>{
      if(detail?.table!=='team_history'||!state.tasksLoaded)return;
      if(detail.teamId&&String(detail.teamId)!==String(state.teamId))return;
      if(state.taskRealtimeTimer)clearTimeout(state.taskRealtimeTimer);
      state.taskRealtimeTimer=setTimeout(()=>{state.taskRealtimeTimer=null;void loadTeamTasks(state,{force:true});},250);
    });
  }

  async function loadTeamTasks(state,{force=false}={}){
    if(state.tasksLoading)return state.tasksLoading;
    const list=state.tasksPanel?.querySelector('.nexlab-team-task-list-v056');const refresh=state.tasksPanel?.querySelector('.nexlab-team-task-refresh-v056');
    if(refresh){refresh.disabled=true;refresh.textContent='Atualizando...';}
    if(list&&(!state.tasksLoaded||force))list.classList.add('is-loading');
    setTaskMessage(state,'Carregando tarefas...','info');
    state.tasksLoading=(async()=>{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_get_team_tasks_v1',{p_team_id:state.teamId});if(error)throw error;
      if(!data?.ok)throw new Error('O Supabase não confirmou o carregamento das tarefas.');
      state.taskWorkspace=data;state.tasksLoaded=true;setTaskMessage(state,'','info');renderTeamTasks(state);syncNavigation(state);return data;
    })().catch(error=>{console.error('NEXLAB team tasks load',error);setTaskMessage(state,error?.message||'Não foi possível carregar as tarefas.','err');return null;}).finally(()=>{
      state.tasksLoading=null;if(list)list.classList.remove('is-loading');if(refresh){refresh.disabled=false;refresh.textContent='Atualizar';}
    });
    return state.tasksLoading;
  }

  async function ensureTeamTasksReady(state){
    await loadAccess(state);
    if(!state.tasksLoaded&&!state.tasksLoading)await loadTeamTasks(state);
    if(state.targetTaskId)highlightTaskTarget(state,state.targetTaskId);
  }

  function taskField(label,input){const wrap=node('label','nexlab-team-task-field-v056');wrap.append(node('span','',label),input);return wrap;}

  function showTaskForm(state,task=null){
    const permissions=state.taskWorkspace?.permissions||{};
    if(task&&!task.can_edit)return;
    if(!task&&!permissions.can_create){setTaskMessage(state,'Você não possui permissão para criar tarefas nesta equipe.','err');return;}
    const slot=state.tasksPanel?.querySelector('.nexlab-team-task-form-slot-v056');if(!slot)return;
    const editing=!!task;slot.hidden=false;slot.replaceChildren();
    const form=node('form','nexlab-team-task-form-v056');
    const formHead=node('div','nexlab-team-task-form-head-v056');formHead.append(node('strong','',editing?'Editar tarefa':'Nova tarefa'),node('span','',editing?'Somente Líder ou Vice-Líder pode alterar os detalhes.':'Escolha um integrante da equipe como responsável.'));form.appendChild(formHead);
    const title=document.createElement('input');title.type='text';title.maxLength=180;title.required=true;title.value=task?.title||'';title.placeholder='Ex.: Preparar material da apresentação';
    const responsible=document.createElement('select');responsible.required=true;responsible.appendChild(new Option('Selecione o responsável',''));
    for(const member of state.taskWorkspace?.members||[]){const option=new Option(member.name||'Integrante',member.id);if(String(member.id)===String(task?.responsible_id||''))option.selected=true;responsible.appendChild(option);}
    const deadline=document.createElement('input');deadline.type='date';deadline.required=true;deadline.value=task?.deadline||'';
    const priority=document.createElement('select');for(const [value,label] of [['baixa','Baixa'],['normal','Normal'],['alta','Alta'],['urgente','Urgente']]){const option=new Option(label,value);if(value===(task?.priority||'normal'))option.selected=true;priority.appendChild(option);}
    const description=document.createElement('textarea');description.rows=3;description.maxLength=4000;description.value=task?.description||'';description.placeholder='Descrição opcional';
    const grid=node('div','nexlab-team-task-form-grid-v056');grid.append(taskField('Título',title),taskField('Responsável',responsible),taskField('Prazo',deadline),taskField('Prioridade',priority));form.append(grid,taskField('Descrição',description));
    let status=null;if(editing){status=document.createElement('select');const statusOptions=[['pendente','Pendente'],['em_andamento','Em andamento'],['cancelada','Cancelada']];if(task.can_complete||task.status==='concluida')statusOptions.splice(2,0,['concluida','Concluída']);for(const [value,label] of statusOptions){const option=new Option(label,value);if(value===(task.status||'pendente'))option.selected=true;status.appendChild(option);}form.appendChild(taskField('Status',status));}
    const actions=node('div','nexlab-team-task-form-actions-v056');const cancel=node('button','','Cancelar');cancel.type='button';cancel.addEventListener('click',()=>{slot.hidden=true;slot.replaceChildren();});const save=node('button','is-primary',editing?'Salvar alterações':'Criar tarefa');save.type='submit';actions.append(cancel,save);form.appendChild(actions);
    form.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;cancel.disabled=true;save.textContent=editing?'Salvando...':'Criando...';
      try{
        const c=await waitClient();const args={p_team_id:state.teamId,p_action:editing?'update':'create',p_task_id:editing?task.id:null,p_title:title.value.trim(),p_description:description.value.trim()||null,p_responsible_id:responsible.value||null,p_deadline:deadline.value||null,p_priority:priority.value,p_status:editing?status.value:null};
        const {data,error}=await c.rpc('nexlab_manage_team_task_v1',args);if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a alteração da tarefa.');
        state.taskWorkspace=data.workspace||state.taskWorkspace;state.tasksLoaded=true;slot.hidden=true;slot.replaceChildren();renderTeamTasks(state);syncNavigation(state);setTaskMessage(state,editing?'Tarefa atualizada.':'Tarefa criada.','ok');
        try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
      }catch(error){console.error('NEXLAB team task save',error);setTaskMessage(state,error?.message||'Não foi possível salvar a tarefa.','err');}
      finally{save.disabled=false;cancel.disabled=false;save.textContent=editing?'Salvar alterações':'Criar tarefa';}
    });
    slot.appendChild(form);requestAnimationFrame(()=>title.focus());
  }

  async function completeTeamTask(state,task){
    if(!task?.can_complete)return;
    try{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_manage_team_task_v1',{p_team_id:state.teamId,p_action:'complete',p_task_id:task.id,p_title:null,p_description:null,p_responsible_id:null,p_deadline:null,p_priority:null,p_status:null});if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a conclusão da tarefa.');
      state.taskWorkspace=data.workspace||state.taskWorkspace;renderTeamTasks(state);setTaskMessage(state,'Tarefa concluída.','ok');try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
    }catch(error){console.error('NEXLAB team task complete',error);setTaskMessage(state,error?.message||'Não foi possível concluir a tarefa.','err');}
  }

  async function deleteTeamTask(state,task){
    if(!task?.can_delete)return;if(!confirm(`Excluir a tarefa “${task.title||'Tarefa'}”?`))return;
    try{
      const c=await waitClient();const {data,error}=await c.rpc('nexlab_manage_team_task_v1',{p_team_id:state.teamId,p_action:'delete',p_task_id:task.id,p_title:null,p_description:null,p_responsible_id:null,p_deadline:null,p_priority:null,p_status:null});if(error)throw error;if(!data?.ok)throw new Error('O Supabase não confirmou a exclusão da tarefa.');
      state.taskWorkspace=data.workspace||state.taskWorkspace;renderTeamTasks(state);setTaskMessage(state,'Tarefa excluída.','ok');try{globalThis.__NEXLAB_PENDING_REALTIME_HUB__?.refresh?.({table:'tasks',eventType:'LOCAL_MUTATION'});globalThis.dispatchEvent(new CustomEvent('nexlab:pending-refresh'));}catch{}
    }catch(error){console.error('NEXLAB team task delete',error);setTaskMessage(state,error?.message||'Não foi possível excluir a tarefa.','err');}
  }

  function renderTeamTasks(state){
    const panel=state.tasksPanel;if(!panel)return;const list=panel.querySelector('.nexlab-team-task-list-v056');const create=panel.querySelector('.nexlab-team-task-create-v056');if(!list)return;
    const workspace=state.taskWorkspace||{};if(create)create.hidden=!workspace.permissions?.can_create;list.replaceChildren();
    const tasks=Array.isArray(workspace.tasks)?workspace.tasks:[];
    if(!tasks.length){const empty=node('div','nexlab-team-task-empty-v056');empty.append(node('strong','', 'Nenhuma tarefa registrada'),node('p','',workspace.permissions?.can_create?'Use “+ Tarefa” para criar a primeira atividade da equipe.':'Ainda não há tarefas nesta equipe.'));list.appendChild(empty);return;}
    for(const task of tasks){
      const card=node('article','nexlab-team-task-card-v056');card.dataset.taskId=String(task.id||'');if(isTaskOverdue(task))card.classList.add('is-overdue');if(task.status==='concluida')card.classList.add('is-done');
      const top=node('div','nexlab-team-task-card-top-v056');const main=node('div','');main.append(node('h4','',task.title||'Tarefa'));
      const badges=node('div','nexlab-team-task-badges-v056');const status=node('span',`is-status-${clean(task.status,30)}`,taskStatusLabel(task.status));const priority=node('span',`is-priority-${clean(task.priority,30)}`,taskPriorityLabel(task.priority));badges.append(status,priority);top.append(main,badges);card.appendChild(top);
      if(task.description)card.appendChild(node('p','nexlab-team-task-description-v056',task.description));
      const meta=node('div','nexlab-team-task-meta-v056');meta.append(node('span','',`Responsável: ${task.responsible_name||'Não identificado'}`),node('span','',`${isTaskOverdue(task)?'Atrasada • ':''}Prazo: ${formatTaskDay(task.deadline)}`));card.appendChild(meta);
      const actions=node('div','nexlab-team-task-actions-v056');
      if(task.can_complete){const done=node('button','is-complete','Concluir');done.type='button';done.addEventListener('click',()=>completeTeamTask(state,task));actions.appendChild(done);}
      if(task.can_edit){const edit=node('button','','Editar');edit.type='button';edit.addEventListener('click',()=>showTaskForm(state,task));actions.appendChild(edit);}
      if(task.can_delete){const remove=node('button','is-danger','Excluir');remove.type='button';remove.addEventListener('click',()=>deleteTeamTask(state,task));actions.appendChild(remove);}
      if(actions.childElementCount)card.appendChild(actions);list.appendChild(card);
    }
    if(state.targetTaskId)highlightTaskTarget(state,state.targetTaskId);
  }

  function highlightTaskTarget(state,id){
    if(!id||!state.tasksPanel)return;const target=state.tasksPanel.querySelector(`[data-task-id="${CSS.escape(String(id))}"]`);if(!target)return;
    target.classList.add('is-target');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('is-target'),3200);state.targetTaskId='';
  }

  function setInlineMessage(state,message,type='info'){
    const box=state.chatPanel?.querySelector('.nexlab-team-chat-message-v055');if(!box)return;
    box.hidden=!message;box.className=`nexlab-team-chat-message-v055 is-${type}`;box.textContent=message||'';
  }

  function syncNavigation(state){
    const nav=state.panel.querySelector('.nexlab-team-tabs-v055');if(!nav)return;
    const chat=nav.querySelector('[data-team-tab="conversation"]');
    if(chat){const denied=state.access?.can_view_chat===false;chat.disabled=denied;chat.title=denied?'Você não possui acesso à conversa desta equipe.':'';}
    const tasks=nav.querySelector('[data-team-tab="tasks"]');
    if(tasks){const denied=state.taskWorkspace?.permissions?.can_view===false;tasks.disabled=denied;tasks.title=denied?'Você não possui acesso às tarefas desta equipe.':'';}
    for(const button of nav.querySelectorAll('[data-team-tab]')){const active=button.dataset.teamTab===state.activeTab;button.classList.toggle('is-active',active);button.setAttribute('aria-selected',String(active));}
  }

  function classifyAndApply(state){
    const content=state.panel.querySelector(CONTENT_SELECTOR);state.content=content||null;if(!content)return;
    const workspace=state.workspace||state.panel.querySelector(':scope > .nexlab-team-workspace-v057');
    const footer=state.panel.querySelector(':scope > .team-details-v2680__footer');state.footer=footer||null;
    const groups={
      overview:[...content.querySelectorAll(':scope > .team-details-v2680__summary, :scope > .team-details-v2680__members, :scope > .team-workspace-v2680__history')],
      links:[...content.querySelectorAll(':scope > .team-workspace-v2680__links')]
    };
    // Fallback for older DOM shapes.
    if(!groups.overview.length){for(const selector of ['.team-details-v2680__summary','.team-details-v2680__members','.team-workspace-v2680__history']){const el=content.querySelector(selector);if(el)groups.overview.push(el);}}
    if(!groups.links.length){const el=content.querySelector('.team-workspace-v2680__links');if(el)groups.links.push(el);}
    const managed=new Set([...groups.overview,...groups.links]);
    for(const el of managed){el.hidden=true;}
    const workspaceTab=state.activeTab==='conversation'||state.activeTab==='tasks';
    content.hidden=workspaceTab;
    if(footer)footer.hidden=workspaceTab;
    if(workspace)workspace.hidden=!workspaceTab;
    if(state.chatPanel)state.chatPanel.hidden=state.activeTab!=='conversation';
    if(state.tasksPanel)state.tasksPanel.hidden=state.activeTab!=='tasks';
    state.panel.classList.toggle('is-nexlab-team-workspace-v057',workspaceTab);
    if(!workspaceTab){for(const el of groups[state.activeTab]||groups.overview)el.hidden=false;}
    syncNavigation(state);
  }

  function activateTab(state,key){
    if(!['overview','tasks','links','conversation'].includes(key))key='overview';
    if(key==='conversation'&&state.access?.can_view_chat===false)return;
    if(key==='tasks'&&state.taskWorkspace?.permissions?.can_view===false)return;
    state.activeTab=key;classifyAndApply(state);
    if(key==='conversation')void ensureConversationReady(state);
    if(key==='tasks')void ensureTeamTasksReady(state);
  }

  async function ensureConversationReady(state){
    await loadAccess(state);
    if(state.access?.can_view_chat===false){setInlineMessage(state,'Você não possui acesso à conversa desta equipe.','err');return;}
    if(!state.loaded&&!state.loading)await loadMessages(state);
    if(state.targetContentId)highlightTarget(state,state.targetContentId);
  }

  async function loadMessages(state,{force=false}={}){
    if(state.loading)return;state.loading=true;
    const list=state.chatPanel.querySelector('.nexlab-team-chat-list-v055');const refresh=state.chatPanel.querySelector('.nexlab-team-chat-refresh-v055');
    refresh.disabled=true;refresh.textContent='Atualizando...';if(!state.loaded||force){list.classList.add('is-loading');setInlineMessage(state,'Carregando conversa...','info');}
    try{
      const data=await api(`/v1/teams/${encodeURIComponent(state.teamId)}/messages?limit=${PAGE_SIZE}`);
      state.messages=Array.isArray(data?.messages)?data.messages:[];state.nextCursor=data?.next_cursor||null;state.loaded=true;setInlineMessage(state,'','info');renderMessages(state);syncOlderButton(state);scrollToBottom(state,force?'auto':'instant');if(state.targetContentId)highlightTarget(state,state.targetContentId);
    }catch(error){console.error('NEXLAB team chat load',error);setInlineMessage(state,error.message||'Não foi possível carregar a conversa.','err');}
    finally{state.loading=false;list.classList.remove('is-loading');refresh.disabled=false;refresh.textContent='Atualizar';syncOlderButton(state);}
  }

  async function loadOlder(state){
    if(state.loading||!state.nextCursor)return;state.loading=true;
    const older=state.chatPanel.querySelector('.nexlab-team-chat-older-v055');const list=state.chatPanel.querySelector('.nexlab-team-chat-list-v055');const beforeHeight=list.scrollHeight;older.disabled=true;older.textContent='Carregando...';
    try{
      const data=await api(`/v1/teams/${encodeURIComponent(state.teamId)}/messages?limit=${PAGE_SIZE}&cursor=${encodeURIComponent(state.nextCursor)}`);
      const rows=Array.isArray(data?.messages)?data.messages:[];const known=new Set(state.messages.map(row=>String(row.id)));state.messages=[...rows.filter(row=>!known.has(String(row.id))),...state.messages];state.nextCursor=data?.next_cursor||null;renderMessages(state);requestAnimationFrame(()=>{list.scrollTop=Math.max(0,list.scrollHeight-beforeHeight);});
    }catch(error){setInlineMessage(state,error.message||'Não foi possível carregar mensagens anteriores.','err');}
    finally{state.loading=false;older.disabled=false;older.textContent='Carregar mensagens anteriores';syncOlderButton(state);}
  }

  function syncOlderButton(state){const older=state.chatPanel?.querySelector('.nexlab-team-chat-older-v055');if(older)older.hidden=!state.nextCursor;}

  function appendTextWithMentions(container,text){
    const source=String(text||'');const regex=/@[\p{L}\p{N}_.-]+/gu;let index=0,match;
    while((match=regex.exec(source))){if(match.index>index)container.appendChild(document.createTextNode(source.slice(index,match.index)));container.appendChild(node('span','nexlab-team-inline-mention-v055',match[0]));index=match.index+match[0].length;}
    if(index<source.length)container.appendChild(document.createTextNode(source.slice(index)));
  }

  function renderMessages(state){
    const list=state.chatPanel.querySelector('.nexlab-team-chat-list-v055');list.replaceChildren();
    if(!state.messages.length){const empty=node('div','nexlab-team-chat-empty-v055');empty.append(node('span','nexlab-team-chat-empty-icon-v055','💬'),node('strong','', 'Nenhuma mensagem ainda'),node('p','',state.access?.can_send_message?'Envie a primeira mensagem para a equipe.':'Ainda não há mensagens registradas nesta conversa.'));list.appendChild(empty);return;}
    let lastAuthor='',lastDay='';
    for(const message of state.messages){
      const currentDay=chatDayKey(message.created_at);
      if(currentDay!==lastDay){const separator=node('div','nexlab-team-chat-day-v058',chatDayLabel(message.created_at));separator.setAttribute('role','separator');list.appendChild(separator);lastAuthor='';lastDay=currentDay;}
      const authorId=String(message.author_id||'');const own=authorId===state.currentUserId;const grouped=lastAuthor===authorId;
      const author=profile(state,message.author_id);const row=node('article',`nexlab-team-chat-row-v055 ${own?'is-own':'is-other'}${grouped?' is-grouped-v058':''}`);row.dataset.messageId=String(message.id||'');
      if(!own){const avatar=node('span',`nexlab-team-chat-avatar-v055${grouped?' is-ghost-v058':''}`,initials(author?.nome));avatar.title=author?.nome||'Usuário';row.appendChild(avatar);}
      const wrap=node('div','nexlab-team-chat-bubble-wrap-v055');
      if(!own&&!grouped){const who=node('span','nexlab-team-chat-author-v055',author?.nome||'Usuário');who.title=roleLabel(author?.role);wrap.appendChild(who);}
      const bubble=node('div','nexlab-team-chat-bubble-v055');const text=node('p','nexlab-team-chat-text-v055');appendTextWithMentions(text,message.message);bubble.appendChild(text);
      if(Array.isArray(message.mentions)&&message.mentions.length){const mentions=node('div','nexlab-team-chat-mentions-v055');for(const id of message.mentions)mentions.appendChild(node('span','',`@ ${profileName(state,id)}`));bubble.appendChild(mentions);}
      const meta=node('span','nexlab-team-chat-time-v055',formatDate(message.created_at));bubble.appendChild(meta);wrap.appendChild(bubble);row.appendChild(wrap);list.appendChild(row);lastAuthor=authorId;
    }
  }

  function scrollToBottom(state,behavior='smooth'){const list=state.chatPanel?.querySelector('.nexlab-team-chat-list-v055');if(list)requestAnimationFrame(()=>list.scrollTo({top:list.scrollHeight,behavior:behavior==='instant'?'auto':behavior}));}

  function mentionChips(state,selected,onRemove){const wrap=node('div','nexlab-team-composer-chips-v055');for(const id of selected){const chip=node('span','nexlab-team-mention-chip-v055');chip.append(document.createTextNode(`@ ${profileName(state,id)}`));const remove=node('button','','×');remove.type='button';remove.setAttribute('aria-label',`Remover menção a ${profileName(state,id)}`);remove.addEventListener('click',()=>onRemove(id));chip.appendChild(remove);wrap.appendChild(chip);}return wrap;}

  function buildComposer(state){
    const wrap=node('div','nexlab-team-composer-v055');
    const tools=node('div','nexlab-team-composer-tools-v055');const plus=node('button','nexlab-team-composer-plus-v055','+');plus.type='button';plus.setAttribute('aria-label','Opções da mensagem');plus.setAttribute('aria-expanded','false');
    const menu=node('div','nexlab-team-composer-menu-v055');menu.hidden=true;const taskAction=node('button','','+ Nova tarefa');taskAction.type='button';const mentionAction=node('button','','@ Mencionar alguém');mentionAction.type='button';menu.append(taskAction,mentionAction);tools.append(plus,menu);
    const inputWrap=node('div','nexlab-team-composer-input-v055');const textarea=node('textarea','');textarea.rows=1;textarea.maxLength=4000;textarea.placeholder='Escreva uma mensagem...';textarea.setAttribute('aria-label','Mensagem para a equipe');
    const suggestions=node('div','nexlab-team-mention-suggestions-v055');suggestions.hidden=true;inputWrap.append(textarea,suggestions);
    const send=node('button','nexlab-team-composer-send-v055','Enviar');send.type='button';
    const selected=new Set();const chipsSlot=node('div','nexlab-team-composer-selected-v055');const counter=node('span','nexlab-team-composer-counter-v055','0/4000');

    const refreshChips=()=>{chipsSlot.replaceChildren();if(selected.size)chipsSlot.appendChild(mentionChips(state,[...selected],id=>{selected.delete(String(id));refreshChips();}));};
    const hideSuggestions=()=>{suggestions.hidden=true;suggestions.replaceChildren();};
    const suggestionQuery=()=>{const before=textarea.value.slice(0,textarea.selectionStart??textarea.value.length);const match=before.match(/(?:^|\s)@([^\s@]{0,40})$/u);return match?{query:match[1],start:before.length-match[1].length-1,end:before.length}:null;};
    const showSuggestions=(force=false)=>{
      let info=suggestionQuery();if(force&&!info){const pos=textarea.selectionStart??textarea.value.length;const before=textarea.value.slice(0,pos);const prefix=before&& !/\s$/.test(before)?' ':'';textarea.setRangeText(prefix+'@',pos,pos,'end');info=suggestionQuery();}
      if(!info){hideSuggestions();return;}
      const q=info.query.toLocaleLowerCase('pt-BR');const rows=[...(state.profiles?.values?.()||[])].filter(row=>row?.id&&String(row.id)!==state.currentUserId&&false!==row.ativo&&clean(row.nome,100).toLocaleLowerCase('pt-BR').includes(q)).slice(0,7);
      suggestions.replaceChildren();if(!rows.length){suggestions.appendChild(node('p','', 'Nenhuma pessoa encontrada.'));suggestions.hidden=false;return;}
      for(const row of rows){const button=node('button','',row.nome||'Usuário');button.type='button';button.appendChild(node('small','',roleLabel(row.role)));button.addEventListener('click',()=>{const token='@'+clean(row.nome,80).split(/\s+/)[0];const value=textarea.value;textarea.value=value.slice(0,info.start)+token+' '+value.slice(info.end);selected.add(String(row.id));refreshChips();hideSuggestions();textarea.focus();const pos=info.start+token.length+1;textarea.setSelectionRange(pos,pos);counter.textContent=`${textarea.value.length}/4000`;});suggestions.appendChild(button);}
      suggestions.hidden=false;
    };

    plus.addEventListener('click',()=>{menu.hidden=!menu.hidden;plus.setAttribute('aria-expanded',String(!menu.hidden));});
    taskAction.addEventListener('click',()=>{menu.hidden=true;plus.setAttribute('aria-expanded','false');activateTab(state,'tasks');void ensureTeamTasksReady(state).then(()=>showTaskForm(state));});
    mentionAction.addEventListener('click',()=>{menu.hidden=true;plus.setAttribute('aria-expanded','false');textarea.focus();showSuggestions(true);});
    textarea.addEventListener('input',()=>{counter.textContent=`${textarea.value.length}/4000`;textarea.style.height='auto';textarea.style.height=`${Math.min(textarea.scrollHeight,112)}px`;if(!textarea.value.includes('@')&&selected.size){selected.clear();refreshChips();}showSuggestions();});
    textarea.addEventListener('keyup',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key))showSuggestions();});
    textarea.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();send.click();}});
    textarea.addEventListener('blur',()=>setTimeout(hideSuggestions,180));

    send.addEventListener('click',async()=>{
      const text=textarea.value.trim();if(!text){textarea.focus();return;}textarea.disabled=send.disabled=plus.disabled=true;send.textContent='Enviando...';
      try{
        const data=await api(`/v1/teams/${encodeURIComponent(state.teamId)}/messages`,{method:'POST',body:JSON.stringify({message:text,mentions:[...selected]})});
        if(data?.message){state.messages.push(data.message);renderMessages(state);textarea.value='';textarea.style.height='';selected.clear();refreshChips();counter.textContent='0/4000';setInlineMessage(state,'','info');scrollToBottom(state);}
      }catch(error){setInlineMessage(state,error.message||'Não foi possível enviar a mensagem.','err');textarea.focus();}
      finally{textarea.disabled=send.disabled=plus.disabled=false;send.textContent='Enviar';}
    });

    const inputRow=node('div','nexlab-team-composer-row-v055');inputRow.append(tools,inputWrap,send);wrap.append(chipsSlot,inputRow,counter);return wrap;
  }

  function renderComposer(state){
    const slot=state.chatPanel?.querySelector('.nexlab-team-chat-composer-slot-v055');if(!slot)return;slot.replaceChildren();
    if(state.accessError){slot.appendChild(node('p','nexlab-team-chat-readonly-v055','Não foi possível verificar sua permissão para enviar mensagens.'));return;}
    if(!state.access?.can_send_message){slot.appendChild(node('p','nexlab-team-chat-readonly-v055','Você pode acompanhar a conversa, mas não possui permissão para enviar mensagens nesta equipe.'));return;}
    slot.appendChild(buildComposer(state));
  }

  function highlightTarget(state,id){
    if(!id)return;const target=state.chatPanel.querySelector(`[data-message-id="${CSS.escape(id)}"]`);if(!target)return;
    target.classList.add('is-target');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.classList.remove('is-target'),3200);state.targetContentId='';
  }

  async function resolveNotificationTarget(){
    if(notificationPromise)return notificationPromise;
    notificationPromise=(async()=>{
      let notificationId='';try{notificationId=new URL(location.href).searchParams.get('notification')||'';}catch{}
      if(!isUuid(notificationId)){try{const stored=JSON.parse(sessionStorage.getItem('nexlabNotificationTarget')||'null');notificationId=String(stored?.notificationId||stored?.notification_id||'');}catch{}}
      if(isUuid(notificationId)){
        const c=await waitClient();const {data,error}=await c.from('notifications').select('id,target_tab,entity_type,entity_id,metadata').eq('id',notificationId).maybeSingle();
        if(!error&&data&&String(data.entity_type||'')==='team'&&isUuid(data.entity_id)&&['conversation','tasks'].includes(String(data.metadata?.open_section||''))){
          const section=String(data.metadata.open_section);return {notificationId,teamId:String(data.entity_id),section,contentId:section==='conversation'?String(data.metadata?.communication_content_id||''):'',taskId:section==='tasks'?String(data.metadata?.task_id||''):''};
        }
      }
      try{
        const direct=JSON.parse(sessionStorage.getItem('nexlabTeamTaskTarget')||'null');
        if(isUuid(direct?.teamId)&&isUuid(direct?.taskId)){sessionStorage.removeItem('nexlabTeamTaskTarget');return {notificationId:'',teamId:String(direct.teamId),section:'tasks',contentId:'',taskId:String(direct.taskId)};}
      }catch{}
      return null;
    })().catch(()=>null).then(value=>{pendingNotification=value;return value;});
    return notificationPromise;
  }

  function tryOpenPendingTeam(){
    if(!pendingNotification?.teamId||document.querySelector(PANEL_SELECTOR))return;
    const card=document.querySelector(`[data-nexlab-record-id="${CSS.escape(pendingNotification.teamId)}"]`);if(!card)return;
    const buttons=[...card.querySelectorAll('button')];const details=buttons.find(button=>/^(ver detalhes|detalhes)$/i.test(clean(button.textContent,60)));if(details){details.click();}
  }

  function mountWorkspace(panel,state){
    panel.querySelectorAll('.nexlab-team-workspace-v057').forEach(el=>el.remove());
    // Remove leftovers from the previous injected layout, including panels nested in the original content.
    panel.querySelectorAll('.nexlab-team-tasks-v056,.nexlab-team-chat-v055').forEach(el=>el.remove());
    const tasks=buildTasksPanel(state);const chat=buildConversationPanel(state);const workspace=buildTeamWorkspace(tasks,chat);
    state.tasksPanel=tasks;state.chatPanel=chat;state.workspace=workspace;state.content=panel.querySelector(CONTENT_SELECTOR);state.footer=panel.querySelector(':scope > .team-details-v2680__footer');
    const nav=panel.querySelector(':scope > .nexlab-team-tabs-v055');
    if(nav)nav.insertAdjacentElement('afterend',workspace);else if(state.content)state.content.insertAdjacentElement('beforebegin',workspace);else panel.appendChild(workspace);
    if(state.loaded){renderMessages(state);syncOlderButton(state);}renderComposer(state);
    if(state.tasksLoaded)renderTeamTasks(state);
  }

  function createState(panel,teamId){
    const state={panel,teamId,activeTab:'overview',messages:[],nextCursor:null,loaded:false,loading:false,access:null,accessError:null,accessLoading:null,profiles:new Map(),currentUserId:'',targetContentId:'',targetTaskId:'',content:null,footer:null,workspace:null,chatPanel:null,tasksPanel:null,taskWorkspace:null,tasksLoaded:false,tasksLoading:null,taskRealtimeUnsubscribe:null,taskRealtimeTimer:null};
    panel.classList.add('has-nexlab-team-chat-v055','has-nexlab-team-tasks-v056');
    const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);
    if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);
    mountWorkspace(panel,state);
    states.set(panel,state);stateByTeamId.set(teamId,state);bindTaskRealtime(state);
    if(pendingNotification?.teamId===teamId){state.activeTab=pendingNotification.section||'overview';state.targetContentId=pendingNotification.contentId||'';state.targetTaskId=pendingNotification.taskId||'';}
    void loadAccess(state).then(()=>{classifyAndApply(state);if(state.activeTab==='conversation')void ensureConversationReady(state);if(state.activeTab==='tasks')void ensureTeamTasksReady(state);});classifyAndApply(state);return state;
  }

  function rebindState(panel,state){
    state.panel=panel;state.content=panel.querySelector(CONTENT_SELECTOR);state.footer=panel.querySelector(':scope > .team-details-v2680__footer');
    panel.classList.add('has-nexlab-team-chat-v055','has-nexlab-team-tasks-v056');
    panel.querySelectorAll('.nexlab-team-tabs-v055,.nexlab-team-workspace-v057,.nexlab-team-tasks-v056,.nexlab-team-chat-v055').forEach(el=>el.remove());
    const header=panel.querySelector(HEADER_SELECTOR);const nav=buildTabs(state);
    if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);
    mountWorkspace(panel,state);
    states.set(panel,state);bindTaskRealtime(state);classifyAndApply(state);
    if(state.activeTab==='conversation'&&!state.loaded)void ensureConversationReady(state);
    if(state.activeTab==='tasks'&&!state.tasksLoaded)void ensureTeamTasksReady(state);
    return state;
  }

  function ensurePanel(panel){
    if(!(panel instanceof HTMLElement))return;const teamId=String(panel.dataset.nexlabTeamId||'');if(!isUuid(teamId))return;
    let state=states.get(panel);if(!state||state.teamId!==teamId){
      panel.querySelectorAll('.nexlab-team-tabs-v055,.nexlab-team-workspace-v057,.nexlab-team-tasks-v056,.nexlab-team-chat-v055').forEach(el=>el.remove());
      const cached=stateByTeamId.get(teamId);
      state=cached&&!cached.panel?.isConnected?rebindState(panel,cached):createState(panel,teamId);
    }else{
      let nav=panel.querySelector(':scope > .nexlab-team-tabs-v055');
      if(!nav){nav=buildTabs(state);const header=panel.querySelector(HEADER_SELECTOR);if(header)header.insertAdjacentElement('afterend',nav);else panel.prepend(nav);}
      const workspace=panel.querySelector(':scope > .nexlab-team-workspace-v057');
      if(!workspace||!workspace.querySelector('.nexlab-team-tasks-v056')||!workspace.querySelector('.nexlab-team-chat-v055'))mountWorkspace(panel,state);
      classifyAndApply(state);
    }
  }

  function scan(){observerScheduled=false;tryOpenPendingTeam();document.querySelectorAll(PANEL_SELECTOR).forEach(ensurePanel);}
  function scheduleScan(){if(observerScheduled)return;observerScheduled=true;requestAnimationFrame(scan);}
  const observer=new MutationObserver(scheduleScan);
  function start(){observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-nexlab-team-id','data-nexlab-record-id']});void resolveNotificationTarget().then(()=>scheduleScan());scheduleScan();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

  globalThis.addEventListener('nexlab:session-reset',()=>{profilesPromise=null;notificationPromise=null;pendingNotification=null;for(const state of stateByTeamId.values()){if(state.taskRealtimeTimer)clearTimeout(state.taskRealtimeTimer);try{state.taskRealtimeUnsubscribe?.();}catch{}state.taskRealtimeTimer=null;state.taskRealtimeUnsubscribe=null;}stateByTeamId.clear();try{sessionStorage.removeItem('nexlabTeamTaskTarget');}catch{}});
  globalThis.__NEXLAB_TEAM_CHAT__=Object.freeze({
    version:BUILD.version,revision:REVISION,workerUrl:workerUrl(),
    refreshCurrent(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?loadMessages(state,{force:true}):Promise.resolve(null);},
    refreshTasks(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?loadTeamTasks(state,{force:true}):Promise.resolve(null);},
    openCurrent(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);if(state){activateTab(state,'conversation');return true;}return false;},
    openTasks(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);if(state){activateTab(state,'tasks');return true;}return false;},
    snapshot(){const panel=document.querySelector(PANEL_SELECTOR);const state=panel&&states.get(panel);return state?Object.freeze({teamId:state.teamId,activeTab:state.activeTab,loaded:state.loaded,messages:state.messages.length,nextCursor:!!state.nextCursor,canView:state.access?.can_view_chat??null,canSend:state.access?.can_send_message??null,tasksLoaded:state.tasksLoaded,tasks:Array.isArray(state.taskWorkspace?.tasks)?state.taskWorkspace.tasks.length:0,canCreateTask:state.taskWorkspace?.permissions?.can_create??null,canManageTask:state.taskWorkspace?.permissions?.can_manage??null}):null;}
  });
})();
