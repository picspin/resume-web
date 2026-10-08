import { clone, createDocument, newId, ResumeStorageError, sanitizeDocument, sanitizeResume, validate } from './documents.js'

export { ResumeStorageError } from './documents.js'
export const RESUME_LIBRARY_STORAGE_KEY = 'resume.library.v1'

export function createResumeStorage(options = {}) {
  const key = options.key ?? RESUME_LIBRARY_STORAGE_KEY
  function backend() {
    try {
      const storage = Object.hasOwn(options, 'storage') ? options.storage : globalThis.localStorage
      if (!storage || typeof storage.getItem !== 'function' || typeof storage.setItem !== 'function') throw new Error('Storage unavailable')
      return storage
    } catch (cause) {
      throw new ResumeStorageError('unavailable', 'Local storage is unavailable.', { cause })
    }
  }
  function write(state) {
    try {
      backend().setItem(key, JSON.stringify(state))
    } catch (cause) {
      if (cause instanceof ResumeStorageError) throw cause
      const quota = cause?.name === 'QuotaExceededError' || cause?.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      throw new ResumeStorageError(quota ? 'quota' : 'unavailable', quota ? 'Local storage is full.' : 'Could not save to local storage.', { cause })
    }
  }
  function read() {
    let raw
    try { raw = backend().getItem(key) } catch (cause) {
      if (cause instanceof ResumeStorageError) throw cause
      throw new ResumeStorageError('unavailable', 'Could not read local storage.', { cause })
    }
    if (raw === null) {
      const sample = createDocument({ mode: 'sample', language: options.language ?? 'en' })
      sample.revision = 1
      const initial = { schemaVersion: 1, documents: [sample], activeDocumentId: sample.id, versions: [], imports: {} }
      write(initial)
      return initial
    }
    try {
      const state = JSON.parse(raw)
      validate(state?.schemaVersion === 1 && Array.isArray(state.documents) && Array.isArray(state.versions), 'Invalid resume library.')
      state.documents = state.documents.map(sanitizeDocument)
      validate(new Set(state.documents.map((doc) => doc.id)).size === state.documents.length, 'Duplicate document IDs.')
      validate(state.activeDocumentId === null || state.documents.some((doc) => doc.id === state.activeDocumentId), 'Invalid active document.')
      state.versions = state.versions.map((version) => {
        validate(version && typeof version.id === 'string' && version.id.length > 0 && typeof version.label === 'string' && typeof version.createdAt === 'string' && typeof version.documentId === 'string', 'Invalid version.')
        validate(version.document?.id === version.documentId, 'Invalid version document.')
        return { id: version.id, label: version.label, createdAt: version.createdAt, documentId: version.documentId, document: sanitizeDocument(version.document) }
      })
      validate(new Set(state.versions.map((version) => version.id)).size === state.versions.length, 'Duplicate version IDs.')
      validate(state.imports && typeof state.imports === 'object' && !Array.isArray(state.imports), 'Invalid import registry.')
      validate(Object.entries(state.imports).every(([requestId, id]) => requestId.trim().length > 0 && typeof id === 'string' && id.length > 0), 'Invalid import registry entry.')
      return state
    } catch (cause) {
      if (cause instanceof ResumeStorageError) throw cause
      throw new ResumeStorageError('validation', 'Stored resume library is invalid.', { cause })
    }
  }
  const publicLibrary = (state) => clone({ documents: state.documents, activeDocumentId: state.activeDocumentId, versions: state.versions })
  function requireDocument(state, id) {
    const document = state.documents.find((item) => item.id === id)
    if (!document) throw new ResumeStorageError('not-found', 'Resume document not found.')
    return document
  }
  function add(state, document, { select = true } = {}) {
    document.revision = 1
    state.documents.push(document)
    if (select) state.activeDocumentId = document.id
    write(state)
    return clone(document)
  }
  // Each transaction re-reads storage and writes synchronously. Web Locks also
  // serialize cooperating browser tabs so revision checks cover cross-tab edits.
  function transaction(action) {
    return Promise.resolve().then(() => {
      if (globalThis.navigator?.locks?.request) return globalThis.navigator.locks.request(key, () => action())
      return action()
    })
  }
  return {
    loadLibrary: () => transaction(() => publicLibrary(read())),
    saveDocument: (document, { expectedRevision } = {}) => transaction(() => {
      const next = sanitizeDocument(document)
      validate(Number.isSafeInteger(expectedRevision) && expectedRevision >= 0, 'Expected revision is required.')
      const state = read()
      const index = state.documents.findIndex((item) => item.id === next.id)
      if (index < 0 && expectedRevision > 0) throw new ResumeStorageError('not-found', 'Resume document was deleted.')
      const revision = index < 0 ? 0 : state.documents[index].revision
      if (revision !== expectedRevision || next.revision !== expectedRevision) throw new ResumeStorageError('conflict', 'Resume has changed; reload before saving.')
      next.revision = revision + 1
      if (index < 0) state.documents.push(next)
      else state.documents[index] = next
      if (state.activeDocumentId === null || index < 0) state.activeDocumentId = next.id
      write(state)
      return clone(next)
    }),
    selectDocument: (id) => transaction(() => {
      const state = read()
      requireDocument(state, id)
      state.activeDocumentId = id
      write(state)
      return publicLibrary(state)
    }),
    deleteDocument: (id) => transaction(() => {
      const state = read()
      requireDocument(state, id)
      state.documents = state.documents.filter((document) => document.id !== id)
      if (state.activeDocumentId === id) state.activeDocumentId = state.documents[0]?.id ?? null
      write(state)
      return publicLibrary(state)
    }),
    saveVersion: (document, label) => transaction(() => {
      const snapshot = sanitizeDocument(document)
      validate(typeof label === 'string' && label.trim().length > 0, 'Version label is required.')
      const state = read()
      const saved = requireDocument(state, snapshot.id)
      if (snapshot.revision !== saved.revision) throw new ResumeStorageError('conflict', 'Resume has changed; reload before versioning.')
      const version = { id: newId(), documentId: snapshot.id, label: label.trim(), createdAt: new Date().toISOString(), document: snapshot }
      state.versions.push(version)
      write(state)
      return clone(version)
    }),
    restoreVersion: (versionId) => transaction(() => {
      const state = read()
      const version = state.versions.find((item) => item.id === versionId)
      if (!version) throw new ResumeStorageError('not-found', 'Resume version not found.')
      const restored = createDocument({ mode: 'duplicate', sourceDocument: version.document })
      restored.name = `${version.document.name} (${version.label})`
      restored.source = { kind: 'restored', documentId: version.documentId, versionId }
      return add(state, restored)
    }),
    importOptimizedResume: ({ sourceDocument, resume, requestId, name } = {}) => transaction(() => {
      validate(typeof requestId === 'string' && requestId.trim().length > 0, 'Import request ID is required.')
      const state = read()
      if (Object.hasOwn(state.imports, requestId)) return clone(requireDocument(state, state.imports[requestId]))
      const imported = createDocument({ mode: 'duplicate', sourceDocument })
      validate(resume !== null && typeof resume === 'object' && !Array.isArray(resume), 'Resume must be an object.')
      // Workflow output may omit presentation and untargeted sections. Explicit
      // empty strings/arrays still clear fields, while omitted fields survive.
      imported.resume = sanitizeResume({
        ...imported.resume,
        ...resume,
        general: { ...imported.resume.general, ...resume.general },
        sectionTitles: { ...imported.resume.sectionTitles, ...resume.sectionTitles },
      })
      imported.name = name ?? `${sourceDocument.name} (optimized)`
      validate(typeof imported.name === 'string' && imported.name.trim().length > 0, 'Document name is required.')
      imported.name = imported.name.trim()
      imported.source = { kind: 'optimized', documentId: sourceDocument.id, requestId }
      Object.defineProperty(state.imports, requestId, { value: imported.id, enumerable: true, writable: true, configurable: true })
      return add(state, imported, { select: false })
    }),
  }
}

const defaultStorage = createResumeStorage()
export const { loadLibrary, saveDocument, selectDocument, deleteDocument, saveVersion, restoreVersion, importOptimizedResume } = defaultStorage
