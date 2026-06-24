const CAREER_ENABLE_FLAG = ['VITE', 'ENABLE', 'CAREER', 'CONSOLE'].join('_')

export function isCareerPath(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].replace(/\/$/, '') || '/'
  return path === '/career'
}

export function isCareerConsoleEnabled({ env = {}, pathname = '/' } = {}) {
  const enabled = String(env[CAREER_ENABLE_FLAG] || '').toLowerCase()
  return env.DEV === true && isCareerPath(pathname) && (enabled === 'true' || enabled === '1')
}
