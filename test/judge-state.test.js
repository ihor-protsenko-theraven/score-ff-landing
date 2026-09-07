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

test('the judge clock uses the configured half duration with a 20 minute fallback', async () => {
  const { halfDurationSeconds } = await import('../public/judge-state.js');

  assert.equal(halfDurationSeconds({ settings: { halfDurationMinutes: 15 } }), 900);
  assert.equal(halfDurationSeconds({ settings: { halfDurationMinutes: 20 } }), 1200);
  assert.equal(halfDurationSeconds({}), 1200);
});

test('each team can use at most two timeouts in each half', async () => {
  const { changeTimeoutUsage, remainingTimeouts } = await import('../public/judge-state.js');
  const match = {};

  assert.equal(remainingTimeouts(match, '1', 'home'), 2);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), true);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), true);
  assert.equal(changeTimeoutUsage(match, '1', 'home', 1), false);
  assert.equal(remainingTimeouts(match, '1', 'home'), 0);
  assert.equal(remainingTimeouts(match, '2', 'home'), 2);
  assert.equal(changeTimeoutUsage(match, '1', 'home', -1), true);
  assert.equal(remainingTimeouts(match, '1', 'home'), 1);
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
