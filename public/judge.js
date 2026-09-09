import {
  changeTimeoutUsage,
  formatClock,
  halfDurationSeconds,
  parseClock,
  remainingTimeouts,
  restoreRunningClock,
  scoreAfter,
  timeoutControlState,
  togglePossession,
} from './judge-state.js';

const judgeLogin = document.querySelector('#judgeLogin');
const judgeApp = document.querySelector('#judgeApp');
const judgeConsole = document.querySelector('#judgeConsole');
const judgeEmpty = document.querySelector('#judgeEmpty');
const matchSelect = document.querySelector('#judgeMatchSelect');
const clockOutput = document.querySelector('#judgeClock');
const clockToggle = document.querySelector('#judgeClockToggle');
const clockReset = document.querySelector('#judgeResetClock');
const timeoutCard = document.querySelector('#judgeTimeoutCard');
const syncIndicator = document.querySelector('#judgeSync');
const toast = document.querySelector('#judgeToast');
const clockDialog = document.querySelector('#judgeClockDialog');
const openClockModalBtn = document.querySelector('#judgeOpenClockModal');
const closeClockModalBtn = document.querySelector('#closeJudgeClockDialog');
const clockForm = document.querySelector('#judgeClockForm');
const clockMinutesInput = document.querySelector('#judgeClockMinutes');
const clockSecondsInput = document.querySelector('#judgeClockSeconds');

