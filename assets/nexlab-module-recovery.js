(function(root){
  'use strict';
  const BUILD=root.__NEXLAB_BUILD_IDENTITY__||{};
  const VERSION=String(BUILD.version||'0.26.82');
  const REVISION=String(BUILD.revision||'beta-0-26-82-agenda-integrada-completa');
  const CACHE_PREFIX='nexlab-';
  const GUARD_KEY='nexlab:module-recovery:'+REVISION;
  const STRUCTURAL_RE=/(?:unexpected token|invalid or unexpected token|unexpected end of input|syntaxerror|does not provide an export named|failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|chunkloaderror|loading chunk|module script)/i;
  const state={version:VERSION,revision:REVISION,status:'ready',attempts:0,lastError:null,lastContext:null,active:null};

  function text(error){ return String(error?.message||error||'Falha desconhecida ao carregar módulo.'); }
  function stack(error){ return String(error?.stack||''); }
  function structural(error){ return STRUCTURAL_RE.test(text(error)+' '+String(error?.name||'')); }
  function dispatch(type,detail){ try{root.dispatchEvent(new CustomEvent(type,{detail}));}catch{} }
  function safeContext(context={}){return {module:String(context.module||document.body?.dataset?.nexlabPage||'').slice(0,120),url:String(context.url||'').slice(0,600),source:String(context.source||'module-loader').slice(0,80)};}
  function readGuard(){try{return JSON.parse(sessionStorage.getItem(GUARD_KEY)||'null')||null;}catch{return null;}}
  function writeGuard(value){try{sessionStorage.setItem(GUARD_KEY,JSON.stringify(value));}catch{}}
  function clearGuard(){try{sessionStorage.removeItem(GUARD_KEY);}catch{}}
  async function purgeNexlabCaches(){
    if(!('caches' in root))return [];
    const names=await caches.keys();
    const targets=names.filter(name=>String(name).startsWith(CACHE_PREFIX));
    await Promise.all(targets.map(name=>caches.delete(name).catch(()=>false)));
    return targets;
  }
  async function refreshWorker(){
    if(!navigator.serviceWorker)return null;
    try{const registration=await navigator.serviceWorker.getRegistration();if(registration)await registration.update();return registration||null;}catch{return null;}
  }
  async function serverIdentity(){
    try{const url=new URL('./release.json',document.baseURI);url.searchParams.set('nexlabModuleRecovery',String(Date.now()));const response=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)return null;const data=await response.json();return {version:String(data?.version||''),revision:String(data?.revision||''),assetRevision:String(data?.asset_revision||'')};}catch{return null;}
  }
  function showBlocked(detail){
    const render=()=>{
      if(document.getElementById('nexlab-module-recovery-blocked'))return;
      const box=document.createElement('div');box.id='nexlab-module-recovery-blocked';box.setAttribute('role','alert');box.style.cssText='position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483647;background:#fff;border:1px solid #f59e0b;border-radius:16px;padding:14px 16px;box-shadow:0 18px 60px rgba(15,23,42,.25);font:13px/1.45 Arial,sans-serif;color:#1e293b';
      const title=document.createElement('strong');title.textContent='Um módulo do NEXLAB não pôde ser carregado.';title.style.display='block';
      const message=document.createElement('div');message.textContent='A atualização automática já foi tentada. Use “Atualizar arquivos” para limpar somente a cache pública do aplicativo e tentar novamente.';message.style.marginTop='5px';
      const button=document.createElement('button');button.type='button';button.textContent='Atualizar arquivos';button.style.cssText='margin-top:10px;border:0;border-radius:10px;padding:9px 13px;background:#0b2a63;color:#fff;font-weight:700;cursor:pointer';
      button.onclick=async()=>{button.disabled=true;clearGuard();await purgeNexlabCaches();await refreshWorker();const url=new URL(location.href);url.searchParams.set('nexlabModuleManualRecovery',String(Date.now()));location.replace(url.toString());};
      box.append(title,message,button);(document.body||document.documentElement).appendChild(box);
    };
    if(document.body)render();else document.addEventListener('DOMContentLoaded',render,{once:true});
    dispatch('nexlab:module-recovery-blocked',detail);
  }
  async function handle(error,context={}){
    if(!structural(error))return false;
    const ctx=safeContext(context);const detail={version:VERSION,revision:REVISION,message:text(error),stack:stack(error),...ctx,detectedAt:Date.now()};
    state.lastError=detail.message;state.lastContext=ctx;
    dispatch('nexlab:module-chunk-error',detail);
    dispatch('nexlab:module-render-error',{module:ctx.module,message:detail.message,stack:detail.stack,source:'chunk-recovery',url:ctx.url});
    if(state.active)return state.active;
    state.active=(async()=>{
      const now=Date.now();const guard=readGuard();
      if(guard&&Number(guard.count||0)>=1&&now-Number(guard.at||0)<120000){state.status='blocked';showBlocked(detail);return false;}
      state.status='recovering';state.attempts+=1;writeGuard({count:Number(guard?.count||0)+1,at:now,module:ctx.module,url:ctx.url,message:detail.message});
      const purged=await purgeNexlabCaches();await refreshWorker();const remote=await serverIdentity();
      dispatch('nexlab:module-recovery-started',{...detail,purgedCaches:purged,serverIdentity:remote});
      const target=new URL(location.href);target.searchParams.set('nexlabModuleRecovery',String(now));if(remote?.revision)target.searchParams.set('nexlabRevision',remote.revision);
      root.setTimeout(()=>location.replace(target.toString()),80);return true;
    })().finally(()=>{state.active=null;});
    return state.active;
  }
  root.addEventListener('unhandledrejection',event=>{const error=event?.reason;if(structural(error))void handle(error,{source:'unhandledrejection'});});
  root.addEventListener('error',event=>{const error=event?.error||new Error(event?.message||'Erro de módulo');const filename=String(event?.filename||'');if(structural(error)&&(filename===''||filename.startsWith(location.origin)||filename.includes('/assets/')))void handle(error,{source:'window-error',url:filename});},true);
  function markHealthy(module=''){const guard=readGuard();if(!guard){state.status='ready';return;}const guardedModule=String(guard.module||'');if(!guardedModule||!module||guardedModule===String(module)){clearGuard();state.status='ready';}}
  root.addEventListener('nexlab:application-ready',()=>{const guard=readGuard();if(!guard?.module)markHealthy('');},{once:true});
  root.__NEXLAB_MODULE_RECOVERY__=Object.freeze({version:VERSION,revision:REVISION,state,handle,isStructuralError:structural,purgeCaches:purgeNexlabCaches,clearGuard,markHealthy});
})(globalThis);
