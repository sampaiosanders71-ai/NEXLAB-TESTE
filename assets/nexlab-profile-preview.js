(function(){
  'use strict';

  window.__NEXLAB_PROFILE_PREVIEW_AVAILABLE__=true;

  const PARAM='nexlab_preview';
  const STORAGE_PREFIX='nexlab-preview:';
  const PROJECT_REF='eahldhabwulnwhuwrhvc';
  const url=new URL(location.href);
  const previewToken=url.searchParams.get(PARAM);
  if(!previewToken)return;

  function readAuthToken(){
    for(let i=0;i<localStorage.length;i+=1){
      const key=localStorage.key(i)||'';
      if(!key.startsWith(`sb-${PROJECT_REF}-auth-token`))continue;
      try{
        const value=JSON.parse(localStorage.getItem(key)||'null');
        const access=value?.access_token||value?.currentSession?.access_token;
        if(access)return access;
      }catch{}
    }
    return '';
  }

  function jwtSubject(jwt){
    try{
      const body=jwt.split('.')[1];
      const normalized=body.replace(/-/g,'+').replace(/_/g,'/');
      const padded=normalized.padEnd(Math.ceil(normalized.length/4)*4,'=');
      const payload=JSON.parse(decodeURIComponent(Array.from(atob(padded),c=>`%${c.charCodeAt(0).toString(16).padStart(2,'0')}`).join('')));
      return String(payload?.sub||'');
    }catch{return '';}
  }

  const storageKey=`${STORAGE_PREFIX}${previewToken}`;
  let config=null;
  try{config=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
  const currentSubject=jwtSubject(readAuthToken());
  const valid=config
    && config.token===previewToken
    && String(config.issuedBy||'')===currentSubject
    && Number(config.expiresAt||0)>Date.now()
    && Array.isArray(config.effectivePermissions)
    && typeof config.targetRole==='string';

  if(!valid){
    try{localStorage.removeItem(storageKey);}catch{}
    url.searchParams.delete(PARAM);
    history.replaceState(null,'',url.toString());
    return;
  }

  const nativeFetch=window.fetch.bind(window);
  const permissions=new Set(config.effectivePermissions.map(String));
  const simulatedRole=String(config.targetRole||'').toLowerCase();
  const issuerId=String(config.issuedBy||'');
  const roleIsAdmin=['admin','administrador'].includes(simulatedRole);
  const roleIsManager=roleIsAdmin||simulatedRole==='coordenador';

  function rpcName(target){
    try{
      const match=new URL(typeof target==='string'?target:target?.url,location.href).pathname.match(/\/rest\/v1\/rpc\/([^/]+)$/i);
      return match?decodeURIComponent(match[1]):'';
    }catch{return '';}
  }

  function requestMethod(input,init){
    return String(init?.method||input?.method||'GET').toUpperCase();
  }

  async function requestBody(input,init){
    try{
      if(init?.body&&typeof init.body==='string')return JSON.parse(init.body);
      if(input instanceof Request){
        const text=await input.clone().text();
        return text?JSON.parse(text):{};
      }
    }catch{}
    return {};
  }

  function jsonResponse(data,status=200,statusText='OK',headers){
    const nextHeaders=new Headers(headers||{});
    nextHeaders.set('Content-Type','application/json; charset=utf-8');
    nextHeaders.set('Cache-Control','no-store');
    return new Response(JSON.stringify(data),{status,statusText,headers:nextHeaders});
  }

  function applyProfileShape(row){
    if(!row||typeof row!=='object'||Array.isArray(row))return row;
    return {
      ...row,
      role:simulatedRole,
      ativo:true,
      cadastro_completo:true,
      role_request_status:'approved',
      effective_permissions:[...permissions],
      acessos:[],
      nome:config.targetName?`${config.targetName} · visualização`:row.nome
    };
  }

  function rewriteDeep(value){
    if(Array.isArray(value))return value.map(rewriteDeep);
    if(!value||typeof value!=='object')return value;
    let next={...value};
    if(String(next.id||'')===issuerId&&(Object.prototype.hasOwnProperty.call(next,'role')||Object.prototype.hasOwnProperty.call(next,'effective_permissions'))){
      next=applyProfileShape(next);
    }
    for(const [key,child] of Object.entries(next)){
      if(child&&typeof child==='object')next[key]=rewriteDeep(child);
    }
    return next;
  }

  function isExactOwnProfileQuery(target){
    try{
      const targetUrl=new URL(typeof target==='string'?target:target?.url,location.href);
      if(!/\/rest\/v1\/profiles$/i.test(targetUrl.pathname))return false;
      const filter=targetUrl.searchParams.get('id')||'';
      return filter===`eq.${issuerId}`;
    }catch{return false;}
  }

  function simulatedRpcResult(name,body){
    const permission=String(body?.p_permission||body?.permission||'');
    if(['nexlab_has_effective_permission_v2680','nexlab_has_permission_v26100','nexlab_has_project_permission_v2690'].includes(name))return permissions.has(permission);
    if(['nexlab_is_admin','nexlab_is_admin_v2680','is_admin'].includes(name))return roleIsAdmin;
    if(['nexlab_is_gestor','is_coord_or_admin'].includes(name))return roleIsManager;
    if(name==='nexlab_has_approved_access')return true;
    if(name==='nexlab_can_view_all_teams_v2680')return roleIsAdmin||permissions.has('teams_view_all');
    if(name==='nexlab_can_create_team_v2680')return roleIsAdmin||permissions.has('teams_create');
    if(name==='nexlab_can_create_project_v2690')return roleIsAdmin||permissions.has('projects_create');
    return undefined;
  }

  const silentWriteRpc=/^(?:nexlab_record_client_error|nexlab_record_device_homologation|nexlab_record_production_snapshot|nexlab_ensure_production_snapshot)/i;
  const mutatingRpc=/(?:^|_)(?:admin_|save|create|update|delete|archive|cancel|move|manage|review|respond|submit|record|set|mark|retry|restore|accept|upsert|start|finish|quarantine|clean|expire|prepare|finalize|requeue)(?:_|$)/i;

  window.fetch=async function previewFetch(input,init){
    const method=requestMethod(input,init);
    const target=typeof input==='string'?input:input?.url||String(input||'');
    const name=rpcName(target);
    const body=name?await requestBody(input,init):{};
    const simulated=simulatedRpcResult(name,body);
    if(simulated!==undefined)return jsonResponse(simulated);

    let pathname='';
    try{pathname=new URL(target,location.href).pathname;}catch{pathname=target;}
    const isSupabase=/\.supabase\.co\//i.test(target);
    const isRpc=Boolean(name);
    const isRest=/\/rest\/v1\//i.test(pathname);
    const isStorage=/\/storage\/v1\//i.test(pathname);
    const isFunction=/\/functions\/v1\//i.test(pathname);

    if(config.readOnly!==false&&isSupabase){
      if(isRpc&&method==='POST'&&silentWriteRpc.test(name))return jsonResponse({ok:true,preview:true});
      if(isRpc&&method==='POST'&&mutatingRpc.test(name)){
        return jsonResponse({message:'Ação bloqueada: a visualização de perfil é somente leitura.',code:'NEXLAB_PREVIEW_READ_ONLY'},403,'Forbidden');
      }
      if((isRest||isStorage||isFunction)&&!['GET','HEAD','OPTIONS'].includes(method)&&!isRpc){
        return jsonResponse({message:'Ação bloqueada: a visualização de perfil é somente leitura.',code:'NEXLAB_PREVIEW_READ_ONLY'},403,'Forbidden');
      }
    }

    const response=await nativeFetch(input,init);
    const contentType=response.headers.get('content-type')||'';
    if(!response.ok||!contentType.includes('application/json'))return response;

    const shouldRewrite=isExactOwnProfileQuery(target)
      || name==='nexlab_list_profiles_visible_v26311'
      || name==='nexlab_get_permission_matrix_v02652'
      || name==='nexlab_get_permission_matrix';
    if(!shouldRewrite)return response;

    try{
      const data=await response.clone().json();
      let rewritten=data;
      if(isExactOwnProfileQuery(target)&&Array.isArray(data))rewritten=data.map(applyProfileShape);
      else rewritten=rewriteDeep(data);
      return jsonResponse(rewritten,response.status,response.statusText,response.headers);
    }catch{return response;}
  };

  function exitPreview(){
    try{localStorage.removeItem(storageKey);}catch{}
    const clean=new URL(location.href);
    clean.searchParams.delete(PARAM);
    location.replace(clean.toString());
  }

  function mountBanner(){
    if(document.getElementById('nexlab-profile-preview-banner'))return;
    document.documentElement.classList.add('nexlab-preview-active');
    const style=document.createElement('style');
    style.textContent=`
      html.nexlab-preview-active body{padding-top:48px!important}
      #nexlab-profile-preview-banner{position:fixed;inset:0 0 auto 0;height:48px;z-index:2147483600;background:#7c2d12;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;padding:8px 14px;font:700 12px/1.25 system-ui,-apple-system,"Segoe UI",sans-serif;box-shadow:0 8px 24px rgba(124,45,18,.25)}
      #nexlab-profile-preview-banner strong{font-weight:900}#nexlab-profile-preview-banner span{opacity:.92}
      #nexlab-profile-preview-banner button{border:1px solid rgba(255,255,255,.5);background:#fff;color:#7c2d12;border-radius:9px;padding:7px 11px;font:800 11px/1 system-ui;cursor:pointer}
      @media(max-width:640px){#nexlab-profile-preview-banner{justify-content:space-between;height:56px;font-size:10px}html.nexlab-preview-active body{padding-top:56px!important}#nexlab-profile-preview-banner span{display:none}}
    `;
    document.head.appendChild(style);
    const banner=document.createElement('div');
    banner.id='nexlab-profile-preview-banner';
    banner.innerHTML=`<strong>VISUALIZAÇÃO: ${String(config.targetName||config.targetRole).toUpperCase()}</strong><span>Simulação de interface e permissões · dados consultados pela conta ADM · somente leitura</span><button type="button">Sair da visualização</button>`;
    banner.querySelector('button').addEventListener('click',exitPreview);
    document.body.appendChild(banner);
  }

  window.__NEXLAB_PROFILE_PREVIEW__=Object.freeze({...config,active:true,permissions:[...permissions]});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountBanner,{once:true});
  else mountBanner();
  setInterval(()=>{if(Date.now()>=Number(config.expiresAt||0))exitPreview();},30000);
})();