const copy = {
  uk: {
    syncReady: 'Синхронізовано', syncSaving: 'Зберігаємо…', syncError: 'Помилка синхронізації', syncOffline: 'Немає мережі', syncReconnect: 'Відновлюємо зв’язок…',
    quickAccess: 'ШВИДКИЙ ДОСТУП', refereePanel: 'Суддівська панель', loginHint: 'Введіть пароль один раз. Сесія збережеться на цьому пристрої на 18 годин.',
    refereePassword: 'Пароль судді', enterPassword: 'Введіть пароль', openMatchBtn: 'Відкрити матч', publicPageLink: '← Публічна сторінка',
    matchLabel: 'Матч', matchSelectAria: 'Вибір матчу',
    noMatchesTitle: 'Матчів поки немає', noMatchesDesc: 'Адміністратор має спочатку додати матч до турніру.', refreshBtn: 'Оновити',
    timeLabel: 'Час', clickToSetTimeTitle: 'Натисніть, щоб задати час', startBtn: 'Старт', pauseBtn: 'Пауза', setTimeBtn: 'Задати час',
    gameStateLabel: 'Стан розіграшу', downLabel: 'Даун', periodLabel: 'Період', possessionLabel: 'Володіння', noneLabel: 'Нічиє',
    scoreLabel: 'Рахунок', scoreHint: 'Натисніть на картку команди, щоб змінити володіння. Авторів занесень паралельно додає статистик в адмінці.',
    correctionMinus1: '−1', timeoutsLabel: 'Тайм-аути', timeoutsHint: 'По 2 на кожну команду в кожній половині. Натискання зупиняє ігровий час.', overtimeTimeoutHint: 'В овертаймі командні тайм-аути недоступні.',
    leftLabel: 'залишилось', undoBtn: 'Скасувати', timeoutBtn: 'Тайм-аут',
    matchStatusLabel: 'Статус матчу', liveBtn: 'Наживо', halftimeBtn: 'Перерва', finishedBtn: 'Завершено',
    setTimeTitle: 'Задати час', closeBtn: 'Закрити', setTimeHint: 'Вкажіть потрібний час матчу або виберіть швидкий пресет:',
    minutesLabel: 'Хвилини', secondsLabel: 'Секунди', setTimeSubmit: 'Встановити час',
    brandLink: 'FLAG SCORE — публічна сторінка', logout: 'Вийти із суддівської панелі',
    half: 'половина', overtime: 'OT', timeOutMsg: 'Час вийшов',
    cancelTimeoutMsg: 'Скасовано тайм-аут', timeoutLimitError: 'Ліміт тайм-аутів для цієї половини вичерпано',
    scheduled: 'Заплановано', liveStatus: 'Наживо', halftime: 'Перерва', finished: 'Завершено',
    setTimerPrompt: 'Поставити таймер на', setTimeError: 'Спочатку встановіть час', setTimeSuccess: 'Час встановлено на',
    sessionExpired: 'Сесія завершилася. Введіть пароль ще раз.', wrongPassword: 'Невірний пароль',
    loadError: 'Не вдалося завантажити турнір', syncFailed: 'Не вдалося синхронізувати матч',
    homeBtn: 'Господарі', awayBtn: 'Гості', togglePossessionTitle: 'Змінити володіння',
  },
  en: {
    syncReady: 'Synced', syncSaving: 'Saving…', syncError: 'Sync error', syncOffline: 'Offline', syncReconnect: 'Reconnecting…',
    quickAccess: 'QUICK ACCESS', refereePanel: 'Referee Panel', loginHint: 'Enter password once. Session is saved on this device for 18 hours.',
    refereePassword: 'Referee Password', enterPassword: 'Enter password', openMatchBtn: 'Open Match', publicPageLink: '← Public Page',
    matchLabel: 'Match', matchSelectAria: 'Match selection',
    noMatchesTitle: 'No matches yet', noMatchesDesc: 'The administrator must add a match to the tournament first.', refreshBtn: 'Refresh',
    timeLabel: 'Clock', clickToSetTimeTitle: 'Click to set time', startBtn: 'Start', pauseBtn: 'Pause', setTimeBtn: 'Set time',
    gameStateLabel: 'Game State', downLabel: 'Down', periodLabel: 'Period', possessionLabel: 'Possession', noneLabel: 'None',
    scoreLabel: 'Score', scoreHint: 'Tap a team card to change possession. The statistician records scorers in the admin panel.',
    correctionMinus1: '−1', timeoutsLabel: 'Timeouts', timeoutsHint: '2 per team per half. Clicking stops the game clock.', overtimeTimeoutHint: 'Team timeouts are unavailable in overtime.',
    leftLabel: 'left', undoBtn: 'Undo', timeoutBtn: 'Timeout',
    matchStatusLabel: 'Match Status', liveBtn: 'Live', halftimeBtn: 'Halftime', finishedBtn: 'Finished',
    setTimeTitle: 'Set Time', closeBtn: 'Close', setTimeHint: 'Enter match time or select a quick preset:',
    minutesLabel: 'Minutes', secondsLabel: 'Seconds', setTimeSubmit: 'Set Time',
    brandLink: 'FLAG SCORE — public page', logout: 'Log out of referee panel',
    half: 'half', overtime: 'OT', timeOutMsg: 'Time is up',
    cancelTimeoutMsg: 'Canceled timeout', timeoutLimitError: 'Timeout limit reached for this half',
    scheduled: 'Scheduled', liveStatus: 'Live', halftime: 'Halftime', finished: 'Finished',
    setTimerPrompt: 'Set timer to', setTimeError: 'Set the time first', setTimeSuccess: 'Time set to',
    sessionExpired: 'Session expired. Please enter your password again.', wrongPassword: 'Wrong password',
    loadError: 'Failed to load tournament', syncFailed: 'Failed to sync match',
    homeBtn: 'Home', awayBtn: 'Away', togglePossessionTitle: 'Toggle possession',
  }
};

let language = localStorage.getItem('flag-score-judge-language') || 'uk';
const t = (key) => copy[language][key] || key;

function updateChrome() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder));
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  document.querySelectorAll('.judge-lang-toggle button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === language));
  });
}

const TOKEN_KEY = 'flag-score-judge-token';
const EXPIRY_KEY = 'flag-score-judge-expiry';
const CLOCK_STORAGE_PREFIX = 'flag-score-judge-clock:';
const ACTIVE_STATUSES = new Set(['live', 'halftime']);

function clockStorageKey(matchId) {
  return `${CLOCK_STORAGE_PREFIX}${matchId}`;
}

