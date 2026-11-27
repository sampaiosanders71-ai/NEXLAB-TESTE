begin;

create schema if not exists nexlab_private;

create or replace function public.nexlab_account_not_expired_v1() returns boolean
language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from public.profiles p where p.id=auth.uid() and p.ativo is distinct from false
 and (not coalesce(p.is_test_account,false) or (p.temporary_until is not null and p.temporary_until>now())));
$fn$;
revoke all on function public.nexlab_account_not_expired_v1() from public,anon;
grant execute on function public.nexlab_account_not_expired_v1() to authenticated,service_role;


CREATE OR REPLACE FUNCTION public.nexlab_has_approved_access()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select exists (
    select 1
    from public.profiles p
    where p.id::text = auth.uid()::text and (not coalesce(p.is_test_account,false) or (p.temporary_until is not null and p.temporary_until>now()))
      and p.ativo is distinct from false
      and coalesce(p.cadastro_completo, false)
      and p.role_request_status in ('approved', 'auto_approved')
  );
$function$;


CREATE OR REPLACE FUNCTION public.nexlab_has_permission_v26100(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    auth.uid() is not null
    and nullif(btrim(coalesce(p_permission,'')),'') is not null
    and exists (
      select 1
      from public.profiles p
      where p.id=auth.uid() and (not coalesce(p.is_test_account,false) or (p.temporary_until is not null and p.temporary_until>now()))
        and p.ativo is distinct from false
        and coalesce(p.cadastro_completo,false)
        and coalesce(p.role_request_status,'approved')='approved'
        and p_permission=any(coalesce(p.effective_permissions,'{}'::text[]))
    );
$function$;


CREATE OR REPLACE FUNCTION public.nexlab_has_effective_permission_v2680(p_permission text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
select exists(select 1 from public.profiles p where p.id=auth.uid() and (not coalesce(p.is_test_account,false) or (p.temporary_until is not null and p.temporary_until>now())) and p.ativo is distinct from false and p_permission=any(coalesce(p.effective_permissions,'{}'::text[])));
$function$;


create or replace function public.nexlab_current_role() returns text language sql stable security definer set search_path='' as $fn$
 select lower(coalesce(p.role::text,'')) from public.profiles p where p.id=auth.uid() and public.nexlab_account_not_expired_v1() limit 1;
$fn$;
create or replace function public.nexlab_is_admin() returns boolean language sql stable security definer set search_path='' as $fn$
 select public.nexlab_account_not_expired_v1() and public.nexlab_current_role() in('admin','administrador');
$fn$;
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $fn$
 select public.nexlab_account_not_expired_v1() and public.nexlab_current_role()='admin';
$fn$;
create or replace function public.nexlab_expire_test_accounts_v02652() returns jsonb language plpgsql security definer set search_path='' as $fn$
declare profiles_count integer:=0; runs_count integer:=0; sessions_count integer:=0; old_flow text:=coalesce(current_setting('nexlab.profile_flow',true),'');
begin
 perform set_config('nexlab.profile_flow','trusted',true);
 update public.profiles set ativo=false,account_status_reason='Conta temporária de teste expirada automaticamente.',account_status_changed_at=now(),account_status_changed_by=null where is_test_account and ativo is distinct from false and temporary_until<=now();
 get diagnostics profiles_count=row_count;
 update public.nexlab_test_runs set status='expired',metadata=metadata||jsonb_build_object('expired_at',now()) where status='active' and expires_at<=now();
 get diagnostics runs_count=row_count;
 perform set_config('nexlab.profile_flow',old_flow,true);
 return jsonb_build_object('ok',true,'expired_profiles',profiles_count,'expired_runs',runs_count,'revoked_sessions',sessions_count,'version','0.26.82');
end;$fn$;
revoke all on function public.nexlab_expire_test_accounts_v02652() from public,anon,authenticated;
grant execute on function public.nexlab_expire_test_accounts_v02652() to service_role;
select cron.schedule('nexlab-expire-test-accounts-v02682','* * * * *','select public.nexlab_expire_test_accounts_v02652()');


CREATE OR REPLACE FUNCTION nexlab_private.notification_visible_for_user_v1(n public.notifications,p_user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare p public.profiles; target text:=lower(coalesce(n.target_tab,'')); typ text:=lower(coalesce(n.type,'')); perms text[];
begin
 if n.recipient_id is distinct from p_user_id then return false; end if;
 select * into p from public.profiles where id=p_user_id;
 if not found or p.ativo=false or not coalesce(p.cadastro_completo,false) or coalesce(p.role_request_status,'') not in('approved','auto_approved') or (coalesce(p.is_test_account,false) and (p.temporary_until is null or p.temporary_until<=now())) then return false; end if;
 if p.role=p.official_role then return true; end if;
 -- Account safety and changes to this person's official assignment remain visible.
 if typ ~ 'password|security|account_|privacy|profile_updated' or lower(coalesce(n.category,'')) in ('seguranca','security')
    or (n.entity_type='profile' and n.entity_id=p_user_id)
    or (target='perfil' and typ in ('profile_request','system')) then return true; end if;
 perms:=coalesce(p.effective_permissions,'{}'::text[]);
 if typ='profile_request' then return p.role='admin'; end if;
 if typ ~ 'asset|patrimonio' and not p.role::text=any(array['admin','coordenador']) then return false; end if;
 if typ ~ 'reservation_created|reservation_request|reservation_pending' and not 'reservations_review'=any(perms) then return false; end if;
 if typ ~ 'feedback_created' and not 'feedback_manage'=any(perms) then return false; end if;
 target:=case target when 'patrimonio' then 'patrimonio' when 'estoque' then 'estoque' when 'saude-sistema' then 'saude-sistema' when 'logs' then 'logs' when 'notificacoes' then 'configuracoes' else target end;
 if target='inventario' then return 'module_patrimonio'=any(perms) or 'module_estoque'=any(perms); end if;
 if target='atividades-sistema' then return 'module_logs'=any(perms) or 'module_saude-sistema'=any(perms); end if;
 if target='' then return false; end if;
 return ('module_'||target)=any(perms);
end; $function$;


revoke all on function nexlab_private.notification_visible_for_user_v1(public.notifications,uuid) from public,anon,authenticated;
create or replace function public.nexlab_notification_visible_in_usage_mode_v1(n public.notifications) returns boolean
language sql stable security definer set search_path='' as $fn$
 select n.recipient_id=auth.uid() and nexlab_private.notification_visible_for_user_v1(n,auth.uid());
$fn$;
create or replace function public.nexlab_push_delivery_guard_v1(p_delivery_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $fn$
declare d public.notification_deliveries; n public.notifications; p public.profiles; policy jsonb; next_at timestamptz;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Acesso exclusivo do remetente.' using errcode='42501';end if;
 select * into d from public.notification_deliveries where id=p_delivery_id and channel='push';
 if not found then return jsonb_build_object('action','skip','reason','Entrega não encontrada.');end if;
 select * into n from public.notifications where id=d.notification_id and recipient_id=d.recipient_id;
 if not found then return jsonb_build_object('action','skip','reason','Notificação removida.');end if;
 select * into p from public.profiles where id=d.recipient_id;
 if not found or p.ativo=false or not coalesce(p.cadastro_completo,false) or coalesce(p.role_request_status,'') not in('approved','auto_approved') or (coalesce(p.is_test_account,false) and (p.temporary_until is null or p.temporary_until<=now())) then return jsonb_build_object('action','skip','reason','Conta sem acesso ativo.');end if;
 if not nexlab_private.notification_visible_for_user_v1(n,p.id) then return jsonb_build_object('action','skip','reason','Aviso indisponível no modo de uso atual.');end if;
 policy:=public.nexlab_notification_policy_v26180(p.id,n.type,n.preference_key);
 if not coalesce((policy->>'push_enabled')::boolean,false) or coalesce((policy->>'external_muted')::boolean,false) or not coalesce(n.push_eligible,false) then return jsonb_build_object('action','skip','reason','Push desativado ou silenciado nas preferências atuais.');end if;
 next_at:=public.nexlab_next_delivery_time(p.id::text,now());
 if next_at>now()+interval '1 second' then return jsonb_build_object('action','defer','next_attempt_at',next_at,'reason','Horário silencioso ativo.');end if;
 return jsonb_build_object('action','send','recipient_id',p.id,'payload',jsonb_build_object('notification_id',n.id,'type',n.type,'preference_key',n.preference_key,'title',n.title,'message',n.message,'target_tab',n.target_tab,'entity_id',n.entity_id,'entity_type',n.entity_type));
end;$fn$;
revoke all on function public.nexlab_push_delivery_guard_v1(uuid) from public,anon,authenticated;
grant execute on function public.nexlab_push_delivery_guard_v1(uuid) to service_role;


create or replace function nexlab_private.guard_test_account_metadata_v1() returns trigger language plpgsql set search_path='' as $fn$
begin
 if auth.uid() is not null and coalesce(current_setting('nexlab.profile_flow',true),'')<>'trusted' and (new.is_test_account,new.test_run_id,new.temporary_until,new.test_profile_kind) is distinct from (old.is_test_account,old.test_run_id,old.temporary_until,old.test_profile_kind) then raise exception 'Metadados temporários são gerenciados pelo serviço de teste.' using errcode='42501';end if;
 return new;
end;$fn$;
revoke all on function nexlab_private.guard_test_account_metadata_v1() from public,anon,authenticated;
drop trigger if exists nexlab_guard_test_metadata_v02682 on public.profiles;
create trigger nexlab_guard_test_metadata_v02682 before update on public.profiles for each row execute function nexlab_private.guard_test_account_metadata_v1();


-- Restrictive policies also cover direct REST reads/writes using old JWTs.
do $policy$
declare t record;
begin
 for t in select tablename from pg_tables where schemaname='public' and tablename<>'profiles' loop
  execute format('drop policy if exists nexlab_valid_account_v02682 on public.%I',t.tablename);
  execute format('create policy nexlab_valid_account_v02682 on public.%I as restrictive for all to authenticated using ((select public.nexlab_account_not_expired_v1())) with check ((select public.nexlab_account_not_expired_v1()))',t.tablename);
 end loop;
end;$policy$;
drop policy if exists nexlab_valid_account_update_v02682 on public.profiles;
create policy nexlab_valid_account_update_v02682 on public.profiles as restrictive for update to authenticated using ((select public.nexlab_account_not_expired_v1())) with check ((select public.nexlab_account_not_expired_v1()));

CREATE OR REPLACE FUNCTION public.nexlab_after_profile_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  request_id uuid;
  admin_row record;
  requested_role_text text;
  role_label text;
begin
  if coalesce(new.is_test_account,false) then return new; end if;
  if coalesce(old.cadastro_completo, false) = false
     and coalesce(new.cadastro_completo, false) = true
  then
    requested_role_text := lower(coalesce(new.vinculo_solicitado::text, ''));
    role_label := public.nexlab_profile_role_label(requested_role_text);

    insert into public.profile_role_requests (
      user_id, requested_role, previous_role, status, automatic, created_at, updated_at
    ) values (
      new.id, new.vinculo_solicitado, old.role, 'pending', false,
      coalesce(new.role_request_created_at, now()), now()
    )
    on conflict do nothing
    returning id into request_id;

    if request_id is null then
      select r.id into request_id
      from public.profile_role_requests r
      where r.user_id::text = new.id::text and r.status = 'pending'
      order by r.created_at desc
      limit 1;
    end if;

    for admin_row in
      select p.id::text as id_text
      from public.profiles p
      where lower(p.role::text) in ('admin', 'administrador')
        and coalesce(p.ativo, true)
        and p.id::text <> new.id::text
    loop
      perform public.nexlab_profile_flow_notification(
        admin_row.id_text,
        'Novo cadastro aguardando aprovação',
        format('%s concluiu o cadastro e solicitou o perfil %s.',
          coalesce(new.nome, new.email, 'Novo usuário'), role_label),
        'pendencias',
        format('profile-registration-pending:%s:%s', request_id, admin_row.id_text),
        'alta',
        jsonb_build_object(
          'request_id', request_id,
          'user_id', new.id,
          'requested_role', requested_role_text,
          'status', 'pending',
          'automatic', false
        )
      );
    end loop;

    perform public.record_security_audit(
      'profile_registration_submitted',
      new.id::text,
      jsonb_build_object(
        'request_id', request_id,
        'requested_role', requested_role_text,
        'status', 'pending'
      )
    );
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.nexlab_can_access_reports()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  select
    auth.uid() is not null and public.nexlab_account_not_expired_v1()
    and exists (
      select 1
      from public.profiles p
      where p.id::text = auth.uid()::text
        and coalesce(p.ativo, true)
        and coalesce(p.cadastro_completo, false)
        and (
          lower(coalesce(p.role::text, '')) in (
            'admin',
            'administrador',
            'coordenador'
          )
          or 'module_relatorios' = any(
            coalesce(p.effective_permissions, '{}'::text[])
          )
        )
    );
$function$;

CREATE OR REPLACE FUNCTION public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_expiration_time bigint DEFAULT NULL::bigint, p_user_agent text DEFAULT NULL::text, p_platform text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'extensions', 'pg_temp'
AS $function$
declare
  saved_id uuid;
begin
  if auth.uid() is null or not public.nexlab_has_approved_access() then
    raise exception 'Usuário não autenticado.'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_endpoint), '') is null
    or nullif(btrim(p_p256dh), '') is null
    or nullif(btrim(p_auth), '') is null
  then
    raise exception 'Inscrição push incompleta.'
      using errcode = '22023';
  end if;

  insert into public.push_subscriptions (
    user_id,
    endpoint,
    p256dh,
    auth,
    expiration_time,
    user_agent,
    platform,
    active,
    last_seen_at
  )
  select
    p.id,
    p_endpoint,
    p_p256dh,
    p_auth,
    p_expiration_time,
    nullif(p_user_agent, ''),
    nullif(p_platform, ''),
    true,
    now()
  from public.profiles p
  where p.id::text = auth.uid()::text
  on conflict (endpoint) do update
    set user_id = excluded.user_id,
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        expiration_time = excluded.expiration_time,
        user_agent = excluded.user_agent,
        platform = excluded.platform,
        active = true,
        last_seen_at = now(),
        updated_at = now()
  returning id into saved_id;

  return jsonb_build_object(
    'id', saved_id,
    'active', true
  );
end;
$function$;

commit;
