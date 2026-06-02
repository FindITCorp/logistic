-- 018_pool_alerts.sql
-- Habilita el sistema de alertas proactivas de Pool Intelligence.
-- pool_alerts_enabled: el cron detecta pools ≥60% FCL y alerta leads automáticamente.

insert into app_settings (key, value) values
  ('pool_alerts_enabled', 'false')
on conflict (key) do nothing;
