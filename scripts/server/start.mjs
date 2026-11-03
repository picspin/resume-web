import { createPrivateServer } from './server.mjs'

const port = Number(process.env.PORT || 3000)
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535.')
const server = await createPrivateServer({
  origin: process.env.APP_ORIGIN,
  username: process.env.APP_OWNER_USER,
  password: process.env.APP_OWNER_PASSWORD,
})
server.requestTimeout = 300_000
server.headersTimeout = 30_000
server.listen(port, process.env.HOST || '127.0.0.1', () => console.log(`Private Career-Ops listening on port ${port}`))
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close())
