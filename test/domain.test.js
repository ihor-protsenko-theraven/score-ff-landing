import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateStandings, validateTournament } from '../lib/tournament.js';

test('finished matches build a correctly ranked standings table', () => {
  const teams = [
    { id: 'wolves', name: 'VinWolves', division: 'open' },
    { id: 'lynx', name: 'LYNX', division: 'open' },
    { id: 'nxt', name: 'NXT', division: 'open' },
  ];
  const matches = [
    { division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx', homeScore: 12, awayScore: 9, status: 'finished' },
    { division: 'open', homeTeamId: 'nxt', awayTeamId: 'wolves', homeScore: 10, awayScore: 13, status: 'finished' },
    { division: 'open', homeTeamId: 'lynx', awayTeamId: 'nxt', homeScore: 11, awayScore: 8, status: 'finished' },
  ];

  assert.deepEqual(calculateStandings(teams, matches, 'open'), [
    { id: 'wolves', name: 'VinWolves', played: 2, wins: 2, losses: 0, pointsFor: 25, pointsAgainst: 19, difference: 6 },
    { id: 'lynx', name: 'LYNX', played: 2, wins: 1, losses: 1, pointsFor: 20, pointsAgainst: 20, difference: 0 },
    { id: 'nxt', name: 'NXT', played: 2, wins: 0, losses: 2, pointsFor: 18, pointsAgainst: 24, difference: -6 },
  ]);
});

test('a match cannot reference a team outside the tournament', () => {
  const tournament = {
    meta: { name: 'Test cup' },
    divisions: [{ id: 'open', name: 'Open' }],
    teams: [{ id: 'wolves', name: 'Wolves', division: 'open', short: 'WLV', color: '#111111' }],
    matches: [
      {
        id: 'm1',
        division: 'open',
        homeTeamId: 'wolves',
        awayTeamId: 'ghosts',
        homeScore: 1,
        awayScore: 0,
        status: 'scheduled',
        date: '2026-09-12',
        time: '10:00',
        field: 'Поле 1',
      },
    ],
  };

  assert.throws(() => validateTournament(tournament), /невідома команда/i);
});
