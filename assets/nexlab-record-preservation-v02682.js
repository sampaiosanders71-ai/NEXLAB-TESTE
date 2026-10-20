/* NexLab — conferência manual de documentos antes da revisão dos registros. */
import {g as React} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-preservacao-manual';
const h=React.createElement;
let requestedGuide=null;
function requestedFor(id){return requestedGuide?.id===String(id||'')&&requestedGuide.until>Date.now()}
function openReports(id){
  requestedGuide={id:String(id||''),until:Date.now()+30000};
  window.dispatchEvent(new CustomEvent('nexlab:navigate-record',{detail:{tabId:'relatorios'}}));
}

export function MaintenanceEntry({profile,canOpenReports=false}){
  return h('section',{className:'nxl-preservation-entry','aria-label':'Preservação e manutenção manual'},
    h('div',{className:'nxl-preservation-entry__intro'},h('span',{className:'nxl-preservation-kicker'},'Organização dos dados'),
      h('h2',null,'Guardar informações e revisar registros'),
      h('p',null,'Relatórios guardam as informações em documentos. Backups ajudam a recuperar o sistema em caso de problema.')),
    h('div',{className:'nxl-preservation-entry__grid'},
      h('article',null,h('h3',null,'Registros dos módulos'),h('p',null,'Gere o relatório disponível, confira o conteúdo e guarde o arquivo em uma pasta. Depois, abra o módulo e escolha quais registros antigos podem ser excluídos.'),
        canOpenReports?h('button',{type:'button',onClick:()=>openReports(profile?.id)},'Abrir fluxo de relatórios →'):h('p',null,'A Central de Relatórios exige permissão de acesso.')),
      h('article',{className:'is-technical'},h('h3',null,'Históricos técnicos'),h('p',null,'Logs de rotinas, notificações e diagnósticos ocupam espaço separado dos registros de trabalho. Sua manutenção deve ser avaliada à parte; baixar um relatório de um módulo não preserva esses históricos.'))),
    h('small',null,'Este fluxo é manual. Abrir um módulo não exclui registros. O espaço exibido no monitor depende de uma nova medição do banco.'));
}

export function PreservationGuide({profile,catalog=[],onExport,onNavigate,disabled=false}){
  const id=String(profile?.id||'');
  const [open,setOpen]=React.useState(()=>requestedFor(id));
  const [scope,setScope]=React.useState('');
  const [receipt,setReceipt]=React.useState(null);
  const [confirmed,setConfirmed]=React.useState(false);
  const [busy,setBusy]=React.useState(false);
  const [notice,setNotice]=React.useState('');
  const lifecycle=React.useRef({mounted:true,sequence:0});
  const selected=catalog.find(item=>item.scope===scope);
  const valid=!!selected&&receipt?.scope===scope&&receipt?.id===id;
  React.useEffect(()=>{
    lifecycle.current.mounted=true;
    if(requestedFor(id))requestedGuide=null;
    return()=>{lifecycle.current.mounted=false;lifecycle.current.sequence++};
  },[id]);
  React.useEffect(()=>{
    lifecycle.current.sequence++;
    setReceipt(null);setConfirmed(false);setNotice('');setBusy(false);
  },[id,scope,!!selected]);
  function changeScope(event){setScope(event.target.value)}
  async function download(format){
    if(!selected||disabled||busy)return;
    const sequence=++lifecycle.current.sequence;
    const current=()=>lifecycle.current.mounted&&lifecycle.current.sequence===sequence;
    let handedOff=false;
    setReceipt(null);setConfirmed(false);setNotice('');setBusy(true);
    try{
      await onExport(scope,format,()=>{
        if(!current())return;
        handedOff=true;
        setReceipt({scope,id,format});
        setNotice('Download iniciado. Abra o arquivo, confira as informações e guarde-o na pasta desejada.');
      });
    }catch{
      if(current()&&!handedOff)setNotice('Não foi possível iniciar o download. Confira o aviso da exportação e tente novamente.');
    }finally{
      if(current()){
        setBusy(false);
        if(!handedOff)setNotice('Download não iniciado. Confira os avisos da exportação, conclua a verificação solicitada e tente novamente.');
      }
    }
  }
  return h('details',{className:'nxl-preservation-guide',open,onToggle:event=>setOpen(event.currentTarget.open)},
    h('summary',null,h('span',null,h('strong',null,'Preservar informações antes de excluir'),h('small',null,'Fluxo manual • relatório, conferência e revisão no módulo'))),
    h('div',{className:'nxl-preservation-guide__body'},
      h('p',{className:'nxl-preservation-explanation'},'O relatório preserva as informações que aparecem no documento. Confira se ele contém tudo o que você precisa guardar; ele não substitui um backup para restauração.'),
      h('ol',{className:'nxl-preservation-steps'},
        h('li',null,h('span',{className:'nxl-preservation-step','aria-hidden':true},'1'),h('div',null,
          h('h3',null,'Gerar o relatório'),
          h('label',{htmlFor:'nxl-preservation-module'},'Módulo com relatório disponível'),
          h('select',{id:'nxl-preservation-module',value:scope,onChange:changeScope,disabled:disabled||busy},
            h('option',{value:''},'Selecione um módulo'),catalog.map(item=>h('option',{key:item.scope,value:item.scope},item.title))),
          selected&&h('p',{className:'nxl-preservation-coverage'},selected.coverage),
          catalog.length===0&&h('p',null,'Nenhum relatório com acesso ao módulo está disponível para seu perfil no momento.'),
          h('div',{className:'nxl-preservation-formats'},
            h('button',{type:'button',disabled:!selected||disabled||busy,onClick:()=>download('pdf')},busy?'Aguarde a exportação…':'Gerar PDF'),
            h('button',{type:'button',disabled:!selected||disabled||busy,onClick:()=>download('excel')},'Gerar Excel')))),
        h('li',null,h('span',{className:'nxl-preservation-step','aria-hidden':true},'2'),h('div',null,
          h('h3',null,'Conferir e guardar o arquivo'),
          h('p',{role:'status','aria-live':'polite'},notice||'Após iniciar o download, abra o documento e confira o conteúdo. O navegador não confirma que o arquivo foi guardado.'),
          h('label',{className:'nxl-preservation-confirm'},h('input',{type:'checkbox',checked:confirmed&&valid,disabled:!valid||disabled||busy,onChange:event=>setConfirmed(event.target.checked)}),
            h('span',null,'Conferi as informações do relatório e guardei o arquivo na pasta desejada.')))),
        h('li',null,h('span',{className:'nxl-preservation-step','aria-hidden':true},'3'),h('div',null,
          h('h3',null,'Revisar os registros no módulo'),
          h('p',null,'Escolha os registros que podem ser excluídos no próprio módulo. As permissões e confirmações de exclusão continuam sendo exigidas.'),
          h('button',{type:'button',className:'nxl-preservation-review',disabled:!valid||!confirmed||disabled||busy,onClick:()=>{if(valid&&confirmed&&!disabled&&!busy)onNavigate(selected.tabId)}},'Revisar registros no módulo →')))),
      h('p',{className:'nxl-preservation-footnote'},'Nenhum registro é excluído por este guia. A conferência vale apenas nesta visita e é reiniciada ao trocar de módulo ou gerar outro arquivo. Históricos técnicos são tratados separadamente.')));
}
