import { lstat, readFile } from 'node:fs/promises'
import path from 'node:path'
import { realpathSync } from 'node:fs'

// Explicit review boundary: new public files are not published automatically.
export const PUBLIC_SAMPLE_ASSETS = Object.freeze([
  'images/Avatar.jpg', 'images/banner.jpeg', 'images/favicon.ico', 'images/awards/image.png',
  ...[
    'fallback.svg', 'project-1.jpg', 'project-2.png', 'project-3.png',
    'project-4.jpg', 'project-4.png', 'project-5.jpg', 'project-5.png',
    'project-6.png', 'project-7.jpg', 'project-7.png', 'project-8.jpg',
    'project-8.png', 'project-9.png', 'project-10.jpg', 'project-11.jpg',
    'project-11.png', 'project-12.jpg', 'project-12.png', 'project-13.jpg',
    'project-13.png', 'project-14.JPG', 'project-15.gif', 'project-15.jpg',
    'project-16.png', 'project-23.png', 'project-24.jpg', 'project-25.gif',
    'project-25.jpg', 'project-34.JPG',
  ].map(name => `images/projects/${name}`),
])

export function publicBuildPlugin() {
  let root
  return {
    name: 'public-sample-build',
    apply: 'build',
    enforce: 'pre',
    configResolved(config) { root = realpathSync(config.root) },
    load(id) {
      if (id.split('?')[0] === path.resolve(root, 'src/data/resume-versions.json')) {
        return '[]'
      }
    },
    async buildStart() {
      for (const fileName of PUBLIC_SAMPLE_ASSETS) {
        const sourcePath = path.resolve(root, 'public', fileName)
        // Reject symlinks at every level, including the public directory.
        let current = root
        for (const segment of ['public', ...fileName.split('/')]) {
          current = path.join(current, segment)
          if ((await lstat(current)).isSymbolicLink()) throw new Error(`Public asset symlink: ${fileName}`)
        }
        this.emitFile({ type: 'asset', fileName, source: await readFile(sourcePath) })
      }
    },
  }
}
