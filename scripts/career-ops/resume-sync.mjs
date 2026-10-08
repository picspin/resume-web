import { spawn } from 'node:child_process'
import { createHash, randomBytes } from 'node:crypto'
import { open, readdir, realpath } from 'node:fs/promises'
import path from 'node:path'

const SECTIONS = ['summary', 'education', 'work', 'skills', 'certificates', 'projects', 'publications', 'posters', 'patents']
const TITLES = ['Summary', 'Education', 'Work Experience', 'Skills', 'Certificate & Reputation', 'Projects & Achievements', 'Publications', 'Poster & Presentation', 'Patents']
const DEFAULT_TARGET = { repository: 'picspin/meinCV', branch: 'main', createNew: false, visibility: 'private' }
const MAX_IMAGE_BYTES = 12_000_000
const MAX_IMAGE_TOTAL = 48_000_000
export const MAX_RESUME_SYNC_REQUEST_BYTES = 70_000_000
const TOKEN_TTL = 10 * 60 * 1000
const SECTION_FIELDS = {
  education: ['degree', 'major', 'institution', 'date', 'year'],
  work: ['title', 'company', 'location', 'date', 'details'],
  projects: ['title', 'description', 'image', 'url', 'link', 'projectNumber'],
  certificates: ['title', 'organization', 'date'],
  publications: ['type', 'title', 'authors', 'journal', 'link', 'html'],
  posters: ['title', 'authors', 'event', 'conference', 'date', 'link'],
  patents: ['title', 'authors', 'link'],
}

export class ResumeSyncError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.name = 'ResumeSyncError'
    this.statusCode = statusCode
  }
}

const fail = (message, status = 400) => { throw new ResumeSyncError(message, status) }
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const sha256 = (value) => createHash('sha256').update(value).digest('hex')
const blobSha = (content) => createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex')
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const rich = (value) => escape(value).replace(/&lt;(\/?(?:b|strong|em|i|u|br))\s*\/?&gt;/gi, '<$1>')

function canonical(value, depth = 0) {
  if (depth > 30) fail('Resume document is too deeply nested.')
  if (Array.isArray(value)) return value.map((item) => canonical(item, depth + 1))
  if (isObject(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) fail('Resume document contains an unsupported key.')
      return [key, canonical(value[key], depth + 1)]
    }))
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value
  fail('Resume document must contain JSON values only.')
}

