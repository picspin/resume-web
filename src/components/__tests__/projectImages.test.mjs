import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProjectImage, buildProjectImageCandidates, FALLBACK_PROJECT_IMAGE, safeImageUrl, safeLink, readResumeImage } from '../projectImages.js'

const availableImages = new Set([
  '/images/projects/project-1.jpg',
  '/images/projects/project-2.png',
  '/images/projects/project-14.JPG',
  '/images/projects/project-24.jpg',
  '/images/projects/fallback.jpg',
])

test('resolveProjectImage ignores legacy placeholder paths and uses project number assets', () => {
  assert.equal(
    resolveProjectImage({ projectNumber: 2, image: '/images/projects/image2.png' }, 1, availableImages),
    '/images/projects/project-2.png',
  )
})

test('resolveProjectImage keeps explicit images when the asset exists', () => {
  assert.equal(
    resolveProjectImage({ projectNumber: 24, image: '/images/projects/project-24.jpg' }, 0, availableImages),
    '/images/projects/project-24.jpg',
  )
})

test('resolveProjectImage falls back to project number when explicit image is missing', () => {
  assert.equal(
    resolveProjectImage({ projectNumber: 1, image: '/images/projects/missing.png' }, 0, availableImages),
    '/images/projects/project-1.jpg',
  )
})

test('resolveProjectImage supports uppercase project image extensions', () => {
  assert.equal(
    resolveProjectImage({ projectNumber: 14 }, 13, availableImages),
    '/images/projects/project-14.JPG',
  )
})

test('new and blank projects never borrow numbered personal project photos', () => {
  assert.deepEqual(buildProjectImageCandidates({}, 0), [FALLBACK_PROJECT_IMAGE])
  assert.deepEqual(buildProjectImageCandidates({ image: '' }, 14), [FALLBACK_PROJECT_IMAGE])
})

test('image and link sources reject active content and unsafe URL schemes', () => {
  for (const value of ['javascript:alert(1)', 'data:image/svg+xml,<svg/>', '//example.com/a.png', 'http://example.com/a.png', '/images/../secret']) assert.equal(safeImageUrl(value), '')
  assert.equal(safeImageUrl('https://example.com/image.png'), 'https://example.com/image.png')
  assert.equal(safeImageUrl('/images/Avatar.jpg'), '/images/Avatar.jpg')
  assert.equal(safeLink('javascript:alert(1)'), undefined)
})

test('image uploads reject unsupported types and oversized payloads before reading', async () => {
  await assert.rejects(readResumeImage({ type: 'image/svg+xml', size: 10 }), /PNG/)
  await assert.rejects(readResumeImage({ type: 'image/png', size: 3 * 1024 * 1024 }), /2 MB/)
})
