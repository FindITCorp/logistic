# INSTRUCCIONES CRÍTICAS — FINDIT Logistic

## ⚠️ LEE ESTO PRIMERO ANTES DE RESPONDER CUALQUIER MENSAJE

Estás trabajando en el proyecto **FINDIT Logistic** — consolidador de carga LCL China → Panamá.

### AL INICIAR SESIÓN — ejecuta esto en bash inmediatamente:
```bash
source /root/.claude/.tokens 2>/dev/null; git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git 2>/dev/null || true
```

### CUANDO EL USUARIO ESCRIBA "continuamos":
Responde EXACTAMENTE así (no uses ningún tool de memoria, no digas que no tienes contexto):

> "Contexto cargado. Estamos en el proyecto FINDIT Logistic — MVP técnico deployado en Vercel. ¿En qué seguimos?"

**NO uses el tool de memoria del sistema. NO digas "no tengo memorias guardadas". El contexto completo está en este archivo.**

---

## ESTADO COMPLETO DEL PROYECTO

# FINDIT — MEMORIA DEL PROYECTO
**Última actualización:** 29 de mayo de 2026
**Dueño:** FindITCorp
**Estado:** 🟢 MVP TÉCNICO CONSTRUIDO Y DEPLOYADO | 🔴 SUPUESTOS SIN VALIDAR | ⏳ EN VALIDACIÓN OPERACIONAL

---

## 1. DEFINICIÓN DEL PROYECTO

### Nombre oficial
**Dynamic Price Pooling — Consolidador Logístico LCL China → Panamá**

### Problema
Micro-importadores en Panamá pagan $400-800/m³ (DDP) cuando tarifa base LCL es $80-150/m³. No acceden a economías de escala. **Gap: $250-700/m³ sin explotar.**

### Solución
Plataforma que agrupa cargas en pools de 10 días, negocia automáticamente con forwarders según volumen real, distribuye ahorro de forma dinámica y transparente.

---

## 2. ESTADO TÉCNICO DEL MVP (ACTUALIZADO)

### Repositorio
- **GitHub:** finditcorp/logistic
- **Rama de trabajo:** `main` (deploy automático desde main)
- **Deploy:** Vercel — **URL LIVE: https://logistic-six-alpha.vercel.app**
- **Vercel proyecto:** `logistic` | projectId: `prj_S68LtSo2WYgAxmp7NFOF5Hxw1qz5` | orgId: `team_BrCUd1PJnqaQTOuhJFrDYsw3`
- **Stack:** Next.js 14 + next-intl + Tailwind CSS

### Estructura del proyecto
```
app/
  [locale]/
    page.tsx          — Landing page completa (4 secciones)
    pools/page.tsx    — Página de pools activos
    layout.tsx        — Layout con selector de idioma
components/
  Header.tsx          — Nav con ES|EN switcher
  LanguageSwitcher.tsx
  PoolCard.tsx        — Tarjeta de pool con precios dinámicos
  PricingTierTable.tsx — Tabla interactiva con slider
lib/
  pricing.ts          — Motor de precios dinámico ✅ CORRECTO
messages/
  es.json             — Traducciones completas español
  en.json             — Traducciones completas inglés
middleware.ts         — Routing i18n (ES default, /en para inglés)
```

### Rutas del sitio
- `/` o `/es` → Landing en español
- `/en` → Landing en inglés
- `/pools` o `/es/pools` → Pools activos en español
- `/en/pools` → Pools activos en inglés

### Inteligencia competitiva (verificada mayo 2026)
| Competidor | Precio | Ruta | Notas |
|---|---|---|---|
| Casillero Guangzhou→Panamá (real, publicado) | **$420/m³** (≥1 CBM) · **$600/m³** (<1 CBM = $17/ft³) | GZH → Panamá | 45–55 días, salidas quincenales |
| LMA Global Logistics | $285/m³ | Yiwu → Villa Zaita | 37 días, 2x/mes, warehouse-to-warehouse |
| Broker DDP (promedio) | $500–800/m³ | China → Panamá DDP | incluye aduanas y entrega |
| **FINDIT pool lleno** | **$180–250/m³** | GZH/SHA/SZH → Colón | precio baja según volumen |