function loadStoredClock(matchId) {
  if (!matchId) return null;
  try {
    const raw = localStorage.getItem(clockStorageKey(matchId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredClock(matchId, clockData) {
  if (!matchId) return;
  try {
    localStorage.setItem(clockStorageKey(matchId), JSON.stringify(clockData));
  } catch {
    // Ignore storage quota or disabled errors
  }
}

const state = {
  data: null,
  matchId: null,
  token: localStorage.getItem(TOKEN_KEY) || '',
  expiresAt: localStorage.getItem(EXPIRY_KEY) || '',
  clockSeconds: 0,
  clockRunning: false,
  clockStartedAt: 0,
  clockStartedSeconds: 0,
  timerId: null,
  lastClockSync: 0,
  syncChain: Promise.resolve(),
  pendingSaves: 0,
};

function selectedMatch() {
  return state.data?.matches.find((match) => match.id === state.matchId);
}

function teamName(teamId) {
  return state.data?.teams.find((team) => team.id === teamId)?.name || 'TBD';
}

function sessionIsFresh() {
  return Boolean(state.token) && Date.parse(state.expiresAt) > Date.now();
}

function clearSession() {
  state.token = '';
  state.expiresAt = '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function setSyncState(status, label) {
  syncIndicator.dataset.state = status;
  syncIndicator.querySelector('span').textContent = label;
}

function showLogin(message = '') {
  stopClock(false);
  judgeApp.hidden = true;
  judgeLogin.hidden = false;
  document.querySelector('#judgeLoginError').textContent = message;
  document.querySelector('#judgePasswordInput').focus();
}

function showApp() {
  judgeLogin.hidden = true;
  judgeApp.hidden = false;
}

function statusLabel(status) {
  return ({ scheduled: t('scheduled'), live: t('liveStatus'), halftime: t('halftime'), finished: t('finished') })[status] || status;
}

function orderedMatches() {
  return [...(state.data?.matches || [])].sort((a, b) => {
    const liveOrder = Number(ACTIVE_STATUSES.has(b.status)) - Number(ACTIVE_STATUSES.has(a.status));
    return liveOrder || `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`);
  });
}

function chooseMatch() {
  const matches = orderedMatches();
  const requestedId = new URLSearchParams(location.search).get('match');
  if (matches.some((match) => match.id === state.matchId)) return;
  state.matchId = matches.find((match) => match.id === requestedId)?.id
    || matches.find((match) => ACTIVE_STATUSES.has(match.status))?.id
    || matches[0]?.id
    || null;
}

function renderMatchPicker() {
  const matches = orderedMatches();
  matchSelect.replaceChildren(...matches.map((match) => {
    const option = document.createElement('option');
    option.value = match.id;
    option.textContent = `${teamName(match.homeTeamId)} — ${teamName(match.awayTeamId)} · ${match.field}`;
    return option;
  }));
  matchSelect.disabled = matches.length === 0;
  if (state.matchId) matchSelect.value = state.matchId;
}

function effectiveClockSeconds() {
  if (!state.clockRunning) return state.clockSeconds;
  const elapsed = Math.floor((Date.now() - state.clockStartedAt) / 1000);
  return Math.max(0, state.clockStartedSeconds - elapsed);
}

function settleClock() {
  state.clockSeconds = effectiveClockSeconds();
  state.clockStartedSeconds = state.clockSeconds;
  state.clockStartedAt = Date.now();
  const match = selectedMatch();
  if (match) match.clock = formatClock(state.clockSeconds);
}

function renderClock() {
  const seconds = effectiveClockSeconds();
  clockOutput.textContent = formatClock(seconds);
  clockOutput.classList.toggle('is-running', state.clockRunning);
  clockToggle.setAttribute('aria-pressed', String(state.clockRunning));
  clockToggle.innerHTML = state.clockRunning ? `<span aria-hidden="true">Ⅱ</span> <span data-i18n="pauseBtn">${t('pauseBtn')}</span>` : `<span aria-hidden="true">▶</span> <span data-i18n="startBtn">${t('startBtn')}</span>`;
  clockReset.textContent = `${language === 'uk' ? 'Поставити' : 'Set to'} ${formatClock(halfDurationSeconds(state.data))}`;
}

function renderPressedState(selector, value, attribute) {
  document.querySelectorAll(selector).forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset[attribute] === String(value)));
  });
}

