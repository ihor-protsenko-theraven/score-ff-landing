function clean(value) {
  return String(value || '').trim();
}

function eventId(prefix) {
  return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validateMatchTeam(match, teamId) {
  if (![match.homeTeamId, match.awayTeamId].includes(teamId)) throw new Error('Оберіть команду цього матчу');
}

function scoringContext(input, options, prefix) {
  return {
    id: options.id || eventId(prefix),
    teamId: clean(input.teamId),
    scorer: clean(input.scorer),
    clock: clean(input.clock),
    period: clean(input.period),
    createdAt: options.createdAt || new Date().toISOString(),
  };
}

export function recordTouchdown(match, input, options = {}) {
  const teamId = clean(input.teamId);
  const scorer = clean(input.scorer);
  validateMatchTeam(match, teamId);
  if (!scorer) throw new Error('Вкажіть автора тачдауну');

  const touchdown = scoringContext({ ...input, teamId, scorer }, options, 'td');

  match.touchdowns ||= [];
  match.touchdowns.push(touchdown);
  return touchdown;
}

export function removeTouchdown(match, touchdownId) {
  match.touchdowns = (match.touchdowns || []).filter((touchdown) => touchdown.id !== touchdownId);
}

export function recordConversion(match, input, options = {}) {
  const teamId = clean(input.teamId);
  const scorer = clean(input.scorer);
  const points = Number(input.points);
  validateMatchTeam(match, teamId);
  if (!scorer) throw new Error('Вкажіть автора реалізації');
  if (![1, 2].includes(points)) throw new Error('Реалізація може коштувати 1 або 2 очки');

  const conversion = {
    ...scoringContext({ ...input, teamId, scorer }, options, 'xp'),
    points,
  };

  match.conversions ||= [];
  match.conversions.push(conversion);
  return conversion;
}

export function removeConversion(match, conversionId) {
  match.conversions = (match.conversions || []).filter((conversion) => conversion.id !== conversionId);
}

export function recordSafety(match, input, options = {}) {
  const teamId = clean(input.teamId);
  const scorer = clean(input.scorer);
  validateMatchTeam(match, teamId);
  if (!scorer) throw new Error('Вкажіть автора сейфті');

  const safety = scoringContext({ ...input, teamId, scorer }, options, 'safety');
  match.safeties ||= [];
  match.safeties.push(safety);
  return safety;
}

export function removeSafety(match, safetyId) {
  match.safeties = (match.safeties || []).filter((safety) => safety.id !== safetyId);
}

export function scoringEvents(match) {
  const events = [
    ...(match.touchdowns || []).map((event, index) => ({ ...event, type: 'touchdown', points: 6, index })),
    ...(match.conversions || []).map((event, index) => ({ ...event, type: 'conversion', points: Number(event.points), index })),
    ...(match.safeties || []).map((event, index) => ({ ...event, type: 'safety', points: 2, index })),
  ];

  return events.sort((a, b) => {
    const byTime = String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
    return byTime || a.index - b.index;
  });
}
