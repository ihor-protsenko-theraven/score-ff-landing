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
