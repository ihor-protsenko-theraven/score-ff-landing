import { readFile, rename, writeFile } from 'node:fs/promises';

import { get, put } from '@vercel/blob';

export function createFileTournamentStore(dataFile) {
  return {
    async read() {
      return JSON.parse(await readFile(dataFile, 'utf8'));
    },
    async write(tournament) {
      const temporaryFile = `${dataFile}.tmp`;
      await writeFile(temporaryFile, `${JSON.stringify(tournament, null, 2)}\n`, 'utf8');
      await rename(temporaryFile, dataFile);
    },
  };
}

export function createDeploymentTournamentStore({ seedFile, token, blobClient }) {
  return token
    ? createBlobTournamentStore({ seedFile, token, blobClient })
    : createFileTournamentStore(seedFile);
}

export function createBlobTournamentStore({
  seedFile,
  pathname = 'flag-score/tournament.json',
  token,
  blobClient = { get, put },
}) {
  return {
    async read() {
      const result = await blobClient.get(pathname, { access: 'private', useCache: false, token });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return JSON.parse(await readFile(seedFile, 'utf8'));
      }
      return JSON.parse(await new Response(result.stream).text());
    },
    async write(tournament) {
      await blobClient.put(pathname, `${JSON.stringify(tournament, null, 2)}\n`, {
        access: 'private',
        allowOverwrite: true,
        cacheControlMaxAge: 60,
        contentType: 'application/json',
        token,
      });
    },
  };
}
