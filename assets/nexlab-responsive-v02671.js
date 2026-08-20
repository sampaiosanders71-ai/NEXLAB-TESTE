(function(){
  'use strict';
  if(globalThis.__NEXLAB_RESPONSIVE_V02671__)return;
  globalThis.__NEXLAB_RESPONSIVE_V02671__=Object.freeze({version:'0.26.79'});

  const root=document.documentElement;
  let activeMenu=null;
  let raf=0;
  let scanTimer=0;
  const detailsSelector='details.card-action-menu,details.project-details-more-v02667,details.team-card-v2680__menu';
  const popoverSelector=':scope > .card-action-menu__popover,:scope > .project-details-more-menu-v02667,:scope > [role="menu"]';

  function updateViewport(){
    const vv=globalThis.visualViewport;
    const height=Math.max(320,Math.round(vv?.height||globalThis.innerHeight||document.documentElement.clientHeight||0));
    const width=Math.max(280,Math.round(vv?.width||globalThis.innerWidth||document.documentElement.clientWidth||0));
    const keyboard=Math.max(0,Math.round((globalThis.innerHeight||height)-height-(vv?.offsetTop||0)));
    root.style.setProperty('--nexlab-vvh',height+'px');
    root.style.setProperty('--nexlab-vvw',width+'px');
    root.style.setProperty('--nexlab-keyboard-inset',keyboard+'px');
    root.dataset.nexlabResponsive='02671';
    root.dataset.nexlabKeyboardOpen=keyboard>120?'true':'false';
    scheduleMenu();
  }

  function getPopover(details){return details?.querySelector?.(popoverSelector)||null;}
  function clearMenu(details){
    const pop=getPopover(details);
    if(!pop)return;
    pop.removeAttribute('data-nexlab-viewport-menu');
    ['--nexlab-menu-top','--nexlab-menu-left','--nexlab-menu-width'].forEach(name=>pop.style.removeProperty(name));
  }
  function positionMenu(details){
    if(!details?.open||!document.documentElement.contains(details))return;
    const trigger=details.querySelector(':scope > summary');
    const pop=getPopover(details);
    if(!trigger||!pop)return;
    pop.setAttribute('data-nexlab-viewport-menu','true');
    pop.style.setProperty('--nexlab-menu-top','0px');
    pop.style.setProperty('--nexlab-menu-left','0px');
    pop.style.setProperty('--nexlab-menu-width','208px');

    const vv=globalThis.visualViewport;
    const viewportLeft=vv?.offsetLeft||0;
    const viewportTop=vv?.offsetTop||0;
    const viewportWidth=vv?.width||globalThis.innerWidth;
    const viewportHeight=vv?.height||globalThis.innerHeight;
    const margin=12,gap=7;
    const triggerRect=trigger.getBoundingClientRect();
    const maxWidth=Math.max(180,viewportWidth-margin*2);
    const natural=Math.max(pop.scrollWidth||0,208);
    const width=Math.min(natural,maxWidth);
    pop.style.setProperty('--nexlab-menu-width',Math.round(width)+'px');

    const measured=pop.getBoundingClientRect();
    const height=Math.min(measured.height||pop.scrollHeight||220,viewportHeight-margin*2);
    let left=triggerRect.right-width;
    left=Math.max(viewportLeft+margin,Math.min(left,viewportLeft+viewportWidth-margin-width));
    let top=triggerRect.bottom+gap;
    if(top+height>viewportTop+viewportHeight-margin)top=Math.max(viewportTop+margin,triggerRect.top-height-gap);
    pop.style.setProperty('--nexlab-menu-left',Math.round(left)+'px');
    pop.style.setProperty('--nexlab-menu-top',Math.round(top)+'px');
  }
  function scheduleMenu(){
    cancelAnimationFrame(raf);
    raf=requestAnimationFrame(()=>{if(activeMenu?.open)positionMenu(activeMenu);});
  }

  function updateModalState(){
    const open=Boolean(document.querySelector('[aria-modal="true"],dialog[open],.nexlab-update-overlay,.nexlab-push-consent-overlay'));
    document.body?.setAttribute('data-nexlab-modal-open',open?'true':'false');
  }

  function enhanceScrollRegions(scope=document){
    scope.querySelectorAll?.('.overflow-x-auto,.nexlab-v265-table-scroll,.nexlab-v265-calendar-scroll,.project-table-wrap-v02667,.project-table-wrap-v2690,.teams-v2680__table-wrap').forEach(el=>{
      el.setAttribute('data-nexlab-horizontal-scroll','true');
      if(!el.hasAttribute('tabindex'))el.tabIndex=0;
      if(!el.hasAttribute('role'))el.setAttribute('role','region');
      if(!el.hasAttribute('aria-label'))el.setAttribute('aria-label','Conteúdo com rolagem horizontal');
    });
  }

  function scan(scope=document){
    updateModalState();
    enhanceScrollRegions(scope);
  }
  function scheduleScan(scope=document){
    clearTimeout(scanTimer);
    scanTimer=setTimeout(()=>scan(scope),24);
  }

  document.addEventListener('toggle',event=>{
    const details=event.target instanceof Element?event.target.closest(detailsSelector):null;
    if(!details)return;
    if(details.open){
      document.querySelectorAll(detailsSelector).forEach(other=>{if(other!==details&&other.open)other.open=false;});
      activeMenu=details;
      scheduleMenu();
    }else{
      clearMenu(details);
      if(activeMenu===details)activeMenu=null;
    }
  },true);

  document.addEventListener('pointerdown',event=>{
    if(!activeMenu?.open)return;
    const pop=getPopover(activeMenu);
    if(event.target instanceof Node&&(activeMenu.contains(event.target)||pop?.contains(event.target)))return;
    activeMenu.open=false;
  },true);
  document.addEventListener('click',event=>{
    if(!activeMenu?.open)return;
    if(event.target instanceof Element&&event.target.closest('button,a,[role="menuitem"]'))setTimeout(()=>{if(activeMenu?.open)activeMenu.open=false;},0);
  },true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&activeMenu?.open){
      const trigger=activeMenu.querySelector(':scope > summary');
      activeMenu.open=false;
      trigger?.focus?.();
    }
  });

  const observer=new MutationObserver(records=>{
    let scope=document;
    for(const record of records){if(record.target instanceof Element){scope=record.target;break;}}
    scheduleScan(scope);
    scheduleMenu();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['open','aria-modal','class']});

  globalThis.addEventListener('resize',updateViewport,{passive:true});
  globalThis.addEventListener('orientationchange',updateViewport,{passive:true});
  globalThis.visualViewport?.addEventListener('resize',updateViewport,{passive:true});
  globalThis.visualViewport?.addEventListener('scroll',updateViewport,{passive:true});
  document.addEventListener('scroll',scheduleMenu,true);

  updateViewport();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>scan(document),{once:true});
  else scan(document);
})();
