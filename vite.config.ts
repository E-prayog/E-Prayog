import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleTutorRequest, readNodeBody } from './server/tutorHandler';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  process.env.FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || env.FIREBASE_WEB_API_KEY;
  process.env.VITE_FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY;
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || env.ALLOWED_ORIGINS;

  return {
    server: {
      port: 3000,
      host: '127.0.0.1',
    },
    plugins: [
      react(),
      {
        name: 'tutor-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            const url = req.url?.split('?')[0];
            if (url !== '/api/tutor') {
              next();
              return;
            }
            try {
              const bodyText = req.method === 'POST' ? await readNodeBody(req) : '';
              const result = await handleTutorRequest({
                method: req.method || 'GET',
                origin: typeof req.headers.origin === 'string' ? req.headers.origin : undefined,
                authorization: typeof req.headers.authorization === 'string' ? req.headers.authorization : undefined,
                ip: req.socket.remoteAddress || 'unknown',
                bodyText,
              });
              res.statusCode = result.status;
              for (const [k, v] of Object.entries(result.headers)) {
                res.setHeader(k, v);
              }
              res.end(result.body);
            } catch {
              res.statusCode = 502;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'AI Tutor is unavailable' }));
            }
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
            'framer': ['framer-motion'],
          },
        },
      },
    },
  };
});
