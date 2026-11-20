/* Marketing alerts use the same records, active permissions and date rule as Marketing. */
export function canReadMarketingPending(profile) {
  return Boolean(profile?.id && Array.isArray(profile.effective_permissions) && profile.effective_permissions.includes('module_marketing'));
}
const statuses = new Set(['Ideia','Em produção','Em revisão','Aprovado','Agendado','Publicado','Arquivado','Cancelado']);
export function marketingPendingStatus(value) {
  if (typeof value !== 'string') return null;
  const raw=value.trim();
  if (statuses.has(raw)) return raw;
  const key=raw.toLowerCase();
  return key==='ideia'?'Ideia':key==='planejado'?'Agendado':key==='ativo'||key==='publicado'?'Publicado':['producao','produção','em producao','em produção'].includes(key)?'Em produção':null;
}
export function isMarketingOverdue(record,today) {
  const status=marketingPendingStatus(record?.status);
  return Boolean(record?.id && /^\d{4}-\d{2}-\d{2}$/.test(record.data||'') && record.data<today && ['Ideia','Em produção','Em revisão','Aprovado','Agendado'].includes(status));
}
export function normalizeMarketingPending(records,profile,today,owners=[]) {
  const names=new Map(owners.map(p=>[String(p.id),p.nome]));
  if(profile?.id) names.set(String(profile.id),profile.nome||profile.name||'');
  return records.filter(row=>isMarketingOverdue(row,today)).map(row=>({
    id:'marketing-'+row.id,kind:'marketing_campaign',title:row.titulo||'Publicação sem título',description:row.descricao||'',
    priority:'alta',date:row.data,createdAt:row.created_at||null,ownerId:row.responsavel_id||null,ownerName:names.get(String(row.responsavel_id))||null,
    statusLabel:marketingPendingStatus(row.status),navigationTarget:'marketing',
    metadata:{recordId:row.id,isOverdue:true,channel:row.canal||'',postingTime:row.horario_postagem||null}
  }));
}
export async function readMarketingPending(client,profile,today,isCurrent=()=>true) {
  if(!canReadMarketingPending(profile)) return {items:[],skipped:true};
  const rows=[],seen=new Set(),pageSize=200;
  // Exclude finished records on the server; normalize legacy casing on the client.
  const finishedStatuses='("Publicado","Arquivado","Cancelado","ativo","publicado")';
  for(let start=0;;start+=pageSize) {
    if(!isCurrent()) return {items:[],skipped:true};
    const result=await client.from('marketing').select('id,titulo,descricao,canal,status,data,horario_postagem,responsavel_id,created_at')
      .lt('data',today).not('status','in',finishedStatuses).order('data',{ascending:true}).order('id',{ascending:true}).range(start,start+pageSize-1);
    if(result.error) throw result.error;
    if(!Array.isArray(result.data)) throw new Error('O servidor não confirmou as pendências de Marketing.');
    if(!isCurrent()) return {items:[],skipped:true};
    let added=0;
    for(const row of result.data) if(row?.id&&!seen.has(row.id)){seen.add(row.id);rows.push(row);added++;}
    if(result.data.length<pageSize) break;
    if(!added) throw new Error('A consulta de Marketing não avançou para a próxima página.');
  }
  return {items:normalizeMarketingPending(rows,profile,today)};
}
