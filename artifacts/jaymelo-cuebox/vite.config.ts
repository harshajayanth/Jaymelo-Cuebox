import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const appRoot = path.resolve(import.meta.dirname);
const privateTunesRoot = path.resolve(appRoot, 'private', 'tunes');

function unauthorizedPage(res: any) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width"><title>Unauthorized</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080d1b;color:#f8fafc;font:16px system-ui}.card{text-align:center;padding:42px;border:1px solid #27344d;border-radius:18px;background:#0e1729;max-width:420px}h1{margin:0 0 12px;font-size:32px}p{color:#9caac0;line-height:1.6}a{display:inline-block;margin-top:16px;padding:12px 22px;border-radius:10px;background:#f43f5e;color:white;text-decoration:none;font-weight:700}</style></head><body><main class="card"><h1>Unauthorized</h1><p>Your session is missing, invalid, or expired. Sign in to access this private track.</p><a href="/">Go to Home</a></main></body></html>`);
}

function encodeSession(projectId: string, secret: string) {
  const payload = Buffer.from(JSON.stringify({ projectId, expiresAt: Date.now() + 3_600_000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token: string | undefined, secret: string) {
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return value.projectId && value.expiresAt > Date.now() ? value as { projectId: string } : null;
  } catch { return null; }
}

function readCookie(req: any, name: string) {
  const entry = String(req.headers.cookie || '').split(';').map((v) => v.trim()).find((v) => v.startsWith(`${name}=`));
  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : undefined;
}

function readJson(req: any) {
  return new Promise<any>((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk; if (body.length > 10_000) reject(new Error('Request too large')); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}

function cueboxSecurityPlugin(env: Record<string, string>) {
  const secret = env.CUEBOX_SESSION_SECRET || 'local-development-change-this-secret';
  const apiKey = env.VITE_FIREBASE_API_KEY;
  const firebaseProjectId = env.VITE_FIREBASE_PROJECT_ID;

  const middleware = async (req: any, res: any, next: () => void) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/api/auth/login' && req.method === 'POST') {
      try {
        const { username, password } = await readJson(req);
        const query = { structuredQuery: { from: [{ collectionId: 'projects' }], where: { compositeFilter: { op: 'AND', filters: [
          { fieldFilter: { field: { fieldPath: 'username' }, op: 'EQUAL', value: { stringValue: String(username || '').trim() } } },
          { fieldFilter: { field: { fieldPath: 'password' }, op: 'EQUAL', value: { stringValue: String(password || '') } } },
        ] } }, limit: 1 } };
        const response = await fetch(`https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/(default)/documents:runQuery?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
        const results = await response.json() as any[];
        const name = results?.find((result) => result.document)?.document?.name as string | undefined;
        if (!response.ok || !name) throw new Error('Invalid credentials');
        const projectId = name.split('/').pop()!;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Set-Cookie', `cuebox_auth=${encodeURIComponent(encodeSession(projectId, secret))}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict`);
        res.end(JSON.stringify({ projectId }));
      } catch {
        res.statusCode = 401; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ error: 'Invalid credentials' }));
      }
      return;
    }
    if (url.pathname === '/api/auth/logout') {
      res.statusCode = 204; res.setHeader('Set-Cookie', 'cuebox_auth=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'); res.end(); return;
    }
    if (url.pathname.startsWith('/tunes/')) {
      if (!verifySession(readCookie(req, 'cuebox_auth'), secret)) return unauthorizedPage(res);
      const requestedName = decodeURIComponent(url.pathname.slice('/tunes/'.length));
      const safeName = path.basename(requestedName);
      if (!safeName || safeName !== requestedName) return unauthorizedPage(res);
      const filePath = path.resolve(privateTunesRoot, safeName);
      if (!filePath.startsWith(`${privateTunesRoot}${path.sep}`) || !fs.existsSync(filePath)) { res.statusCode = 404; res.end('Not found'); return; }
      const stat = fs.statSync(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', safeName.toLowerCase().endsWith('.wav') ? 'audio/wav' : 'audio/mpeg');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('Cache-Control', 'private, no-store');
      res.setHeader('Content-Disposition', 'inline');
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    next();
  };
  return { name: 'cuebox-security', configureServer: (server: any) => server.middlewares.use(middleware), configurePreviewServer: (server: any) => server.middlewares.use(middleware) };
}

const port = Number(process.env.PORT ?? '5173');
const basePath = process.env.BASE_PATH ?? '/';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, appRoot, '');
  return {
    base: basePath,
    plugins: [react(), tailwindcss(), runtimeErrorOverlay()],
    resolve: { alias: { '@': path.resolve(appRoot, 'src'), '@assets': path.resolve(appRoot, '..', '..', 'attached_assets') }, dedupe: ['react', 'react-dom'] },
    root: appRoot,
    build: { outDir: path.resolve(appRoot, 'dist/public'), emptyOutDir: true },
    server: { port, strictPort: true, host: '0.0.0.0', allowedHosts: true, fs: { strict: true } },
    preview: { port, host: '0.0.0.0', allowedHosts: true },
  };
});
