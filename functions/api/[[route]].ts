import { Hono } from 'hono'
import { handle } from 'hono/cloudflare-pages'

const app = new Hono()
app.get('/api/test', (c) => c.text('hono works'))

export const onRequest = handle(app)