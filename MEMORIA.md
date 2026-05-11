# FINDIT — MEMORIA DEL PROYECTO
**Última actualización:** 11 de mayo de 2026
**Dueño:** FindITCorp
**Estado:** 🟡 CONCEPTO VALIDADO | 🔴 SUPUESTOS SIN VALIDAR | ⏳ EN VALIDACIÓN OPERACIONAL

---

## 1. DEFINICIÓN DEL PROYECTO

### Nombre oficial
**Dynamic Price Pooling — Consolidador Logístico LCL China → Panamá**

### Problema
Micro-importadores en Panamá pagan $400-800/m³ (DDP) cuando tarifa base LCL es $80-150/m³. No acceden a economías de escala. **Gap: $250-700/m³ sin explotar.**

### Solución
Plataforma que agrupa cargas en pools de 10 días, negocia automáticamente con forwarders según volumen real, distribuye ahorro de forma dinámica y transparente.

---

## 2. SUPUESTOS CRÍTICOS (ESTADO ACTUAL)

| # | Supuesto | Crítico | Status | Validación necesaria |
|---|----------|---------|--------|----------------------|
| 1 | Existe demanda (100+ micro-importadores) | SÍ | 🔴 NO VALIDADO | Contactar 10-15 importadores vía redes |
| 2 | Forwarders aceptan tier pricing dinámico | SÍ | 🔴 NO VALIDADO | Contactar 3+ forwarders, obtener tabla precios |
| 3 | Margen ≥12% es viable | SÍ | 🟡 FRÁGIL | Depende de volumen 6m³+ |
| 4 | Regulación aduanal permite estructura | SÍ | 🔴 NO VALIDADO | Consultar agente aduanal Panamá |
| 5 | Clientes aceptan esperar 10 días | SÍ | 🔴 NO VALIDADO | Encuesta directa a 10 importadores |

---

## 3. DECISIONES CONFIRMADAS

✓ Estándar W/M (cobrar mayor entre volumen/peso)
✓ Pool 10 días (flexible 7-14)
✓ Múltiples forwarders (mín 2)
✓ MVP manual (Excel + WhatsApp)
✓ Cliente paga 50%+50%
✓ Distribución ahorro: día 1=90%, día 10=10%
✓ Bodega Guangzhou + Panamá
✓ Estructura legal: Consolidador importador oficial

---

## 4. MODELO FINANCIERO

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

## 5. PLAN DE VALIDACIÓN (90 DÍAS)

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

## 6. CAPITAL REQUERIDO

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

## 7. PRÓXIMOS PASOS INMEDIATOS

### Semana 1 - Validación crítica

- [ ] Contactar 5-7 forwarders (6h)
- [ ] Encuestar 15+ importadores (4h)
- [ ] Consulta aduanal (2h)
- [ ] Compilar resultados
- [ ] **DECISIÓN GO/NO-GO**

---

## 8. ESTADO ACTUAL

**Fecha:** 11 de mayo de 2026
**Fase:** 🟡 CONCEPTO VALIDADO
**Validación operativa:** 🔴 POR COMENZAR
**Capital:** NO INVERTIDO AÚN
**Timeline:** Semana 1 decisión crítica

---

## 9. PROTOCOLO AUTOMÁTICO

### Cuando abras nuevo chat conmigo:

**Escribe:** `MEMORIA SYNC`

**Yo haré automáticamente:**
1. Leo este archivo desde GitHub
2. Tengo contexto completo del proyecto
3. Espero que me digas qué validaste esta semana
4. Respondo con análisis y propuestas ejecutables

### Para actualizar la memoria:
- Edita este archivo en GitHub
- Haz push con git desde tu computadora
- Yo leeré la versión más reciente automáticamente cada sesión

---

**Este archivo es tu fuente de verdad del proyecto.**

Próximo update: EOW Semana 1 con resultados validación supuestos críticos.
