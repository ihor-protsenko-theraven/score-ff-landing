import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createApp } from '../lib/app.js';

const fixture = {
  meta: { name: 'Test cup' },
  divisions: [{ id: 'open', name: 'Open' }],
  teams: [
    { id: 'wolves', name: 'Wolves', division: 'open', short: 'WLV', color: '#111111' },
    { id: 'lynx', name: 'Lynx', division: 'open', short: 'LNX', color: '#222222' },
  ],
  matches: [],
  content: { rules: '', regulations: '' },
};

async function withServer(run) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'flag-score-'));
  const dataFile = path.join(directory, 'tournament.json');
  await writeFile(dataFile, JSON.stringify(fixture), 'utf8');
  await writeFile(path.join(directory, 'index.html'), '<h1>Score app</h1>', 'utf8');
  await writeFile(path.join(directory, 'judge.html'), '<h1>Judge app</h1>', 'utf8');
  const server = createApp({ dataFile, publicDir: directory, adminPassword: 'secret', judgePassword: 'referee' });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('the public API returns tournament data with calculated standings', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tournament`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.meta.name, 'Test cup');
    assert.deepEqual(body.standings.open, [
      { id: 'lynx', name: 'Lynx', played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, difference: 0 },
      { id: 'wolves', name: 'Wolves', played: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, difference: 0 },
    ]);
  });
});

test('updating tournament data requires the admin password', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { error: 'Невірний пароль адміністратора' });
  });
});

test('an authorized update is validated, persisted, and returned publicly', async () => {
  await withServer(async (baseUrl) => {
    const updated = structuredClone(fixture);
    updated.meta.name = 'Updated cup';
    const updateResponse = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret' },
      body: JSON.stringify(updated),
    });
    const publicResponse = await fetch(`${baseUrl}/api/tournament`);
    const body = await publicResponse.json();

    assert.equal(updateResponse.status, 200);
    assert.equal(body.meta.name, 'Updated cup');
  });
});

test('the server delivers the public application shell', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(baseUrl);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /Score app/);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.doesNotMatch(response.headers.get('content-security-policy'), /https:\/\/fonts\./);
    assert.match(response.headers.get('content-security-policy'), /font-src 'self'/);
  });
});

test('the server delivers the judge application shell at a clean URL', async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/judge`);

    assert.equal(response.status, 200);
    assert.match(await response.text(), /Judge app/);
  });
});

test('the public, admin, and judge shells avoid render-blocking third-party fonts', async () => {
  const [publicShell, adminShell, judgeShell] = await Promise.all([
    readFile(path.resolve('public/index.html'), 'utf8'),
    readFile(path.resolve('public/admin.html'), 'utf8'),
    readFile(path.resolve('public/judge.html'), 'utf8'),
  ]);

  assert.doesNotMatch(publicShell, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(adminShell, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(judgeShell, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
});

test('the mobile admin navigation exposes public and judge destinations', async () => {
  const adminShell = await readFile(path.resolve('public/admin.html'), 'utf8');

  assert.match(adminShell, /class="admin-mobile-tools"/);
  assert.match(adminShell, /class="admin-mobile-tools"[\s\S]*href="\/"[\s\S]*href="\/judge"/);
});

test('the admin password can be verified without changing tournament data', async () => {
  await withServer(async (baseUrl) => {
    const rejected = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: { 'X-Admin-Password': 'wrong' },
    });
    const accepted = await fetch(`${baseUrl}/api/admin/verify`, {
      method: 'POST',
      headers: { 'X-Admin-Password': 'secret' },
    });

    assert.equal(rejected.status, 401);
    assert.equal(accepted.status, 200);
  });
});

test('a judge password can be exchanged for a temporary session token', async () => {
  await withServer(async (baseUrl) => {
    const rejected = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'wrong' },
    });
    const accepted = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'referee' },
    });
    const body = await accepted.json();

    assert.equal(rejected.status, 401);
    assert.equal(accepted.status, 200);
    assert.equal(typeof body.token, 'string');
    assert.ok(body.token.length > 32);
    assert.ok(Date.parse(body.expiresAt) > Date.now());
  });
});

