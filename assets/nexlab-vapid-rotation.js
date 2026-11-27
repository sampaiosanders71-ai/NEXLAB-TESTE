(function(){
 'use strict';
 if(window.__NEXLAB_VAPID_ROTATION_BETA_0264__)return;
 const state=window.__NEXLAB_VAPID_ROTATION_BETA_0264__={version:'0.26.82',status:'idle'};
 const config=window.__NEXLAB_CONFIG__?.assert?.();
 if(!config)throw new Error('Configuração do NEXLAB não carregada.');
 const marker='nexlab:vapid-generation';
 let queue=Promise.resolve(),activeSync=null,boundToken='',boundUser='';
 const subject=token=>{try{return JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).sub||'';}catch{return '';}};
 const decode=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-value.length%4)%4)),c=>c.charCodeAt(0));
 const equal=(a,b)=>a&&b&&a.byteLength===b.byteLength&&new Uint8Array(a).every((x,i)=>x===new Uint8Array(b)[i]);
 const supported=()=>location.protocol==='https:'&&'serviceWorker'in navigator&&'PushManager'in window&&'Notification'in window;
 async function rpc(name,body,access){
  const response=await fetch(config.supabaseUrl+'/rest/v1/rpc/'+name,{method:'POST',cache:'no-store',headers:{apikey:config.supabaseAnonKey,Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.message||'Não foi possível sincronizar este aparelho.');return data;
 }
 function identity(registration,userId){const worker=registration?.active||navigator.serviceWorker.controller;worker?.postMessage({type:'NEXLAB_PUSH_IDENTITY',userId});}
 async function rotate(){
  state.status='checking';if(!supported()){state.status='unsupported';return false;}
  if(Notification.permission!=='granted'){state.status=Notification.permission;return false;}
  for(let i=0;i<20&&!config.getAccessToken();i++)await new Promise(r=>setTimeout(r,750));
  const access=config.getAccessToken(),userId=subject(access);if(!access||!userId){state.status='no-session';return false;}
  let timer;const registration=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Service Worker do NEXLAB não ficou pronto.')),15000);})]).finally(()=>clearTimeout(timer));
  if(subject(config.getAccessToken())!==userId){state.status='no-session';return false;}
  let subscription=await registration.pushManager.getSubscription();const expected=decode(config.vapidPublicKey);let changed=false;
  if(subscription&&!equal(subscription.options?.applicationServerKey,expected.buffer)){
   try{await rpc('disable_push_subscription',{p_endpoint:subscription.endpoint},access);}catch{}
   await subscription.unsubscribe();subscription=null;changed=true;
  }
  if(!subscription){subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:expected});changed=true;}
  const json=subscription.toJSON();
  // Local markers are hints only. Revalidate ownership/active state on every
  // scheduled sync, including A -> B -> A and server-side subscription removal.
  const saved=await rpc('save_push_subscription',{p_endpoint:subscription.endpoint,p_p256dh:json.keys?.p256dh||'',p_auth:json.keys?.auth||'',p_expiration_time:subscription.expirationTime||null,p_user_agent:navigator.userAgent||null,p_platform:navigator.userAgentData?.platform||navigator.platform||null},access);
  if(saved.active!==true||!saved.id)throw new Error('O servidor não confirmou o cadastro do aparelho.');
  boundToken=access;boundUser=userId;
  if(subject(config.getAccessToken())!==userId){identity(registration,'');state.status='no-session';return false;}
  try{localStorage.setItem(marker+':'+userId,'0.26.82:'+subscription.endpoint);}catch{}
  identity(registration,userId);state.status=changed?'rotated':'refreshed';state.completedAt=new Date().toISOString();
  window.dispatchEvent(new CustomEvent('nexlab:vapid-rotated',{detail:{status:state.status,version:state.version}}));return true;
 }
 function sync(){if(activeSync)return activeSync;const work=queue.catch(()=>{}).then(rotate);queue=work.catch(()=>{});activeSync=work.catch(error=>{state.status='error';state.error=String(error?.message||error);throw error;}).finally(()=>{activeSync=null;});return activeSync;}
 function detach(){const work=queue.catch(()=>{}).then(async()=>{
  if(!('serviceWorker'in navigator))return;
  const registration=await navigator.serviceWorker.getRegistration('./').catch(()=>null);identity(registration,'');
  if(boundUser){const subscription=await registration?.pushManager?.getSubscription();if(subscription){try{await rpc('disable_push_subscription',{p_endpoint:subscription.endpoint},boundToken);}catch{}try{await subscription.unsubscribe();}catch{}}
   try{localStorage.removeItem(marker+':'+boundUser);}catch{}
  }
  boundUser='';boundToken='';state.status='no-session';
 });queue=work.catch(()=>{});return work;}
 Object.assign(state,{sync,detach});
 const start=()=>sync().catch(()=>{});
 if(document.readyState==='complete')setTimeout(start,1200);else window.addEventListener('load',()=>setTimeout(start,1200),{once:true});
 window.addEventListener('nexlab:push-permission-granted',start);
 window.addEventListener('nexlab:session-reset',()=>{void detach();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&['error','no-session','default'].includes(state.status))start();});
})();
