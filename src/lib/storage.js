// localStorage puede fallar (modo privado, permisos), así que siempre con try/catch.
export function load(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : JSON.parse(v)
  } catch {
    return fallback
  }
}

export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin almacenamiento disponible: seguimos sin guardar.
  }
}
