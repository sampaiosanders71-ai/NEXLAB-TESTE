/* NEXLAB — página de projeto e links externos. Usa o contrato existente de attachments. */
import { g as React, Ln as supabase } from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-google-calendar-integracao-sem-chat-projetos-pagina-sem-historico';

const h=React.createElement;
const PROJECT_PARAM='nexlabProject';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function projectLinkUrl(value){
  try{
    const text=String(value||'').trim();
    if(text.length>2048||!/^https?:\/\//i.test(text))return null;
    const url=new URL(text);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname)return null;
    return url.href;
  }catch{return null;}
}

export function useProjectPageRoute({open,projectId,onOpen,onClose,panelRef}){
  const callbacks=React.useRef({onOpen,onClose});callbacks.current={onOpen,onClose};
  const previous=React.useRef(null),applying=React.useRef(false),scroll=React.useRef({main:0,window:0});
  const read=()=>{try{return new URL(location.href).searchParams.get(PROJECT_PARAM)||'';}catch{return '';}};
  React.useEffect(()=>{
    const sync=()=>{
      try{const tab=new URL(location.href).searchParams.get('nexlabTab');if(tab&&tab!=='projetos'&&tab!=='planejamentos')return;}catch{}
      const id=read();
      applying.current=true;
      if(uuid.test(id))callbacks.current.onOpen({id});else callbacks.current.onClose();
    };
    if(uuid.test(read()))sync();
    window.addEventListener('popstate',sync);
    return()=>{
      window.removeEventListener('popstate',sync);
      try{const url=new URL(location.href),tab=url.searchParams.get('nexlabTab');if(tab!=='projetos'&&tab!=='planejamentos'&&url.searchParams.has(PROJECT_PARAM)){url.searchParams.delete(PROJECT_PARAM);history.replaceState(history.state,'',url);}}catch{}
    };
  },[]);
  React.useEffect(()=>{
    const main=document.getElementById('nexlab-main-content');
    if(open&&projectId){
      if(!previous.current)scroll.current={main:main?.scrollTop||0,window:window.scrollY||0};
      if(!applying.current&&read()!==projectId)try{
        const url=new URL(location.href);
        if(url.searchParams.get('nexlabTab')!=='projetos'){
          url.searchParams.set('nexlabTab','projetos');url.searchParams.delete(PROJECT_PARAM);
          history.pushState({...history.state,nexlabTab:'projetos'},'',url);
        }
        url.searchParams.set(PROJECT_PARAM,projectId);
        history.pushState({...history.state,nexlabProjectPage:projectId},'',url);
      }catch{}
      if(previous.current!==projectId)requestAnimationFrame(()=>{if(main)main.scrollTop=0;window.scrollTo(0,0);panelRef.current?.focus?.({preventScroll:true});});
      previous.current=projectId;
    }else if(previous.current){
      if(!applying.current&&read())try{const url=new URL(location.href);url.searchParams.delete(PROJECT_PARAM);const state={...history.state};delete state.nexlabProjectPage;history.replaceState(state,'',url);}catch{}
      previous.current=null;
      requestAnimationFrame(()=>{if(main)main.scrollTop=scroll.current.main;window.scrollTo(0,scroll.current.window);});
    }
    applying.current=false;
  },[open,projectId]);
  return {back(){
    try{if(history.state?.nexlabProjectPage===projectId&&read()===projectId){history.back();return;}}catch{}
    callbacks.current.onClose();
  }};
}

