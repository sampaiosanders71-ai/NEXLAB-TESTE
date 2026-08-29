(function(){
  'use strict';
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-homologacao-correcoes-criticas'});
  const REVISION=BUILD.revision;
  if(globalThis.__NEXLAB_PROFILE_REDESIGN__?.revision===REVISION)return;
  let scheduled=false;

  const ICONS={
    teams:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    projects:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/></svg>',
    events:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    meetings:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M14 20v-1.5a4 4 0 0 1 7.5-2"/></svg>'
  };

  function text(el){return String(el?.textContent||'').trim();}
  function countFromHeading(value){const m=String(value||'').match(/\((\d+)\)/);return m?Number(m[1]):0;}
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

  function tagInfoCards(page){
    const layout=page.querySelector('.nexlab-profile-layout-v058');
    const left=layout?.children?.[0];
    if(!left)return;
    [...left.children].forEach(card=>{
      if(!(card instanceof HTMLElement))return;
      const heading=card.querySelector(':scope > h3');
      const title=normalize(text(heading));
      card.classList.add('nexlab-profile-info-card-v059');
      if(title.includes('habilidade')) card.classList.add('nexlab-profile-skills-v059');
      const content=[...card.children].find(el=>el!==heading && el instanceof HTMLElement);
      if(content){
        content.classList.add('nexlab-profile-info-content-v059');
        [...content.children].forEach(row=>{
          if(!(row instanceof HTMLElement))return;
          if(row.querySelector('button') || /border-(orange|red|slate)/.test(row.className)){
            row.classList.add('nexlab-profile-status-block-v059');
          }else if(row.querySelector(':scope > span')){
            row.classList.add('nexlab-profile-info-row-v059');
          }
        });
      }
    });
  }

  function contributionKind(label){
    const n=normalize(label);
    if(n.includes('equipe'))return 'teams';
    if(n.includes('projeto'))return 'projects';
    if(n.includes('evento'))return 'events';
    if(n.includes('reunio'))return 'meetings';
    return 'other';
  }

  function enhanceContributions(page){
    const box=page.querySelector('.nexlab-profile-contributions-v058');
    if(!box)return;
    const head=box.children?.[0];
    if(head instanceof HTMLElement)head.classList.add('nexlab-profile-contrib-head-v059');
    const grid=[...box.children].find(el=>el instanceof HTMLElement && el.classList.contains('grid'));
    if(!grid)return;
    grid.classList.add('nexlab-profile-activity-grid-v059');
    const sections=[...grid.children].filter(el=>el instanceof HTMLElement);
    const stats=[];
    sections.forEach(section=>{
      const heading=section.querySelector(':scope > h4');
      const label=text(heading);
      const kind=contributionKind(label);
      section.classList.add('nexlab-profile-activity-card-v059');
      section.dataset.profileActivityKind=kind;
      stats.push({kind,count:countFromHeading(label),label:label.replace(/\s*\(\d+\)\s*$/,'')});
    });
    let statGrid=box.querySelector('.nexlab-profile-stats-v059');
    if(!statGrid){
      statGrid=document.createElement('div');
      statGrid.className='nexlab-profile-stats-v059';
      if(head?.nextSibling)box.insertBefore(statGrid,head.nextSibling);else box.appendChild(statGrid);
    }
    const canonical=[
      ['teams','Equipe atual'],['projects','Projeto ativo'],['events','Eventos organizados'],['meetings','Reuniões participadas']
    ];
    const signature=canonical.map(([kind])=>`${kind}:${stats.find(item=>item.kind===kind)?.count??0}`).join('|');
    if(statGrid.dataset.signature===signature)return;
    statGrid.dataset.signature=signature;
    statGrid.replaceChildren();
    for(const [kind,label] of canonical){
      const found=stats.find(item=>item.kind===kind);
      const card=document.createElement('div');
      card.className='nexlab-profile-stat-v059';
      card.dataset.kind=kind;
      const icon=document.createElement('span');icon.className='nexlab-profile-stat-icon-v059';icon.innerHTML=ICONS[kind]||'';
      const value=document.createElement('strong');value.className='nexlab-profile-stat-value-v059';value.textContent=String(found?.count??0);
      const desc=document.createElement('span');desc.className='nexlab-profile-stat-label-v059';desc.textContent=label;
      card.append(icon,value,desc);statGrid.appendChild(card);
    }
  }

  function enhance(){
    scheduled=false;
    const page=document.querySelector('.nexlab-profile-page-v058');
    if(!page)return;
    page.dataset.nexlabProfileRedesign='reference-cards';
    tagInfoCards(page);
    enhanceContributions(page);
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  const observer=new MutationObserver(schedule);
  function start(){observer.observe(document.documentElement,{subtree:true,childList:true});schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  globalThis.__NEXLAB_PROFILE_REDESIGN__=Object.freeze({version:BUILD.version,revision:REVISION,refresh:schedule});
})();
