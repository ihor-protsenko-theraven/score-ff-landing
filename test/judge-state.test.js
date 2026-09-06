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
