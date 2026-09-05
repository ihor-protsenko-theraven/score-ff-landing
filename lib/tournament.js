export function calculateStandings(teams, matches, division) {
  const table = new Map(
    teams
      .filter((team) => team.division === division)
      .map((team) => [
        team.id,
        {
          id: team.id,
          name: team.name,
          played: 0,
          wins: 0,
          losses: 0,
          pointsFor: 0,
          pointsAgainst: 0,
          difference: 0,
        },
      ]),
  );

  for (const match of matches) {
    if (match.division !== division || match.status !== 'finished') continue;
    const home = table.get(match.homeTeamId);
    const away = table.get(match.awayTeamId);
    if (!home || !away) continue;

    const homeScore = Number(match.homeScore) || 0;
    const awayScore = Number(match.awayScore) || 0;
    home.played += 1;
    away.played += 1;
    home.pointsFor += homeScore;
    home.pointsAgainst += awayScore;
    away.pointsFor += awayScore;
    away.pointsAgainst += homeScore;

    if (homeScore > awayScore) {
      home.wins += 1;
      away.losses += 1;
    } else if (awayScore > homeScore) {
      away.wins += 1;
      home.losses += 1;
    }
  }

  for (const team of table.values()) {
    team.difference = team.pointsFor - team.pointsAgainst;
  }

  return [...table.values()].sort(
    (a, b) => b.wins - a.wins || b.difference - a.difference || b.pointsFor - a.pointsFor || a.name.localeCompare(b.name),
  );
}

const MATCH_STATUSES = new Set(['scheduled', 'live', 'halftime', 'finished']);

export function validateTournament(tournament) {
  if (!tournament || typeof tournament !== 'object') throw new Error('Некоректні дані турніру');
  if (!tournament.meta?.name?.trim()) throw new Error('Назва турніру обов’язкова');
  if (!Array.isArray(tournament.divisions) || !Array.isArray(tournament.teams) || !Array.isArray(tournament.matches)) {
    throw new Error('Дивізіони, команди та матчі мають бути списками');
  }

  const divisionIds = new Set(tournament.divisions.map((division) => division.id));
  const teamIds = new Set();
  for (const team of tournament.teams) {
    if (!team.id || teamIds.has(team.id)) throw new Error('ID команд мають бути унікальними');
    if (!team.name?.trim()) throw new Error('Назва команди обов’язкова');
    if (!divisionIds.has(team.division)) throw new Error(`Невідомий дивізіон команди: ${team.name}`);
    teamIds.add(team.id);
  }

  const matchIds = new Set();
  for (const match of tournament.matches) {
    if (!match.id || matchIds.has(match.id)) throw new Error('ID матчів мають бути унікальними');
    if (!teamIds.has(match.homeTeamId) || !teamIds.has(match.awayTeamId)) {
      throw new Error(`Матч ${match.id}: невідома команда`);
    }
    if (match.homeTeamId === match.awayTeamId) throw new Error(`Матч ${match.id}: команда не може грати сама з собою`);
    if (!divisionIds.has(match.division)) throw new Error(`Матч ${match.id}: невідомий дивізіон`);
    if (!MATCH_STATUSES.has(match.status)) throw new Error(`Матч ${match.id}: невідомий статус`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(match.date || '')) throw new Error(`Матч ${match.id}: некоректна дата`);
    if (!/^\d{2}:\d{2}$/.test(match.time || '')) throw new Error(`Матч ${match.id}: некоректний час`);
    if (![match.homeScore, match.awayScore].every((score) => Number.isInteger(score) && score >= 0)) {
      throw new Error(`Матч ${match.id}: рахунок має бути цілим невід’ємним числом`);
    }
    matchIds.add(match.id);
  }

  return true;
}
