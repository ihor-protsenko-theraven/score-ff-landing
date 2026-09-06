import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { handleAdminVerification, handleJudgeVerification, handleTournamentRequest } from './api.js';
import { createFileTournamentStore } from './store.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function sendFile(response, content, filePath) {
  response.writeHead(200, {
    'Content-Type': MIME_TYPES[path.extname(filePath)] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; script-src 'self'; connect-src 'self';",
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  response.end(content);
}

export function createApp({ dataFile, publicDir, adminPassword, judgePassword = adminPassword, store = createFileTournamentStore(dataFile) }) {
  return createServer(async (request, response) => {
    const url = new URL(request.url, 'http://localhost');

    if (url.pathname === '/api/tournament') {
      await handleTournamentRequest(request, response, { store, adminPassword, judgePassword });
      return;
    }

    if (url.pathname === '/api/admin/verify') {
      handleAdminVerification(request, response, { adminPassword });
      return;
    }

    if (url.pathname === '/api/judge/verify') {
      handleJudgeVerification(request, response, { judgePassword, adminPassword });
      return;
    }

    if (request.method === 'GET') {
      const requestedPath = url.pathname === '/' ? '/index.html' : url.pathname === '/admin' ? '/admin.html' : url.pathname === '/judge' ? '/judge.html' : url.pathname;
      const relativePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^([/\\])+/, '');
      const filePath = path.resolve(publicDir, relativePath);
      if (filePath.startsWith(path.resolve(publicDir) + path.sep) || filePath === path.resolve(publicDir)) {
        try {
          const content = await readFile(filePath);
          sendFile(response, content, filePath);
          return;
        } catch {
          // Continue to the 404 response below.
        }
      }
    }

    response.writeHead(404, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.end(JSON.stringify({ error: 'Не знайдено' }));
  });
}