test('a judge session updates only the selected match state', async () => {
  await withServer(async (baseUrl) => {
    const tournament = structuredClone(fixture);
    tournament.matches = [
      {
        id: 'match-1', division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx',
        homeScore: 0, awayScore: 0, status: 'scheduled', date: '2026-09-12', time: '10:00', field: 'Поле 1', clock: '20:00', down: 1,
      },
      {
        id: 'match-2', division: 'open', homeTeamId: 'lynx', awayTeamId: 'wolves',
        homeScore: 0, awayScore: 0, status: 'scheduled', date: '2026-09-12', time: '11:00', field: 'Поле 2', clock: '20:00', down: 1,
      },
    ];
    await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret' },
      body: JSON.stringify(tournament),
    });
    const loginResponse = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'referee' },
    });
    const { token } = await loginResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        matchId: 'match-1',
        patch: { homeScore: 6, awayScore: 2, clock: '18:42', down: 2, period: '1', status: 'live' },
      }),
    });
    const publicResponse = await fetch(`${baseUrl}/api/tournament`);
    const body = await publicResponse.json();

    assert.equal(updateResponse.status, 200);
    assert.deepEqual(
      body.matches.map(({ id, homeScore, awayScore, clock, down, status }) => ({ id, homeScore, awayScore, clock, down, status })),
      [
        { id: 'match-1', homeScore: 6, awayScore: 2, clock: '18:42', down: 2, status: 'live' },
        { id: 'match-2', homeScore: 0, awayScore: 0, clock: '20:00', down: 1, status: 'scheduled' },
      ],
    );
  });
});

test('a judge update rejects an invalid down value', async () => {
  await withServer(async (baseUrl) => {
    const tournament = structuredClone(fixture);
    tournament.matches = [{
      id: 'match-1', division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx',
      homeScore: 0, awayScore: 0, status: 'live', date: '2026-09-12', time: '10:00', field: 'Поле 1', clock: '20:00', down: 1,
    }];
    await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret' },
      body: JSON.stringify(tournament),
    });
    const loginResponse = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'referee' },
    });
    const { token } = await loginResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId: 'match-1', patch: { down: 5 } }),
    });

    assert.equal(updateResponse.status, 400);
    assert.match((await updateResponse.json()).error, /даун/i);
  });
});

test('a judge session synchronizes timeout usage for both halves', async () => {
  await withServer(async (baseUrl) => {
    const tournament = structuredClone(fixture);
    tournament.settings = { halfDurationMinutes: 15 };
    tournament.matches = [{
      id: 'match-1', division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx',
      homeScore: 0, awayScore: 0, status: 'live', date: '2026-09-12', time: '10:00', field: 'Поле 1', clock: '15:00', down: 1,
    }];
    await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret' },
      body: JSON.stringify(tournament),
    });
    const loginResponse = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'referee' },
    });
    const { token } = await loginResponse.json();

    const updateResponse = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        matchId: 'match-1',
        patch: { timeouts: { 1: { home: 1, away: 2 }, 2: { home: 0, away: 1 } } },
      }),
    });
    const body = await (await fetch(`${baseUrl}/api/tournament`)).json();

    assert.equal(updateResponse.status, 200);
    assert.deepEqual(body.matches[0].timeouts, { 1: { home: 1, away: 2 }, 2: { home: 0, away: 1 } });
  });
});

test('an admin cannot overwrite a newer judge update with stale tournament data', async () => {
  await withServer(async (baseUrl) => {
    const tournament = structuredClone(fixture);
    tournament.matches = [{
      id: 'match-1', division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx',
      homeScore: 0, awayScore: 0, status: 'live', date: '2026-09-12', time: '10:00', field: 'Поле 1', clock: '20:00', down: 1,
    }];
    const initialSave = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret' },
      body: JSON.stringify(tournament),
    });
    const { updatedAt: initialVersion } = await initialSave.json();
    tournament.meta.updatedAt = initialVersion;
    const loginResponse = await fetch(`${baseUrl}/api/judge/verify`, {
      method: 'POST',
      headers: { 'X-Judge-Password': 'referee' },
    });
    const { token } = await loginResponse.json();
    await fetch(`${baseUrl}/api/tournament`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ matchId: 'match-1', patch: { homeScore: 6 } }),
    });

    const staleSave = await fetch(`${baseUrl}/api/tournament`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': 'secret', 'X-Tournament-Version': initialVersion },
      body: JSON.stringify(tournament),
    });

    assert.equal(staleSave.status, 409);
    assert.match((await staleSave.json()).error, /судд|оновлен/i);
  });
});
