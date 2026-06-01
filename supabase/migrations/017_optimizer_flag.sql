-- 017_optimizer_flag.sql
-- Agrega el flag de auto-ejecución diaria del optimizador evolutivo.
insert into app_settings (key, value) values
  ('optimizer_auto_apply', 'false')
on conflict (key) do nothing;