export function validateResumeSyncRequest(payload) {
  if (!isObject(payload) || !isObject(payload.document) || !isObject(payload.document.resume)) fail('A resume document is required.')
  const document = canonical(payload.document)
  if (Buffer.byteLength(JSON.stringify(document)) > 68_000_000) fail('Resume document is too large.', 413)
  if (typeof document.id !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(document.id)) fail('Invalid resume document ID.')
  if (typeof document.name !== 'string' || !document.name.trim() || document.name.length > 200) fail('A resume name of at most 200 characters is required.')
  if (document.theme !== undefined && !['default', 'github', 'nord', 'monokai'].includes(document.theme)) fail('Unsupported resume theme.')
  for (const titles of [document.sectionTitles, document.resume.sectionTitles]) {
    if (titles !== undefined && (!isObject(titles) || Object.entries(titles).some(([key, value]) => !['general', ...SECTIONS].includes(key) || typeof value !== 'string' || value.length > 200))) fail('Invalid section titles.')
  }
  for (const field of ['sectionOrder', 'hiddenSections']) {
    if (document[field] !== undefined && (!Array.isArray(document[field]) || document[field].some((key) => !SECTIONS.includes(key)) || new Set(document[field]).size !== document[field].length)) fail(`Invalid ${field}.`)
  }
  for (const key of SECTIONS.filter((key) => key !== 'summary')) {
    if (document.resume[key] !== undefined && (!Array.isArray(document.resume[key]) || document.resume[key].length > 500)) fail('Invalid resume section.')
    for (const item of document.resume[key] || []) {
      if (key === 'skills' ? typeof item !== 'string' : !isObject(item)) fail('Invalid resume section entry.')
      if (key === 'work' && item.details !== undefined && (!Array.isArray(item.details) || item.details.some((detail) => typeof detail !== 'string'))) fail('Invalid work details.')
      for (const field of SECTION_FIELDS[key] || []) {
        if (field !== 'details' && field !== 'projectNumber' && item[field] !== undefined && item[field] !== null && typeof item[field] !== 'string') fail('Resume presentation fields must contain text.')
      }
    }
  }
  if (document.resume.general !== undefined && !isObject(document.resume.general)) fail('Invalid resume contact information.')
  for (const field of ['name', 'headline', 'location', 'address', 'email_work', 'email_private', 'tel', 'photo']) {
    const value = document.resume.general?.[field]
    if (value !== undefined && value !== null && typeof value !== 'string') fail('Invalid resume contact field.')
  }
  for (const field of ['summary', 'banner']) {
    if (document.resume[field] !== undefined && document.resume[field] !== null && typeof document.resume[field] !== 'string') fail('Invalid resume header field.')
  }
  if (payload.target !== undefined && !isObject(payload.target)) fail('Invalid publication target.')
  const personalSample = document.source?.kind === 'personal-sample' && document.source?.sampleId === 'xiaolei'
  if (!payload.target?.repository && !personalSample) fail('Choose an explicit repository for this document.')
  const target = canonical({ ...DEFAULT_TARGET, ...payload.target })
  if (Object.keys(target).some((key) => !Object.hasOwn(DEFAULT_TARGET, key))) fail('Unsupported publication target field.')
  if (typeof target.repository !== 'string' || !/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/[A-Za-z0-9][A-Za-z0-9_.-]{0,99}$/.test(target.repository) || target.repository.endsWith('.git')) fail('Use a valid owner/repository name.')
  if (typeof target.branch !== 'string' || target.branch.length > 150 || !/^[A-Za-z0-9][A-Za-z0-9_./-]*$/.test(target.branch) || target.branch.includes('..') || target.branch.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.') || part.endsWith('.lock'))) fail('Invalid branch name.')
  if (typeof target.createNew !== 'boolean' || !['private', 'public'].includes(target.visibility)) fail('Choose private or public repository visibility.')
  return { document, target }
}

function presentationDocument(document) {
  const pick = (value, fields) => Object.fromEntries(fields.filter((key) => value?.[key] !== undefined).map((key) => [key, value[key]]))
  const exported = pick(document, ['id', 'name', 'theme', 'language', 'sectionOrder', 'sectionTitles', 'hiddenSections'])
  exported.resume = pick(document.resume, ['summary', 'banner', 'sectionTitles'])
  for (const value of [exported, exported.resume]) {
    if (value.sectionTitles) value.sectionTitles = Object.fromEntries(Object.entries(value.sectionTitles).filter(([key]) => !document.hiddenSections?.includes(key)))
  }
  if (document.hiddenSections?.includes('summary')) exported.resume.summary = ''
  exported.resume.general = pick(document.resume.general, ['name', 'headline', 'location', 'address', 'email_work', 'email_private', 'tel', 'photo'])
  for (const key of SECTIONS.filter((key) => key !== 'summary')) {
    exported.resume[key] = document.hiddenSections?.includes(key) ? [] : (document.resume[key] || []).map((item) => key === 'skills' ? item : pick(item, SECTION_FIELDS[key]))
  }
  return exported
}

// This is the only process boundary; JSON bodies go over stdin, never shell arguments.
export function execGitHub(args, { input } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn('gh', args, { stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, GH_PROMPT_DISABLED: '1', GH_PAGER: 'cat' } })
    const stdout = []
    const stderr = []
    let bytes = 0
    let overflow = false
    const timer = setTimeout(() => child.kill('SIGKILL'), 30_000)
    const collect = (chunks) => (chunk) => {
      bytes += chunk.length
      if (bytes > 12_000_000) { overflow = true; child.kill('SIGKILL'); return }
      chunks.push(chunk)
    }
    child.stdout.on('data', collect(stdout))
    child.stderr.on('data', collect(stderr))
    child.stdin.on('error', () => {})
    child.on('error', (error) => { clearTimeout(timer); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0 || overflow) {
        const error = new Error('GitHub command failed.')
        error.httpStatus = Number(Buffer.concat(stderr).toString().match(/\(HTTP (\d{3})\)/)?.[1]) || undefined
        reject(error)
      } else resolve({ stdout: Buffer.concat(stdout).toString('utf8') })
    })
    child.stdin.end(input || '')
  })
}

