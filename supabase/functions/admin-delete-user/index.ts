function accountExpired(profile:any):boolean{return Boolean(profile?.is_test_account)&&(!profile.temporary_until||!Number.isFinite(Date.parse(profile.temporary_until))||Date.parse(profile.temporary_until)<=Date.now());}
import { createClient } from 'npm:@supabase/supabase-js@2.108.2';

const VERSION = '0.26.51';
const EDGE_VERSION = 22;
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
};
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify({ version: VERSION, edgeVersion: EDGE_VERSION, ...body }), { status, headers });
const normalizeRole = (value: unknown) => String(value ?? '').trim().toLowerCase();
const isAdminRole = (value: unknown) => ['admin', 'administrador'].includes(normalizeRole(value));
const safeDeleteMessage = (message: string) => {
  const normalized = message.toLowerCase();
  if (normalized.includes('foreign key') || normalized.includes('violates foreign key constraint')) {
    return 'A conta possui um vínculo que ainda não pôde ser desvinculado. A exclusão foi cancelada integralmente.';
  }
  if (normalized.includes('last') && normalized.includes('admin')) {
    return 'O último administrador ativo não pode ser excluído.';
  }
  return 'Não foi possível concluir a exclusão permanente do usuário.';
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers });
  if (request.method !== 'POST') return reply(405, { ok: false, message: 'Método não permitido.' });

  const base = Deno.env.get('SUPABASE_URL') ?? '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const authorization = request.headers.get('Authorization') ?? '';
  if (!base || !anon || !service || !authorization) {
    return reply(401, { ok: false, message: 'Autenticação obrigatória.' });
  }

  const userClient = createClient(base, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const admin = createClient(base, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return reply(401, { ok: false, message: 'Sessão inválida ou expirada.' });

    const { data: requester, error: requesterError } = await admin
      .from('profiles')
      .select('id,role,ativo,is_test_account,temporary_until')
      .eq('id', user.id)
      .maybeSingle();
    if (requesterError || !requester || accountExpired(requester) || !isAdminRole(requester.role) || requester.ativo === false) {
      return reply(403, { ok: false, message: 'Somente administradores ativos podem excluir usuários.' });
    }

    const body = await request.json().catch(() => ({})) as { userId?: unknown };
    const target = typeof body.userId === 'string' ? body.userId.trim() : '';
    if (!uuid.test(target)) return reply(400, { ok: false, message: 'Identificador do usuário inválido.' });
    if (target === user.id) return reply(400, { ok: false, message: 'O administrador não pode excluir a própria conta.' });

    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('id,nome,email,role,ativo')
      .eq('id', target)
      .maybeSingle();
    if (profileError) return reply(500, { ok: false, message: 'Não foi possível localizar o usuário.' });
    if (!profile) return reply(404, { ok: false, message: 'Usuário não encontrado ou já excluído.' });

    if (isAdminRole(profile.role)) {
      const { data: administrators, error: administratorsError } = await admin
        .from('profiles')
        .select('id,role,ativo,is_test_account,temporary_until');
      if (administratorsError) {
        return reply(500, { ok: false, message: 'Não foi possível validar a quantidade de administradores.' });
      }
      const activeAdminCount = (administrators ?? []).filter(
        (row) => isAdminRole(row.role) && row.ativo !== false,
      ).length;
      if (activeAdminCount <= 1) {
        return reply(409, { ok: false, message: 'O último administrador ativo não pode ser excluído.' });
      }
    }

    const { data: preflight, error: preflightError } = await userClient.rpc(
      'nexlab_user_deletion_preflight_v02651',
      { p_target_user_id: target },
    );
    if (preflightError || !preflight?.ok || !preflight?.ready) {
      console.warn('admin-delete-user preflight blocked', {
        target,
        code: preflightError?.code ?? 'deletion_preflight_failed',
        checks: preflight?.checks ?? null,
      });
      return reply(409, {
        ok: false,
        code: preflightError?.code ?? 'deletion_preflight_failed',
        message: preflight?.message ?? 'A estrutura de exclusão ainda exige correção administrativa.',
        preflightReady: false,
      });
    }

    const { error: deleteError } = await admin.auth.admin.deleteUser(target, false);
    if (deleteError) {
      console.warn('admin-delete-user rejected', {
        target,
        code: deleteError.code ?? 'auth_delete_failed',
        message: deleteError.message,
      });
      return reply(409, {
        ok: false,
        message: safeDeleteMessage(deleteError.message ?? ''),
        code: deleteError.code ?? 'auth_delete_failed',
        preflightReady: true,
      });
    }

    const { data: remainingProfile, error: remainingError } = await admin
      .from('profiles')
      .select('id')
      .eq('id', target)
      .maybeSingle();
    if (remainingError || remainingProfile) {
      console.error('admin-delete-user profile remained', { target, remainingError });
      return reply(500, {
        ok: false,
        authDeleted: true,
        profileDeleted: false,
        message: 'A autenticação foi removida, mas o perfil ainda exige revisão administrativa.',
      });
    }

    const { data: audit, error: auditError } = await userClient.rpc('nexlab_record_user_deleted_v26297', {
      p_deleted_user_id: target,
      p_deleted_user_name: profile.nome ?? null,
      p_deleted_user_email: profile.email ?? null,
      p_deleted_user_role: profile.role ?? null,
    });

    return reply(200, {
      ok: true,
      authDeleted: true,
      profileDeleted: true,
      auditRecorded: !auditError && Boolean(audit?.ok),
      auditId: audit?.audit_id ?? null,
      deletedUserId: target,
      referencesProcessed: Number(preflight?.total_references ?? 0),
      message: 'Usuário excluído permanentemente com sucesso.',
    });
  } catch (error) {
    console.error('admin-delete-user unexpected error', error);
    return reply(500, { ok: false, message: 'Erro inesperado ao excluir o usuário.' });
  }
});
