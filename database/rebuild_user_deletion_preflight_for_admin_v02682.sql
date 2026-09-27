-- NEXLAB Beta 0.26.82
-- Correção: exclusão administrativa de usuários
-- Objetivo: permitir que ADM exclua outros usuários quando os vínculos
-- já são tratados pelas ações nativas das FKs (ON DELETE SET NULL / CASCADE),
-- mantendo bloqueios reais de integridade, autoexclusão e proteção do último ADM.

create or replace function public.nexlab_user_deletion_preflight_v02651(p_target_user_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'auth', 'pg_catalog', 'pg_temp'
as $function$
declare
  requester_role text;
  requester_active boolean;
  target_profile record;
  fk_row record;
  reference_count bigint;
  total_references bigint := 0;
  blocking_references bigint := 0;
  reference_details jsonb := '[]'::jsonb;
  non_nullable_set_null integer := 0;
  active_admin_count integer := 0;
  last_active_admin_block boolean := false;
  marker_trigger_present boolean := false;
  ready boolean := false;
  row_blocking boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Autenticação obrigatória.' using errcode='42501';
  end if;

  select lower(p.role::text), p.ativo is distinct from false
    into requester_role, requester_active
  from public.profiles p
  where p.id = auth.uid();

  if requester_role not in ('admin','administrador') or not coalesce(requester_active,false) then
    raise exception 'Ação exclusiva de Administradores ativos.' using errcode='42501';
  end if;

  if p_target_user_id is null or p_target_user_id = auth.uid() then
    raise exception 'Usuário alvo inválido para exclusão.' using errcode='22023';
  end if;

  select p.id,p.nome,p.email,p.role::text as role,p.ativo
    into target_profile
  from public.profiles p
  where p.id = p_target_user_id;

  if target_profile.id is null then
    return jsonb_build_object(
      'ok',false,
      'ready',false,
      'target_exists',false,
      'message','Usuário não encontrado ou já excluído.'
    );
  end if;

  if lower(coalesce(target_profile.role,'')) in ('admin','administrador')
     and target_profile.ativo is distinct from false then
    select count(*)::integer
      into active_admin_count
    from public.profiles p
    where lower(p.role::text) in ('admin','administrador')
      and p.ativo is distinct from false;

    last_active_admin_block := active_admin_count <= 1;
  end if;

  select count(*)::integer
    into non_nullable_set_null
  from pg_constraint con
  join pg_class cl on cl.oid = con.conrelid
  join pg_namespace ns on ns.oid = cl.relnamespace
  join lateral unnest(con.conkey) key_column(attnum) on true
  join pg_attribute att
    on att.attrelid = con.conrelid
   and att.attnum = key_column.attnum
  where con.contype='f'
    and con.confrelid='public.profiles'::regclass
    and con.confdeltype='n'
    and ns.nspname='public'
    and att.attnotnull;

  select exists(
    select 1
    from pg_trigger trigger_row
    where trigger_row.tgrelid='public.profiles'::regclass
      and trigger_row.tgname='aaa_nexlab_mark_profile_deletion_v02651'
      and not trigger_row.tgisinternal
      and trigger_row.tgenabled in ('O','A')
  ) into marker_trigger_present;

  for fk_row in
    select
      ns.nspname as schema_name,
      cl.relname as table_name,
      att.attname as column_name,
      con.conname as constraint_name,
      con.confdeltype,
      att.attnotnull,
      case con.confdeltype
        when 'c' then 'CASCADE'
        when 'n' then 'SET NULL'
        when 'r' then 'RESTRICT'
        when 'a' then 'NO ACTION'
        when 'd' then 'SET DEFAULT'
        else 'UNKNOWN'
      end as delete_rule
    from pg_constraint con
    join pg_class cl on cl.oid=con.conrelid
    join pg_namespace ns on ns.oid=cl.relnamespace
    join lateral unnest(con.conkey) key_column(attnum) on true
    join pg_attribute att
      on att.attrelid=con.conrelid
     and att.attnum=key_column.attnum
    where con.contype='f'
      and con.confrelid='public.profiles'::regclass
      and ns.nspname='public'
    order by cl.relname,att.attname
  loop
    execute format(
      'select count(*) from %I.%I where %I=$1',
      fk_row.schema_name,
      fk_row.table_name,
      fk_row.column_name
    ) into reference_count using p_target_user_id;

    if reference_count > 0 then
      total_references := total_references + reference_count;

      row_blocking :=
        fk_row.confdeltype in ('r','a','d')
        or (fk_row.confdeltype='n' and fk_row.attnotnull);

      if row_blocking then
        blocking_references := blocking_references + reference_count;
      end if;

      reference_details := reference_details || jsonb_build_array(
        jsonb_build_object(
          'table',fk_row.table_name,
          'column',fk_row.column_name,
          'constraint',fk_row.constraint_name,
          'delete_rule',fk_row.delete_rule,
          'count',reference_count,
          'blocking',row_blocking
        )
      );
    end if;
  end loop;

  ready :=
    blocking_references = 0
    and non_nullable_set_null = 0
    and not last_active_admin_block;

  return jsonb_build_object(
    'ok',true,
    'ready',ready,
    'target_exists',true,
    'target',jsonb_build_object(
      'id',target_profile.id,
      'name',target_profile.nome,
      'email',target_profile.email,
      'role',target_profile.role,
      'active',target_profile.ativo
    ),
    'total_references',total_references,
    'reference_details',reference_details,
    'checks',jsonb_build_object(
      'blocking_references',blocking_references,
      'non_nullable_set_null_constraints',non_nullable_set_null,
      'last_active_admin_block',last_active_admin_block,
      'profile_deletion_marker_trigger',marker_trigger_present,
      'native_fk_actions_authoritative',true,
      'custom_sanitizer_required',false,
      'preflight_revision','0.26.82-admin-native-fk'
    ),
    'message',case
      when last_active_admin_block
        then 'O último administrador ativo não pode ser excluído.'
      when blocking_references > 0 or non_nullable_set_null > 0
        then 'Existem vínculos incompatíveis com exclusão permanente e que precisam ser corrigidos.'
      else 'Estrutura pronta para exclusão permanente segura pelo Administrador.'
    end
  );
end;
$function$;

revoke all on function public.nexlab_user_deletion_preflight_v02651(uuid) from public, anon;
grant execute on function public.nexlab_user_deletion_preflight_v02651(uuid) to authenticated, service_role;
