import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const compiled = await build({ entryPoints: ['src/components/ResumeSyncDialog.jsx'], bundle: true, write: false, format: 'esm', platform: 'node', jsx: 'automatic', external: ['react', 'react/jsx-runtime'], logLevel: 'silent' })
// Resolve React from this workspace while keeping the test bundle entirely in memory.
const source = compiled.outputFiles[0].text.replace(/from "react"/g, `from "${import.meta.resolve('react')}"`).replace(/from "react\/jsx-runtime"/g, `from "${import.meta.resolve('react/jsx-runtime')}"`)
const { default: ResumeSyncDialog } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

function nodes(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => nodes(child, predicate))
  if (!node || typeof node !== 'object') return []
  return [...(predicate(node) ? [node] : []), ...nodes(node.props?.children, predicate)]
}
function text(node) {
  if (Array.isArray(node)) return node.map(text).join('')
  return typeof node === 'string' ? node : text(node?.props?.children || [])
}
function harness(props) {
  const component = ResumeSyncDialog(props).type
  const hooks = []
  const effects = []
  const dispatcher = React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher
  return {
    props,
    render() {
      let index = 0
      const previous = dispatcher.current
      dispatcher.current = {
        useState(initial) {
          const slot = index++
          if (!(slot in hooks)) hooks[slot] = typeof initial === 'function' ? initial() : initial
          return [hooks[slot], (value) => { hooks[slot] = typeof value === 'function' ? value(hooks[slot]) : value }]
        },
        useRef(value) { const slot = index++; return hooks[slot] ||= { current: value } },
        useId() { return `sync-${index++}` },
        useEffect(effect, deps) {
          const slot = index++
          if (!hooks[slot] || deps.some((value, i) => value !== hooks[slot].deps[i])) {
            const old = hooks[slot]
            hooks[slot] = { deps }
            effects.push(() => { old?.cleanup?.(); hooks[slot].cleanup = effect() })
          }
        },
      }
      try { return component(props) } finally { dispatcher.current = previous }
    },
    flush() { while (effects.length) effects.shift()() },
    cleanup() { hooks.forEach((hook) => hook?.cleanup?.()) },
  }
}
const sample = { id: 'sample', name: 'Sample', resume: { skills: ['React'] }, source: { kind: 'personal-sample', sampleId: 'xiaolei' } }
const button = (tree, label) => nodes(tree, (node) => node.type === 'button' && text(node) === label)[0]
const input = (tree, value) => nodes(tree, (node) => node.type === 'input' && node.props.value === value)[0]
const tick = () => new Promise((resolve) => setImmediate(resolve))

test('closed dialog renders nothing; only the explicit personal sample defaults its repository', () => {
  assert.equal(ResumeSyncDialog({ open: false }), null)
  for (const [document, expected] of [[sample, 'picspin/meinCV'], [{ ...sample, source: { kind: 'duplicate' } }, ''], [{ ...sample, source: undefined }, '']]) {
    const view = harness({ open: true, document })
    const tree = view.render()
    assert.ok(input(tree, expected))
    assert.equal(tree.type, 'dialog')
    assert.equal(tree.props['aria-modal'], 'true')
    assert.match(tree.props.className, /w-\[calc\(100%_-_2rem\)\]/)
    assert.equal(button(tree, 'Publish').props.disabled, true)
  }
})