function renderTimeouts(match, homeName, awayName) {
  const period = String(match.period || '1');
  const isRegulationHalf = ['1', '2'].includes(period);
  timeoutCard.hidden = false;
  timeoutCard.classList.toggle('is-unavailable', !isRegulationHalf);
  document.querySelector('#judgeTimeoutPeriod').textContent = period === 'OT' ? t('overtime') : `${period} ${t('half')}`;
  document.querySelector('#judgeTimeoutHint').textContent = isRegulationHalf ? t('timeoutsHint') : t('overtimeTimeoutHint');
  document.querySelector('#judgeHomeTimeoutName').textContent = homeName;
  document.querySelector('#judgeAwayTimeoutName').textContent = awayName;
  for (const side of ['home', 'away']) {
    const controls = timeoutControlState(match, period, side);
    document.querySelector(`#judge${side === 'home' ? 'Home' : 'Away'}Timeouts`).textContent = controls.remaining;
    timeoutCard.querySelector(`[data-timeout-side="${side}"][data-timeout-action="use"]`).disabled = !controls.canUse;
    timeoutCard.querySelector(`[data-timeout-side="${side}"][data-timeout-action="undo"]`).disabled = !controls.canUndo;
  }
}

function renderMatch() {
  const match = selectedMatch();
  const hasMatch = Boolean(match);
  judgeEmpty.hidden = hasMatch;
  judgeConsole.hidden = !hasMatch;
  document.querySelector('.judge-picker').hidden = !hasMatch;
  if (!match) return;

  matchSelect.value = match.id;
  const homeName = teamName(match.homeTeamId);
  const awayName = teamName(match.awayTeamId);
  document.querySelector('#judgeHomeName').textContent = homeName;
  document.querySelector('#judgeAwayName').textContent = awayName;
  document.querySelector('#judgeHomeScore').textContent = match.homeScore;
  document.querySelector('#judgeAwayScore').textContent = match.awayScore;
  document.querySelector('#judgeMatchMeta').textContent = `${statusLabel(match.status)} · ${match.date} ${match.time} · ${match.field}`;
  renderPressedState('[data-down]', match.down || 1, 'down');
  renderPressedState('[data-period]', match.period || '1', 'period');
  renderPressedState('[data-match-status]', match.status, 'matchStatus');
  renderTimeouts(match, homeName, awayName);
  document.querySelectorAll('[data-possession-side]').forEach((button) => {
    const isHome = button.dataset.possessionSide === 'home';
    const teamId = isHome ? match.homeTeamId : match.awayTeamId;
    const name = isHome ? homeName : awayName;
    const isActive = match.possessionTeamId === teamId;
    button.setAttribute('aria-pressed', String(isActive));
    button.setAttribute('aria-label', `${t('togglePossessionTitle')}: ${name}`);
    button.closest('.judge-team')?.classList.toggle('is-possession', isActive);
  });
  document.querySelectorAll('[data-score-side]').forEach((button) => {
    const scoringTeam = button.dataset.scoreSide === 'home' ? homeName : awayName;
    button.setAttribute('aria-label', `${button.dataset.play}, ${scoringTeam}`);
  });
  renderClock();
}

function prepareSelectedClock() {
  const match = selectedMatch();
  if (!match) return;

  const defaultSeconds = parseClock(match.clock || formatClock(halfDurationSeconds(state.data)));
  const stored = loadStoredClock(match.id);
  const restored = match.status !== 'finished' ? restoreRunningClock(stored) : null;

  if (restored) {
    if (restored.running) {
      state.clockRunning = true;
      state.clockSeconds = restored.seconds;
      state.clockStartedSeconds = restored.startedSeconds;
      state.clockStartedAt = restored.startedAt;
      state.lastClockSync = restored.seconds;
      match.clock = formatClock(restored.seconds);

      if (state.timerId) clearInterval(state.timerId);
      state.timerId = setInterval(tickClock, 250);
      queueSync();
      return;
    }

    if (restored.expired) {
      state.clockRunning = false;
      state.clockSeconds = 0;
      state.clockStartedSeconds = 0;
      state.clockStartedAt = Date.now();
      state.lastClockSync = 0;
      match.clock = '00:00';
      saveStoredClock(match.id, { running: false, seconds: 0 });
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
      queueSync();
      showToast(t('timeOutMsg'));
      return;
    }
  }

  state.clockRunning = false;
  if (state.timerId) {
    clearInterval(state.timerId);
    state.timerId = null;
  }
  state.clockSeconds = defaultSeconds;
  state.clockStartedSeconds = state.clockSeconds;
  state.clockStartedAt = Date.now();
  state.lastClockSync = state.clockSeconds;
  match.clock = formatClock(state.clockSeconds);
}

