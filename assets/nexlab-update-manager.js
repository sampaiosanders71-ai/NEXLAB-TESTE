(function(){
  'use strict';
  const BUILD=window.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',release:'Beta',revision:'beta-0-26-82-google-calendar-integracao',generatedAt:'2026-09-27T17:59:00Z',cacheName:'nexlab-app-beta-0-26-82-google-calendar-integracao-20260928T022407Z',pwa:{identity:{id:'./nexlab-pwa',name:'NexLab',scope:'./',startUrl:'./?source=pwa',worker:'./nexlab-sw.js?pwa=nexlab-identity-v2-20260926',workerPath:'nexlab-sw.js',namespace:'nexlab-pwa-v2'}}});
  const CURRENT={version:String(BUILD.version||''),release:String(BUILD.release||''),revision:String(BUILD.revision||''),generatedAt:String(BUILD.generatedAt||'')};
  const HEAD_URL='./release-head.json';
  const PWA_IDENTITY=BUILD.pwa?.identity||Object.freeze({id:'./nexlab-pwa',name:'NexLab',scope:'./',startUrl:'./?source=pwa',worker:'./nexlab-sw.js',workerPath:'nexlab-sw.js',namespace:'nexlab-pwa-v2'});
  const WORKER_URL=String(PWA_IDENTITY.worker||'./nexlab-sw.js');
  const WORKER_SCOPE=String(PWA_IDENTITY.scope||'./');
  const EXPECTED_SCOPE_URL=new URL(WORKER_SCOPE,document.baseURI).href;
  const EXPECTED_WORKER_PATH=new URL(String(PWA_IDENTITY.workerPath||'nexlab-sw.js'),document.baseURI).pathname;
  const CHECK_INTERVAL_MS=15*60*1000;
  const VISIBILITY_MIN_INTERVAL_MS=2*60*1000;
  const MESSAGE_TIMEOUT_MS=5000;
  const ACTIVATE_TIMEOUT_MS=30000;
  const DEFERRED_KEY='nexlab:update-deferred-revision';
  if(window.__NEXLAB_UPDATE_MANAGER__?.revision===CURRENT.revision)return;

  let started=false,intervalId=null,initialTimer=null,checking=null,applying=false,reloading=false,lastCheckMs=0;
  let observedRegistration=null,updateFoundHandler=null,banner=null,bannerText=null,bannerNow=null;
  const state={...CURRENT,status:'idle',updateAvailable:false,remoteVersion:null,remoteRelease:null,remoteRevision:null,remoteGeneratedAt:null,workerRevision:null,checkedAt:null,error:null,protocol:2};
  const dispatch=(name,detail)=>{try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch{}};
  const withTimeout=(promise,ms,message)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(message)),ms);Promise.resolve(promise).then(v=>{clearTimeout(timer);resolve(v);},e=>{clearTimeout(timer);reject(e);});});
  function id(value){if(!value||typeof value!=='object')return null;return{version:String(value.version||'').trim(),release:String(value.release||'').trim(),revision:String(value.revision||'').trim(),generatedAt:String(value.generatedAt||value.generated_at||'').trim(),cache:String(value.cache||'').trim(),protocol:Number(value.protocol||value.update_protocol||0)||0};}
  function newer(value){const remote=id(value);if(!remote?.revision)return false;const rt=Date.parse(remote.generatedAt||''),ct=Date.parse(CURRENT.generatedAt||'');if(remote.revision===CURRENT.revision)return Number.isFinite(rt)&&Number.isFinite(ct)&&rt>ct;if(Number.isFinite(rt)&&Number.isFinite(ct))return rt>ct;return remote.revision!==CURRENT.revision;}
  function buildKey(value){const remote=id(value);return remote?.revision?`${remote.revision}@${remote.generatedAt||''}`:'';}
  function deferred(){try{return sessionStorage.getItem(DEFERRED_KEY)||'';}catch{return '';}}
  function clearDeferred(){try{sessionStorage.removeItem(DEFERRED_KEY);}catch{}}
  function ensureStyle(){
    if(document.getElementById('nexlab-update-manager-style'))return;
    const style=document.createElement('style');
    style.id='nexlab-update-manager-style';
    style.textContent=`
#nexlab-update-notice{position:fixed;top:50%;left:50%;right:auto;bottom:auto;transform:translate(-50%,-50%);z-index:2147483000;display:block;width:min(440px,calc(100% - 32px));max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);overflow-y:auto;overscroll-behavior:contain;margin:0;padding:22px;box-sizing:border-box;border:1px solid #d5dfed;border-top:4px solid var(--nexlab-orange,#FF8A00);border-radius:18px;background:#fff;color:var(--nexlab-navy,#0E1F3D);box-shadow:0 18px 56px rgba(14,31,61,.24);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:left}
#nexlab-update-notice *{box-sizing:border-box}
#nexlab-update-notice .nexlab-update-heading{display:flex;align-items:center;gap:12px}
#nexlab-update-notice .nexlab-update-icon{display:grid;place-items:center;flex:0 0 42px;height:42px;border-radius:12px;background:#fff1df;color:#b35b00}
#nexlab-update-notice .nexlab-update-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.85;stroke-linecap:round;stroke-linejoin:round}
#nexlab-update-notice .nexlab-update-title{display:block;min-width:0;margin:0;color:var(--nexlab-navy,#0E1F3D);font-size:1.3125rem;font-weight:750;line-height:1.3;letter-spacing:-.025em;overflow-wrap:anywhere}
#nexlab-update-notice .nexlab-update-message{display:block;margin:15px 0 21px;color:#4e6079;font-size:.875rem;line-height:1.6;white-space:normal;overflow-wrap:anywhere}
#nexlab-update-notice .nexlab-update-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap}
#nexlab-update-notice .nexlab-update-actions button{appearance:none;min-height:44px;max-width:100%;padding:10px 17px;border:1px solid #d5dfed;border-radius:10px;background:#fff;color:var(--nexlab-navy,#0E1F3D);font-family:inherit;font-size:.8125rem;font-weight:650;line-height:1.4;white-space:normal;cursor:pointer}
#nexlab-update-notice .nexlab-update-actions .nexlab-update-now{background:var(--nexlab-navy,#0E1F3D);border-color:var(--nexlab-navy,#0E1F3D);color:#fff}
#nexlab-update-notice button:focus-visible{outline:3px solid var(--nexlab-orange,#FF8A00);outline-offset:3px}
#nexlab-update-notice button:disabled{opacity:.65;cursor:wait}
@media(hover:hover){#nexlab-update-notice button:hover:not(:disabled){filter:brightness(.96)}}
@media(max-width:380px){#nexlab-update-notice{padding:18px 16px}#nexlab-update-notice .nexlab-update-title{font-size:1.25rem}#nexlab-update-notice .nexlab-update-actions button{flex:1;padding:10px 12px}}
`;
    document.head.appendChild(style);
  }
  function hideBanner(){banner?.remove();banner=null;bannerText=null;bannerNow=null;}
  function showBanner(identity,validation){
    if(!document.body)return;
    const remote=id(identity);
    if(!remote?.revision||deferred()===buildKey(remote))return;
    ensureStyle();
    hideBanner();
    const box=document.createElement('section');
    box.id='nexlab-update-notice';
    box.className='nexlab-update-banner';
    box.setAttribute('role','status');
    box.setAttribute('aria-live','polite');
    box.setAttribute('aria-labelledby','nexlab-update-notice-title');
    const heading=document.createElement('div');
    heading.className='nexlab-update-heading';
    const icon=document.createElement('span');
    icon.className='nexlab-update-icon';
    icon.setAttribute('aria-hidden','true');
    icon.innerHTML='<svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>';
    const title=document.createElement('strong');
    title.id='nexlab-update-notice-title';
    title.className='nexlab-update-title';
    title.textContent='Nova atualização';
    heading.append(icon,title);
    const text=document.createElement('p');
    text.className='nexlab-update-message';
    text.textContent='A nova atualização do NexLab está pronta para instalar. Atualize quando for melhor para você.';
    const actions=document.createElement('div');
    actions.className='nexlab-update-actions';
    const later=document.createElement('button');
    later.type='button';
    later.className='nexlab-update-later';
    later.textContent='Depois';
    later.onclick=()=>{try{sessionStorage.setItem(DEFERRED_KEY,buildKey(remote));}catch{}hideBanner();state.status='deferred';dispatch('nexlab:update-deferred',{...state});};
    const now=document.createElement('button');
    now.type='button';
    now.className='nexlab-update-now';
    now.textContent='Atualizar agora';
    now.onclick=()=>void applyUpdate();
    actions.append(later,now);
    box.append(heading,text,actions);
    document.body.appendChild(box);
    banner=box;bannerText=text;bannerNow=now;
  }
  function setProgress(message){if(bannerText)bannerText.textContent=message;if(bannerNow){bannerNow.disabled=true;bannerNow.textContent='Atualizando...';}}
  function restoreAction(message){if(bannerText)bannerText.textContent=message||'Não foi possível ativar a atualização. Tente novamente.';if(bannerNow){bannerNow.disabled=false;bannerNow.textContent='Tentar novamente';}}
  async function fetchHead(){const url=new URL(HEAD_URL,location.href);url.searchParams.set('check',String(Date.now()));const response=await fetch(url,{cache:'no-store',credentials:'same-origin',headers:{Accept:'application/json'}});if(!response.ok)throw new Error(`Cabeçalho de atualização indisponível (${response.status}).`);const data=await response.json();return id(data)||{};}
  function workerScriptOwned(worker){if(!worker?.scriptURL)return true;try{return new URL(worker.scriptURL).pathname===EXPECTED_WORKER_PATH;}catch{return false;}}
  function registrationOwned(registration){if(!registration||registration.scope!==EXPECTED_SCOPE_URL)return false;return [registration.active,registration.waiting,registration.installing].filter(Boolean).every(workerScriptOwned);}
  async function getRegistration(){
    if(!('serviceWorker'in navigator)||location.protocol==='file:')return null;
    const registrations=await navigator.serviceWorker.getRegistrations();
    let registration=registrations.find(item=>item.scope===EXPECTED_SCOPE_URL)||null;
    if(registration&&!registrationOwned(registration)){
      await registration.unregister();
      registration=null;
      dispatch('nexlab:pwa-scope-reclaimed',{scope:EXPECTED_SCOPE_URL,reason:'foreign-worker-on-nexlab-scope'});
    }
    registration=await navigator.serviceWorker.register(WORKER_URL,{scope:WORKER_SCOPE,updateViaCache:'none'});
    if(registration.scope!==EXPECTED_SCOPE_URL)throw new Error('O Service Worker do NexLab foi registrado fora do escopo exclusivo do aplicativo.');
    observeRegistration(registration);
    return registration;
  }
  async function workerMessage(worker,payload,timeoutMs=MESSAGE_TIMEOUT_MS){if(!worker||typeof MessageChannel==='undefined')return null;return withTimeout(new Promise((resolve,reject)=>{const channel=new MessageChannel();channel.port1.onmessage=(event)=>{const data=event.data||{};data.ok===false?reject(new Error(data.error||'O Service Worker recusou a operação.')):resolve(data);};worker.postMessage(payload,[channel.port2]);}),timeoutMs,'O Service Worker não respondeu no tempo esperado.');}
  async function workerIdentity(worker){try{return id(await workerMessage(worker,{type:'NEXLAB_GET_VERSION'}));}catch{return null;}}
  async function validateWaiting(worker){return workerMessage(worker,{type:'NEXLAB_VALIDATE_INSTALL'},10000);}
  function publishReady(identity,validation){const remote=id(identity);if(!remote||!newer(remote)||validation?.ok!==true)return false;state.workerRevision=remote.revision;state.remoteVersion=remote.version;state.remoteRelease=remote.release;state.remoteRevision=remote.revision;state.remoteGeneratedAt=remote.generatedAt;state.updateAvailable=true;state.status=deferred()===buildKey(remote)?'deferred':'available';state.error=null;if(state.status==='available')showBanner(remote,validation);dispatch('nexlab:update-available',{...state,validation});return true;}
  async function inspectWaiting(registration,expectedHead=null){const worker=registration?.waiting;if(!worker)return false;const identity=await workerIdentity(worker);if(!identity?.revision||!newer(identity))return false;if(expectedHead?.revision&&identity.revision!==expectedHead.revision)return false;try{const validation=await validateWaiting(worker);return publishReady(identity,validation);}catch(error){state.status='preparing';state.error=String(error?.message||error);hideBanner();dispatch('nexlab:update-preparing',{...state});return false;}}
  function detachObserver(){if(observedRegistration&&updateFoundHandler)observedRegistration.removeEventListener('updatefound',updateFoundHandler);observedRegistration=null;updateFoundHandler=null;}
  function observeRegistration(registration){if(!registration||observedRegistration===registration)return;detachObserver();observedRegistration=registration;updateFoundHandler=()=>{const installing=registration.installing;if(!installing)return;state.status='downloading';state.updateAvailable=false;hideBanner();dispatch('nexlab:update-preparing',{...state});installing.addEventListener('statechange',()=>{if(installing.state==='installed'&&navigator.serviceWorker.controller)void inspectWaiting(registration);else if(installing.state==='redundant'){state.status='preparing';state.error='A revisão ainda não foi publicada por completo. O NEXLAB atual permanece ativo.';dispatch('nexlab:update-preparing',{...state});}});};registration.addEventListener('updatefound',updateFoundHandler);void inspectWaiting(registration);}
  async function performCheck(options={}){lastCheckMs=Date.now();state.status='checking';state.error=null;try{const registration=await getRegistration();let head=null;try{head=await fetchHead();}catch(error){state.checkedAt=new Date().toISOString();state.status=navigator.onLine===false?'offline':'current';state.error=navigator.onLine===false?null:String(error?.message||error);return{ok:true,...state,offline:navigator.onLine===false};}state.checkedAt=new Date().toISOString();
    const activeWorker=registration?.active||navigator.serviceWorker.controller;
    const activeIdentity=await workerIdentity(activeWorker);
    const expectedRevision=String(head?.revision||CURRENT.revision||'');
    if(expectedRevision&&activeIdentity?.revision&&activeIdentity.revision!==expectedRevision){
      state.workerRevision=activeIdentity.revision;state.remoteVersion=head?.version||CURRENT.version;state.remoteRelease=head?.release||CURRENT.release;state.remoteRevision=expectedRevision;state.remoteGeneratedAt=head?.generatedAt||CURRENT.generatedAt;state.updateAvailable=false;state.status='repairing';state.error=null;hideBanner();dispatch('nexlab:update-repairing',{...state,activeRevision:activeIdentity.revision,expectedRevision});
      if(registration&&!registration.installing)try{await registration.update();}catch(error){state.error=String(error?.message||error);}
      if(await inspectWaiting(registration,head))return{ok:true,...state,ready:true,repaired:true};
      state.status=registration?.installing?'downloading':'preparing';dispatch('nexlab:update-preparing',{...state,remote:head,repair:true});return{ok:true,...state,ready:false,repair:true};
    }
    if(head?.revision&&newer(head)){state.remoteVersion=head.version;state.remoteRelease=head.release;state.remoteRevision=head.revision;state.remoteGeneratedAt=head.generatedAt;if(await inspectWaiting(registration,head))return{ok:true,...state,ready:true};state.updateAvailable=false;hideBanner();state.status=registration?.installing?'downloading':'preparing';if(registration&&!registration.installing)try{await registration.update();}catch{}dispatch('nexlab:update-preparing',{...state,remote:head});return{ok:true,...state,ready:false};}state.updateAvailable=false;state.status='current';state.error=null;clearDeferred();hideBanner();dispatch('nexlab:update-current',{...state});return{ok:true,...state,ready:false};}catch(error){state.status='error';state.error=String(error?.message||error);state.checkedAt=new Date().toISOString();dispatch('nexlab:update-error',{...state});return{ok:false,...state};}}
  function check(options={}){if(checking)return checking;checking=performCheck(options).finally(()=>{checking=null;});return checking;}
  async function applyUpdate(){if(applying)return{ok:false,reason:'already_applying'};applying=true;state.status='activating';state.error=null;clearDeferred();setProgress('Ativando a revisão já validada...');try{const registration=await getRegistration();const waiting=registration?.waiting;if(!waiting)throw new Error('A atualização ainda não está no estado pronto. Aguarde o próximo aviso.');const identity=await workerIdentity(waiting);if(!identity||!newer(identity))throw new Error('O Service Worker em espera não corresponde a uma revisão nova.');const validation=await validateWaiting(waiting);if(validation?.ok!==true)throw new Error('A revisão deixou de passar na validação final.');const controllerPromise=waitForController(identity.revision);await workerMessage(waiting,{type:'NEXLAB_ACTIVATE_UPDATE',expectedVersion:identity.version,expectedRevision:identity.revision},10000);await controllerPromise;state.status='reloading';setProgress('Atualização ativada. Recarregando o NEXLAB...');reloadOnce(identity.revision);return{ok:true,identity,validation};}catch(error){applying=false;state.status='error';state.error=String(error?.message||error);restoreAction(state.error);dispatch('nexlab:update-error',{...state});return{ok:false,error:state.error};}}
  function waitForController(revision){return withTimeout(new Promise(resolve=>{const onChange=async()=>{const active=await workerIdentity(navigator.serviceWorker.controller);if(!revision||active?.revision===revision){navigator.serviceWorker.removeEventListener('controllerchange',onChange);resolve(active);}};navigator.serviceWorker.addEventListener('controllerchange',onChange);}),ACTIVATE_TIMEOUT_MS,'A nova revisão foi ativada, mas não assumiu a página no tempo esperado.');}
  function reloadOnce(revision){if(reloading)return;reloading=true;try{const key='nexlab:update-reload:'+revision;const at=Number(sessionStorage.getItem(key)||0);if(Date.now()-at<10000)return;sessionStorage.setItem(key,String(Date.now()));}catch{}const target=new URL(location.href);target.searchParams.set('nexlabActivated',revision);target.searchParams.set('nexlabReload',String(Date.now()));setTimeout(()=>location.replace(target.toString()),50);}
  function cleanTechnicalUrl(){try{const target=new URL(location.href);let changed=false;for(const key of ['nexlabActivated','nexlabReload','nexlabModuleRetry','nexlabRecoveryReason']){if(target.searchParams.has(key)){target.searchParams.delete(key);changed=true;}}if(changed)history.replaceState(history.state,'',target.pathname+(target.searchParams.toString()?`?${target.searchParams}`:'')+target.hash);return changed;}catch{return false;}}
  async function announceBootOk(){try{const registration=await navigator.serviceWorker.getRegistration('./');const active=registration?.active||navigator.serviceWorker.controller;const identity=await workerIdentity(active);if(identity?.revision!==CURRENT.revision)return false;await workerMessage(active,{type:'NEXLAB_APP_BOOT_OK',expectedRevision:CURRENT.revision},8000);cleanTechnicalUrl();return true;}catch{return false;}}
  function showAvailable(){if(state.updateAvailable&&state.remoteRevision&&observedRegistration?.waiting)void inspectWaiting(observedRegistration,{revision:state.remoteRevision});}
  function start(){if(started)return;started=true;if(!('serviceWorker'in navigator)||location.protocol==='file:'){state.status='unsupported';return;}void getRegistration().then(reg=>{observeRegistration(reg);void inspectWaiting(reg);});initialTimer=setTimeout(()=>void check(),1800);intervalId=setInterval(()=>void check(),CHECK_INTERVAL_MS);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastCheckMs>VISIBILITY_MIN_INTERVAL_MS)void check();});window.addEventListener('online',()=>void check());window.addEventListener('pageshow',event=>{if(event.persisted&&Date.now()-lastCheckMs>VISIBILITY_MIN_INTERVAL_MS)void check();});navigator.serviceWorker.addEventListener('controllerchange',async()=>{const identity=await workerIdentity(navigator.serviceWorker.controller);if(identity?.revision&&identity.revision!==CURRENT.revision)reloadOnce(identity.revision);});if(document.body?.dataset?.nexlabAppReady==='true')void announceBootOk();}
  function stop(){if(initialTimer)clearTimeout(initialTimer);if(intervalId)clearInterval(intervalId);initialTimer=null;intervalId=null;detachObserver();started=false;}
  window.addEventListener('nexlab:application-ready',()=>void announceBootOk(),{once:true});
  window.__NEXLAB_UPDATE_MANAGER__={version:CURRENT.version,release:CURRENT.release,revision:CURRENT.revision,state,check,applyUpdate,start,stop,showAvailable,isPublishedUpdate:newer,cleanTechnicalUrl,compareIdentity:(a,b=CURRENT)=>{const ai=id(a),bi=id(b);if(!ai||!bi)return 0;const at=Date.parse(ai.generatedAt||''),bt=Date.parse(bi.generatedAt||'');if(ai.revision===bi.revision)return Number.isFinite(at)&&Number.isFinite(bt)?Math.sign(at-bt):0;return Number.isFinite(at)&&Number.isFinite(bt)?Math.sign(at-bt):1;}};
  if(document.readyState==='complete')start();else window.addEventListener('load',start,{once:true});
})();
