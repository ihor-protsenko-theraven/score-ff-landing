import { timingSafeEqual } from 'node:crypto';

import { calculateStandings, validateTournament } from './tournament.js';

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function passwordsMatch(actual = '', expected = '') {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

async function readJsonBody(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }

  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new Error('Запит завеликий');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function handleTournamentRequest(request, response, { store, adminPassword }) {
  if (request.method === 'GET') {
    try {
      const tournament = await store.read();
      const standings = Object.fromEntries(
        tournament.divisions.map((division) => [
          division.id,
          calculateStandings(tournament.teams, tournament.matches, division.id),
        ]),
      );
      sendJson(response, 200, { ...tournament, standings });
    } catch {
      sendJson(response, 500, { error: 'Не вдалося прочитати дані турніру' });
    }
    return;
  }

  if (request.method === 'PUT') {
    if (!adminPassword) {
      sendJson(response, 503, { error: 'Адмін-панель не налаштована' });
      return;
    }
    if (!passwordsMatch(request.headers['x-admin-password'], adminPassword)) {
      sendJson(response, 401, { error: 'Невірний пароль адміністратора' });
      return;
    }
    try {
      const tournament = await readJsonBody(request);
      validateTournament(tournament);
      tournament.meta.updatedAt = new Date().toISOString();
      await store.write(tournament);
      sendJson(response, 200, { ok: true, updatedAt: tournament.meta.updatedAt });
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Некоректні дані' });
    }
    return;
  }

  sendJson(response, 405, { error: 'Метод не підтримується' });
}

export function handleAdminVerification(request, response, { adminPassword }) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Метод не підтримується' });
    return;
  }
  if (!adminPassword) {
    sendJson(response, 503, { error: 'Адмін-панель не налаштована' });
    return;
  }
  if (!passwordsMatch(request.headers['x-admin-password'], adminPassword)) {
    sendJson(response, 401, { error: 'Невірний пароль адміністратора' });
    return;
  }
  sendJson(response, 200, { ok: true });
}
