// Identifica a cada visitante sin necesidad de cuentas ni login. Se guarda en
// localStorage para que sea estable entre visitas, pero no identifica a la
// persona real de ninguna forma.
export function obtenerAutorAnonId(): string {
  if (typeof window === "undefined") return "servidor";

  const clave = "pizarra_autor_id";
  let id = localStorage.getItem(clave);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(clave, id);
  }
  return id;
}
