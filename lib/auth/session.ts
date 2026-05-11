// Demo auth para Fase 1 — sin base de datos
// Credenciales de acceso al dashboard de operador
export const DEMO_CREDENTIALS = {
  email: "operador@findit.com",
  password: "findit2026",
};

export const SESSION_COOKIE = "findit_session";
export const SESSION_VALUE = "demo_authenticated";

export function isValidCredentials(email: string, password: string): boolean {
  return (
    email === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password
  );
}
