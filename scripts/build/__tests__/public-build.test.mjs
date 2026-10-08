import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, realpath } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { build, resolveConfig } from 'vite'
import { PUBLIC_SAMPLE_ASSETS, publicBuildPlugin } from '../public-build.mjs'
import { safeImageUrl, buildProjectImageCandidates } from '../../../src/components/projectImages.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))

test('production config closes automatic public copying and source maps; base is overridable', async () => {
  const config = await resolveConfig({ root, logLevel: 'silent' }, 'build')
  assert.equal(config.publicDir, '')
  assert.equal(config.build.sourcemap, false)
  assert.equal(config.build.emptyOutDir, true)
  assert.equal(config.base, process.env.VITE_BASE_PATH || '/resume-web/')
  const local = await resolveConfig({ root, logLevel: 'silent' }, 'serve')
  assert.equal(local.base, process.env.VITE_BASE_PATH || '/')
  const preview = await resolveConfig({ root, logLevel: 'silent' }, 'serve', 'production', 'production', true)
  assert.equal(preview.base, config.base)
  const custom = await resolveConfig({ root, base: '/', logLevel: 'silent' }, 'build')
  assert.equal(custom.base, '/')
})

test('public build emits only approved images and never reads private manifest contents', async t => {
  const fixture = await realpath(await mkdtemp(path.join(os.tmpdir(), 'public-build-')))
  t.after(() => rm(fixture, { recursive: true, force: true }))
  for (const asset of PUBLIC_SAMPLE_ASSETS) {
    const target = path.join(fixture, 'public', asset)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, 'sample image')
  }
  for (const privateFile of ['generated-resumes/private.pdf', 'generated-resumes/sample.pdf', 'images/projects/private.png', 'private-manifest.json', 'debug.js.map']) {
    const target = path.join(fixture, 'public', privateFile)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, 'PRIVATE_SENTINEL')
  }
  await mkdir(path.join(fixture, 'src/data'), { recursive: true })
  const manifest = path.join(fixture, 'src/data/resume-versions.json')
  await writeFile(manifest, 'PRIVATE_SENTINEL deliberately invalid JSON')
  await writeFile(path.join(fixture, 'index.html'), '<script type="module" src="/src/main.js"></script>')
  await writeFile(path.join(fixture, 'src/main.js'), 'import versions from "./data/resume-versions.json"; console.log(versions)')
  await mkdir(path.join(fixture, 'dist/generated-resumes'), { recursive: true })
  await writeFile(path.join(fixture, 'dist/generated-resumes/stale.pdf'), 'PRIVATE_SENTINEL')
  await build({ root: fixture, configFile: false, publicDir: false, logLevel: 'silent', plugins: [publicBuildPlugin()], build: { sourcemap: false, emptyOutDir: true } })
  const files = (await readdir(path.join(fixture, 'dist'), { recursive: true, withFileTypes: true })).filter(entry => entry.isFile())
  const emitted = files.map(entry => path.relative(path.join(fixture, 'dist'), path.join(entry.parentPath, entry.name)))
  for (const asset of PUBLIC_SAMPLE_ASSETS) assert.ok(emitted.includes(asset), asset)
  for (const file of emitted) {
    assert.ok(PUBLIC_SAMPLE_ASSETS.includes(file) || file === 'index.html' || /^assets\/index-[\w-]+\.js$/.test(file), file)
    assert.doesNotMatch(await readFile(path.join(fixture, 'dist', file), 'utf8'), /PRIVATE_SENTINEL/)
  }
  assert.equal(await readFile(manifest, 'utf8'), 'PRIVATE_SENTINEL deliberately invalid JSON')
  const assetPath = path.join(fixture, 'public', PUBLIC_SAMPLE_ASSETS[0])
  await rm(assetPath)
  await symlink(manifest, assetPath)
  await assert.rejects(build({ root: fixture, configFile: false, publicDir: false, logLevel: 'silent', plugins: [publicBuildPlugin()] }), /Public asset symlink/)
})

test('sample images respect repository, local, and meinCV base paths', () => {
  for (const base of ['/resume-web/', '/', '/meinCV/']) {
    assert.equal(safeImageUrl('/images/Avatar.jpg', base), `${base}images/Avatar.jpg`)
    assert.equal(buildProjectImageCandidates({ projectNumber: 1 }, base)[0], `${base}images/projects/project-1.jpg`)
    assert.equal(safeImageUrl('https://example.com/a.png', base), 'https://example.com/a.png')
  }
})
