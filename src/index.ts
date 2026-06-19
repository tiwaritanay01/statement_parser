import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Inject fallbacks for Better Auth in production environments like Railway if they are missing
if (!process.env.BETTER_AUTH_SECRET) {
    process.env.BETTER_AUTH_SECRET = "fallback-secret-that-must-be-at-least-32-characters-long-to-satisfy-better-auth-in-production";
}
if (!process.env.BETTER_AUTH_URL) {
    process.env.BETTER_AUTH_URL = process.env.PORT ? `http://localhost:${process.env.PORT}` : "http://localhost:3000";
}

import { apiRouter } from './routes/index.js';
import { auth } from './auth/auth.js';

const app = new Hono();

// Enable CORS
app.use(
    '/api/*',
    cors({
        origin: (origin) => {
            if (!origin) return 'http://localhost:3001';
            // Dynamically allow ANY Vercel preview or production domain, plus localhost
            if (origin.endsWith('.vercel.app') || origin.includes('localhost') || origin === process.env.FRONTEND_URL) {
                return origin;
            }
            return process.env.FRONTEND_URL || 'http://localhost:3001';
        },
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