function judgePatch() {
  const match = selectedMatch();
  if (!match) return null;
  settleClock();
  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    clock: match.clock,
    down: match.down || 1,
    period: match.period || '1',
    possessionTeamId: match.possessionTeamId || null,
    status: match.status,
    lastPlay: match.lastPlay || '',
    timeouts: match.timeouts,
  };
}

async function sendPatch(matchId, patch) {
  const response = await fetch('/api/tournament', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
    body: JSON.stringify({ matchId, patch }),
  });
  const result = await response.json();
  if (response.status === 401) {
    clearSession();
    showLogin(t('sessionExpired'));
    throw new Error(result.error || t('sessionExpired'));
  }
  if (!response.ok) throw new Error(result.error || t('syncFailed'));
  const match = state.data?.matches.find((item) => item.id === matchId);
  if (match) match.judgeUpdatedAt = result.match?.judgeUpdatedAt;
}

function queueSync() {
  const match = selectedMatch();
  if (!match || !state.token) return Promise.resolve();
  const matchId = match.id;
  const patch = judgePatch();
  state.pendingSaves += 1;
  setSyncState('saving', 'Зберігаємо…');

  const operation = state.syncChain.then(() => sendPatch(matchId, patch));
  state.syncChain = operation.catch(() => {});
  operation
    .then(() => {
      if (state.pendingSaves === 1) setSyncState('ready', t('syncReady'));
    })
    .catch((error) => {
      setSyncState('error', navigator.onLine ? t('syncError') : t('syncOffline'));
      showToast(error.message, 'error');
    })
    .finally(() => {
      state.pendingSaves = Math.max(0, state.pendingSaves - 1);
    });
  return operation;
}

function stopClock(sync = true) {
  if (!state.clockRunning) return;
  settleClock();
  state.clockRunning = false;
  clearInterval(state.timerId);
  state.timerId = null;
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: false,
      seconds: state.clockSeconds,
    });
  }
  renderClock();
  if (sync) queueSync();
}

function tickClock() {
  const seconds = effectiveClockSeconds();
  renderClock();
  if (seconds === 0) {
    stopClock();
    showToast(t('timeOutMsg'));
    return;
  }
  if (Math.abs(seconds - state.lastClockSync) >= 5) {
    state.lastClockSync = seconds;
    queueSync();
  }
}

function toggleClock() {
  if (state.clockRunning) {
    stopClock();
    return;
  }
  if (state.clockSeconds <= 0) return showToast(t('setTimeError'), 'error');
  const match = selectedMatch();
  if (['scheduled', 'halftime'].includes(match.status)) match.status = 'live';
  state.clockRunning = true;
  state.clockStartedSeconds = state.clockSeconds;
  state.clockStartedAt = Date.now();
  state.lastClockSync = state.clockSeconds;
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: true,
      startedAt: state.clockStartedAt,
      startedSeconds: state.clockStartedSeconds,
    });
  }
  state.timerId = setInterval(tickClock, 250);
  renderMatch();
  queueSync();
}

function adjustClock(delta) {
  settleClock();
  state.clockSeconds = Math.max(0, state.clockSeconds + delta);
  state.clockStartedSeconds = state.clockSeconds;
  state.clockStartedAt = Date.now();
  selectedMatch().clock = formatClock(state.clockSeconds);
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: state.clockRunning,
      startedAt: state.clockStartedAt,
      startedSeconds: state.clockStartedSeconds,
      seconds: state.clockSeconds,
    });
  }
  renderClock();
  queueSync();
}

