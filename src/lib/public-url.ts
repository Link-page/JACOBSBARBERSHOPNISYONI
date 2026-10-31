/**
 * URL for a file in /public, e.g. publicUrl('lookbook/skin-fade.jpg').
 * Prefixes the deploy base so it resolves under the GitHub Pages subpath too.
 */
export const publicUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`
