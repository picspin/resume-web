export function isCareerPath(pathname = '/') {
  const path = String(pathname || '/').split('?')[0].replace(/\/$/, '') || '/'
  return path === '/career'
}

export function isCareerConsoleEnabled({ env = {}, pathname = '/' } = {}) {
  return (env.DEV === true || env.VITE_PRIVATE_WORKSPACE === 'true') && isCareerPath(pathname)
}
