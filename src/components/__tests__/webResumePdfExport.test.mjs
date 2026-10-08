import test from 'node:test'
import assert from 'node:assert/strict'
import { exportWebResumePdf } from '../webResumePdfExport.js'

test('exportWebResumePdf prints the current web resume instead of downloading a static PDF', () => {
  const calls = []
  const doc = {
    title: 'Original title',
    createElement() {
      calls.push('createElement')
      return {}
    },
  }
  const win = {
    print() {
      calls.push('print')
    },
  }

  const exported = exportWebResumePdf({ win, doc, title: 'Xiaolei Zhu - Web Resume' })

  assert.equal(exported, true)
  assert.deepEqual(calls, ['print'])
  assert.equal(doc.title, 'Original title')
})

test('exportWebResumePdf returns false when browser printing is unavailable', () => {
  assert.equal(exportWebResumePdf({ win: {}, doc: { title: 'Resume' } }), false)
})
