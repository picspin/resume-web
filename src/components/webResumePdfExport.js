export function exportWebResumePdf({
  win = globalThis.window,
  doc = globalThis.document,
  title = 'Web Resume',
} = {}) {
  if (!win || typeof win.print !== 'function') {
    return false
  }

  const previousTitle = doc?.title

  if (doc && typeof title === 'string' && title.trim()) {
    doc.title = title.trim()
  }

  try {
    win.print()
    return true
  } finally {
    if (doc && typeof previousTitle === 'string') {
      doc.title = previousTitle
    }
  }
}
