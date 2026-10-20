/* NexLab — animação dos cards associada ao fluxo real de exportação. */
import {g as React} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-animacao-relatorios';
const h=React.createElement;

// Let React paint the current stage before synchronous PDF/XLSX work begins.
// The fallback also lets exports continue when a background tab suspends RAF.
function nextPaint(){
  return new Promise(resolve=>{
    let frame=0,done=false;
    const finish=()=>{if(done)return;done=true;clearTimeout(timer);cancelAnimationFrame(frame);resolve()};
    const timer=setTimeout(finish,150);
    frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(finish)});
  });
}

export function useReportDownload(){
  const [state,setState]=React.useState(null);
  const ref=React.useRef({mounted:true,busy:false,sequence:0,timer:null});
  React.useEffect(()=>{
    ref.current.mounted=true;
    return()=>{const r=ref.current;r.mounted=false;r.sequence++;clearTimeout(r.timer)};
  },[]);
  const clear=()=>{const r=ref.current;if(!r.busy){clearTimeout(r.timer);r.sequence++;if(r.mounted)setState(null)}};
  function begin(scope,type){
    const r=ref.current;if(r.busy||!r.mounted)return null;
    clearTimeout(r.timer);r.busy=true;const id=++r.sequence;
    let phase='preparing',handedOff=false;
    const publish=()=>{if(r.mounted&&r.sequence===id)setState({scope,type,phase})};
    publish();
    const started=()=>{handedOff=true;phase='complete';publish()};
    return {
      paint:nextPaint,
      async generate(){if(!handedOff){phase='generating';publish();await nextPaint()}},
      async run(action,mayCancel=false){
        phase='generating';publish();await nextPaint();
        const result=await action();
        if(!mayCancel||result!=null)started();
        return result;
      },
      async pdfSave(document,filename){await nextPaint();await document.save(filename,{returnPromise:true});started()},
      started,
      hasStarted:()=>handedOff,
      fail(){if(!handedOff){phase='error';publish()}},
      end(){
        r.busy=false;if(!r.mounted||r.sequence!==id)return;
        if(phase==='complete')r.timer=setTimeout(()=>{if(r.mounted&&r.sequence===id)setState(null)},2600);
        else if(phase!=='error')setState(null);
      }
    };
  }
  return {state,begin,clear,isBusy:()=>ref.current.busy};
}

export function reportMotionPhase(state,scope){return state?.scope===scope?state.phase:null}

function glyph(kind){
  const props={viewBox:'0 0 24 24',fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  if(kind==='check')return h('svg',props,h('circle',{cx:12,cy:12,r:9}),h('path',{d:'m8 12 3 3 5-6'}));
  if(kind==='error')return h('svg',props,h('circle',{cx:12,cy:12,r:9}),h('path',{d:'M12 7v6m0 4h.01'}));
  return h('svg',props,h('path',{d:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5'}));
}

export function ReportDownloadOverlay({state,scope,title,icon,onRetry,onDismiss,disabled=false}){
  if(!state||state.scope!==scope)return null;
  const complete=state.phase==='complete',error=state.phase==='error',busy=!complete&&!error;
  const format=state.type==='pdf'?'PDF':'Excel';
  const message=complete?'Download iniciado':error?'Não foi possível gerar':state.phase==='preparing'?'Preparando relatório…':`Gerando ${format}…`;
  return h('div',{className:'nexlab-report-download-v02682 is-'+state.phase},
    busy&&h('div',{className:'report-download-sweep','aria-hidden':true}),
    h('div',{className:'report-download-caption','aria-hidden':true},icon,h('span',null,title),h('small',null,format)),
    h('div',{className:'report-download-body'},
      h('span',{className:'report-download-symbol'},glyph(complete?'check':error?'error':'download')),
      h('span',{className:'report-download-message',role:'status','aria-live':'polite'},message),
      complete&&h('small',null,'Confira os downloads do navegador.'),
      busy&&h('div',{role:'progressbar','aria-label':`${message} ${title}`,className:'report-download-indeterminate'}),
      error&&h('div',{className:'report-download-error-actions'},
        h('button',{type:'button',disabled,onClick:()=>onRetry(scope,state.type)},'Tentar novamente'),
        h('button',{type:'button',disabled,onClick:onDismiss},'Voltar'))));
}
