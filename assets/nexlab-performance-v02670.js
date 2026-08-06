/* NEXLAB Beta 0.26.70 — Volume e desempenho */
(()=>{
'use strict';
const state=new WeakMap();
const controls=new WeakMap();
let scheduled=false;
const mobile=matchMedia('(max-width: 760px)').matches;
const saveData=Boolean(navigator.connection&&navigator.connection.saveData);
const lowMemory=Number(navigator.deviceMemory||8)<=4;
const lowCpu=Number(navigator.hardwareConcurrency||8)<=4;
const lowPower=mobile&&(saveData||lowMemory||lowCpu);
document.documentElement.dataset.nexlabLowPower=String(lowPower);
window.__NEXLAB_VOLUME_PERFORMANCE__=Object.freeze({version:'0.26.70',mobile,saveData,lowMemory,lowCpu,lowPower});
const idle=fn=>'requestIdleCallback'in window?requestIdleCallback(fn,{timeout:700}):setTimeout(fn,40);
const markManaged=node=>{if(!(node instanceof HTMLElement))return;node.classList.add(node.matches('tr')?'nexlab-performance-row':'nexlab-performance-managed');node.querySelectorAll('img').forEach((img,index)=>{if(index>0||!img.getBoundingClientRect().height){img.loading='lazy';img.decoding='async';}})};
function labelFor(kind,count,total){const names={project:'projetos',row:'registros',log:'atividades',stock:'itens',asset:'bens',booking:'agendamentos',marketing:'campanhas'};return `${count} de ${total} ${names[kind]||'registros'} visíveis`;}
function manage(container,items,kind,step){
 if(!(container instanceof HTMLElement)||items.length<=step){const old=controls.get(container);old?.remove();controls.delete(container);items.forEach(el=>{el.classList.remove('nexlab-volume-hidden');markManaged(el)});return;}
 let visible=state.get(container)||step;visible=Math.min(Math.max(step,visible),items.length);state.set(container,visible);
 items.forEach((el,index)=>{markManaged(el);el.classList.toggle('nexlab-volume-hidden',index>=visible)});
 let wrap=controls.get(container);
 if(!wrap||!wrap.isConnected){wrap=document.createElement('div');wrap.className='nexlab-volume-load-more-wrap nexlab-volume-runtime-control';const info=document.createElement('span');const button=document.createElement('button');button.type='button';button.className='nexlab-volume-load-more';button.addEventListener('click',()=>{state.set(container,Math.min((state.get(container)||step)+step,items.length));schedule()});wrap.append(info,button);container.after(wrap);controls.set(container,wrap)}
 const info=wrap.querySelector('span'),button=wrap.querySelector('button');info.textContent=labelFor(kind,visible,items.length);button.textContent=`Mostrar mais ${kind==='project'?'projetos':'registros'}`;wrap.hidden=visible>=items.length;
}
function scan(){
 scheduled=false;
 document.querySelectorAll('.compact-card,[data-nexlab-record-id],.team-card-v2680').forEach(markManaged);
 document.querySelectorAll('.nexlab-project-kanban__column').forEach(column=>{const cards=[...column.querySelectorAll('[data-kanban-project-id]')];const list=cards[0]?.parentElement;if(list)manage(list,cards,'project',mobile?8:12)});
 document.querySelectorAll('.project-table-v2690 tbody,.project-table-v02667 tbody').forEach(body=>manage(body,[...body.children].filter(e=>e.matches('tr')),'row',mobile?20:30));
 const modules=[...document.querySelectorAll('.module-shell')];
 for(const module of modules){
  const heading=(module.querySelector('h1,h2')?.textContent||'').toLocaleLowerCase('pt-BR');
  if(heading.includes('central de atividades')){const candidates=[...module.querySelectorAll('[data-nexlab-record-id],article')].filter(e=>!e.closest('[role="dialog"]'));const parent=candidates[0]?.parentElement;if(parent)manage(parent,candidates,'log',mobile?20:30)}
  if(heading.includes('estoque')){const rows=[...module.querySelectorAll('tbody>tr')];if(rows.length){manage(rows[0].parentElement,rows,'stock',mobile?20:30)}}
  if(heading.includes('patrimônio')){const rows=[...module.querySelectorAll('tbody>tr')];if(rows.length){manage(rows[0].parentElement,rows,'asset',mobile?20:30)}}
  if(heading.includes('reservas')||heading.includes('reuniões')){const cards=[...module.querySelectorAll('[data-nexlab-record-id]')].filter(e=>!e.closest('[role="dialog"]'));const parent=cards[0]?.parentElement;if(parent)manage(parent,cards,'booking',mobile?16:24)}
  if(heading.includes('marketing')){const cards=[...module.querySelectorAll('[data-nexlab-record-id]')].filter(e=>!e.closest('[role="dialog"]'));const parent=cards[0]?.parentElement;if(parent)manage(parent,cards,'marketing',mobile?16:24)}
 }
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>idle(scan))}
new MutationObserver(schedule).observe(document.getElementById('root')||document.body,{childList:true,subtree:true});
addEventListener('resize',schedule,{passive:true});
addEventListener('orientationchange',schedule,{passive:true});
if('PerformanceObserver'in window){try{let count=0,total=0;const observer=new PerformanceObserver(list=>{for(const entry of list.getEntries()){count+=1;total+=entry.duration}if(count>=8||total>=650)document.documentElement.dataset.nexlabPerformanceDegraded='true'});observer.observe({type:'longtask',buffered:true})}catch{}}
schedule();
})();
