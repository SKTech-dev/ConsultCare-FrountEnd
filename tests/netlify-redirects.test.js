import test from 'node:test'
import assert from 'node:assert/strict'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Run the actual deployment script in a disposable build directory.
function generate(t, backendOrigin, apiBase = '/api') {
  const root = mkdtempSync(join(tmpdir(), 'consultcare-netlify-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  mkdirSync(join(root, 'scripts'))
  mkdirSync(join(root, 'dist'))
  const script = join(root, 'scripts', 'write-netlify-redirects.mjs')
  copyFileSync(new URL('../scripts/write-netlify-redirects.mjs', import.meta.url), script)
  const env = { ...process.env, VITE_API_BASE_URL: apiBase }
  delete env.BACKEND_ORIGIN
  if (backendOrigin !== undefined) env.BACKEND_ORIGIN = backendOrigin
  const result = spawnSync(process.execPath, [script], { env, encoding: 'utf8' })
  if (result.error) throw result.error
  const output = join(root, 'dist', '_redirects')
  return { ...result, redirects: existsSync(output) ? readFileSync(output, 'utf8') : null }
}

test('Netlify routes each environment to its own backend before the SPA fallback', (t) => {
  for (const origin of ['https://dev.example.test', 'https://prod.example.test/']) {
    const result = generate(t, origin)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(result.redirects,
      `/api/* ${new URL(origin).origin}/api/:splat 200!\n/* /index.html 200\n`)
  }
})

test('Netlify rejects missing or invalid backend origins without publishing redirects', (t) => {
  for (const origin of [
    undefined, '', '****', 'api.example.test', 'http://api.example.test',
    'https://user:pass@api.example.test', 'https://api.example.test/api',
    'https://api.example.test?target=dev', 'https://api.example.test/#dev',
    ' https://api.example.test',
  ]) {
    const result = generate(t, origin)
    assert.notEqual(result.status, 0, `Accepted invalid origin: ${origin}`)
    assert.equal(result.redirects, null)
  }
})

test('Netlify rejects a browser API base that bypasses its same-origin proxy', (t) => {
  const result = generate(t, 'https://api.example.test', 'https://other.example.test/api')
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /VITE_API_BASE_URL=\/api/)
  assert.equal(result.redirects, null)
})
