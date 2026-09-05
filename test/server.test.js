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
  const server = createApp({ dataFile, publicDir: directory, adminPassword: 'secret' });
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

test('the public and admin shells avoid render-blocking third-party fonts', async () => {
  const [publicShell, adminShell] = await Promise.all([
    readFile(path.resolve('public/index.html'), 'utf8'),
    readFile(path.resolve('public/admin.html'), 'utf8'),
  ]);

  assert.doesNotMatch(publicShell, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
  assert.doesNotMatch(adminShell, /fonts\.googleapis\.com|fonts\.gstatic\.com/);
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
