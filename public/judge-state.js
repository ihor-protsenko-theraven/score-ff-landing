export function parseClock(value) {
  const match = /^(\d{1,3}):([0-5]\d)$/.exec(String(value || '').trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

export function formatClock(value) {
  const totalSeconds = Math.max(0, Math.floor(Number(value) || 0));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function scoreAfter(currentScore, delta) {
  return Math.max(0, (Number(currentScore) || 0) + Number(delta || 0));
}

export function togglePossession(match, side) {
  if (!match || !['home', 'away'].includes(side)) return null;
  const teamId = side === 'home' ? match.homeTeamId : match.awayTeamId;
  if (!teamId) return match.possessionTeamId || null;
  match.possessionTeamId = match.possessionTeamId === teamId ? null : teamId;
  return match.possessionTeamId;
}

export const DEFAULT_HALF_DURATION_MINUTES = 20;
export const TIMEOUTS_PER_HALF = 2;

export function halfDurationSeconds(tournament = {}) {
  const minutes = tournament.settings?.halfDurationMinutes;
  return (Number.isInteger(minutes) && minutes > 0 ? minutes : DEFAULT_HALF_DURATION_MINUTES) * 60;
}

function usedTimeouts(match, period, side) {
  if (!['1', '2'].includes(String(period)) || !['home', 'away'].includes(side)) return 0;
  const value = match?.timeouts?.[String(period)]?.[side];
  return Number.isInteger(value) ? Math.min(TIMEOUTS_PER_HALF, Math.max(0, value)) : 0;
}

export function remainingTimeouts(match, period, side) {
  return TIMEOUTS_PER_HALF - usedTimeouts(match, period, side);
}

export function timeoutControlState(match, period, side) {
  const available = ['1', '2'].includes(String(period)) && ['home', 'away'].includes(side);
  const remaining = available ? remainingTimeouts(match, period, side) : 0;
  return {
    available,
    remaining,
    canUse: available && remaining > 0,
    canUndo: available && remaining < TIMEOUTS_PER_HALF,
  };
}

export function changeTimeoutUsage(match, period, side, delta) {
  const half = String(period);
  if (!match || !['1', '2'].includes(half) || !['home', 'away'].includes(side)) return false;
  const current = usedTimeouts(match, half, side);
  const next = current + Number(delta || 0);
  if (!Number.isInteger(next) || next < 0 || next > TIMEOUTS_PER_HALF) return false;
  match.timeouts ||= {};
  match.timeouts[half] ||= { home: 0, away: 0 };
  match.timeouts[half][side] = next;
  return true;
}

export function restoreRunningClock(storedClock, now = Date.now()) {
  if (
    !storedClock
    || typeof storedClock !== 'object'
    || !storedClock.running
    || typeof storedClock.startedAt !== 'number'
    || typeof storedClock.startedSeconds !== 'number'
  ) {
    return null;
  }
  const elapsed = Math.floor(Math.max(0, now - storedClock.startedAt) / 1000);
  const remaining = Math.max(0, storedClock.startedSeconds - elapsed);
  return {
    running: remaining > 0,
    seconds: remaining,
    startedSeconds: storedClock.startedSeconds,
    startedAt: storedClock.startedAt,
    expired: remaining === 0,
  };
}
