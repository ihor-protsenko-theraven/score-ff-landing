import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createApp } from './lib/app.js';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const adminPassword = process.env.ADMIN_PASSWORD || 'flag2026';
const judgePassword = process.env.JUDGE_PASSWORD || adminPassword;
const dataFile = path.resolve(rootDir, process.env.DATA_FILE || 'data/tournament.json');
const publicDir = path.resolve(rootDir, 'public');

const server = createApp({ dataFile, publicDir, adminPassword, judgePassword });

server.listen(port, () => {
  console.log(`FLAG SCORE запущено: http://localhost:${port}`);
  console.log(`Адмінка: http://localhost:${port}/admin`);
  console.log(`Суддівська панель: http://localhost:${port}/judge`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('Увага: використовується демо-пароль flag2026. Задайте ADMIN_PASSWORD перед публікацією.');
  }
});