**Ventaja vs. competidor principal:** 40–57% más barato que el casillero ($420), comparable a LMA ($285) con ventaja de precio dinámico

### Motor de precios (lib/pricing.ts) — ACTUALIZADO
**Precio de referencia:** $285/m³ (igual a LMA = ya somos competitivos en el peor caso)
**Duración del pool:** 10 días · **Embarques:** cada 15 días
**Mínimo por cliente:** 0.5 m³ (forwarder cobra 1 CBM mínimo de todas formas)

#### Modo de envío automático (LCL → FCL)
| Volumen pool | Modo | Costo/m³ aprox | Nota |
|---|---|---|---|
| 0–19 m³ | LCL consolidado | $82–100/m³ | tramos por volumen |
| 20–40 m³ | FCL 20ft (~$2,000) | $80–100/m³ | más estable |
| ≥41 m³ | FCL 40ft (~$3,200) | $58–78/m³ | precio óptimo |

#### Tramos LCL (costo del naviero, LCL)
| Volumen pool | Costo naviero |
|---|---|
| 0–5 m³ | $100 |
| 5–15 m³ | $92 |
| 15–20 m³ | $87 |
| +20 m³ | $82 (o FCL) |

#### Distribución del ahorro por día de entrada ✅ CONFIRMADO
| Día entrada | Días restantes | % cliente | % FINDIT |
|---|---|---|---|
| Día 1 | 10 días | 90% | 10% |
| Día 2 | 9 días | 80% | 20% |
| Día 3 | 8 días | 70% | 30% |
| Día 4 | 7 días | 60% | 40% |
| Día 5 | 6 días | 50% | 50% |
| Día 6 | 5 días | 40% | 60% |
| Día 7 | 4 días | 30% | 70% |
| Día 8 | 3 días | 20% | 80% |
| Día 9 | 2 días | 10% | 90% |
| Día 10 | 1 día | 10% (piso) | 90% |

**Ejemplo confirmado (precio base $100, naviero baja a $90 = ahorro $10):**
- Cliente entró día 1 → paga **$91**, FINDIT gana **$1/m³**
- Cliente entró día 5 → paga **$95**, FINDIT gana **$5/m³**

### Datos mock de pools (para demostración)
| Pool | Ruta | Volumen | Participantes | Día |
|---|---|---|---|---|
| 1 | Shanghai → Colón | 8.5 m³ | 6 | Día 3 |
| 2 | Guangzhou → Colón | 2.1 m³ | 2 | Día 1 |
| 3 | Shenzhen → Colón | 16.4 m³ | 11 | Día 7 |

---

## 3. SUPUESTOS CRÍTICOS (ESTADO ACTUAL)

| # | Supuesto | Crítico | Status | Validación necesaria |
|---|----------|---------|--------|----------------------|
| 1 | Existe demanda (100+ micro-importadores) | SÍ | 🔴 NO VALIDADO | Contactar 10-15 importadores vía redes |
| 2 | Forwarders aceptan tier pricing dinámico | SÍ | 🔴 NO VALIDADO | Contactar 3+ forwarders, obtener tabla precios |
| 3 | Margen ≥12% es viable | SÍ | 🟡 FRÁGIL | Depende de volumen 6m³+ |
| 4 | Regulación aduanal permite estructura | SÍ | 🔴 NO VALIDADO | Consultar agente aduanal Panamá |
| 5 | Clientes aceptan esperar 10 días | SÍ | 🔴 NO VALIDADO | Encuesta directa a 10 importadores |

---

## 4. DECISIONES CONFIRMADAS

