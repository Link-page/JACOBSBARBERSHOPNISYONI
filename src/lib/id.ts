// crypto.randomUUID is unavailable on plain-http LAN previews, so fall back.
export const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
