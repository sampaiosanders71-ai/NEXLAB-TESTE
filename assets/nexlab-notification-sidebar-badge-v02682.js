/* NEXLAB Beta 0.26.82 — badge de notificações não lidas na sidebar. */
(()=>{'use strict';let unread=0,scheduled=0;
const clean=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function findButtons(){const side=document.getElementById('mobile-sidebar');if(!side)return[];return[...side.querySelectorAll('button,a')].filter(el=>clean(el.textContent).includes('notificacoes'));}
function render(){scheduled=0;for(const el of findButtons()){el.classList.add('nexlab-sidebar-notification-anchor-v02682');let badge=el.querySelector(':scope > .nexlab-sidebar-notification-badge-v02682');if(unread<=0){badge?.remove();continue}if(!badge){badge=document.createElement('span');badge.className='nexlab-sidebar-notification-badge-v02682';badge.setAttribute('aria-label',`${unread} notificações não lidas`);el.appendChild(badge)}badge.textContent=unread>99?'99+':String(unread);badge.dataset.count=String(unread)}}
function schedule(){if(!scheduled)scheduled=requestAnimationFrame(render)}
window.addEventListener('nexlab:notifications-updated',ev=>{const value=Number(ev?.detail?.unreadTotal??ev?.detail?.unread_total??0);unread=Number.isFinite(value)?Math.max(0,value):0;schedule()});
new MutationObserver(schedule).observe(document.documentElement,{subtree:true,childList:true});
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',schedule,{once:true}):schedule();
})();