✓ Estándar W/M (cobrar mayor entre volumen/peso)
✓ Pool 10 días fijos (embarques cada 15 días)
✓ Múltiples forwarders (mín 2)
✓ MVP manual (Excel + WhatsApp)
✓ Cliente paga 50%+50%
✓ Distribución ahorro: día 1=90% → día 10=10% (piso), -10% por día
✓ Precio de referencia = techo máximo ($100/m³)
✓ Precio real siempre ≤ precio de referencia
✓ Bodega Guangzhou + Panamá
✓ Estructura legal: Consolidador importador oficial
✓ Sitio bilingüe ES/EN con routing automático

---

## 5. MODELO FINANCIERO

**Proyección 3 meses:**

| Métrica | Mes 1 | Mes 2 | Mes 3 |
|---------|-------|-------|-------|
| Volumen | 1m³ | 2m³ | 4m³ |
| Ingresos | $155 | $310 | $620 |
| Costos | $3,900 | $4,100 | $4,300 |
| Margen neto | -$3,745 | -$3,790 | -$3,680 |

**Burn rate:** $2,600/mes
**Capital requerido:** $25K (3 meses MVP)
**Break-even:** Mes 5-6 (si volumen crece a 8m³+/mes)

---

## 6. PLAN DE VALIDACIÓN (90 DÍAS)

### FASE 1: Supuestos críticos (Semana 1)

**Tarea 1.1:** Validar forwarders
- Contactar 5-7 forwarders en Guangzhou/Shanghai
- Obtener tabla precios: 1m³, 3m³, 6m³, 10m³
- Pregunta clave: "¿Si cierro con 2m³, qué tarifa aplicas?"
- **Resultado esperado:** 2+ forwarders dan tabla clara = VALIDADO

**Tarea 1.2:** Identificar demanda
- Contactar 15 micro-importadores en Facebook, LinkedIn, OLX Panamá
- Pregunta: "¿Cuánto pagas hoy? ¿Esperas 10 días por 20-30% descuento?"
- **Resultado esperado:** 70%+ dicen SÍ = VALIDADO

**Tarea 1.3:** Validación aduanal
- Contactar agente aduanal Panamá
- Pregunta: "¿Puedo importar como consolidador con múltiples clientes finales?"
- **Resultado esperado:** Aduanas dice "viable" = VALIDADO

**Decisión GO/NO-GO:** Si 2 de 3 tareas pasan, continúa a Fase 2.

---

## 7. CAPITAL REQUERIDO

**MVP Fase 1 (3 meses): $25,000**

| Item | Costo |
|------|-------|
| Bodega China (3 meses) | $2,400 |
| Bodega Panamá (3 meses) | $2,400 |
| Operador logístico | $6,000 |
| Agente aduanal | $1,500 |
| Consultoría legal | $1,500 |
| Marketing | $2,000 |
| Contingencia (20%) | $4,700 |
| **TOTAL** | **$25,000** |

---

## 8. ESTADO ACTUAL

**Fecha:** 29 de mayo de 2026 (actualizado)
**Fase:** 🟢 MVP TÉCNICO COMPLETO Y EN PRODUCCIÓN — CAPA INTEGRIDAD+AUTONOMÍA DEPLOYADA
**Sitio:** https://logistic-six-alpha.vercel.app — deploy automático desde `main` vía GitHub Actions
**Validación operativa:** 🟡 LISTA PARA COMENZAR
**Capital:** NO INVERTIDO AÚN

### GitHub Secrets configurados:
- VERCEL_TOKEN, VERCEL_ORG_ID (`team_BrCUd1PJnqaQTOuhJFrDYsw3`), VERCEL_PROJECT_ID (`prj_S68LtSo2WYgAxmp7NFOF5Hxw1qz5`)
- ADMIN_SETUP_KEY, CRON_SECRET, SUPABASE_ACCESS_TOKEN y demás

