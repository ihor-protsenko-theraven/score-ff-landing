import assert from 'node:assert/strict';
import test from 'node:test';

test('recording a touchdown stores its scorer and match context', async () => {
  const { recordTouchdown } = await import('../public/match-events.js').catch(() => ({}));
  const match = { id: 'm1', homeTeamId: 'wolves', awayTeamId: 'lynx', homeScore: 0, awayScore: 0 };

  recordTouchdown(match, {
    teamId: 'wolves', scorer: '  Олена К.  ', clock: ' 05:42 ', period: ' 1 ',
  }, { id: 'td-1', createdAt: '2026-09-12T10:05:00.000Z' });

  assert.deepEqual(match.touchdowns, [{
    id: 'td-1', teamId: 'wolves', scorer: 'Олена К.', clock: '05:42', period: '1', createdAt: '2026-09-12T10:05:00.000Z',
  }]);
});

test('recording rejects a blank scorer or a team outside the match', async () => {
  const { recordTouchdown } = await import('../public/match-events.js');
  const match = { id: 'm1', homeTeamId: 'wolves', awayTeamId: 'lynx' };

  assert.throws(
    () => recordTouchdown(match, { teamId: 'ghosts', scorer: 'Player 7' }),
    /команд/i,
  );
  assert.throws(
    () => recordTouchdown(match, { teamId: 'wolves', scorer: '   ' }),
    /автор/i,
  );
});

test('removing a touchdown leaves the match score unchanged', async () => {
  const { removeTouchdown } = await import('../public/match-events.js');
  const match = {
    homeScore: 12,
    awayScore: 6,
    touchdowns: [
      { id: 'td-1', teamId: 'wolves', scorer: 'Player 7' },
      { id: 'td-2', teamId: 'lynx', scorer: 'Player 12' },
    ],
  };

  removeTouchdown(match, 'td-1');

  assert.deepEqual(match, {
    homeScore: 12,
    awayScore: 6,
    touchdowns: [{ id: 'td-2', teamId: 'lynx', scorer: 'Player 12' }],
  });
});

test('recording conversions stores both one-point and two-point results', async () => {
  const { recordConversion, scoringEvents } = await import('../public/match-events.js');
  const match = { id: 'm1', homeTeamId: 'wolves', awayTeamId: 'lynx' };

  recordConversion(match, { teamId: 'wolves', scorer: 'Player 8', points: 1, clock: '04:10', period: '2' }, { id: 'xp-1', createdAt: '2026-09-12T10:06:00.000Z' });
  recordConversion(match, { teamId: 'lynx', scorer: 'Player 21', points: 2, clock: '01:15', period: '2' }, { id: 'xp-2', createdAt: '2026-09-12T10:07:00.000Z' });

  assert.deepEqual(match.conversions, [
    { id: 'xp-1', teamId: 'wolves', scorer: 'Player 8', points: 1, clock: '04:10', period: '2', createdAt: '2026-09-12T10:06:00.000Z' },
    { id: 'xp-2', teamId: 'lynx', scorer: 'Player 21', points: 2, clock: '01:15', period: '2', createdAt: '2026-09-12T10:07:00.000Z' },
  ]);
  assert.deepEqual(scoringEvents(match).map(({ type, points, scorer }) => ({ type, points, scorer })), [
    { type: 'conversion', points: 1, scorer: 'Player 8' },
    { type: 'conversion', points: 2, scorer: 'Player 21' },
  ]);
});

test('removing a conversion leaves other scoring events intact', async () => {
  const { removeConversion, scoringEvents } = await import('../public/match-events.js');
  const match = {
    touchdowns: [{ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' }],
    conversions: [
      { id: 'xp-1', teamId: 'wolves', scorer: 'Player 8', points: 1 },
      { id: 'xp-2', teamId: 'lynx', scorer: 'Player 21', points: 2 },
    ],
  };

  removeConversion(match, 'xp-1');

  assert.deepEqual(scoringEvents(match).map(({ id, points }) => ({ id, points })), [
    { id: 'td-1', points: 6 },
    { id: 'xp-2', points: 2 },
  ]);
});

test('a safety is recorded as a two-point scoring event', async () => {
  const { recordSafety, scoringEvents } = await import('../public/match-events.js');
  const match = { id: 'm1', homeTeamId: 'wolves', awayTeamId: 'lynx' };

  recordSafety(match, { teamId: 'lynx', scorer: 'Player 4', clock: '03:20', period: '2' }, { id: 'safety-1', createdAt: '2026-09-12T10:08:00.000Z' });

  assert.deepEqual(scoringEvents(match).map(({ id, type, points, scorer }) => ({ id, type, points, scorer })), [
    { id: 'safety-1', type: 'safety', points: 2, scorer: 'Player 4' },
  ]);
});
