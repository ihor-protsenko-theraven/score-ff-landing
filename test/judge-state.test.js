import assert from 'node:assert/strict';
import test from 'node:test';

test('the judge clock converts display time to seconds and back', async () => {
  const { formatClock, parseClock } = await import('../public/judge-state.js').catch(() => ({}));

  assert.equal(parseClock('18:42'), 1122);
  assert.equal(parseClock('bad value'), 0);
  assert.equal(formatClock(1122), '18:42');
  assert.equal(formatClock(-5), '00:00');
});

test('judge score controls support touchdowns, conversions, safety, and corrections', async () => {
  const { scoreAfter } = await import('../public/judge-state.js');

  assert.equal(scoreAfter(0, 6), 6);
  assert.equal(scoreAfter(6, 1), 7);
  assert.equal(scoreAfter(7, 2), 9);
  assert.equal(scoreAfter(0, -1), 0);
});

test('clicking a team score card selects, switches, and clears possession', async () => {
  const { togglePossession } = await import('../public/judge-state.js');
  const match = { homeTeamId: 'wolves', awayTeamId: 'lynx', possessionTeamId: null };

  assert.equal(togglePossession(match, 'home'), 'wolves');
  assert.equal(match.possessionTeamId, 'wolves');
  assert.equal(togglePossession(match, 'away'), 'lynx');
  assert.equal(match.possessionTeamId, 'lynx');
  assert.equal(togglePossession(match, 'away'), null);
  assert.equal(match.possessionTeamId, null);
});

test('the judge clock uses the configured half duration with a 20 minute fallback', async () => {
  const { halfDurationSeconds } = await import('../public/judge-state.js');

  assert.equal(halfDurationSeconds({ settings: { halfDurationMinutes: 15 } }), 900);
  assert.equal(halfDurationSeconds({ settings: { halfDurationMinutes: 20 } }), 1200);
  assert.equal(halfDurationSeconds({}), 1200);
});

test('each team can use at most two timeouts in each half', async () => {
  const { changeTimeoutUsage, remainingTimeouts, timeoutControlState } = await import('../public/judge-state.js');
  const match = {};

  assert.equal(remainingTimeouts(match, '1', 'home'), 2);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), true);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), true);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), false);
  assert.equal(remainingTimeouts(match, '1', 'home'), 0);
  assert.equal(remainingTimeouts(match, '2', 'home'), 2);
  assert.equal(changeTimeoutUsage(match, '1', 'home', -1), true);
  assert.equal(remainingTimeouts(match, '1', 'home'), 1);
  assert.deepEqual(timeoutControlState(match, 'OT', 'home'), {
    available: false,
    remaining: 0,
    canUse: false,
    canUndo: false,
  });
});

test('judge console shell exposes 1-2 point conversions, 1-2 point safeties, +/-1s clock deltas, and custom clock dialog', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const judgeHtml = await readFile(path.resolve('public/judge.html'), 'utf8');

  assert.match(judgeHtml, /data-play="Реалізація \+1"/);
  assert.match(judgeHtml, /data-play="Реалізація \+2"/);
  assert.match(judgeHtml, /data-play="Сейфті \+1"/);
  assert.match(judgeHtml, /data-play="Сейфті \+2"/);
  assert.match(judgeHtml, /data-clock-delta="-1"/);
  assert.match(judgeHtml, /data-clock-delta="1"/);
  assert.match(judgeHtml, /id="judgeClockDialog"/);
  assert.match(judgeHtml, /data-preset="20:00"/);
  assert.match(judgeHtml, /data-preset="15:00"/);
  assert.match(judgeHtml, /data-preset="12:00"/);
  assert.match(judgeHtml, /data-preset="10:00"/);
  assert.match(judgeHtml, /data-preset="02:00"/);
});

test('judge score cards are the possession controls', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const judgeHtml = await readFile(path.resolve('public/judge.html'), 'utf8');

  assert.match(judgeHtml, /data-possession-side="home"/);
  assert.match(judgeHtml, /data-possession-side="away"/);
  assert.doesNotMatch(judgeHtml, /id="judgePossession"/);
});

test('judge timeout card stays visible outside the regulation halves', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const judgeJs = await readFile(path.resolve('public/judge.js'), 'utf8');

  assert.match(judgeJs, /timeoutCard\.hidden = false/);
  assert.doesNotMatch(judgeJs, /timeoutCard\.hidden = !\['1', '2'\]\.includes\(period\)/);
});

test('admin shell contains exactly one HTML document', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const adminHtml = await readFile(path.resolve('public/admin.html'), 'utf8');

  assert.equal(adminHtml.match(/<!doctype html>/gi)?.length, 1);
  assert.equal(adminHtml.match(/<html\b/gi)?.length, 1);
  assert.equal(adminHtml.match(/<body\b/gi)?.length, 1);
});

test('every static admin translation key has Ukrainian and English copy', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const adminHtml = await readFile(path.resolve('public/admin.html'), 'utf8');
  const adminJs = await readFile(path.resolve('public/admin.js'), 'utf8');
  const keys = [...adminHtml.matchAll(/data-i18n(?:-aria|-placeholder|-title)?="([^"]+)"/g)]
    .map((match) => match[1]);

  for (const key of new Set(keys)) {
    const property = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const copies = adminJs.match(new RegExp(`(?:^|[,{]\\s*)${property}\\s*:`, 'gm')) || [];
    assert.equal(copies.length, 2, `expected Ukrainian and English copy for ${key}`);
  }
});

test('admin uses one header language switcher and score-card possession controls', async () => {
  const { readFile } = await import('node:fs/promises');
  const path = await import('node:path');
  const adminHtml = await readFile(path.resolve('public/admin.html'), 'utf8');
  const adminJs = await readFile(path.resolve('public/admin.js'), 'utf8');
  const header = adminHtml.match(/<header class="admin-header">([\s\S]*?)<\/header>/)?.[1] || '';

  assert.equal(adminHtml.match(/class="[^"]*admin-lang-toggle/g)?.length, 1);
  assert.match(header, /admin-lang-toggle/);
  assert.match(adminJs, /data-quick-possession-card="home"/);
  assert.match(adminJs, /data-quick-possession-card="away"/);
  assert.doesNotMatch(adminJs, /<select data-quick-possession/);
});

test('restoreRunningClock calculates elapsed seconds and recognizes expired clocks', async () => {
  const { restoreRunningClock } = await import('../public/judge-state.js');

  const start = 1_000_000;
  const running = { running: true, startedAt: start, startedSeconds: 300 };

  // 15 seconds elapsed
  const active = restoreRunningClock(running, start + 15_000);
  assert.equal(active?.running, true);
  assert.equal(active?.seconds, 285);
  assert.equal(active?.expired, false);

  // 300 seconds elapsed (exact expiry)
  const expiredExact = restoreRunningClock(running, start + 300_000);
  assert.equal(expiredExact?.running, false);
  assert.equal(expiredExact?.seconds, 0);
  assert.equal(expiredExact?.expired, true);

  // 350 seconds elapsed (past expiry)
  const expiredPast = restoreRunningClock(running, start + 350_000);
  assert.equal(expiredPast?.running, false);
  assert.equal(expiredPast?.seconds, 0);
  assert.equal(expiredPast?.expired, true);

  // Paused clock returns null
  assert.equal(restoreRunningClock({ running: false, seconds: 200 }), null);
  assert.equal(restoreRunningClock(null), null);
});
