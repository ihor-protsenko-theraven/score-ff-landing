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
