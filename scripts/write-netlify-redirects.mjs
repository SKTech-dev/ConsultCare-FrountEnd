import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Netlify redirects do not interpolate environment variables.
// Same-origin /api keeps session and CSRF cookies on the frontend host.
const value = process.env.BACKEND_ORIGIN
if (!value) throw new Error('Set BACKEND_ORIGIN to this environment\'s HTTPS backend origin.')
const origin = new URL(value)
if (
  origin.protocol !== 'https:' || origin.username || origin.password ||
  origin.pathname !== '/' || origin.search || origin.hash || /\s/.test(value)
) {
  throw new Error('BACKEND_ORIGIN must be an HTTPS origin without credentials, path, query, or fragment.')
}
if (process.env.VITE_API_BASE_URL && process.env.VITE_API_BASE_URL !== '/api') {
  throw new Error('Netlify deployments require VITE_API_BASE_URL=/api.')
}
writeFileSync(
  fileURLToPath(new URL('../dist/_redirects', import.meta.url)),
  `/api/* ${origin.origin}/api/:splat 200!\n/* /index.html 200\n`,
)
