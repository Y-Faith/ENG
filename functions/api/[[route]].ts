import { Hono } from 'hono'

const app = new Hono()
app.get('/api/test', (c) => c.text('hono works'))

export const onRequest = app.fetch