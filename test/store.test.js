import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import * as stores from '../lib/store.js';

test('a deployment without Blob credentials reads the bundled tournament seed', async () => {
  assert.equal(typeof stores.createDeploymentTournamentStore, 'function');

  const directory = await mkdtemp(path.join(os.tmpdir(), 'flag-score-store-'));
  const seedFile = path.join(directory, 'tournament.json');
  await writeFile(seedFile, JSON.stringify({ meta: { name: 'Seed tournament' } }), 'utf8');

  const store = stores.createDeploymentTournamentStore({ seedFile, token: '' });

  assert.equal((await store.read()).meta.name, 'Seed tournament');
});

test('a deployment with Blob credentials reads the persisted tournament', async () => {
  const persisted = JSON.stringify({ meta: { name: 'Persisted tournament' } });
  const blobClient = {
    async get(_pathname, options) {
      assert.equal(options.token, 'blob-token');
      return { statusCode: 200, stream: new Response(persisted).body };
    },
    async put() {},
  };

  const store = stores.createDeploymentTournamentStore({
    seedFile: 'unused.json',
    token: 'blob-token',
    blobClient,
  });

  assert.equal((await store.read()).meta.name, 'Persisted tournament');
});