### Sistema en producción (29 mayo 2026 — estado final):
- ✅ Auth admin completa — login seguro en /admin/login (httpOnly cookie 24h)
- ✅ Dashboard KPIs — /admin/dashboard con revenue, pools, facturas pendientes
- ✅ Gestión de envíos — /admin/envios con filtros y acción WhatsApp
- ✅ Estado de facturas para clientes — /factura/estado (búsqueda por código FDT)
- ✅ JoinPoolModal conectado a DB — leads se guardan en Supabase
- ✅ Landing con stats en vivo — HeroSection lee datos reales de Supabase
- ✅ Migraciones 001-013 aplicadas en producción
- ✅ **Race condition eliminada**: join_pool() atómica con FOR UPDATE
- ✅ **RLS PII lockdown** (migración 013): anon = zero acceso
- ✅ **Rate limiting durable**: tabla rate_limits + RPC
- ✅ **Autopilot cron**: auto-sana volumen, cierra pools, garantiza pool activo por ruta
- ✅ **Motor de notificaciones**: WhatsApp → email → GitHub fallback
- ✅ **Conciliación real**: pool_settlement view + /api/admin/settlement
- ✅ **Crecimiento orgánico**: referidos, sitemap dinámico, JSON-LD, OG cards WhatsApp
- ✅ Cuenta admin: enrique.eaguilarh@gmail.com / Findit2026! (insertada directo en DB vía SQL)
- ✅ Bug /api/admin/setup corregido: ahora usa bcrypt + admin_users (no Supabase Auth)
- ✅ Next.js 14.2.29 (parche CVE crítico aplicado)

### Páginas del sistema (19 páginas):
**Públicas:** /, /pools, /pools/[pool_number], /pools/unirme, /registro, /mis-pedidos, /seguimiento, /factura/[token], /factura/estado
**Admin:** /admin, /admin/dashboard, /admin/login, /admin/leads, /admin/pools, /admin/pools/[id], /admin/pools/[id]/aduana, /admin/proveedores, /admin/envios

### Supabase DB — Tablas:
clients, pools, shipments, pool_members, orders, providers, provider_rates, leads, invoices, payments, admin_users, admin_sessions, audit_log, rate_limits, lead_followups

### Pendiente técnico (menor):
- Agregar GITHUB_TOKEN_NOTIFY en Vercel para fallback de leads a GitHub Issues
- Probar flujo completo E2E: registro → envío → factura → aduana
- Activar NURTURE_ENABLED=true + WHATSAPP_TOKEN o RESEND_API_KEY para outreach autónomo

### Para retomar en sesión nueva:
Escribe: `continuamos` — si los tokens no están cargados, el asistente los pedirá.
Los tokens están guardados en `/root/.claude/.tokens` (solo en el contenedor local).

---

## 9. PROTOCOLO AUTOMÁTICO

### Cuando abras nuevo chat:
1. Di `continuamos` o `MEMORIA SYNC`
2. Yo leo este archivo
3. Tengo contexto completo — técnico y de negocio
4. Retomamos desde donde estábamos

### Credenciales de acceso
- Tokens guardados localmente en `/root/.claude/.tokens` (nunca en GitHub)
- Al iniciar sesión, cargar con: `source /root/.claude/.tokens`
- Configurar remote: `git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git`
- Si el archivo no existe, pedirle al usuario los tokens (GitHub PAT + Vercel token)

### Regla para el asistente:
- Al leer `continuamos`: ejecutar el comando de remote de arriba inmediatamente
- **SIEMPRE** actualizar esta MEMORIA.md al final de cada sesión con cambios relevantes
- **SIEMPRE** hacer commit + push junto con cualquier cambio de código
- Push siempre a `main` para triggear deploy automático en Vercel
- Rama de trabajo activa: `main`

---

**Este archivo es la fuente de verdad del proyecto.**

---

## REGLAS DE TRABAJO

- Push siempre a `main` → dispara deploy en Vercel
- NUNCA subir tokens a GitHub
- Actualizar CLAUDE.md + MEMORIA.md al final de cada sesión
- Commit + push de ambos archivos junto con cualquier cambio de código

## STACK

Next.js 14 + next-intl + Tailwind CSS — repo: FindITCorp/logistic