test('preview and publish use exact frozen payload; target and snapshot changes invalidate confirmation', async (t) => {
  const calls = []
  const html = '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"></head><body><h1>Visible candidate</h1></body></html>'
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const payload = options.body && JSON.parse(options.body)
    calls.push({ url, payload })
    return { ok: true, json: async () => url.endsWith('/status') ? { authenticated: true, login: 'picspin' } : url.endsWith('/preview') ? { html, confirmationToken: 'opaque', target: payload.target, repositoryVisibility: 'public', changedPaths: ['resumes/sample/resume.json', 'resumes/sample/index.html'] } : { commit: 'abc' } }
  })
  const synced = []
  const view = harness({ open: true, document: sample, onSynced: (result) => synced.push(result) })
  view.render(); view.flush(); await tick()
  await button(view.render(), 'Preview changes').props.onClick()
  let tree = view.render()
  assert.match(text(tree), /picspin\/meinCV.*main.*public.*resumes\/sample\/resume.json/)
  assert.match(text(tree), /GitHub connected as picspin/)
  assert.match(text(tree), /selected resume, photos, and contact details will be publicly accessible/)
  assert.doesNotMatch(text(tree), /hidden sections/i)
  assert.equal(button(tree, 'Publish').props.disabled, false)
  const frame = nodes(tree, (node) => node.type === 'iframe')[0]
  assert.equal(frame.props.srcDoc, html)
  assert.equal(frame.props.sandbox, '')
  assert.equal(frame.props.referrerPolicy, 'no-referrer')
  assert.equal(frame.props.title, 'Exact resume publication preview')
  assert.match(frame.props.className, /w-full/)
  const markup = renderToStaticMarkup(frame)
  assert.match(markup, /<iframe[^>]*sandbox=""/)
  assert.match(markup, /srcDoc="&lt;!doctype html&gt;/)
  assert.match(markup, /Visible candidate/)
  input(tree, 'main').props.onChange({ target: { value: 'draft' } })
  tree = view.render()
  assert.equal(button(tree, 'Publish').props.disabled, true)
  assert.equal(nodes(tree, (node) => node.type === 'iframe').length, 0)
  view.flush()
  await button(view.render(), 'Preview changes').props.onClick()
  view.props.document = { ...sample, theme: 'nord' }
  assert.equal(button(view.render(), 'Publish').props.disabled, true)
  assert.equal(nodes(view.render(), (node) => node.type === 'iframe').length, 0)
  view.flush()
  await button(view.render(), 'Preview changes').props.onClick()
  await button(view.render(), 'Publish').props.onClick()
  assert.deepEqual(calls.at(-1).payload, { document: view.props.document, target: { repository: 'picspin/meinCV', branch: 'draft', createNew: false, visibility: 'private' }, confirmationToken: 'opaque' })
  assert.deepEqual(synced, [{ commit: 'abc' }])
  assert.equal(button(view.render(), 'Publish').props.disabled, true)
  view.cleanup()
})

test('new repositories default private; errors and malformed previews fail closed', async (t) => {
  let response = { ok: true, json: async () => ({ authenticated: true }) }
  t.mock.method(globalThis, 'fetch', async () => response)
  const view = harness({ open: true, document: sample })
  view.render(); view.flush(); await tick()
  const radios = nodes(view.render(), (node) => node.type === 'input' && node.props.type === 'radio')
  radios[1].props.onChange()
  let tree = view.render(); view.flush()
  assert.equal(nodes(tree, (node) => node.type === 'input' && node.props.type === 'radio')[2].props.checked, true)
  response = { ok: true, json: async () => ({ confirmationToken: 'invalid' }) }
  await button(view.render(), 'Preview changes').props.onClick()
  assert.match(text(view.render()), /incomplete preview/)
  for (const html of [undefined, '', '   ']) {
    response = { ok: true, json: async () => ({ html, confirmationToken: 'opaque', target: { repository: 'picspin/meinCV', branch: 'main' }, repositoryVisibility: 'private', changedPaths: ['resume.json'] }) }
    await button(view.render(), 'Preview changes').props.onClick()
    assert.match(text(view.render()), /incomplete preview/)
    assert.equal(button(view.render(), 'Publish').props.disabled, true)
    assert.equal(nodes(view.render(), (node) => node.type === 'iframe').length, 0)
  }
  response = { ok: false, status: 409 }
  await button(view.render(), 'Preview changes').props.onClick()
  tree = view.render()
  assert.match(text(tree), /destination changed/)
  assert.equal(button(tree, 'Publish').props.disabled, true)
  view.cleanup()
})

test('late preview responses are ignored after snapshot changes and duplicate requests are blocked', async (t) => {
  let resolvePreview
  let count = 0
  t.mock.method(globalThis, 'fetch', async (url) => {
    if (url.endsWith('/status')) return { ok: true, json: async () => ({ authenticated: true }) }
    count++
    return new Promise((resolve) => { resolvePreview = resolve })
  })
  const view = harness({ open: true, document: sample })
  view.render(); view.flush(); await tick()
  const action = button(view.render(), 'Preview changes').props.onClick
  const pending = action()
  await action()
  assert.equal(count, 1)
  view.props.document = { ...sample, name: 'Edited' }
  view.render(); view.flush()
  resolvePreview({ ok: true, json: async () => ({ confirmationToken: 'old', target: { repository: 'picspin/meinCV', branch: 'main', visibility: 'private' }, changedPaths: ['old.json'] }) })
  await pending
  assert.equal(button(view.render(), 'Publish').props.disabled, true)
  assert.doesNotMatch(text(view.render()), /old.json/)
  view.cleanup()
})
