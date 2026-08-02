(function(){
  'use strict';

  const VERSION='0.26.54';
  const PROJECT_REF='eahldhabwulnwhuwrhvc';
  const BASE=`https://${PROJECT_REF}.supabase.co`;
  const KEY='sb_publishable_hr-WTQUBbBE0Ei3Lr2hkhQ_XSKG_PXa';
  const ROLE_LABELS={admin:'Administrador',administrador:'Administrador',coordenador:'Coordenador',bolsista:'Bolsista',voluntario:'Voluntário',coworking_junior:'Coworking Júnior'};
  const ROLE_ORDER=['admin','coordenador','bolsista','voluntario','coworking_junior'];
  let matrixCache=null;
  let matrixLoadedAt=0;

  window.NexlabAdminHomologation={version:VERSION};

  const style=document.createElement('style');
  style.textContent=`
    #nexlab-admin-tools-trigger{position:fixed;right:18px;bottom:86px;z-index:10045;border:0;border-radius:999px;background:#0b2a63;color:#fff;padding:11px 15px;box-shadow:0 14px 38px rgba(15,23,42,.3);font:800 12px/1.2 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;display:flex;gap:8px;align-items:center}
    #nexlab-admin-tools-trigger:hover{background:#123a7a}#nexlab-admin-tools-trigger svg{width:17px;height:17px}
    .nexlab-admin-overlay{position:fixed;inset:0;z-index:10080;background:rgba(2,6,23,.68);display:grid;place-items:center;padding:18px}
    .nexlab-admin-dialog{width:min(980px,100%);max-height:min(92vh,920px);overflow:auto;background:#fff;border-radius:24px;box-shadow:0 30px 90px rgba(2,6,23,.38);font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a}
    .nexlab-admin-dialog.is-wide{width:min(1380px,100%)}
    .nexlab-admin-head{padding:22px 24px 18px;background:linear-gradient(135deg,#0b2a63,#111827);color:#fff;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;position:sticky;top:0;z-index:3}
    .nexlab-admin-head h2{font-size:21px;margin:0 0 5px}.nexlab-admin-head p{margin:0;color:#cbd5e1;font-size:12px;line-height:1.45;max-width:760px}
    .nexlab-admin-close{border:0;background:rgba(255,255,255,.13);color:#fff;width:36px;height:36px;border-radius:12px;font-size:20px;cursor:pointer;flex:0 0 auto}
    .nexlab-admin-body{padding:22px 24px;display:grid;gap:16px}.nexlab-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
    .nexlab-admin-tool{border:1px solid #dbe4ef;background:#fff;border-radius:18px;padding:17px;text-align:left;cursor:pointer;display:grid;grid-template-columns:42px 1fr;gap:13px;align-items:start;transition:.16s ease}
    .nexlab-admin-tool:hover{transform:translateY(-1px);border-color:#93b4e8;box-shadow:0 12px 28px rgba(15,23,42,.08)}.nexlab-admin-tool:disabled{opacity:.55;cursor:not-allowed;transform:none}
    .nexlab-admin-tool-icon{width:42px;height:42px;border-radius:13px;background:#eaf1fb;color:#0b2a63;display:grid;place-items:center;font-size:20px;font-weight:900}.nexlab-admin-tool h3{margin:0 0 5px;font-size:14px}.nexlab-admin-tool p{margin:0;color:#64748b;font-size:11px;line-height:1.5}
    .nexlab-admin-note{border:1px solid #dbe4ef;background:#f8fafc;border-radius:15px;padding:13px 15px;color:#475569;font-size:11px;line-height:1.55}
    .nexlab-admin-warning{border-color:#fdba74;background:#fff7ed;color:#9a3412}.nexlab-admin-success{border-color:#86efac;background:#f0fdf4;color:#166534}.nexlab-admin-error{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
    .nexlab-admin-actions{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.nexlab-admin-btn{border:0;border-radius:12px;padding:11px 15px;font:800 12px/1 system-ui;cursor:pointer}.nexlab-admin-btn:disabled{opacity:.55;cursor:wait}.nexlab-admin-primary{background:#0b2a63;color:#fff}.nexlab-admin-secondary{background:#e2e8f0;color:#0f172a}.nexlab-admin-danger{background:#fee2e2;color:#991b1b}.nexlab-admin-orange{background:#f97316;color:#fff}
    .nexlab-admin-field{display:grid;gap:6px}.nexlab-admin-field>span{font-size:11px;font-weight:800;color:#475569}.nexlab-admin-field input,.nexlab-admin-field select,.nexlab-admin-field textarea{width:100%;border:1px solid #cbd5e1;border-radius:12px;padding:10px 12px;font:12px/1.4 system-ui;background:#fff;color:#0f172a}.nexlab-admin-field textarea{resize:vertical;min-height:84px}
    .nexlab-preview-modes{display:flex;gap:8px}.nexlab-preview-mode{border:1px solid #cbd5e1;background:#fff;color:#475569;border-radius:999px;padding:8px 12px;font:800 11px/1 system-ui;cursor:pointer}.nexlab-preview-mode.is-active{background:#0b2a63;color:#fff;border-color:#0b2a63}
    .nexlab-role-cards{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px}.nexlab-role-card{border:1px solid #dbe4ef;background:#fff;border-radius:14px;padding:12px 9px;text-align:center;cursor:pointer;font:800 11px/1.25 system-ui;color:#334155}.nexlab-role-card.is-active{border-color:#f97316;background:#fff7ed;color:#9a3412;box-shadow:0 0 0 2px rgba(249,115,22,.12)}
    .nexlab-preview-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.nexlab-preview-summary div{border:1px solid #dbe4ef;background:#f8fafc;border-radius:14px;padding:12px}.nexlab-preview-summary strong{display:block;font-size:18px;color:#0b2a63}.nexlab-preview-summary span{font-size:10px;color:#64748b}
    .nexlab-kanban-toolbar{display:grid;grid-template-columns:190px minmax(180px,1fr) minmax(180px,1fr);gap:10px;align-items:end}.nexlab-kanban-toolbar .nexlab-admin-field{margin:0}
    .nexlab-kanban-stats{display:flex;gap:8px;flex-wrap:wrap}.nexlab-kanban-pill{border-radius:999px;padding:6px 9px;background:#eef2f7;color:#475569;font:800 10px/1 system-ui}.nexlab-kanban-pill.is-changed{background:#ffedd5;color:#9a3412}
    .nexlab-kanban-board{display:grid;grid-template-columns:repeat(4,minmax(245px,1fr));gap:12px;overflow-x:auto;padding-bottom:5px}.nexlab-kanban-column{border:1px solid #dbe4ef;background:#f8fafc;border-radius:18px;min-height:460px;display:flex;flex-direction:column}.nexlab-kanban-column.is-drop{outline:3px solid rgba(249,115,22,.22);border-color:#f97316}.nexlab-kanban-column-head{padding:13px 14px;border-bottom:1px solid #dbe4ef;display:flex;align-items:center;justify-content:space-between;gap:8px;position:sticky;top:76px;background:#f8fafc;border-radius:18px 18px 0 0;z-index:2}.nexlab-kanban-column-head strong{font-size:12px}.nexlab-kanban-column-head span{font-size:10px;background:#fff;border:1px solid #dbe4ef;border-radius:999px;padding:4px 7px}
    .nexlab-kanban-list{padding:10px;display:grid;gap:8px;align-content:start;min-height:390px}.nexlab-permission-card{border:1px solid #dbe4ef;background:#fff;border-radius:14px;padding:11px;display:grid;gap:7px;cursor:grab;box-shadow:0 4px 12px rgba(15,23,42,.04)}.nexlab-permission-card.is-locked{cursor:not-allowed;background:#f1f5f9}.nexlab-permission-card.is-dragging{opacity:.45}.nexlab-permission-card h4{font-size:11px;margin:0;color:#0f172a}.nexlab-permission-card p{font-size:9px;line-height:1.4;color:#64748b;margin:0}.nexlab-permission-card-meta{display:flex;gap:5px;flex-wrap:wrap}.nexlab-permission-card-meta span{font-size:8px;font-weight:900;border-radius:999px;background:#eef2f7;color:#475569;padding:4px 6px}.nexlab-permission-toggle{border:0;background:#e2e8f0;color:#334155;border-radius:9px;padding:7px 8px;font:800 9px/1 system-ui;cursor:pointer}.nexlab-permission-card.is-locked .nexlab-permission-toggle{display:none}
    .nexlab-security-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.nexlab-security-summary div{border:1px solid #dbe4ef;border-radius:14px;padding:12px;background:#f8fafc}.nexlab-security-summary strong{display:block;font-size:19px;color:#0b2a63}.nexlab-security-summary span{font-size:9px;color:#64748b}.nexlab-hash{display:block;word-break:break-all;border:1px solid #dbe4ef;background:#0f172a;color:#e2e8f0;border-radius:12px;padding:10px;font:10px/1.5 ui-monospace,monospace}
    .nexlab-review-list{display:grid;gap:9px}.nexlab-review-row{border:1px solid #dbe4ef;border-radius:13px;padding:11px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px}.nexlab-review-row strong{font-size:11px}.nexlab-review-row span{font-size:10px;color:#64748b}.nexlab-review-state{font-weight:900!important}.nexlab-review-state.ok{color:#166534}.nexlab-review-state.fail{color:#b91c1c}.nexlab-hidden{display:none!important}
    @media(max-width:760px){#nexlab-admin-tools-trigger{right:14px;bottom:78px;padding:12px}#nexlab-admin-tools-trigger span{display:none}.nexlab-admin-overlay{padding:0}.nexlab-admin-dialog,.nexlab-admin-dialog.is-wide{max-height:100vh;height:100%;border-radius:0}.nexlab-admin-head,.nexlab-admin-body{padding-left:17px;padding-right:17px}.nexlab-admin-grid{grid-template-columns:1fr}.nexlab-role-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.nexlab-preview-summary,.nexlab-security-summary{grid-template-columns:repeat(2,minmax(0,1fr))}.nexlab-kanban-toolbar{grid-template-columns:1fr}.nexlab-kanban-board{grid-template-columns:repeat(4,270px)}.nexlab-kanban-column-head{top:72px}}
  `;
  document.head.appendChild(style);

  function authToken(){
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i)||'';
      if(!key.startsWith(`sb-${PROJECT_REF}-auth-token`))continue;
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        const token=value?.access_token||value?.currentSession?.access_token;
        if(token)return token;
      }catch{}
    }
    return '';
  }

  function jwtSubject(jwt){
    try{
      const body=jwt.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      const padded=body.padEnd(Math.ceil(body.length/4)*4,'=');
      const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      return String(payload?.sub||'');
    }catch{return '';}
  }

  async function api(path,options={}){
    const token=authToken();
    if(!token)throw new Error('Sessão não encontrada. Entre novamente no NEXLAB.');
    const response=await fetch(`${BASE}${path}`,{
      ...options,
      headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(options.headers||{})},
      cache:'no-store'
    });
    let data=null;
    try{data=await response.json();}catch{}
    if(!response.ok){
      const message=data?.message||data?.error_description||data?.hint||`Falha HTTP ${response.status}.`;
      throw new Error(message);
    }
    return data;
  }

  function rpc(name,payload={}){
    return api(`/rest/v1/rpc/${encodeURIComponent(name)}`,{method:'POST',body:JSON.stringify(payload)});
  }

  async function currentAdmin(){
    const token=authToken();
    const id=jwtSubject(token);
    if(!id)return null;
    try{
      const rows=await api(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=id,nome,role,ativo`);
      const profile=Array.isArray(rows)?rows[0]:null;
      if(!profile||profile.ativo===false||!['admin','administrador'].includes(String(profile.role||'').toLowerCase()))return null;
      return profile;
    }catch{return null;}
  }

  async function loadMatrix(force=false){
    if(!force&&matrixCache&&Date.now()-matrixLoadedAt<30000)return matrixCache;
    const data=await rpc('nexlab_get_permission_matrix_v02652');
    if(!data||!Array.isArray(data.catalog)||!Array.isArray(data.defaults)||!Array.isArray(data.users))throw new Error('O Supabase retornou uma matriz incompleta.');
    matrixCache=data;matrixLoadedAt=Date.now();return data;
  }

  function createDialog(title,description,wide=false){
    const overlay=document.createElement('div');overlay.className='nexlab-admin-overlay';
    const dialog=document.createElement('section');dialog.className=`nexlab-admin-dialog${wide?' is-wide':''}`;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');
    dialog.innerHTML=`<header class="nexlab-admin-head"><div><h2></h2><p></p></div><button class="nexlab-admin-close" type="button" aria-label="Fechar">×</button></header><div class="nexlab-admin-body"></div>`;
    dialog.querySelector('h2').textContent=title;dialog.querySelector('p').textContent=description;
    overlay.appendChild(dialog);document.body.appendChild(overlay);
    const close=()=>overlay.remove();dialog.querySelector('.nexlab-admin-close').onclick=close;overlay.addEventListener('click',event=>{if(event.target===overlay)close();});
    return {overlay,dialog,body:dialog.querySelector('.nexlab-admin-body'),close};
  }

  function messageBox(text,type=''){
    const box=document.createElement('div');box.className=`nexlab-admin-note${type?` nexlab-admin-${type}`:''}`;box.textContent=text;return box;
  }

  function roleLabel(role){return ROLE_LABELS[String(role||'').toLowerCase()]||String(role||'Perfil');}

  function downloadBlob(name,content,type='application/json'){
    const blob=new Blob([content],{type});
    const anchor=document.createElement('a');anchor.href=URL.createObjectURL(blob);anchor.download=name;anchor.click();
    setTimeout(()=>URL.revokeObjectURL(anchor.href),1800);
  }

  async function sha256(text){
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
  }

  async function openProfilePreview(){
    const {body}=createDialog('Visualizar como perfil','Simule a interface e as permissões de um perfil sem alterar usuários, vínculos ou dados do Supabase. O modo aberto será somente leitura.');
    const loading=messageBox('Carregando perfis e permissões...');body.appendChild(loading);
    try{
      const [matrix,admin]=await Promise.all([loadMatrix(),currentAdmin()]);
      if(!admin)throw new Error('A sessão administrativa não foi confirmada.');
      loading.remove();
      let mode='role';let selectedRole='voluntario';let selectedUserId='';
      const modes=document.createElement('div');modes.className='nexlab-preview-modes';modes.innerHTML='<button class="nexlab-preview-mode is-active" data-mode="role" type="button">Perfil padrão</button><button class="nexlab-preview-mode" data-mode="user" type="button">Usuário específico</button>';body.appendChild(modes);
      const roleCards=document.createElement('div');roleCards.className='nexlab-role-cards';
      for(const role of ROLE_ORDER){
        const button=document.createElement('button');button.type='button';button.className=`nexlab-role-card${role===selectedRole?' is-active':''}`;button.dataset.role=role;button.textContent=roleLabel(role);roleCards.appendChild(button);
      }
      body.appendChild(roleCards);
      const userField=document.createElement('label');userField.className='nexlab-admin-field nexlab-hidden';userField.innerHTML='<span>Usuário para simulação</span><select></select>';
      const select=userField.querySelector('select');
      const users=[...matrix.users].sort((a,b)=>String(a.nome||a.email||'').localeCompare(String(b.nome||b.email||''),'pt-BR'));
      for(const user of users){
        const option=document.createElement('option');option.value=String(user.id);option.textContent=`${user.nome||user.email||'Usuário'} — ${roleLabel(user.role)}${user.ativo===false?' — inativo':''}`;select.appendChild(option);
      }
      selectedUserId=select.value;body.appendChild(userField);
      const summary=document.createElement('div');summary.className='nexlab-preview-summary';body.appendChild(summary);
      const note=messageBox('A visualização modifica somente a apresentação local. As consultas continuam autenticadas pela conta Administradora, por isso ela não substitui o teste real com uma conta temporária.','warning');body.appendChild(note);
      const status=document.createElement('div');body.appendChild(status);
      const actions=document.createElement('div');actions.className='nexlab-admin-actions';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-primary">Abrir visualização em nova guia</button>';body.appendChild(actions);
      const launch=actions.querySelector('button');

      function rolePermissions(role){return matrix.defaults.filter(row=>row.role_key===role&&row.allowed).map(row=>row.permission_key);}
      function selection(){
        if(mode==='user'){
          const user=users.find(item=>String(item.id)===String(selectedUserId));
          if(!user)return null;
          return {role:String(user.role||'coworking_junior').toLowerCase(),name:user.nome||user.email||'Usuário',permissions:Array.isArray(user.effective_permissions)?user.effective_permissions:rolePermissions(String(user.role||'').toLowerCase()),user};
        }
        return {role:selectedRole,name:roleLabel(selectedRole),permissions:rolePermissions(selectedRole),user:null};
      }
      function renderSummary(){
        const chosen=selection();
        const allowed=chosen?.permissions?.length||0;
        const modules=new Set((chosen?.permissions||[]).filter(key=>String(key).startsWith('module_'))).size;
        summary.innerHTML=`<div><strong>${allowed}</strong><span>permissões efetivas</span></div><div><strong>${modules}</strong><span>módulos principais</span></div><div><strong>20 min</strong><span>validade da visualização</span></div>`;
      }
      renderSummary();
      modes.addEventListener('click',event=>{
        const button=event.target.closest('[data-mode]');if(!button)return;mode=button.dataset.mode;
        modes.querySelectorAll('[data-mode]').forEach(item=>item.classList.toggle('is-active',item===button));
        roleCards.classList.toggle('nexlab-hidden',mode!=='role');userField.classList.toggle('nexlab-hidden',mode!=='user');renderSummary();
      });
      roleCards.addEventListener('click',event=>{
        const button=event.target.closest('[data-role]');if(!button)return;selectedRole=button.dataset.role;
        roleCards.querySelectorAll('[data-role]').forEach(item=>item.classList.toggle('is-active',item===button));renderSummary();
      });
      select.addEventListener('change',()=>{selectedUserId=select.value;renderSummary();});
      launch.addEventListener('click',()=>{
        const chosen=selection();if(!chosen)return;
        const token=crypto.randomUUID();
        const config={token,issuedBy:String(admin.id),mode,targetRole:chosen.role,targetName:chosen.name,targetUserId:chosen.user?String(chosen.user.id):null,effectivePermissions:[...new Set(chosen.permissions.map(String))],sourceRevision:matrix.revision,readOnly:true,createdAt:Date.now(),expiresAt:Date.now()+20*60*1000};
        localStorage.setItem(`nexlab-preview:${token}`,JSON.stringify(config));
        const target=new URL(location.href);target.searchParams.set('nexlab_preview',token);target.hash='';
        const opened=window.open(target.toString(),'_blank');
        if(opened)try{opened.opener=null;}catch{}
        if(!opened){status.replaceChildren(messageBox('O navegador bloqueou a nova guia. Autorize pop-ups para este site e tente novamente.','error'));}
        else status.replaceChildren(messageBox(`Visualização de ${chosen.name} aberta em modo somente leitura.`,'success'));
      });
    }catch(error){loading.className='nexlab-admin-note nexlab-admin-error';loading.textContent=error.message||'Falha ao carregar a visualização.';}
  }

  async function openPermissionKanban(){
    const {body}=createDialog('Kanban de permissões','Arraste permissões entre Permitidas e Negadas. Permissões essenciais, críticas ou incompatíveis permanecem bloqueadas pelas regras do Supabase.',true);
    const loading=messageBox('Carregando matriz de permissões...');body.appendChild(loading);
    try{
      let matrix=await loadMatrix();loading.remove();
      let role='voluntario';let search='';let category='all';let original=new Map();let working=new Map();let dragged='';
      const catalogByKey=new Map(matrix.catalog.map(item=>[item.permission_key,item]));
      const dependencies=Array.isArray(matrix.dependencies)?matrix.dependencies:[];
      const toolbar=document.createElement('div');toolbar.className='nexlab-kanban-toolbar';toolbar.innerHTML='<label class="nexlab-admin-field"><span>Perfil</span><select data-role></select></label><label class="nexlab-admin-field"><span>Buscar permissão</span><input data-search type="search" placeholder="Nome, chave ou descrição"></label><label class="nexlab-admin-field"><span>Categoria</span><select data-category></select></label>';body.appendChild(toolbar);
      const roleSelect=toolbar.querySelector('[data-role]');for(const item of ROLE_ORDER){const option=document.createElement('option');option.value=item;option.textContent=roleLabel(item);roleSelect.appendChild(option);}roleSelect.value=role;
      const categories=['all',...[...new Set(matrix.catalog.map(item=>item.category||'Outros'))].sort((a,b)=>a.localeCompare(b,'pt-BR'))];const categorySelect=toolbar.querySelector('[data-category]');for(const item of categories){const option=document.createElement('option');option.value=item;option.textContent=item==='all'?'Todas as categorias':item;categorySelect.appendChild(option);}
      const stats=document.createElement('div');stats.className='nexlab-kanban-stats';body.appendChild(stats);
      const board=document.createElement('div');board.className='nexlab-kanban-board';body.appendChild(board);
      const form=document.createElement('div');form.innerHTML='<label class="nexlab-admin-field"><span>Motivo da alteração</span><textarea data-reason placeholder="Obrigatório para registrar a mudança na auditoria"></textarea></label><div class="nexlab-admin-actions"><button type="button" data-save class="nexlab-admin-btn nexlab-admin-primary">Salvar alterações</button><button type="button" data-reset class="nexlab-admin-btn nexlab-admin-secondary">Descartar alterações</button></div><div data-message></div>';body.appendChild(form);
      const reason=form.querySelector('[data-reason]'),save=form.querySelector('[data-save]'),reset=form.querySelector('[data-reset]'),message=form.querySelector('[data-message]');

      function assignmentState(row,item){
        if(role==='admin')return'protected';
        if(row?.assignment_state==='protected'||item.core||item.admin_only||item.grantable===false)return'protected';
        if(row?.assignment_state==='incompatible'||!Array.isArray(item.eligible_roles)||!item.eligible_roles.includes(role))return'incompatible';
        return row?.allowed?'allowed':'denied';
      }
      function rebuildState(){
        original=new Map();working=new Map();
        for(const item of matrix.catalog){const row=matrix.defaults.find(entry=>entry.role_key===role&&entry.permission_key===item.permission_key);const state=assignmentState(row,item);original.set(item.permission_key,state);working.set(item.permission_key,state);}
      }
      function changedKeys(){return [...working.keys()].filter(key=>working.get(key)!==original.get(key)&&['allowed','denied'].includes(working.get(key)));}
      function locked(key){return['protected','incompatible'].includes(working.get(key));}
      function visible(item){const term=search.trim().toLowerCase();const matchesText=!term||`${item.label} ${item.permission_key} ${item.description||''}`.toLowerCase().includes(term);return matchesText&&(category==='all'||(item.category||'Outros')===category);}
      function setMessage(text,type=''){message.replaceChildren(text?messageBox(text,type):document.createTextNode(''));}
      function allowWithDependencies(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='incompatible')throw new Error(`${catalogByKey.get(key)?.label||key} é incompatível com ${roleLabel(role)}.`);
        if(working.get(key)==='protected')return;
        for(const dep of dependencies.filter(item=>item.permission_key===key))allowWithDependencies(dep.required_permission_key,visited);
        working.set(key,'allowed');
      }
      function denyWithDependents(key,visited=new Set()){
        if(visited.has(key))return;visited.add(key);
        if(working.get(key)==='protected')throw new Error(`${catalogByKey.get(key)?.label||key} é protegida e não pode ser negada.`);
        if(working.get(key)==='incompatible')return;
        for(const dep of dependencies.filter(item=>item.required_permission_key===key)){
          if(working.get(dep.permission_key)==='allowed')denyWithDependents(dep.permission_key,visited);
        }
        working.set(key,'denied');
      }
      function move(key,target){
        try{
          if(locked(key)||!['allowed','denied'].includes(target))return;
          if(target==='allowed')allowWithDependencies(key);else denyWithDependents(key);
          setMessage('Alteração preparada. Salve para aplicar no Supabase.');render();
        }catch(error){setMessage(error.message,'error');}
      }
      function render(){
        const states=[['allowed','Permitidas'],['denied','Negadas'],['protected','Protegidas'],['incompatible','Incompatíveis']];board.innerHTML='';
        for(const [state,label] of states){
          const column=document.createElement('section');column.className='nexlab-kanban-column';column.dataset.state=state;
          const items=matrix.catalog.filter(item=>working.get(item.permission_key)===state&&visible(item));
          column.innerHTML=`<header class="nexlab-kanban-column-head"><strong>${label}</strong><span>${items.length}</span></header><div class="nexlab-kanban-list"></div>`;
          const list=column.querySelector('.nexlab-kanban-list');
          for(const item of items){
            const isLocked=['protected','incompatible'].includes(state);const card=document.createElement('article');card.className=`nexlab-permission-card${isLocked?' is-locked':''}`;card.draggable=!isLocked;card.dataset.key=item.permission_key;
            const deps=dependencies.filter(dep=>dep.permission_key===item.permission_key).map(dep=>catalogByKey.get(dep.required_permission_key)?.label||dep.required_permission_key);
            card.innerHTML=`<h4></h4><p></p><div class="nexlab-permission-card-meta"></div>${!isLocked?'<button class="nexlab-permission-toggle" type="button"></button>':''}`;
            card.querySelector('h4').textContent=item.label;card.querySelector('p').textContent=item.description||item.permission_key;
            const meta=card.querySelector('.nexlab-permission-card-meta');for(const text of [item.category||'Outros',item.permission_key,deps.length?`Exige: ${deps.join(', ')}`:'']){if(!text)continue;const chip=document.createElement('span');chip.textContent=text;meta.appendChild(chip);}
            const toggle=card.querySelector('.nexlab-permission-toggle');if(toggle){toggle.textContent=state==='allowed'?'Mover para Negadas':'Mover para Permitidas';toggle.onclick=()=>move(item.permission_key,state==='allowed'?'denied':'allowed');}
            card.addEventListener('dragstart',()=>{dragged=item.permission_key;card.classList.add('is-dragging');});card.addEventListener('dragend',()=>{dragged='';card.classList.remove('is-dragging');board.querySelectorAll('.is-drop').forEach(node=>node.classList.remove('is-drop'));});list.appendChild(card);
          }
          if(['allowed','denied'].includes(state)){
            column.addEventListener('dragover',event=>{event.preventDefault();column.classList.add('is-drop');});column.addEventListener('dragleave',event=>{if(!column.contains(event.relatedTarget))column.classList.remove('is-drop');});column.addEventListener('drop',event=>{event.preventDefault();column.classList.remove('is-drop');if(dragged)move(dragged,state);});
          }
          board.appendChild(column);
        }
        const changed=changedKeys().length;const counts={};for(const state of working.values())counts[state]=(counts[state]||0)+1;
        stats.innerHTML=`<span class="nexlab-kanban-pill">Revisão ${matrix.revision}</span><span class="nexlab-kanban-pill">${counts.allowed||0} permitidas</span><span class="nexlab-kanban-pill">${counts.denied||0} negadas</span><span class="nexlab-kanban-pill">${counts.protected||0} protegidas</span><span class="nexlab-kanban-pill">${counts.incompatible||0} incompatíveis</span><span class="nexlab-kanban-pill${changed?' is-changed':''}">${changed} alteração(ões)</span>`;
        save.disabled=role==='admin'||changed===0;
      }
      async function refreshAfterSave(){matrix=await loadMatrix(true);catalogByKey.clear();for(const item of matrix.catalog)catalogByKey.set(item.permission_key,item);rebuildState();reason.value='';render();}
      rebuildState();render();
      roleSelect.addEventListener('change',()=>{role=roleSelect.value;rebuildState();setMessage(role==='admin'?'O perfil Administrador é integral e protegido.':'');render();});
      toolbar.querySelector('[data-search]').addEventListener('input',event=>{search=event.target.value;render();});categorySelect.addEventListener('change',()=>{category=categorySelect.value;render();});
      reset.addEventListener('click',()=>{rebuildState();setMessage('Alterações locais descartadas.');render();});
      save.addEventListener('click',async()=>{
        const changes=changedKeys();if(!changes.length)return;if(!reason.value.trim()){setMessage('Informe o motivo da alteração.','error');return;}
        if(typeof window.nexlabRequestPermissionPassword!=='function'){setMessage('O componente de confirmação administrativa não está disponível. Recarregue o aplicativo.','error');return;}
        const password=await window.nexlabRequestPermissionPassword({title:'Autorizar Kanban de permissões',message:`Confirme com a senha administrativa para aplicar ${changes.length} alteração(ões) em ${roleLabel(role)}.`,confirmLabel:'Salvar permissões'});
        if(password==null)return;save.disabled=true;reset.disabled=true;setMessage('Salvando alterações...');
        const payload={};for(const key of changes)payload[key]=working.get(key)==='allowed';
        try{
          await rpc('nexlab_admin_save_role_permissions_v02652',{p_role:role,p_permissions:payload,p_reason:reason.value.trim(),p_expected_revision:matrix.revision,p_admin_password:password});
          await refreshAfterSave();setMessage(`Padrões de ${roleLabel(role)} atualizados e auditados.`,'success');
        }catch(error){setMessage(error.message||'Falha ao salvar permissões.','error');render();}
        finally{reset.disabled=false;}
      });
    }catch(error){loading.className='nexlab-admin-note nexlab-admin-error';loading.textContent=error.message||'Falha ao carregar o Kanban.';}
  }

  async function openSecurityExport(){
    const {body}=createDialog('Exportação de segurança','Gere um snapshot sanitizado e auditado da configuração atual. Dados pessoais protegidos, credenciais e segredos não são incluídos.');
    const purpose=document.createElement('label');purpose.className='nexlab-admin-field';purpose.innerHTML='<span>Finalidade da exportação</span><textarea>Homologação da Beta 0.26.54 e conferência das configurações de segurança.</textarea>';body.appendChild(purpose);
    body.appendChild(messageBox('O arquivo registra perfis apenas por contagem e função. A auditoria recente usa identificadores técnicos, sem e-mail, telefone, CPF, data de nascimento ou conteúdo pessoal.'));
    const actions=document.createElement('div');actions.className='nexlab-admin-actions';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-primary">Gerar e baixar snapshot</button>';body.appendChild(actions);
    const output=document.createElement('div');body.appendChild(output);const button=actions.querySelector('button');
    button.addEventListener('click',async()=>{
      const text=purpose.querySelector('textarea').value.trim();if(text.length<10){output.replaceChildren(messageBox('Informe uma finalidade com pelo menos 10 caracteres.','error'));return;}
      button.disabled=true;button.textContent='Gerando snapshot...';output.replaceChildren(messageBox('Consultando integridade, permissões, RLS, auditoria e versões...'));
      try{
        const snapshot=await rpc('nexlab_export_security_snapshot_v02653',{p_purpose:text});
        const canonical=JSON.stringify(snapshot);
        const hash=await sha256(canonical);
        const envelope={format:'NEXLAB_SECURITY_SNAPSHOT',format_version:'1.0',generated_at:new Date().toISOString(),sha256:hash,hash_scope:'snapshot',snapshot};
        const filename=`NEXLAB_SEGURANCA_${VERSION.replaceAll('.','_')}_${new Date().toISOString().slice(0,10)}.json`;
        downloadBlob(filename,JSON.stringify(envelope,null,2));
        const profiles=snapshot.profiles||{};const permissions=snapshot.permissions||{};const database=snapshot.database||{};const rls=database.row_level_security||{};
        output.innerHTML=`<div class="nexlab-security-summary"><div><strong>${profiles.total||0}</strong><span>perfis analisados</span></div><div><strong>${permissions.actual_pairs||0}/${permissions.expected_pairs||0}</strong><span>pares da matriz</span></div><div><strong>${rls.rls_enabled||0}</strong><span>tabelas com RLS</span></div><div><strong>${snapshot.audit_chain?.valid===true?'Íntegra':'Revisar'}</strong><span>cadeia de auditoria</span></div></div><div class="nexlab-admin-note nexlab-admin-success">Snapshot gerado, auditado e baixado. ID de auditoria: ${snapshot.audit_id||'—'}</div><code class="nexlab-hash"></code>`;
        output.querySelector('.nexlab-hash').textContent=`SHA-256: ${hash}`;
      }catch(error){output.replaceChildren(messageBox(error.message||'Falha ao exportar a segurança.','error'));}
      finally{button.disabled=false;button.textContent='Gerar e baixar snapshot';}
    });
  }

  async function openReleaseReview(){
    const {body}=createDialog('Revisão da Beta 0.26.54','Validação integrada do pacote publicado, da matriz de permissões e do ambiente controlado de homologação.');
    const status=messageBox('Executando verificações...');body.appendChild(status);
    const list=document.createElement('div');list.className='nexlab-review-list';body.appendChild(list);
    const actions=document.createElement('div');actions.className='nexlab-admin-actions nexlab-hidden';actions.innerHTML='<button type="button" class="nexlab-admin-btn nexlab-admin-secondary">Baixar relatório da revisão</button>';body.appendChild(actions);
    try{
      const checks=[];
      let release=null,manifest=null,matrix=null,testStatus=null;
      try{release=await fetch(`./release.json?review=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null);}catch{}
      try{manifest=await fetch(`./manifest.webmanifest?review=${Date.now()}`,{cache:'no-store'}).then(response=>response.ok?response.json():null);}catch{}
      try{matrix=await loadMatrix(true);}catch{}
      try{testStatus=window.NexlabTestEnvironment?.call?await window.NexlabTestEnvironment.call('status'):null;}catch{}
      const identity=window.__NEXLAB_BUILD_IDENTITY__||window.__NEXLAB_RELEASE__||{};
      checks.push({label:'Identidade da versão',ok:String(identity.version||'')===VERSION,detail:String(identity.version||'não identificada')});
      checks.push({label:'Manifesto PWA',ok:String(manifest?.name||'').includes(VERSION),detail:manifest?.name||'não carregado'});
      checks.push({label:'Inventário release.json',ok:String(release?.version||'')===VERSION,detail:String(release?.version||'não carregado')});
      checks.push({label:'Matriz de cinco perfis',ok:Boolean(matrix?.summary?.matrix_complete)&&Number(matrix?.summary?.actual_pairs)===Number(matrix?.summary?.expected_pairs),detail:matrix?`${matrix.summary.actual_pairs}/${matrix.summary.expected_pairs} pares`:'indisponível'});
      checks.push({label:'Visualização somente leitura',ok:Boolean(window.__NEXLAB_PROFILE_PREVIEW_AVAILABLE__),detail:window.__NEXLAB_PROFILE_PREVIEW_AVAILABLE__?'módulo carregado':'módulo ausente'});
      checks.push({label:'Ambiente de teste controlado',ok:Boolean(testStatus)&&testStatus?.active!==true,detail:testStatus?.active===true?'cenário ativo':testStatus?'nenhum cenário ativo':'consulta indisponível'});
      const allOk=checks.every(item=>item.ok);status.className=`nexlab-admin-note ${allOk?'nexlab-admin-success':'nexlab-admin-warning'}`;status.textContent=allOk?'Todas as verificações integradas foram aprovadas.':'A revisão encontrou itens que precisam de atenção.';
      for(const item of checks){const row=document.createElement('div');row.className='nexlab-review-row';row.innerHTML='<div><strong></strong><br><span></span></div><span class="nexlab-review-state"></span>';row.querySelector('strong').textContent=item.label;row.querySelector('div span').textContent=item.detail;const state=row.querySelector('.nexlab-review-state');state.textContent=item.ok?'APROVADO':'ATENÇÃO';state.classList.add(item.ok?'ok':'fail');list.appendChild(row);}
      const report={app:'NEXLAB',version:VERSION,checked_at:new Date().toISOString(),approved:allOk,checks};actions.classList.remove('nexlab-hidden');actions.querySelector('button').onclick=()=>downloadBlob(`NEXLAB_REVISAO_${VERSION.replaceAll('.','_')}.json`,JSON.stringify(report,null,2));
    }catch(error){status.className='nexlab-admin-note nexlab-admin-error';status.textContent=error.message||'Falha na revisão.';}
  }

  function openSuite(){
    const {body}=createDialog('Ferramentas de homologação','Recursos administrativos da Beta 0.26.54 para testar perfis, validar com Coordenadores e preparar a promoção seletiva.');
    const grid=document.createElement('div');grid.className='nexlab-admin-grid';
    const tools=[
      ['🧪','Ambiente de teste','Crie ou limpe as sete contas temporárias e os dados fictícios rastreados.',()=>window.NexlabTestEnvironment?.open?.()],
      ['👁','Visualizar como perfil','Abra uma simulação somente leitura por perfil padrão ou usuário específico.',openProfilePreview],
      ['▦','Kanban de permissões','Organize padrões de acesso com arrastar e soltar, dependências e auditoria.',openPermissionKanban],
      ['⬇','Exportar segurança','Baixe um snapshot sanitizado, auditado e protegido por SHA-256.',openSecurityExport],
      ['✓','Revisar versão','Confira identidade, PWA, matriz, visualização e ambiente de teste.',openReleaseReview],
      ['☑','Validação dos coordenadores','Abra o roteiro, acompanhe aprovações e registre pedidos de ajuste por item.',()=>window.NexlabCoordinatorValidation?.openValidation?.()],
      ['⇧','Promoção seletiva','Gere o manifesto oficial somente depois das aprovações e verificações técnicas.',()=>window.NexlabCoordinatorValidation?.openPromotion?.()]
    ];
    for(const [icon,title,description,handler] of tools){
      const button=document.createElement('button');button.type='button';button.className='nexlab-admin-tool';button.innerHTML='<span class="nexlab-admin-tool-icon"></span><span><h3></h3><p></p></span>';button.querySelector('.nexlab-admin-tool-icon').textContent=icon;button.querySelector('h3').textContent=title;button.querySelector('p').textContent=description;button.onclick=handler;grid.appendChild(button);
    }
    body.appendChild(grid);body.appendChild(messageBox(`Versão ativa: NEXLAB Beta ${VERSION}. Todas as ações de alteração continuam sujeitas às permissões e confirmações do Supabase oficial.`));
  }

  async function mount(){
    if(document.getElementById('nexlab-admin-tools-trigger')||window.__NEXLAB_PROFILE_PREVIEW__?.active)return;
    const admin=await currentAdmin();if(!admin)return;
    const old=document.getElementById('nexlab-test-trigger');if(old)old.remove();
    const button=document.createElement('button');button.id='nexlab-admin-tools-trigger';button.type='button';button.title='Ferramentas administrativas de homologação';button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.64 5.64l2.12 2.12m8.48 8.48 2.12 2.12m0-12.72-2.12 2.12M7.76 16.24l-2.12 2.12"/><circle cx="12" cy="12" r="4"/></svg><span>Homologação</span>';button.onclick=openSuite;document.body.appendChild(button);
  }

  window.NexlabAdminHomologation=Object.freeze({version:VERSION,open:openSuite,openProfilePreview,openPermissionKanban,openSecurityExport,openReleaseReview,openCoordinatorValidation:()=>window.NexlabCoordinatorValidation?.openValidation?.(),openPromotion:()=>window.NexlabCoordinatorValidation?.openPromotion?.()});
  window.addEventListener('nexlab:auth-ready',()=>setTimeout(mount,500));
  setTimeout(mount,2600);
  setInterval(()=>{if(!document.getElementById('nexlab-admin-tools-trigger'))mount();},12000);
})();