function imageMime(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png'
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg'
  if (['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) return 'image/gif'
  if (bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP') return 'image/webp'
  return null
}

async function imageLoader(rootDir) {
  const directory = path.join(await realpath(rootDir), 'public/images')
  const allowed = new Map()
  async function walk(folder) {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      const filename = path.join(folder, entry.name)
      if (entry.isDirectory()) await walk(filename)
      else if (entry.isFile() && /\.(png|jpe?g|gif|webp)$/i.test(entry.name)) allowed.set(`/images/${path.relative(directory, filename).split(path.sep).join('/')}`, filename)
    }
  }
  try {
    const resolved = await realpath(directory)
    if (resolved !== directory) fail('Public images directory must not be a symbolic link.')
    await walk(directory)
  } catch (error) { if (error.code !== 'ENOENT') throw error }
  let total = 0
  const cache = new Map()
  const load = async (source) => {
    if (!source) return ''
    if (cache.has(source)) return cache.get(source)
    let bytes
    if (typeof source !== 'string') fail('Invalid resume image.')
    if (source.startsWith('data:')) {
      const match = source.match(/^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/)
      if (!match || match[2].length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) fail('Only bounded base64 PNG, JPEG, GIF, and WebP images are supported.')
      bytes = Buffer.from(match[2], 'base64')
      if (bytes.toString('base64') !== match[2] || imageMime(bytes) !== `image/${match[1]}`) fail('Invalid image content.')
    } else {
      const filename = allowed.get(source)
      if (!filename) fail('Images must be whitelisted public images or supported data images.')
      const resolved = await realpath(filename)
      if (resolved !== filename || !resolved.startsWith(`${directory}${path.sep}`)) fail('Image path is not allowed.')
      const file = await open(resolved, 'r')
      try {
        if ((await file.stat()).size > MAX_IMAGE_BYTES) fail('Resume image exceeds the 12 MB limit.', 413)
        const buffer = Buffer.alloc(MAX_IMAGE_BYTES + 1)
        const result = await file.read(buffer, 0, buffer.length, 0)
        bytes = buffer.subarray(0, result.bytesRead)
      } finally { await file.close() }
    }
    total += bytes.length
    const mime = imageMime(bytes)
    if (!mime) fail('Unsupported image content.')
    if (bytes.length > MAX_IMAGE_BYTES || total > MAX_IMAGE_TOTAL) fail('Resume images exceed the export size limit.', 413)
    const data = `data:${mime};base64,${bytes.toString('base64')}`
    cache.set(source, data)
    return data
  }
  load.has = (source) => allowed.has(source)
  return load
}

async function bundleDocumentImages(document, rootDir) {
  const load = await imageLoader(rootDir)
  const general = document.resume.general || {}
  if (general.photo) general.photo = await load(general.photo)
  if (document.resume.banner) document.resume.banner = await load(document.resume.banner)
  const legacy = new Set(['/images/projects/image.png', '/images/projects/image2.png', '/images/gihub.gif', '/images/github.gif'])
  for (const project of document.resume.projects || []) {
    let image = project.image
    if ((!image || legacy.has(image)) && Number.isSafeInteger(project.projectNumber) && project.projectNumber > 0) {
      image = ['jpg', 'png', 'gif', 'jpeg', 'webp', 'JPG', 'PNG', 'GIF', 'JPEG', 'WEBP'].map((ext) => `/images/projects/project-${project.projectNumber}.${ext}`).find(load.has) || ''
    }
    project.image = image ? await load(image) : ''
  }
  return document
}

function safeLink(value, label = 'Link') {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value)
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return ''
    return `<a href="${escape(url.href)}" rel="noopener noreferrer">${escape(label)}</a>`
  } catch { return '' }
}

