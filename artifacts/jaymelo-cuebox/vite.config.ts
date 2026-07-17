import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

function cueboxTuneAuthPlugin() {
  const requireSession = (req: any, res: any, next: () => void) => {
    if (!req.url?.startsWith('/tunes/')) {
      next();
      return;
    }

    const cookies = Object.fromEntries(
      (req.headers.cookie || '')
        .split(';')
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((entry) => {
          const [key, ...valueParts] = entry.split('=');
          return [key, valueParts.join('=')];
        })
    );

    const sessionCookie = cookies.cuebox_session;
    const sessionHeader = req.headers['x-cuebox-session'];
    const rawSession = sessionCookie || sessionHeader;

    if (!rawSession) {
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }

    try {
      const parsed = JSON.parse(decodeURIComponent(rawSession));
      if (!parsed?.projectId) {
        throw new Error('Invalid session');
      }
    } catch {
      res.statusCode = 401;
      res.end('Unauthorized');
      return;
    }

    next();
  };

  return {
    name: 'cuebox-tune-auth',
    configureServer(server: any) {
      server.middlewares.use(requireSession);
    },
    configurePreviewServer(server: any) {
      server.middlewares.use(requireSession);
    },
  };
}

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT ?? '5173';
const port = Number(rawPort);
const basePath = process.env.BASE_PATH ?? '/';

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    cueboxTuneAuthPlugin(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
