# FINDIT — Consolidador Logístico China → Panamá

> **Dynamic Price Pooling para importación LCL** — La plataforma donde tu precio de flete baja en tiempo real conforme entra más carga al pool.

[![Status](https://img.shields.io/badge/status-MVP_en_desarrollo-yellow)]()
[![Stack](https://img.shields.io/badge/stack-Next.js_14_+_Supabase-black)]()
[![License](https://img.shields.io/badge/license-Privado-red)]()

---

## El problema que resolvemos

Micro-importadores en Panamá pagan **$400–800/m³ (DDP)** cuando la tarifa LCL base es **$80–150/m³**. No tienen acceso a economías de escala porque no consolidan volumen suficiente. El gap de **$250–700/m³** está sin explotar.

## Nuestra solución

FINDIT funciona como un **protocolo de enrutamiento logístico** (analogía OSPF). El cliente solo ve que su carga llega de China a Panamá al menor costo posible. Por debajo:

1. **Pools de 10 días** agrupan cargas de múltiples importadores
2. **Pricing dinámico** muestra al cliente cómo baja su precio conforme entra más volumen
3. **Negociación automática** con forwarders según el volumen real del pool al cierre
4. **Distribución transparente** del ahorro entre todos los participantes

**Diferencial competitivo:** transparencia + precio máximo garantizado + visualización en vivo del ahorro.

---

## Stack técnico

| Capa | Tecnología | Razón |
|------|-----------|-------|
| Framework | Next.js 14 (App Router) | SSR para landing pública + dashboard privado en un solo codebase |
| Lenguaje | TypeScript | Manejo de dinero, pesos y dimensiones requiere tipado estricto |
| Base de datos | Supabase (PostgreSQL) | Joins fuertes para pools/cargas/clientes + realtime para precios dinámicos |
| Auth | Supabase Auth | Email + Google OAuth listos para usar |
| UI | Tailwind CSS + shadcn/ui | Velocidad de desarrollo sin diseñar desde cero |
| Deploy | Vercel | CI/CD automático conectado a GitHub |
| Validación | Zod | Esquemas compartidos cliente/servidor |

**Costo de infraestructura durante validación: $0/mes** (todos los tiers gratuitos cubren hasta 100–500 usuarios activos).

---

## Estructura del repositorio

```
findit-logistic/
├── app/                      # Rutas Next.js (App Router)
│   ├── api/                  # Endpoints serverless (pricing, pools, webhooks)
│   ├── auth/                 # Login, registro, recuperación
│   ├── calculator/           # Calculadora pública de ahorro (lead magnet)
│   ├── dashboard/            # Panel privado del cliente
│   └── pools/                # Vista pública de pools activos
├── components/               # React components reutilizables
│   ├── calculator/           # Componentes de la calculadora
│   ├── layout/               # Header, footer, navegación
│   ├── pools/                # Card de pool, barra de progreso dinámica
│   └── ui/                   # Primitivas de shadcn/ui
├── lib/
│   ├── pricing/              # Motor de Dynamic Price Pooling (lógica OSPF)
│   ├── supabase/             # Clientes server/browser
│   └── validation/           # Esquemas Zod compartidos
├── supabase/
│   └── migrations/           # Esquema SQL versionado
├── docs/                     # Documentación interna y memoria del proyecto
└── scripts/                  # Seed data, utilidades de admin
```

---

## Arranque local

```bash
# 1. Clonar
git clone https://github.com/FindITCorp/logistic.git
cd logistic

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.example .env.local
# Edita .env.local con tus credenciales de Supabase

# 4. Ejecutar migraciones de base de datos
npx supabase db push

# 5. Levantar servidor de desarrollo
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

---

## Roadmap del MVP

### Fase 1 — Validación de demanda (Semanas 1-2)
- [x] Landing page con propuesta de valor
- [x] Calculadora pública de ahorro (sin registro)
- [ ] Formulario de pre-registro con captura de email
- [ ] Tracking de conversión (Plausible/Umami)

### Fase 2 — Pool MVP (Semanas 3-4)
- [ ] Sistema de autenticación
- [ ] Creación de pools por operador
- [ ] Inscripción de cargas por cliente
- [ ] Motor de pricing dinámico en tiempo real
- [ ] Visualización OSPF: precio baja conforme entra volumen

### Fase 3 — Operación (Semanas 5-8)
- [ ] Integración con forwarders (manual primero, API después)
- [ ] Sistema de cotización tier-based
- [ ] Estados del pool: abierto → cerrado → en tránsito → entregado
- [ ] Notificaciones por email en cada hito
- [ ] Dashboard de operador

### Fase 4 — Escala (Meses 3+)
- [ ] Integración con plataformas chinas (Taobao, 1688) para captura automática
- [ ] Sistema de comisiones de revendedor
- [ ] App móvil (React Native)
- [ ] Expansión a rutas adicionales

---

## Documentación clave

- [`docs/MEMORIA.md`](docs/MEMORIA.md) — Memoria viva del proyecto (visión, supuestos, decisiones)
- [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) — Decisiones técnicas y rationale
- [`docs/PRICING_ENGINE.md`](docs/PRICING_ENGINE.md) — Cómo funciona el motor de Dynamic Price Pooling
- [`docs/SCHEMA.md`](docs/SCHEMA.md) — Modelo de datos comentado

---

## Estado actual

**Fase:** 🟡 Concepto validado — Construcción de MVP
**Capital invertido:** $0
**Última actualización:** Mayo 2026

---

## Licencia

Privado — FindITCorp. Todos los derechos reservados.
