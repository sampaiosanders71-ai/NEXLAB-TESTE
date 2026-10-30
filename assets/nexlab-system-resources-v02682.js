import {g as React} from './nexlab-runtime-vendor.js?v=app-beta-0-26-82-central-notificacoes-unificada';
const h=React.createElement;
const number=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1});
const integer=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0});
const knownNumber=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0?value:typeof value==='string'&&value.trim()!==''&&Number.isFinite(Number(value))&&Number(value)>=0?Number(value):null;

export function resourceValues(database){
  const data=database||{},storage=data.storage||{};
  const total=knownNumber(storage.total_bytes)??knownNumber(data.bytes);
  const history=knownNumber(storage.history_bytes),other=knownNumber(storage.other_bytes);
  const partition=storage.history_available===true&&total!==null&&total>0&&history!==null&&other!==null&&Math.abs(history+other-total)<=1;
  const connections=knownNumber(data.connections),limit=knownNumber(data.max_connections);
  const percentage=connections!==null&&limit!==null&&limit>0?100*connections/limit:null;
  return {total,history,other,partition,connections,limit,percentage,share:partition?100*history/total:null};
}

export function formatBytes(value){
  const bytes=knownNumber(value);
  if(bytes===null)return {value:'—',unit:''};
  const units=['B','kB','MB','GB','TB','PB'];
  const index=bytes>0?Math.min(units.length-1,Math.floor(Math.log(bytes)/Math.log(1024))):0;
  return {value:new Intl.NumberFormat('pt-BR',{maximumFractionDigits:index===0?0:1}).format(bytes/1024**index),unit:units[index]};
}

function byteLabel(bytes){const value=formatBytes(bytes);return value.value+(value.unit?' '+value.unit:'')}
function icon(kind){
  const props={viewBox:'0 0 24 24',width:20,height:20,fill:'none',stroke:'currentColor',strokeWidth:1.8,strokeLinecap:'round',strokeLinejoin:'round','aria-hidden':true};
  return kind==='plug'?h('svg',props,h('path',{d:'M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0V8Zm6 9v4'})):h('svg',props,h('ellipse',{cx:12,cy:5,rx:8,ry:3}),h('path',{d:'M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'}));
}
function heading(kind,title,description){return h('div',{className:'nexlab-system-monitor__resource-head'},h('div',{className:'nexlab-system-monitor__resource-icon '+(kind==='plug'?'is-green':'is-blue')},icon(kind)),h('div',null,h('strong',null,title),h('span',null,description)))}
function legend(label,bytes,kind){return h('div',null,h('span',null,h('i',{className:kind||'','aria-hidden':true}),label),h('strong',null,byteLabel(bytes)))}

export function DatabaseResourceCards({database,refreshing=false,stale=false}){
  const value=resourceValues(database);
  const total=formatBytes(value.total);
  const pretty=typeof database?.size_pretty==='string'?database.size_pretty:null;
  const tone=stale?'neutral':value.percentage>=85?'danger':value.percentage>=70?'warning':'success';
  return h(React.Fragment,null,
    h('article',{className:'nexlab-system-monitor__resource nxl-system-resource is-connections','aria-busy':refreshing,'data-resource':'connections'},
      heading('plug','Conexões do Supabase','Ligações abertas com o banco'),
      h('div',{className:'nxl-system-metric'},h('strong',null,value.connections===null?'—':integer.format(value.connections)),h('span',null,value.limit!==null&&value.limit>0?'/ '+integer.format(value.limit):'')),
      h('p',{className:'nxl-system-caption'},stale?'Última leitura disponível':refreshing?'Atualizando as conexões…':'conexões abertas no momento da consulta'),
      value.percentage!==null?h(React.Fragment,null,
        h('div',{className:'nexlab-system-monitor__resource-track',role:'meter','aria-label':'Uso das conexões configuradas','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.min(100,value.percentage),'aria-valuetext':integer.format(value.connections)+' de '+integer.format(value.limit)+' conexões'},h('div',{className:'nexlab-system-monitor__resource-fill is-'+tone,style:{width:Math.min(100,value.percentage)+'%'}})),
        h('strong',{className:'nxl-system-track-label'},number.format(value.percentage)+'% do limite configurado')):
        h('p',{className:'nxl-system-unavailable'},refreshing?'Consultando as métricas…':value.connections!==null?'Limite de conexões não informado.':'Métricas de conexões indisponíveis.'),
      h('p',{className:'nxl-system-note'},stale?'Atualize para conferir as conexões atuais.':'Inclui os serviços internos. Não corresponde ao número de usuários online.')),
    h('article',{className:'nexlab-system-monitor__resource nxl-system-resource is-storage','aria-busy':refreshing,'data-resource':'storage'},
      heading('database','Armazenamento do Supabase','Espaço ocupado pelo banco em disco'),
      h('div',{className:'nxl-system-metric'},h('strong',null,value.total===null?(pretty||'—'):total.value),total.unit&&h('span',{className:'unit'},total.unit)),
      h('p',{className:'nxl-system-caption'},stale?'Última leitura disponível':refreshing?'Atualizando o armazenamento…':'Distribuição do espaço ocupado'),
      value.partition?h(React.Fragment,null,
        h('div',{className:'nxl-system-storage-track',role:'img','aria-label':'Distribuição do banco: '+byteLabel(value.history)+' de histórico de rotinas e '+byteLabel(value.other)+' de outros dados e estrutura'},h('span',{className:'history',style:{width:value.share+'%'}}),h('span',{className:'others',style:{width:(100-value.share)+'%'}})),
        h('div',{className:'nxl-system-legend'},legend('Histórico de rotinas',value.history),legend('Outros dados e estrutura',value.other,'others'))):
        h('p',{className:'nxl-system-unavailable'},refreshing?'Consultando a distribuição…':'Distribuição do armazenamento indisponível.'),
      h('p',{className:'nxl-system-storage-foot'},'A divisão representa o uso atual, sem estimar o limite do plano.')));
}

export function StorageHistoryNotice({database,stale=false}){
  const value=resourceValues(database);
  if(!value.partition||value.history===0)return null;
  return h('aside',{className:'nxl-system-storage-notice '+(value.share>=50?'is-attention':'is-info')},
    h('span',{'aria-hidden':true},'i'),
    h('div',null,h('strong',null,'O histórico das rotinas ocupa '+number.format(value.share)+'% do banco'+(stale?' na última leitura':'')),h('p',null,'Esse espaço inclui registros técnicos de execução. Use a seleção manual dos históricos técnicos para revisar os registros que podem ser excluídos.')));
}
