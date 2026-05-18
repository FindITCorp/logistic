# FINDIT — MEMORIA DEL PROYECTO
**Última actualización:** 15 de mayo de 2026
**Dueño:** FindITCorp
**Estado:** 🟢 MVP TÉCNICO CONSTRUIDO | 🔴 SUPUESTOS SIN VALIDAR | ⏳ EN VALIDACIÓN OPERACIONAL

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
- **Rama de trabajo:** `claude/continue-work-HHKEo`
- **Deploy:** Vercel (vercel.json configurado)
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

### Motor de precios (lib/pricing.ts) — LÓGICA CONFIRMADA
**Precio de referencia:** $100/m³ (techo máximo)
**Duración del pool:** 10 días
**Embarques:** cada 15 días

#### Tramos de volumen (costo del naviero)
| Volumen pool | Costo naviero | Ahorro vs referencia |
|---|---|---|
| 0–5 m³ | $100 | $0 |
| 5–15 m³ | $90 | $10 |
| 15–20 m³ | $85 | $15 |
| +20 m³ | $80 | $20 |

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

**Fecha:** 15 de mayo de 2026
**Fase:** 🟢 MVP TÉCNICO LISTO
**Sitio:** Desplegable en Vercel desde rama `claude/continue-work-HHKEo`
**Validación operativa:** 🔴 POR COMENZAR
**Capital:** NO INVERTIDO AÚN
**Pendiente técnico:** Formulario de registro en pool (botón "Unirme" sin funcionalidad)

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
