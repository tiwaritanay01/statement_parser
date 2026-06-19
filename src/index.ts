import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { apiRouter } from './routes/index.js';
import { auth } from './auth/auth.js';

const app = new Hono();

// Enable CORS
app.use(
    '/api/*',
    cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
        credentials: true,
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
        exposeHeaders: ['Set-Cookie'],
    })
);

// Mount the custom apiRouter (includes /api/auth/register, login, me, etc.)
app.route('/api', apiRouter);

// Fallback catch-all for Better Auth's internal handlers (e.g. session, sign-out, etc.)
app.all('/api/auth/*', (c) => auth.handler(c.req.raw));

app.get('/', (c) => {
    return c.text('Hello Hono!');
});

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

serve(
    {
        fetch: app.fetch,
        port: port,
    },
    (info) => {
        console.log(`Server is running on http://localhost:${info.port}`);
    }
);
