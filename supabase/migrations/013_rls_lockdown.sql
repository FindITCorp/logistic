-- ─── 013_rls_lockdown.sql ────────────────────────────────────────────────────
-- Cierra la fuga de datos personales (PII).
--
-- Contexto: TODO el frontend accede a datos vía rutas /api/* que usan la
-- service_role key (createServerClient) — la cual hace bypass de RLS. Ningún
-- componente del navegador usa la clave anon directamente (verificado).
--
-- Por tanto, el rol `anon` (cuya clave vive en el navegador y es pública) no
-- necesita acceso a NINGUNA tabla. Antes de esto, políticas `using (true)`
-- permitían a cualquiera con la anon key descargar la tabla de clientes
-- completa (nombres, WhatsApp, emails, valores declarados de carga ajena).
--
-- Estrategia: eliminar todas las políticas anon del esquema public y dejar
-- RLS habilitado sin políticas = anon denegado en todo. service_role sigue
-- operando sin restricción desde el servidor.

-- Eliminar todas las políticas existentes en public.
do $$ declare r record; begin
  for r in select policyname, tablename from pg_policies where schemaname = 'public' loop
    execute format('drop policy if exists %I on %I', r.policyname, r.tablename);
  end loop;
end $$;

-- Re-asegurar RLS habilitado en todas las tablas (incluye las nuevas de 012).
do $$ declare t text; begin
  foreach t in array array[
    'clients','pools','shipments','pool_members','orders','leads',
    'providers','provider_rates','invoices','payments',
    'admin_users','admin_sessions','audit_log','rate_limits','lead_followups'
  ] loop
    if exists (select 1 from information_schema.tables
               where table_schema = 'public' and table_name = t) then
      execute format('alter table %I enable row level security', t);
    end if;
  end loop;
end $$;

-- Resultado: 0 políticas para anon → anon no puede leer ni escribir nada.
-- service_role (servidor) hace bypass de RLS y mantiene toda la operación.
