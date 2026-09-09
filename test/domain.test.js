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

function tournamentWithTouchdown(touchdown) {
  return {
    meta: { name: 'Test cup' },
    divisions: [{ id: 'open', name: 'Open' }],
    teams: [
      { id: 'wolves', name: 'Wolves', division: 'open' },
      { id: 'lynx', name: 'Lynx', division: 'open' },
      { id: 'nxt', name: 'NXT', division: 'open' },
    ],
    matches: [{
      id: 'm1', division: 'open', homeTeamId: 'wolves', awayTeamId: 'lynx',
      homeScore: 6, awayScore: 0, status: 'live', date: '2026-09-12', time: '10:00',
      touchdowns: [touchdown],
    }],
  };
}

function tournamentWithConversion(conversion) {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.matches[0].conversions = [conversion];
  return tournament;
}

test('a touchdown scorer must belong to one of the teams in the match', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'nxt', scorer: 'Player 7', clock: '05:42', period: '1' });

  assert.throws(() => validateTournament(tournament), /тачдаун.*команд/i);
});

test('a touchdown requires the scorer name', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: '   ', clock: '05:42', period: '1' });

  assert.throws(() => validateTournament(tournament), /автор.*тачдаун/i);
});

test('a conversion is worth exactly one or two points', () => {
  const tournament = tournamentWithConversion({ id: 'xp-1', teamId: 'wolves', scorer: 'Player 8', points: 3 });

  assert.throws(() => validateTournament(tournament), /реалізаці.*1 або 2/i);
});

test('a running match clock uses minutes and valid seconds', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.matches[0].clock = '18:99';

  assert.throws(() => validateTournament(tournament), /ігровий час/i);
});

test('a safety must belong to a team in the match', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.matches[0].safeties = [{ id: 'safety-1', teamId: 'nxt', scorer: 'Player 4' }];

  assert.throws(() => validateTournament(tournament), /сейфті.*команд/i);
});

test('half duration must be a positive whole number of minutes', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.settings = { halfDurationMinutes: 15.5 };

  assert.throws(() => validateTournament(tournament), /тривалість половини/i);
});

test('a team cannot use more than two timeouts in one half', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.matches[0].timeouts = { 1: { home: 3, away: 0 }, 2: { home: 0, away: 0 } };

  assert.throws(() => validateTournament(tournament), /тайм.?аут/i);
});

test('possession can only belong to a team playing in the match', () => {
  const tournament = tournamentWithTouchdown({ id: 'td-1', teamId: 'wolves', scorer: 'Player 7' });
  tournament.matches[0].possessionTeamId = 'nxt';

  assert.throws(() => validateTournament(tournament), /володіння.*команд/i);
});