async function loadTournament({ quiet = false } = {}) {
  try {
    const response = await fetch('/api/tournament', { cache: 'no-store' });
    if (!response.ok) throw new Error('Не вдалося завантажити турнір');
    state.data = await response.json();
    chooseMatch();
    renderMatchPicker();
    prepareSelectedClock();
    renderMatch();
    updateChrome();
    if (!quiet) setSyncState('ready', t('syncReady'));
  } catch (error) {
    setSyncState('error', navigator.onLine ? t('syncError') : t('syncOffline'));
    if (!quiet) showToast(t('loadError'), 'error');
  }
}

async function authenticate(password) {
  const response = await fetch('/api/judge/verify', {
    method: 'POST',
    headers: { 'X-Judge-Password': password },
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || t('wrongPassword'));
  state.token = result.token;
  state.expiresAt = result.expiresAt;
  localStorage.setItem(TOKEN_KEY, result.token);
  localStorage.setItem(EXPIRY_KEY, result.expiresAt);
}

document.querySelector('#judgeLoginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const error = document.querySelector('#judgeLoginError');
  button.disabled = true;
  button.textContent = 'Входимо…';
  error.textContent = '';
  try {
    await authenticate(document.querySelector('#judgePasswordInput').value);
    showApp();
    await loadTournament();
  } catch (loginError) {
    error.textContent = loginError.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Відкрити матч <span>→</span>';
  }
});

matchSelect.addEventListener('change', () => {
  stopClock();
  state.matchId = matchSelect.value;
  const url = new URL(location.href);
  url.searchParams.set('match', state.matchId);
  history.replaceState(null, '', url);
  prepareSelectedClock();
  renderMatch();
});

clockToggle.addEventListener('click', toggleClock);
document.querySelectorAll('[data-clock-delta]').forEach((button) => {
  button.addEventListener('click', () => adjustClock(Number(button.dataset.clockDelta)));
});
clockReset.addEventListener('click', () => {
  const resetSeconds = halfDurationSeconds(state.data);
  const resetClock = formatClock(resetSeconds);
  if (state.clockSeconds !== 0 && !confirm(`${t('setTimerPrompt')} ${resetClock}?`)) return;
  stopClock(false);
  state.clockSeconds = resetSeconds;
  state.clockStartedSeconds = state.clockSeconds;
  state.clockStartedAt = Date.now();
  selectedMatch().clock = formatClock(state.clockSeconds);
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: false,
      seconds: resetSeconds,
    });
  }
  renderClock();
  queueSync();
});

function openClockDialog() {
  if (!selectedMatch()) return;
  const currentSeconds = effectiveClockSeconds();
  const mins = Math.floor(currentSeconds / 60);
  const secs = currentSeconds % 60;
  if (clockMinutesInput) clockMinutesInput.value = mins;
  if (clockSecondsInput) clockSecondsInput.value = String(secs).padStart(2, '0');
  clockDialog?.showModal();
  clockMinutesInput?.focus();
  clockMinutesInput?.select();
}

function closeClockDialog() {
  clockDialog?.close();
}

clockOutput?.addEventListener('click', openClockDialog);
openClockModalBtn?.addEventListener('click', openClockDialog);
closeClockModalBtn?.addEventListener('click', closeClockDialog);

document.querySelector('#judgeClockPresets')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-preset]');
  if (!button) return;
  const [mins, secs] = button.dataset.preset.split(':').map(Number);
  if (clockMinutesInput) clockMinutesInput.value = mins;
  if (clockSecondsInput) clockSecondsInput.value = String(secs).padStart(2, '0');
});

clockForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const mins = Math.max(0, Math.min(99, parseInt(clockMinutesInput?.value, 10) || 0));
  const secs = Math.max(0, Math.min(59, parseInt(clockSecondsInput?.value, 10) || 0));
  const targetSeconds = mins * 60 + secs;
  stopClock(false);
  state.clockSeconds = targetSeconds;
  state.clockStartedSeconds = targetSeconds;
  state.clockStartedAt = Date.now();
  const match = selectedMatch();
  if (match) match.clock = formatClock(targetSeconds);
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: false,
      seconds: targetSeconds,
    });
  }
  renderClock();
  queueSync();
  closeClockDialog();
  showToast(`${t('setTimeSuccess')} ${formatClock(targetSeconds)}`);
});

