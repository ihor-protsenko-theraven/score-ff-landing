import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { handleTournamentRequest } from '../lib/api.js';
import { createDeploymentTournamentStore } from '../lib/store.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const store = createDeploymentTournamentStore({
  seedFile: path.join(rootDir, 'data', 'tournament.json'),
  token: process.env.BLOB_READ_WRITE_TOKEN || '',
});

export default async function handler(request, response) {
  await handleTournamentRequest(request, response, {
    store,
    adminPassword: process.env.ADMIN_PASSWORD || '',
  });
}
