export function isCareerPath(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].replace(/\/$/, '') || '/'
  return path === '/career'
}

export function isCareerConsoleEnabled({ env = {}, pathname = '/' } = {}) {
  const enabled = String(env.VITE_ENABLE_CAREER_CONSOLE || '').toLowerCase()
  return isCareerPath(pathname) && (enabled === 'true' || enabled === '1')
}
