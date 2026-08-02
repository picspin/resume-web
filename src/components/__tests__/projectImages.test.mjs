import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveProjectImage } from '../projectImages.js'

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