export function ProjectExternalLinks({projectId,attachments=[],canManage=false,canDeleteAll=false,currentUserId,onChanged,addToast}){
  const [title,setTitle]=React.useState(''),[url,setUrl]=React.useState(''),[busy,setBusy]=React.useState(''),[error,setError]=React.useState(''),[owners,setOwners]=React.useState({});
  const mounted=React.useRef(true),sequence=React.useRef(0);
  React.useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;sequence.current+=1;};},[]);
  React.useEffect(()=>{
    let active=true;setTitle('');setUrl('');setError('');setOwners({});sequence.current+=1;
    if(canManage&&!canDeleteAll)supabase.from('attachments').select('id,autor_id').eq('record_id',projectId).in('modulo',['projetos','projects','project']).then(({data})=>{
      if(active)setOwners(Object.fromEntries((data||[]).map(row=>[row.id,row.autor_id])));
    }).catch(()=>{});
    return()=>{active=false;};
  },[projectId,canManage,canDeleteAll]);
  const current=token=>mounted.current&&sequence.current===token;
  async function save(event){
    event.preventDefault();if(busy||!canManage)return;
    const normalized=projectLinkUrl(url),label=title.trim();
    if(!normalized)return setError('Informe um link completo começando com https:// ou http://.');
    if(!label)return setError('Informe um título para identificar o link.');
    if(attachments.some(row=>projectLinkUrl(row.url)===normalized))return setError('Este link já está anexado ao projeto.');
    const token=sequence.current;setBusy('save');setError('');
    try{
      const {data,error}=await supabase.from('attachments').insert({modulo:'projetos',record_id:projectId,titulo:label,url:normalized,tipo:'link',autor_id:currentUserId}).select('id,autor_id').single();
      if(error)throw error;
      if(!current(token))return;
      if(data?.id)setOwners(prev=>({...prev,[data.id]:data.autor_id}));
      setTitle('');setUrl('');addToast?.('Link anexado ao projeto.','ok');
      await onChanged?.();
    }catch(error){if(current(token))setError(error?.message||'Não foi possível anexar o link. Tente novamente.');}
    finally{if(current(token))setBusy('');}
  }
  async function remove(row){
    if(busy||!canManage||!(canDeleteAll||owners[row.id]===currentUserId))return;
    const confirmed=typeof window.nexlabConfirm==='function'?await window.nexlabConfirm(`Remover o link "${row.title||'Link do projeto'}"?`):window.confirm(`Remover o link "${row.title||'Link do projeto'}"?`);
    if(!confirmed)return;
    const token=sequence.current;setBusy(row.id);setError('');
    try{
      const {data,error}=await supabase.from('attachments').delete().eq('id',row.id).eq('record_id',projectId).in('modulo',['projetos','projects','project']).eq('tipo','link').select('id');
      if(error)throw error;
      if(!data?.length)throw new Error('O link não foi removido. Atualize os dados e verifique sua permissão.');
      if(current(token)){addToast?.('Link removido do projeto.','ok');await onChanged?.();}
    }catch(error){if(current(token))setError(error?.message||'Não foi possível remover o link.');}
    finally{if(current(token))setBusy('');}
  }
  return h('section',{className:'project-details-section-v2690 project-external-links-v02682'},
    h('div',{className:'project-details-section-head-v2690'},h('h3',null,'Links e anexos'),h('span',null,`${attachments.length} ${attachments.length===1?'item':'itens'}`)),
    h('p',{className:'project-links-help-v02682'},'Acesse o site, repositório, protótipo ou documento do projeto. Os links abrem em outra aba.'),
    !attachments.length?h('p',{className:'project-details-empty-v2690'},'Nenhum link anexado a este projeto.'):h('ul',{className:'project-external-link-list-v02682'},...attachments.map(row=>{
      const safe=projectLinkUrl(row.url),label=row.title||row.titulo||'Link do projeto';
      return h('li',{key:row.id},h('div',null,h('strong',null,label),h('small',null,safe?new URL(safe).hostname:'Endereço indisponível')),
        safe?h('a',{href:safe,target:'_blank',rel:'noopener noreferrer',className:'project-open-link-v02682','aria-label':`Abrir projeto: ${label} (nova aba)`},'Abrir projeto ↗'):h('span',{role:'status'},'Link inválido'),
        canManage&&(row.type||row.tipo)==='link'&&(canDeleteAll||owners[row.id]===currentUserId)?h('button',{type:'button',disabled:!!busy,onClick:()=>remove(row),'aria-label':`Remover link ${label}`,className:'project-remove-link-v02682'},busy===row.id?'Removendo…':'Remover'):null);
    })),
    canManage?h('form',{className:'project-external-link-form-v02682',onSubmit:save,noValidate:true},
      h('h4',null,'Anexar link'),
      h('label',null,'Título do link',h('input',{type:'text',maxLength:180,value:title,disabled:!!busy,placeholder:'Ex.: Site do projeto ou Repositório',onChange:event=>setTitle(event.target.value)})),
      h('label',null,'Endereço do link',h('input',{type:'url',inputMode:'url',maxLength:2048,value:url,disabled:!!busy,placeholder:'https://',onChange:event=>setUrl(event.target.value)})),
      h('button',{type:'submit',disabled:!!busy},busy==='save'?'Anexando…':'Anexar link')):null,
    error?h('p',{className:'project-link-error-v02682',role:'alert'},error):null);
}
