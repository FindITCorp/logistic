# INSTRUCCIONES AUTOMÁTICAS — FINDIT Logistic

## AL INICIAR CUALQUIER SESIÓN — hacer esto primero, siempre:

1. Leer el archivo `MEMORIA.md` de este repositorio — contiene el estado completo del proyecto
2. Cargar tokens locales si existen: `source /root/.claude/.tokens 2>/dev/null`
3. Configurar git remote con el token de GitHub:
   `git remote set-url origin https://${GITHUB_TOKEN}@github.com/FindITCorp/logistic.git`
4. Si los tokens no existen localmente, pedirle al usuario el GitHub token y el Vercel token, guardarlos en `/root/.claude/.tokens`

## CUANDO EL USUARIO ESCRIBE "continuamos":
- Ya hiciste el paso anterior — confirmar contexto cargado y preguntar en qué seguimos

## REGLAS DE TRABAJO:
- Rama y deploy: siempre push a `main` → dispara deploy automático en Vercel vía GitHub Actions
- Nunca subir tokens a GitHub (push protection los bloquea)
- Actualizar `MEMORIA.md` al final de cada sesión con los cambios realizados
- Hacer commit + push de MEMORIA.md junto con cualquier cambio de código

## STACK:
Next.js 14 + next-intl + Tailwind CSS — repo: FindITCorp/logistic
