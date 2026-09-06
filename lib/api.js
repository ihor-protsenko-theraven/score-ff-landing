import { createHmac, timingSafeEqual } from 'node:crypto';

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

const JUDGE_SESSION_DURATION_MS = 18 * 60 * 60 * 1000;

function judgeSessionToken(secret, expiresAt) {
  const signature = createHmac('sha256', secret).update(`judge:${expiresAt}`).digest('base64url');
  return `${expiresAt}.${signature}`;
}

function judgeCredentialsMatch(actual, { judgePassword, adminPassword }) {
  const configuredPassword = judgePassword || adminPassword;
  return Boolean(configuredPassword) && (
    passwordsMatch(actual, configuredPassword)
    || Boolean(adminPassword && passwordsMatch(actual, adminPassword))
  );
}

function judgeSessionMatches(token = '', secret = '') {
  const [expiresAtValue, signature, extra] = String(token).split('.');
  const expiresAt = Number(expiresAtValue);
  if (!secret || !signature || extra || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now()) return false;
  return passwordsMatch(token, judgeSessionToken(secret, expiresAt));
}

function judgeRequestIsAuthorized(request, { judgePassword, adminPassword }) {
  const sessionSecret = judgePassword || adminPassword;
  const authorization = String(request.headers.authorization || '');
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  return judgeSessionMatches(token, sessionSecret);
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

export async function handleTournamentRequest(request, response, { store, adminPassword, judgePassword = adminPassword }) {
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
      const expectedVersion = request.headers['x-tournament-version'];
      if (expectedVersion) {
        const currentTournament = await store.read();
        if (currentTournament.meta?.updatedAt !== expectedVersion) {
          sendJson(response, 409, { error: 'Турнір уже оновлено суддею або іншим адміністратором. Оновіть дані перед збереженням.' });
          return;
        }
      }
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

  if (request.method === 'PATCH') {
    if (!judgeRequestIsAuthorized(request, { judgePassword, adminPassword })) {
      sendJson(response, 401, { error: 'Суддівська сесія недійсна або завершилася' });
      return;
    }
    try {
      const { matchId, patch } = await readJsonBody(request);
      const allowedFields = new Set(['homeScore', 'awayScore', 'clock', 'down', 'period', 'status', 'possessionTeamId', 'lastPlay', 'timeouts']);
      if (!matchId || !patch || typeof patch !== 'object' || Array.isArray(patch)) throw new Error('Некоректне оновлення матчу');
      if (Object.keys(patch).some((field) => !allowedFields.has(field))) throw new Error('Поле недоступне для суддівського оновлення');

      const tournament = await store.read();
      const match = tournament.matches.find((item) => item.id === matchId);
      if (!match) throw new Error('Матч не знайдено');
      Object.assign(match, patch, { judgeUpdatedAt: new Date().toISOString() });
      validateTournament(tournament);
      tournament.meta.updatedAt = new Date().toISOString();
      await store.write(tournament);
      sendJson(response, 200, { ok: true, match, updatedAt: tournament.meta.updatedAt });
    } catch (error) {
      sendJson(response, 400, { error: error.message || 'Некоректне оновлення матчу' });
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

export function handleJudgeVerification(request, response, { judgePassword, adminPassword }) {
  if (request.method !== 'POST') {
    sendJson(response, 405, { error: 'Метод не підтримується' });
    return;
  }
  const sessionSecret = judgePassword || adminPassword;
  if (!sessionSecret) {
    sendJson(response, 503, { error: 'Суддівська панель не налаштована' });
    return;
  }
  if (!judgeCredentialsMatch(request.headers['x-judge-password'], { judgePassword, adminPassword })) {
    sendJson(response, 401, { error: 'Невірний пароль судді' });
    return;
  }

  const expiresAt = Date.now() + JUDGE_SESSION_DURATION_MS;
  sendJson(response, 200, {
    ok: true,
    token: judgeSessionToken(sessionSecret, expiresAt),
    expiresAt: new Date(expiresAt).toISOString(),
  });
}