export async function exportResumeHtml(document, { rootDir = process.cwd() } = {}) {
  const loadImage = await imageLoader(rootDir)
  const data = document.resume
  const general = data.general || {}
  const order = [...(document.sectionOrder || []), ...SECTIONS.filter((key) => !document.sectionOrder?.includes(key))]
  const blocks = []
  for (const key of order.filter((key) => !document.hiddenSections?.includes(key))) {
    const title = data.sectionTitles?.[key] || document.sectionTitles?.[key] || TITLES[SECTIONS.indexOf(key)]
    if (key === 'summary') {
      if (data.summary) blocks.push(`<section id="summary"><h2>${escape(title)}</h2><p>${rich(data.summary)}</p></section>`)
      continue
    }
    const items = data[key] || []
    if (!items.length) continue
    let content = ''
    if (key === 'education') {
      content = `<div class="table-wrap"><table><thead><tr>${['Degree', 'Major', 'Institution', 'Date', 'Year'].map((title) => `<th>${title}</th>`).join('')}</tr></thead><tbody>${items.map((item) => `<tr>${['degree', 'major', 'institution', 'date', 'year'].map((field) => `<td>${escape(item[field])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
    } else {
      for (const item of items) {
        if (key === 'skills') { content += `<p class="skill">${escape(item)}</p>`; continue }
        const image = key === 'projects' && item.image ? await loadImage(item.image) : ''
        content += `<article class="${key}">${image ? `<img src="${image}" alt="${escape(item.title)}" loading="lazy">` : ''}<div><h3>${escape(item.title)}</h3>${item.date ? `<p class="muted">${escape(item.date)}</p>` : ''}${[item.company, item.location, item.organization, item.authors, item.journal, item.event, item.conference].filter(Boolean).map((text) => `<p class="muted">${escape(text)}</p>`).join('')}${item.description ? `<p>${rich(item.description)}</p>` : ''}${item.html ? `<p>${rich(item.html)}</p>` : ''}${item.details ? `<ul>${item.details.map((detail) => `<li>${rich(detail)}</li>`).join('')}</ul>` : ''}${safeLink(item.link || item.url)}</div></article>`
      }
    }
    blocks.push(`<section id="${key}"><h2>${escape(title)}</h2>${content}</section>`)
  }
  const avatar = general.photo
  const avatarData = avatar ? await loadImage(avatar) : ''
  const bannerData = data.banner ? await loadImage(data.banner) : ''
  const theme = document.theme || 'default'
  return `<!doctype html><html lang="${document.language === 'zh' ? 'zh' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><meta name="referrer" content="no-referrer"><title>${escape(document.name)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f6f8fa;color:#24292f;font:15px/1.65 system-ui,sans-serif;letter-spacing:0}main{max-width:1040px;margin:auto;padding:48px 32px}header{padding:0 0 28px;border-bottom:2px solid #0969da}h1{font-size:32px;line-height:1.2;margin:0 0 18px}h2{font-size:20px;color:#0969da;border-bottom:1px solid #d0d7de;padding-bottom:10px}h3{font-size:17px;margin:0}p{margin:8px 0}section{margin-top:32px}article{padding:16px 0;border-bottom:1px solid #d0d7de}.work{border-left:4px solid #0969da;padding-left:16px;margin-bottom:16px}.skill{border-left:4px solid #1a7f37;padding:12px 16px;background:#fff}.muted{color:#57606a}.contact{display:flex;flex-wrap:wrap;gap:8px 24px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;text-align:left}td,th{padding:10px;border-bottom:1px solid #d0d7de}.projects{display:flex;gap:20px}.projects img{width:120px;height:90px;object-fit:contain}.avatar{width:100px;height:100px;object-fit:cover;float:right;border-radius:50%;margin:0 0 16px 20px}a{color:#0969da}li{margin-bottom:6px}p,li,h1,h2,h3,td,a{overflow-wrap:anywhere}body.nord{background:#eceff4;color:#2e3440}body.nord h2,body.nord a{color:#356c83}body.monokai{background:#272822;color:#f8f8f2}body.monokai .muted{color:#d0d0c5}body.monokai h2,body.monokai a{color:#a6e22e}body.monokai .skill{background:#34352f}@media(max-width:600px){main{padding:24px 16px}h1{font-size:26px}.projects{display:block}.projects img{width:100%;height:160px;margin-bottom:12px}.avatar{width:72px;height:72px}}@media print{body,body.monokai{background:white;color:black}main{max-width:none;padding:0}article{break-inside:avoid}h2,h3{break-after:avoid}.muted{color:#555}}
.banner{width:100%;max-height:260px;object-fit:cover;margin-bottom:24px}body{--resume-accent:#0969da;--resume-bg:#f6f8fa;--resume-text:#24292f;background:var(--resume-bg);color:var(--resume-text)}body.nord{--resume-accent:#356c83;--resume-bg:#eceff4;--resume-text:#2e3440}body.monokai{--resume-accent:#a6e22e;--resume-bg:#272822;--resume-text:#f8f8f2}h2,a{color:var(--resume-accent)}
body{--resume-surface:#fff;--resume-border:#e5e7eb;--resume-label:#dbeafe;--resume-label-text:#1d4ed8}body.github{--resume-bg:#fff}body.nord{--resume-surface:#eceff4;--resume-border:#d8dee9;--resume-label:#d8dee9;--resume-label-text:#2e3440}body.monokai{--resume-bg:#1f201b;--resume-surface:#272822;--resume-border:#49483e;--resume-label:#3e3d32;--resume-label-text:#a6e22e}header{border:0;text-align:center;margin-bottom:48px;display:flow-root}.banner{border-radius:8px}.avatar{float:none;display:block;width:128px;height:128px;margin:0 auto 20px;border:4px solid var(--resume-surface)}.contact{justify-content:center}.contact span{border:1px solid var(--resume-border);border-radius:6px;padding:8px 12px;background:var(--resume-surface)}section{position:relative;margin-top:48px;padding:28px 24px 24px;border:1px solid var(--resume-border);border-radius:8px;background:var(--resume-surface);box-shadow:0 4px 12px #00000008}section>h2{position:relative;display:table;max-width:100%;margin:-48px 0 20px;padding:7px 20px;border:0;border-radius:24px;background:var(--resume-label);color:var(--resume-label-text);box-shadow:0 3px 6px #0000000a}article:last-child{border-bottom:0}body.monokai article,body.monokai td,body.monokai th{border-color:var(--resume-border)}@media(max-width:600px){section{padding:24px 14px 16px}section>h2{font-size:18px;margin-top:-44px}.contact{display:grid}.avatar{width:96px;height:96px}}@media print{section{box-shadow:none}body{--resume-bg:#fff}}
</style></head><body class="${theme}"><main><header>${bannerData ? `<img class="banner" src="${bannerData}" alt="">` : ''}${avatarData ? `<img class="avatar" src="${avatarData}" alt="">` : ''}${data.sectionTitles?.general ? `<p>${escape(data.sectionTitles.general)}</p>` : ''}<h1>${escape(general.name || document.name)}</h1>${general.headline ? `<p>${escape(general.headline)}</p>` : ''}<div class="contact">${[general.location, general.address, general.email_work, general.email_private, general.tel].filter(Boolean).map((value) => `<span>${escape(value)}</span>`).join('')}</div></header>${blocks.join('')}</main></body></html>`
}

export function createResumeSyncService({ rootDir = process.cwd(), execGh = execGitHub, now = Date.now } = {}) {
  const previews = new Map()
  const sha = (value) => {
    if (typeof value !== 'string' || !/^[a-f0-9]{40}$/.test(value)) fail('GitHub returned an invalid object identifier.', 502)
    return value
  }
  async function api(endpoint, method = 'GET', body) {
    try {
      const args = ['api', '--hostname', 'github.com', '--method', method, endpoint]
      if (body !== undefined) args.push('--input', '-')
      const result = await execGh(args, { input: body === undefined ? undefined : JSON.stringify(body) })
      return JSON.parse(typeof result === 'string' ? result : result.stdout)
    } catch (error) {
      const status = error.httpStatus
      const safe = new ResumeSyncError(status === 404 ? 'GitHub repository or branch was not found or is inaccessible.' : status === 409 || status === 422 ? 'GitHub rejected the update. Preview again before publishing.' : 'GitHub request failed. Check local gh authentication and repository permissions.', status === 404 ? 404 : status === 409 || status === 422 ? 409 : 502)
      safe.githubStatus = status
      throw safe
    }
  }
  const repoPath = (target) => `repos/${target.repository}`
  const refPath = (target) => `${repoPath(target)}/git/ref/heads/${target.branch.split('/').map(encodeURIComponent).join('/')}`
  async function repository(target, allowAbsent = false) {
    try { return await api(repoPath(target)) } catch (error) { if (allowAbsent && error.githubStatus === 404) return null; throw error }
  }
  async function head(target) {
    const ref = await api(refPath(target))
    if (ref.ref !== `refs/heads/${target.branch}` || ref.object?.type !== 'commit') fail('GitHub returned an unexpected branch.', 502)
    return sha(ref.object.sha)
  }
  async function inspect(target, documentId) {
    const info = await repository(target, target.createNew)
    if (target.createNew) {
      if (info) fail('The new repository already exists. Choose an unused name or an existing-repository target.', 409)
      const user = await api('user')
      const owner = target.repository.split('/')[0]
      const ownerInfo = owner.toLowerCase() === String(user.login).toLowerCase() ? { type: 'User' } : await api(`users/${owner}`)
      if (ownerInfo.type !== 'Organization' && owner.toLowerCase() !== String(user.login).toLowerCase()) fail('Create a repository under your authenticated account or an organization you can manage.')
      return { headSha: null, treeSha: null, entries: [], rootEntries: [], visibility: target.visibility, createEndpoint: ownerInfo.type === 'Organization' ? `orgs/${owner}/repos` : 'user/repos' }
    }
    if (info.permissions?.push === false || info.archived || info.disabled) fail('The repository is not writable.', 403)
    const headSha = await head(target)
    const commit = await api(`${repoPath(target)}/git/commits/${headSha}`)
    const treeSha = sha(commit.tree?.sha)
    let cursor = treeSha
    let entries = []
    let rootEntries = []
    for (const part of ['resumes', documentId, null]) {
      const tree = await api(`${repoPath(target)}/git/trees/${cursor}`)
      if (tree.truncated || !Array.isArray(tree.tree)) fail('The repository tree cannot be safely inspected.', 409)
      if (part === 'resumes') rootEntries = tree.tree
      if (part === null) { entries = tree.tree; break }
      const entry = tree.tree.find((item) => item.path === part)
      if (!entry) break
      if (entry.type !== 'tree') fail('The resume namespace conflicts with an existing file.', 409)
      cursor = sha(entry.sha)
    }
    if (typeof info.private !== 'boolean') fail('GitHub did not report repository visibility.', 502)
    return { headSha, treeSha, entries, rootEntries, visibility: info.private ? 'private' : 'public' }
  }
  async function snapshot(payload) {
    const { document, target } = validateResumeSyncRequest(payload)
    const exported = await bundleDocumentImages(presentationDocument(document), rootDir)
    const html = await exportResumeHtml(exported, { rootDir })
    if (Buffer.byteLength(html) > 68_000_000 || Buffer.byteLength(JSON.stringify(exported)) > 68_000_000) fail('Resume export exceeds the size limit.', 413)
    const fingerprint = sha256(JSON.stringify({ document, target, html }))
    const namespace = `resumes/${document.id}`
    const files = {
      [`${namespace}/resume.json`]: `${JSON.stringify(exported, null, 2)}\n`,
      [`${namespace}/index.html`]: html,
      [`${namespace}/metadata.json`]: `${JSON.stringify({ schemaVersion: 1, documentId: document.id, name: document.name, theme: document.theme || 'github' }, null, 2)}\n`,
    }
    return { document, target, html, fingerprint, files }
  }
  function addEntryPage(content, remote) {
    if (!remote.rootEntries.some((entry) => entry.path === 'index.html')) {
      content.files['index.html'] = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Resume</title></head><body><main><h1>${escape(content.document.name)}</h1><a href="resumes/${content.document.id}/index.html">View resume</a></main></body></html>`
    }
  }
  function clearExpired() {
    for (const [token, record] of previews) if (record.expiresAt <= now()) previews.delete(token)
  }
  return {
    async status() {
      try {
        const user = await api('user')
        return { available: true, authenticated: true, canCreate: true, login: typeof user.login === 'string' ? user.login : '', defaultTarget: { ...DEFAULT_TARGET } }
      } catch {
        return { available: false, authenticated: false, canCreate: false, defaultTarget: { ...DEFAULT_TARGET }, message: 'GitHub CLI is unavailable or not authenticated. Sign in locally with gh auth login.' }
      }
    },
    async preview(payload) {
      const content = await snapshot(payload)
      const remote = await inspect(content.target, content.document.id)
      addEntryPage(content, remote)
      const changedPaths = Object.entries(content.files).filter(([filename, text]) => {
        const existing = (filename === 'index.html' ? remote.rootEntries : remote.entries).find((entry) => entry.path === path.posix.basename(filename))
        if (existing && (existing.type !== 'blob' || existing.mode !== '100644')) fail('An export path conflicts with a non-regular file.', 409)
        return !existing || existing.sha !== blobSha(text)
      }).map(([filename]) => filename)
      const confirmationToken = randomBytes(32).toString('hex')
      const expiresAt = now() + TOKEN_TTL
      clearExpired()
      while (previews.size >= 4) previews.delete(previews.keys().next().value)
      previews.set(confirmationToken, { fingerprint: content.fingerprint, remote, changedPaths, expiresAt })
      const warnings = []
      if (remote.visibility === 'public') warnings.push('This repository is public: the visible resume snapshot and contact details will be publicly readable.')
      warnings.push('Hidden sections and internal notes are omitted from the exported JSON and HTML.')
      if (content.target.createNew) warnings.push(`Publishing creates a ${content.target.visibility} repository initialized with a README before adding the resume snapshot.`)
      if (content.files['index.html']) warnings.push('A root index.html linking to this snapshot will be created because none exists. GitHub Pages is not enabled by this operation.')
      return { fingerprint: content.fingerprint, confirmationToken, expiresAt: new Date(expiresAt).toISOString(), target: content.target, changedPaths, html: content.html, headSha: remote.headSha, repositoryVisibility: remote.visibility, visibility: remote.visibility, warnings }
    },
    async publish(payload) {
      clearExpired()
      const record = previews.get(payload?.confirmationToken)
      if (!record) fail('Preview confirmation is missing or expired. Preview again.', 409)
      const content = await snapshot(payload)
      addEntryPage(content, record.remote)
      if (record.fingerprint !== content.fingerprint) fail('The document or target changed. Preview again.', 409)
      // Consume before the first await that can lead to remote writes; concurrent reuse fails.
      if (!previews.delete(payload.confirmationToken)) fail('Preview confirmation has already been used.', 409)
      let remote = record.remote
      if (content.target.createNew) {
        const checked = await inspect(content.target, content.document.id)
        if (checked.createEndpoint !== remote.createEndpoint) fail('GitHub account changed. Preview again.', 409)
        const created = await api(remote.createEndpoint, 'POST', { name: content.target.repository.split('/')[1], private: content.target.visibility === 'private', auto_init: true })
        if (created.private !== (content.target.visibility === 'private') || String(created.full_name).toLowerCase() !== content.target.repository.toLowerCase()) fail('GitHub did not confirm the expected repository and visibility.', 502)
        const initialBranch = created.default_branch
        validateResumeSyncRequest({ document: content.document, target: { ...content.target, branch: initialBranch } })
        const initialTarget = { ...content.target, branch: initialBranch, createNew: false }
        remote = await inspect(initialTarget, content.document.id)
        if (remote.visibility !== content.target.visibility || remote.rootEntries.some((entry) => entry.path !== 'README.md') || remote.entries.length) fail('The new repository was modified during creation. Preview it as an existing repository.', 409)
        if (initialBranch !== content.target.branch) {
          await api(`${repoPath(content.target)}/git/refs`, 'POST', { ref: `refs/heads/${content.target.branch}`, sha: remote.headSha })
        }
      } else {
        const current = await repository(content.target)
        if ((current.private ? 'private' : 'public') !== remote.visibility) fail('Repository visibility changed. Preview again.', 409)
        if (await head(content.target) !== remote.headSha) fail('The remote branch changed after preview. Preview again.', 409)
      }
      const base = repoPath(content.target)
      if (!record.changedPaths.length) return { repository: content.target.repository, branch: content.target.branch, commitSha: remote.headSha, changedPaths: [], url: `https://github.com/${content.target.repository}/tree/${remote.headSha}/resumes/${content.document.id}` }
      const tree = await api(`${base}/git/trees`, 'POST', { base_tree: remote.treeSha, tree: record.changedPaths.map((filename) => ({ path: filename, mode: '100644', type: 'blob', content: content.files[filename] })) })
      const commit = await api(`${base}/git/commits`, 'POST', { message: `Publish resume ${content.document.id}`, tree: sha(tree.sha), parents: [remote.headSha] })
      const commitSha = sha(commit.sha)
      if (await head(content.target) !== remote.headSha) fail('The remote branch changed during publishing. Preview again.', 409)
      await api(`${base}/git/refs/heads/${content.target.branch.split('/').map(encodeURIComponent).join('/')}`, 'PATCH', { sha: commitSha, force: false })
      return { repository: content.target.repository, branch: content.target.branch, commitSha, changedPaths: record.changedPaths, url: `https://github.com/${content.target.repository}/tree/${commitSha}/resumes/${content.document.id}` }
    },
  }
}
