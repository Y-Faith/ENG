import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/proxy', async (req: any, res: any, next: any) => {
        if (req.method !== 'POST') return next()

        let body = ''
        req.on('data', (chunk: string) => (body += chunk))
        req.on('end', async () => {
          try {
            const { targetUrl, headers: reqHeaders, reqBody } = JSON.parse(body)

            const response = await fetch(targetUrl, {
              method: 'POST',
              headers: reqHeaders,
              body: JSON.stringify(reqBody),
            })

            if (!response.ok) {
              const errorText = await response.text()
              res.writeHead(response.status, { 'Content-Type': 'application/json' })
              res.end(errorText)
              return
            }

            const data = await response.text()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(data)
          } catch (e: any) {
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: { message: e.message || 'Proxy error' } }))
          }
        })
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  base: '/',
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
})