import { createHash, timingSafeEqual } from 'node:crypto'
import { createServer } from 'node:http'
import { readFile, realpath } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'
import { createCareerOpsMiddleware } from '../dev/career-runtime.mjs'

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
}

export async function createPrivateServer({ rootDir = process.cwd(), distDir = join(rootDir, 'dist-private'), origin, username, password, kernel, resumeSync } = {}) {
  const url = new URL(origin)
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (url.origin !== origin || (url.protocol !== 'https:' && !(loopback && url.protocol === 'http:'))) {
    throw new Error('APP_ORIGIN must be an HTTPS origin (HTTP is allowed only for loopback verification).')
  }
  if (!username || username.includes(':') || /[\r\n]/.test(username) || !password || password.length < 32) {
    throw new Error('Set an owner username and a random password of at least 32 characters.')
  }
  const digest = (value) => createHash('sha256').update(value).digest()
  const expected = digest(`${username}:${password}`)
  const buildRoot = await realpath(distDir)
  await readFile(join(buildRoot, 'index.html'))
  const trusted = new WeakSet()
  const career = createCareerOpsMiddleware({ rootDir, kernel, resumeSync, trustRequest: (request) => trusted.has(request) })
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    response.setHeader('Referrer-Policy', 'same-origin')
    const end = (status, message) => { response.statusCode = status; response.end(message) }
    try {
      if (request.headers.host !== url.host) return end(403, 'Unexpected host.')
      const auth = String(request.headers.authorization || '')
      const decoded = /^Basic [A-Za-z0-9+/]+=*$/i.test(auth) ? Buffer.from(auth.slice(6), 'base64').toString('utf8') : ''
      if (!timingSafeEqual(digest(decoded), expected)) {
        response.setHeader('WWW-Authenticate', 'Basic realm="Private Career-Ops", charset="UTF-8"')
        return end(401, 'Owner authentication required.')
      }
      if (request.headers['sec-fetch-site'] === 'cross-site' || (request.headers.origin && request.headers.origin !== origin)) {
        return end(403, 'Same-origin requests only.')
      }
      if (!['GET', 'HEAD', 'POST'].includes(request.method)) return end(405, 'Method not allowed.')
      if (request.method === 'POST' && request.headers.origin !== origin) return end(403, 'An explicit same-origin request is required.')
      const pathname = new URL(request.url, origin).pathname
      if (pathname.startsWith('/api/career/')) {
        trusted.add(request)
        request.url = pathname.slice('/api/career'.length)
        return await career(request, response)
      }
      if (request.method === 'POST') return end(404, 'Not found.')
      if (pathname === '/healthz') {
        response.setHeader('Content-Type', 'application/json')
        return end(200, JSON.stringify({ status: 'ok' }))
      }
      if (pathname === '/src/data/career-versions.local.json') {
        response.setHeader('Content-Type', 'application/json')
        let manifest = []
        try { manifest = JSON.parse(await readFile(join(rootDir, 'src/data/career-versions.local.json'), 'utf8')) } catch (error) { if (error.code !== 'ENOENT') throw error }
        return end(200, JSON.stringify(manifest))
      }
      const file = ['/', '/career', '/career/'].includes(pathname) ? 'index.html'
        : /^\/(?:assets|images)\//.test(pathname) ? decodeURIComponent(pathname.slice(1)) : ''
      if (!file) return end(404, 'Not found.')
      const candidate = resolve(buildRoot, file)
      if (!candidate.startsWith(`${buildRoot}${sep}`) || await realpath(candidate) !== candidate) return end(404, 'Not found.')
      const content = await readFile(candidate)
      response.setHeader('Content-Type', MIME[extname(file).toLowerCase()] || 'application/octet-stream')
      response.statusCode = 200
      response.end(request.method === 'HEAD' ? undefined : content)
    } catch (error) {
      if (response.headersSent) return response.destroy()
      end(error.code === 'ENOENT' ? 404 : 500, error.code === 'ENOENT' ? 'Not found.' : 'Private service request failed.')
    }
  })
}
