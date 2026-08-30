(function(){
  'use strict';
  const BUILD=globalThis.__NEXLAB_BUILD_IDENTITY__||Object.freeze({version:'0.26.82',revision:'beta-0-26-82-perfil-redesign-refinado'});
  const REVISION=BUILD.revision;
  if(globalThis.__NEXLAB_PROFILE_REDESIGN__?.revision===REVISION)return;
  let scheduled=false;

  const ICONS={
    teams:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    projects:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v2"/></svg>',
    events:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01"/></svg>',
    meetings:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><circle cx="17" cy="8" r="2.5"/><path d="M3 20v-2a5 5 0 0 1 10 0v2M14 20v-1.5a4 4 0 0 1 7.5-2"/></svg>'
  };

  const text=el=>String(el?.textContent||'').trim();
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const countFromHeading=value=>{const m=String(value||'').match(/\((\d+)\)/);return m?Number(m[1]):null;};

  function infoKind(title){
    const n=normalize(title);
    if(n.includes('pesso'))return 'personal';
    if(n.includes('academ'))return 'academic';
    if(n.includes('habil'))return 'skills';
    return 'other';
  }

  function tagHero(page){
    const hero=page.querySelector('.nexlab-profile-hero-v058');
    if(!hero)return;
    hero.classList.add('nexlab-profile-hero-v060');
    const direct=[...hero.children].filter(el=>el instanceof HTMLElement && !el.classList.contains('absolute'));
    if(direct[0])direct[0].classList.add('nexlab-profile-avatar-wrap-v060');
    if(direct[1])direct[1].classList.add('nexlab-profile-identity-v060');
    if(direct[2])direct[2].classList.add('nexlab-profile-hero-action-v060');
    const identity=direct[1];
    if(identity){
      const badgeRow=identity.children?.[0];
      if(badgeRow instanceof HTMLElement)badgeRow.classList.add('nexlab-profile-badges-v060');
      const meta=identity.children?.[2];
      if(meta instanceof HTMLElement)meta.classList.add('nexlab-profile-hero-meta-v060');
    }
  }

  function tagInfoCards(page){
    const layout=page.querySelector('.nexlab-profile-layout-v058');
    const left=layout?.children?.[0];
    if(!left)return;
    left.classList.add('nexlab-profile-info-column-v060');
    [...left.children].forEach(card=>{
      if(!(card instanceof HTMLElement))return;
      const heading=card.querySelector(':scope > h3');
      if(!heading)return;
      const kind=infoKind(text(heading));
      card.classList.add('nexlab-profile-info-card-v060');
      card.dataset.profileInfoKind=kind;
      const content=[...card.children].find(el=>el!==heading && el instanceof HTMLElement);
      if(!content)return;
      content.classList.add('nexlab-profile-info-content-v060');
      if(kind==='skills'){
        card.classList.add('nexlab-profile-skills-v060');
        return;
      }
      [...content.children].forEach(row=>{
        if(!(row instanceof HTMLElement))return;
        const directSpans=[...row.children].filter(el=>el instanceof HTMLElement && el.tagName==='SPAN');
        if(directSpans.length>=1){
          row.classList.add('nexlab-profile-info-row-v060');
        }else{
          row.classList.add('nexlab-profile-status-block-v060');
        }
      });
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

  function sectionHasRecords(section){
    const body=[...section.children].find(el=>el instanceof HTMLElement && el!==section.querySelector(':scope > h4'));
    if(!body)return false;
    return [...body.children].some(el=>el instanceof HTMLElement && el.tagName!=='P');
  }

  function enhanceContributions(page){
    const box=page.querySelector('.nexlab-profile-contributions-v058');
    if(!box)return;
    box.classList.add('nexlab-profile-contributions-v060');
    const head=box.children?.[0];
    if(head instanceof HTMLElement)head.classList.add('nexlab-profile-contrib-head-v060');
    const grid=[...box.children].find(el=>el instanceof HTMLElement && el.classList.contains('grid'));
    if(!grid)return;
    grid.classList.add('nexlab-profile-activity-grid-v060');
    const sections=[...grid.children].filter(el=>el instanceof HTMLElement);
    const stats=[];
    sections.forEach(section=>{
      const heading=section.querySelector(':scope > h4');
      const raw=text(heading);
      const kind=contributionKind(raw);
      const parsed=countFromHeading(raw);
      const body=[...section.children].find(el=>el instanceof HTMLElement && el!==heading);
      const actual=body?[...body.children].filter(el=>el instanceof HTMLElement && el.tagName!=='P').length:0;
      const count=parsed==null?actual:parsed;
      stats.push({kind,count});
      section.classList.add('nexlab-profile-activity-section-v060');
      section.dataset.profileActivityKind=kind;
      section.classList.toggle('is-empty',!sectionHasRecords(section));
      if(heading){
        const clean=raw.replace(/\s*\(\d+\)\s*$/,'');
        if(heading.dataset.nexlabCleaned!=='true'){
          heading.dataset.nexlabCleaned='true';
          const nodes=[...heading.childNodes];
          const textNode=nodes.find(node=>node.nodeType===Node.TEXT_NODE && normalize(node.textContent).includes(normalize(clean).split(' ')[0]));
          if(textNode)textNode.textContent=clean;
          const countBadge=document.createElement('span');
          countBadge.className='nexlab-profile-section-count-v060';
          countBadge.textContent=String(count);
          heading.appendChild(countBadge);
        }else{
          const badge=heading.querySelector('.nexlab-profile-section-count-v060');
          if(badge)badge.textContent=String(count);
        }
      }
    });

    let statGrid=box.querySelector('.nexlab-profile-stats-v060');
    if(!statGrid){
      statGrid=document.createElement('div');
      statGrid.className='nexlab-profile-stats-v060';
      if(head?.nextSibling)box.insertBefore(statGrid,head.nextSibling);else box.appendChild(statGrid);
    }
    const canonical=[
      ['teams','Equipe atual'],['projects','Projeto ativo'],['events','Eventos organizados'],['meetings','Reuniões participadas']
    ];
    const signature=canonical.map(([kind])=>`${kind}:${stats.find(item=>item.kind===kind)?.count??0}`).join('|');
    if(statGrid.dataset.signature!==signature){
      statGrid.dataset.signature=signature;
      statGrid.replaceChildren();
      for(const [kind,label] of canonical){
        const count=stats.find(item=>item.kind===kind)?.count??0;
        const card=document.createElement('div');
        card.className='nexlab-profile-stat-v060';
        card.dataset.kind=kind;
        const icon=document.createElement('span');
        icon.className='nexlab-profile-stat-icon-v060';
        icon.innerHTML=ICONS[kind]||'';
        const copy=document.createElement('span');
        copy.className='nexlab-profile-stat-copy-v060';
        const value=document.createElement('strong');
        value.className='nexlab-profile-stat-value-v060';
        value.textContent=String(count);
        const desc=document.createElement('span');
        desc.className='nexlab-profile-stat-label-v060';
        desc.textContent=label;
        copy.append(value,desc);
        card.append(icon,copy);
        statGrid.appendChild(card);
      }
    }
  }

  function tagAuxiliary(page){
    page.querySelector('.nexlab-profile-security-v058')?.classList.add('nexlab-profile-security-v060');
    page.querySelector('.nexlab-profile-edit-v058')?.classList.add('nexlab-profile-edit-v060');
  }

  function enhance(){
    scheduled=false;
    const page=document.querySelector('.nexlab-profile-page-v058');
    if(!page)return;
    page.dataset.nexlabProfileRedesign='refined-reference';
    tagHero(page);
    tagInfoCards(page);
    enhanceContributions(page);
    tagAuxiliary(page);
  }

  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  const observer=new MutationObserver(schedule);
  function start(){observer.observe(document.documentElement,{subtree:true,childList:true});schedule();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  globalThis.__NEXLAB_PROFILE_REDESIGN__=Object.freeze({version:BUILD.version,revision:REVISION,refresh:schedule});
})();