document.querySelector('#judgeDowns').addEventListener('click', (event) => {
  const button = event.target.closest('[data-down]');
  if (!button) return;
  selectedMatch().down = Number(button.dataset.down);
  renderMatch();
  queueSync();
  navigator.vibrate?.(20);
});

document.querySelector('#judgePeriods').addEventListener('click', (event) => {
  const button = event.target.closest('[data-period]');
  if (!button) return;
  selectedMatch().period = button.dataset.period;
  renderMatch();
  queueSync();
});

timeoutCard.addEventListener('click', (event) => {
  const button = event.target.closest('[data-timeout-action]');
  if (!button) return;
  const match = selectedMatch();
  const period = String(match.period || '1');
  const delta = button.dataset.timeoutAction === 'use' ? 1 : -1;
  if (!changeTimeoutUsage(match, period, button.dataset.timeoutSide, delta)) {
    showToast(t('timeoutLimitError'), 'error');
    return;
  }
  stopClock(false);
  const timeoutTeam = teamName(button.dataset.timeoutSide === 'home' ? match.homeTeamId : match.awayTeamId);
  match.lastPlay = `${delta > 0 ? t('timeoutBtn') : t('cancelTimeoutMsg')} · ${timeoutTeam} · ${period === 'OT' ? t('overtime') : `${period} ${t('half')}`}`;
  renderMatch();
  queueSync();
  navigator.vibrate?.(30);
});

document.querySelector('.judge-scoreboard').addEventListener('click', (event) => {
  const possessionButton = event.target.closest('[data-possession-side]');
  if (possessionButton) {
    togglePossession(selectedMatch(), possessionButton.dataset.possessionSide);
    renderMatch();
    queueSync();
    navigator.vibrate?.(20);
    return;
  }
  const button = event.target.closest('[data-score-side]');
  if (!button) return;
  const match = selectedMatch();
  const field = button.dataset.scoreSide === 'home' ? 'homeScore' : 'awayScore';
  match[field] = scoreAfter(match[field], Number(button.dataset.scoreDelta));
  const scoringTeam = teamName(button.dataset.scoreSide === 'home' ? match.homeTeamId : match.awayTeamId);
  match.lastPlay = `${button.dataset.play} · ${scoringTeam}`;
  renderMatch();
  queueSync();
  navigator.vibrate?.(25);
});

document.querySelector('.judge-match-status').addEventListener('click', (event) => {
  const button = event.target.closest('[data-match-status]');
  if (!button) return;
  if (button.dataset.matchStatus !== 'live') stopClock(false);
  selectedMatch().status = button.dataset.matchStatus;
  renderMatch();
  queueSync();
});

document.querySelector('#judgeReload').addEventListener('click', () => loadTournament());
document.querySelector('#judgeLogout').addEventListener('click', () => {
  clearSession();
  showLogin();
});

window.addEventListener('online', () => {
  setSyncState('saving', t('syncReconnect'));
  queueSync();
});
window.addEventListener('pagehide', () => {
  if (!state.token || !selectedMatch()) return;
  settleClock();
  if (state.matchId) {
    saveStoredClock(state.matchId, {
      running: state.clockRunning,
      startedAt: state.clockStartedAt,
      startedSeconds: state.clockStartedSeconds,
      seconds: state.clockSeconds,
    });
  }
  const patch = judgePatch();
  fetch('/api/tournament', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.token}` },
    body: JSON.stringify({ matchId: state.matchId, patch }),
    keepalive: true,
  }).catch(() => {});
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && state.clockRunning) {
    const seconds = effectiveClockSeconds();
    if (seconds === 0) {
      stopClock();
      showToast(t('timeOutMsg'));
    } else {
      renderClock();
    }
  }
});

document.querySelector('.judge-lang-toggle').addEventListener('click', (event) => {
  const button = event.target.closest('[data-lang]');
  if (!button) return;
  language = button.dataset.lang;
  localStorage.setItem('flag-score-judge-language', language);
  updateChrome();
  renderMatch();
});

setInterval(() => {
  if (!state.clockRunning && state.pendingSaves === 0 && !document.hidden && sessionIsFresh()) loadTournament({ quiet: true });
}, 5000);

if (sessionIsFresh()) {
  showApp();
  loadTournament();
} else {
  clearSession();
  showLogin();
}
