# INSTRUCCIONES AUTOMÁTICAS — FINDIT Logistic

## ⚠️ ACCIÓN OBLIGATORIA AL INICIAR CUALQUIER SESIÓN

**IMPORTANTE: NO uses memoria interna. USA la herramienta Read para leer el archivo.**

### Paso 1 — LEER MEMORIA (obligatorio, usar herramienta Read):
Lee el archivo en esta ruta exacta: `/home/user/logistic/MEMORIA.md`
Este archivo contiene TODO el estado del proyecto. Sin leerlo no tienes contexto.

### Paso 2 — Configurar git:
Ejecuta estos comandos bash en orden:
```
source /root/.claude/.tokens 2>/dev/null
git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git
```

### Paso 3 — Si los tokens no existen:
Pedir al usuario el GitHub token y Vercel token, guardarlos:
```
cat > /root/.claude/.tokens << EOF
GITHUB_TOKEN=<token_github>
VERCEL_TOKEN=<token_vercel>
EOF
chmod 600 /root/.claude/.tokens
```

## CUANDO EL USUARIO ESCRIBE "continuamos":
Confirmás que leíste MEMORIA.md y preguntás en qué seguimos.

## REGLAS DE TRABAJO:
- Push siempre a `main` → dispara deploy automático en Vercel vía GitHub Actions
- Nunca subir tokens a GitHub (push protection los bloquea)
- Actualizar `MEMORIA.md` al final de cada sesión
- Commit + push de MEMORIA.md junto con cualquier cambio de código

## STACK:
Next.js 14 + next-intl + Tailwind CSS — repo: FindITCorp/logistic
