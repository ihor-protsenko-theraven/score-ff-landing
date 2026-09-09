import {
  recordConversion,
  recordSafety,
  recordTouchdown,
  removeConversion,
  removeSafety,
  removeTouchdown,
  scoringEvents,
} from './match-events.js';
import { formatClock, halfDurationSeconds, remainingTimeouts, togglePossession } from './judge-state.js';

const loginScreen = document.querySelector('#loginScreen');
const adminApp = document.querySelector('#adminApp');
const adminContent = document.querySelector('#adminContent');
const toast = document.querySelector('#toast');
const touchdownDialog = document.querySelector('#touchdownDialog');

const copy = {
  uk: {
    controlRoom: 'CONTROL ROOM', loginTitle: 'Керуйте турніром без зайвого шуму.',
    loginDesc: 'Оновлюйте рахунок, статус матчу, розклад і склад учасників. Зміни одразу з’являться на публічній сторінці.',
    adminPassword: 'Пароль адміністратора', enterPassword: 'Введіть пароль', loginBtn: 'Увійти в адмінку', backToSite: '← Повернутися на сайт',
    currentTournament: 'ПОТОЧНИЙ ТУРНІР', navOverview: 'Огляд', navMatches: 'Матчі', navTeams: 'Команди', navSettings: 'Турнір і тексти',
    publicSiteLink: 'Відкрити публічний сайт', publicSiteLinkShort: 'Публічний сайт', judgePanelLink: 'Суддівська панель', logoutBtn: 'Вийти',
    matchStats: 'Статистика матчу', scoringAction: 'Результативна дія', tdOption: 'Тачдаун · 6 очок',
    conv1Option: 'Реалізація · 1 очко', conv2Option: 'Реалізація · 2 очки', safetyOption: 'Сейфті · 2 очки',
    teamLabel: 'Команда', scorerLabel: 'Хто набрав очки', scorerPlaceholder: 'Ім’я або номер гравця',
    clockLabel: 'Час на табло', periodLabel: 'Період', statsHint: 'Подія додає автора й тип набору очок до статистики, але не змінює рахунок автоматично.',
    addEventBtn: '+ Додати подію', scoringActionsList: 'Результативні дії',
    overview: 'Огляд', matches: 'Матчі', teams: 'Команди', settings: 'Турнір і тексти',
    unsavedChanges: 'Є незбережені зміни', allSaved: 'Усі зміни збережено', updatedFromJudge: 'Оновлено із суддівської панелі',
    saving: 'Зберігаємо…', saveBtn: 'Зберегти зміни', checking: 'Перевіряємо…', enterAdmin: 'Увійти в адмінку',
    team: 'Команда', allMatches: 'Усі матчі', onFields: 'На полях', liveSmall: 'наживо', progress: 'Прогрес',
    activeMatches: 'Активні матчі', scheduledCount: 'заплановано', noActiveMatches: 'Активних матчів немає',
    noActiveHint: 'Перейдіть у «Матчі» та змініть статус потрібної гри на «Наживо».', liveHintTitle: 'Як оновлювати live',
    liveHintDesc: 'Змінюйте рахунок кнопками +/− і натискайте «Зберегти зміни» у шапці. Публічний сайт перевіряє оновлення кожні 10 секунд. Турнірна таблиця перераховується автоматично після статусу «Завершено».',
    scheduled: 'Заплановано', live: 'Наживо', halftime: 'Перерва', finished: 'Завершено',
    stats: 'Статистика', down: 'Даун', timeouts: 'Тайм-аути', possession: 'Володіння', none: 'Нічиє',
    togglePossessionTitle: 'Змінити володіння',
    allDivisions: 'Усі дивізіони', allStatuses: 'Усі статуси', addMatch: '+ Додати матч', addTeam: '+ Додати команду',
    dateTime: 'Дата / час', division: 'Дивізіон', home: 'Господарі', score: 'Рахунок', away: 'Гості', fieldRound: 'Поле / раунд', status: 'Статус',
    delete: 'Видалити', teamUsed: 'Ця команда вже використовується в матчах', confirmDeleteMatch: 'Видалити цей матч? Дію можна скасувати, якщо не зберігати зміни.', confirmDeleteTeam: 'Видалити цю команду?',
    name: 'Назва', short: 'Скорочення', teamColor: 'Колір команди', halfMinutes: 'Хвилин у половині',
    gameTimeDesc: 'Тривалість однієї половини. Суддівська панель використовує її для скидання таймера, а нові матчі отримують цей час автоматично. Поточний відлік активного матчу не змінюється.',
    tournamentName: 'Назва турніру', shortName: 'Назва в логотипі', eyebrow: 'Надзаголовок', dates: 'Дати', location: 'Локація', mapLink: 'Посилання на мапу', shortDesc: 'Короткий опис',
    rules: 'Правила гри', regulations: 'Регламент турніру', aboutTournament: 'Про турнір', aboutDesc: 'Ці поля формують перший екран публічного сайту. Назву й опис можна змінювати будь-коли.',
    refMaterials: 'Правила та регламент', gameTime: 'Час гри', tournamentSettings: 'Турнір і тексти', matchCenter: 'Керування матчами', roster: 'Команди',
    point: 'очко', pointsFew: 'очки', pointsMany: 'очок', noEvents: 'Ще немає результативних дій.', half1: '1 половина', half2: '2 половина', overtime: 'овертайм',
    tdLabel: 'Тачдаун', convLabel: 'Реалізація', safetyLabel: 'Сейфті', eventAdded: 'Результативну дію додано до статистики',
    changesPublished: 'Зміни опубліковано', saveFailed: 'Збереження не вдалося', twoTeamsRequired: 'Спочатку додайте щонайменше дві команди',
    newTeam: 'Нова команда', groupStage: 'Груповий етап', field1: 'Поле 1'
  },
  en: {
    controlRoom: 'CONTROL ROOM', loginTitle: 'Run the tournament without the clutter.',
    loginDesc: 'Update scores, match statuses, schedules, and teams. Changes appear on the public page immediately.',
    adminPassword: 'Administrator password', enterPassword: 'Enter password', loginBtn: 'Enter admin panel', backToSite: '← Back to site',
    currentTournament: 'CURRENT TOURNAMENT', navOverview: 'Overview', navMatches: 'Matches', navTeams: 'Teams', navSettings: 'Tournament and texts',
    publicSiteLink: 'Open public site', publicSiteLinkShort: 'Public site', judgePanelLink: 'Referee panel', logoutBtn: 'Log out',
    matchStats: 'Match stats', scoringAction: 'Scoring play', tdOption: 'Touchdown · 6 points',
    conv1Option: 'Conversion · 1 point', conv2Option: 'Conversion · 2 points', safetyOption: 'Safety · 2 points',
    teamLabel: 'Team', scorerLabel: 'Who scored', scorerPlaceholder: 'Player name or number',
    clockLabel: 'Game clock', periodLabel: 'Period', statsHint: 'The event records the scorer and scoring type but does not change the score automatically.',
    addEventBtn: '+ Add event', scoringActionsList: 'Scoring plays',
    overview: 'Overview', matches: 'Matches', teams: 'Teams', settings: 'Tournament and Texts',
    unsavedChanges: 'Unsaved changes', allSaved: 'All changes saved', updatedFromJudge: 'Updated from referee panel',
    saving: 'Saving…', saveBtn: 'Save changes', checking: 'Checking…', enterAdmin: 'Enter admin panel',
    team: 'Team', allMatches: 'All matches', onFields: 'On fields', liveSmall: 'live', progress: 'Progress',
    activeMatches: 'Active matches', scheduledCount: 'scheduled', noActiveMatches: 'No active matches',
    noActiveHint: 'Go to "Matches" and change the status of the desired game to "Live".', liveHintTitle: 'How to update live',
    liveHintDesc: 'Change the score with +/- buttons and click "Save changes" in the header. The public site checks for updates every 10 seconds. The standings are recalculated automatically after the "Finished" status.',
    scheduled: 'Scheduled', live: 'Live', halftime: 'Halftime', finished: 'Finished',
    stats: 'Stats', down: 'Down', timeouts: 'Timeouts', possession: 'Possession', none: 'None',
    togglePossessionTitle: 'Toggle possession',
    allDivisions: 'All divisions', allStatuses: 'All statuses', addMatch: '+ Add match', addTeam: '+ Add team',
    dateTime: 'Date / Time', division: 'Division', home: 'Home', score: 'Score', away: 'Away', fieldRound: 'Field / Round', status: 'Status',
    delete: 'Delete', teamUsed: 'This team is already used in matches', confirmDeleteMatch: 'Delete this match? You can undo this by not saving changes.', confirmDeleteTeam: 'Delete this team?',
    name: 'Name', short: 'Short', teamColor: 'Team color', halfMinutes: 'Minutes in half',
    gameTimeDesc: 'Duration of one half. The referee panel uses it to reset the timer, and new matches get this time automatically. The current countdown of an active match is not changed.',
    tournamentName: 'Tournament name', shortName: 'Name in logo', eyebrow: 'Eyebrow', dates: 'Dates', location: 'Location', mapLink: 'Map link', shortDesc: 'Short description',
    rules: 'Game rules', regulations: 'Tournament regulations', aboutTournament: 'About tournament', aboutDesc: 'These fields form the first screen of the public site. Name and description can be changed at any time.',
    refMaterials: 'Rules and regulations', gameTime: 'Game time', tournamentSettings: 'Tournament and Texts', matchCenter: 'Match Management', roster: 'Teams',
    point: 'point', pointsFew: 'points', pointsMany: 'points', noEvents: 'No scoring events yet.', half1: '1st half', half2: '2nd half', overtime: 'overtime',
    tdLabel: 'Touchdown', convLabel: 'Conversion', safetyLabel: 'Safety', eventAdded: 'Scoring event added to stats',
    changesPublished: 'Changes published', saveFailed: 'Save failed', twoTeamsRequired: 'First add at least two teams',
    newTeam: 'New team', groupStage: 'Group stage', field1: 'Field 1'
  }
};

let language = localStorage.getItem('flag-score-admin-language') || 'uk';
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
  document.querySelectorAll('.admin-lang-toggle button').forEach(btn => {
    btn.setAttribute('aria-pressed', String(btn.dataset.lang === language));
  });
}

const state = {
  data: null,
  password: sessionStorage.getItem('flag-score-admin') || '',
  section: 'overview',
  matchStatus: 'all',
  matchDivision: 'all',
  statsMatchId: null,
  dirty: false,
};

const sectionMeta = {
  overview: ['CONTROL ROOM', 'overview'],
  matches: ['MATCH CENTER', 'matchCenter'],
  teams: ['ROSTER', 'roster'],
  settings: ['TOURNAMENT', 'tournamentSettings'],
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);

const slugify = (value) => String(value || 'team')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[^a-z0-9а-яіїєґ]+/gi, '-')
  .replace(/^-|-$/g, '') || 'team';

function showToast(message, type = 'success') {
  toast.textContent = message;
  toast.style.background = type === 'error' ? '#b3234d' : '#0b0d10';
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 3000);
}

function markDirty() {
  state.dirty = true;
  const label = document.querySelector('#saveState');
  label.textContent = t('unsavedChanges');
  label.classList.add('is-dirty');
}

function markSaved() {
  state.dirty = false;
  const label = document.querySelector('#saveState');
  label.textContent = t('allSaved');
  label.classList.remove('is-dirty');
}

function divisionName(id) {
  return state.data.divisions.find((item) => item.id === id)?.name || id;
}

function teamName(id) {
  return state.data.teams.find((item) => item.id === id)?.name || 'TBD';
}

function matchTeamOptions(match, selectedId) {
  return state.data.teams
    .filter((team) => team.division === match.division)
    .map((team) => `<option value="${escapeHtml(team.id)}" ${team.id === selectedId ? 'selected' : ''}>${escapeHtml(team.name)}</option>`)
    .join('');
}

function statusOptions(selected) {
  const labels = { scheduled: t('scheduled'), live: t('live'), halftime: t('halftime'), finished: t('finished') };
  return Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}

function selectedStatsMatch() {
  return state.data?.matches.find((match) => match.id === state.statsMatchId);
}

function pointsLabel(points) {
  const word = points === 1 ? t('point') : (points === 2 ? t('pointsFew') : t('pointsMany'));
  return `${points} ${word}`;
}

function renderTouchdownDialog() {
  const match = selectedStatsMatch();
  if (!match) return touchdownDialog.close();
  const home = teamName(match.homeTeamId);
  const away = teamName(match.awayTeamId);
  document.querySelector('#touchdownDialogMatch').textContent = `${home} ${match.homeScore} : ${match.awayScore} ${away}`;
  document.querySelector('#touchdownTeamInput').innerHTML = [match.homeTeamId, match.awayTeamId]
    .map((teamId) => `<option value="${escapeHtml(teamId)}">${escapeHtml(teamName(teamId))}</option>`)
    .join('');
  document.querySelector('#touchdownScorerInput').value = '';
  document.querySelector('#touchdownClockInput').value = match.clock || '';
  document.querySelector('#touchdownPeriodInput').value = ['1', '2', 'OT'].includes(String(match.period || '')) ? String(match.period) : '1';
  document.querySelector('#touchdownFormError').textContent = '';

  const events = scoringEvents(match).reverse();
  document.querySelector('#touchdownLogCount').textContent = events.length;
  document.querySelector('#touchdownLog').innerHTML = events.length ? events.map((scoringEvent) => {
    const eventLabel = ({ touchdown: t('tdLabel'), conversion: t('convLabel'), safety: t('safetyLabel') })[scoringEvent.type];
    const context = [`${eventLabel} · ${pointsLabel(scoringEvent.points)}`, teamName(scoringEvent.teamId), scoringEvent.period ? `${scoringEvent.period === 'OT' ? t('overtime') : `${scoringEvent.period} ${t('half1').split(' ')[1]}`}` : '', scoringEvent.clock || '']
      .filter(Boolean)
      .join(' · ');
    return `<article class="touchdown-admin-item">
      <span class="touchdown-admin-item__ball" aria-label="${pointsLabel(scoringEvent.points)}">${scoringEvent.points}</span>
      <div><strong>${escapeHtml(scoringEvent.scorer)}</strong><span>${escapeHtml(context)}</span></div>
      <button class="mini-button mini-button--danger" type="button" data-delete-scoring="${escapeHtml(scoringEvent.id)}" data-scoring-type="${scoringEvent.type}">${t('delete')}</button>
    </article>`;
  }).join('') : `<div class="touchdown-admin-empty">${t('noEvents')}</div>`;
}

function openTouchdownDialog(matchId) {
  state.statsMatchId = matchId;
  renderTouchdownDialog();
  touchdownDialog.showModal();
  document.querySelector('#touchdownScorerInput').focus();
}

function teamBadge(team) {
  const color = /^#[0-9a-f]{6}$/i.test(team?.color || '') ? team.color : '#30343d';
  return `<span class="team-badge team-badge--small" style="--team-color:${color}">${escapeHtml(team?.short || 'TBD')}</span>`;
}

function renderOverview() {
  const matches = state.data.matches;
  const liveMatches = matches.filter((match) => ['live', 'halftime'].includes(match.status));
  const finished = matches.filter((match) => match.status === 'finished').length;
  const scheduled = matches.filter((match) => match.status === 'scheduled').length;
  return `
    <div class="metric-grid">
      <article class="metric-card"><span>${t('teams')}</span><strong>${state.data.teams.length}</strong></article>
      <article class="metric-card"><span>${t('allMatches')}</span><strong>${matches.length}</strong></article>
      <article class="metric-card"><span>${t('onFields')}</span><strong>${liveMatches.length} <small>${t('liveSmall')}</small></strong></article>
      <article class="metric-card"><span>${t('progress')}</span><strong>${finished}<small> / ${matches.length}</small></strong></article>
    </div>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ШВИДКЕ КЕРУВАННЯ</span><h2>${t('activeMatches')}</h2></div><span>${scheduled} ${t('scheduledCount')}</span></div>
      <div class="panel-body">
        ${liveMatches.length ? `<div class="quick-score-list">${liveMatches.map((match) => quickScore(match)).join('')}</div>` : `<div class="empty-state"><h3>${t('noActiveMatches')}</h3><p>${t('noActiveHint')}</p></div>`}
      </div>
    </section>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ПІДКАЗКА</span><h2>${t('liveHintTitle')}</h2></div></div>
      <div class="panel-body"><p class="settings-note">${t('liveHintDesc')}</p></div>
    </section>`;
}

function timeoutSummary(match) {
  const period = String(match.period || '1');
  if (!['1', '2'].includes(period)) return `${t('timeouts')} —`;
  return `ТО ${remainingTimeouts(match, period, 'home')}:${remainingTimeouts(match, period, 'away')}`;
}

function quickScore(match) {
  const eventCount = scoringEvents(match).length;
  const homeName = teamName(match.homeTeamId);
  const awayName = teamName(match.awayTeamId);
  const homeHasPossession = match.possessionTeamId === match.homeTeamId;
  const awayHasPossession = match.possessionTeamId === match.awayTeamId;
  return `
    <article class="quick-score">
      <div class="quick-score__meta"><strong>${escapeHtml(match.field)}</strong><span>${escapeHtml(divisionName(match.division))} · ${escapeHtml(match.clock || '--:--')} · ${t('down')} ${match.down || '—'} · ${escapeHtml(timeoutSummary(match))}</span></div>
      <div class="quick-score__teams">
        <div class="quick-score__team ${homeHasPossession ? 'is-possession' : ''}">
          <button class="quick-score__possession-card" type="button" data-quick-possession-card="home" data-match-id="${escapeHtml(match.id)}" aria-pressed="${homeHasPossession}" aria-label="${t('togglePossessionTitle')}: ${escapeHtml(homeName)}">
            <span class="quick-score__team-name">${escapeHtml(homeName)}</span><strong>${match.homeScore}</strong>
            <span class="quick-score__possession-state"><span aria-hidden="true">🏈</span>${t('possession')}</span>
          </button>
          <div class="quick-score__stepper"><button type="button" data-bump="home" data-match-id="${escapeHtml(match.id)}" data-delta="-1" aria-label="Мінус очко ${escapeHtml(homeName)}">−</button><button type="button" data-bump="home" data-match-id="${escapeHtml(match.id)}" data-delta="1" aria-label="Плюс очко ${escapeHtml(homeName)}">+</button></div>
        </div>
        <span class="score-divider">:</span>
        <div class="quick-score__team ${awayHasPossession ? 'is-possession' : ''}">
          <button class="quick-score__possession-card" type="button" data-quick-possession-card="away" data-match-id="${escapeHtml(match.id)}" aria-pressed="${awayHasPossession}" aria-label="${t('togglePossessionTitle')}: ${escapeHtml(awayName)}">
            <span class="quick-score__team-name">${escapeHtml(awayName)}</span><strong>${match.awayScore}</strong>
            <span class="quick-score__possession-state"><span aria-hidden="true">🏈</span>${t('possession')}</span>
          </button>
          <div class="quick-score__stepper"><button type="button" data-bump="away" data-match-id="${escapeHtml(match.id)}" data-delta="-1" aria-label="Мінус очко ${escapeHtml(awayName)}">−</button><button type="button" data-bump="away" data-match-id="${escapeHtml(match.id)}" data-delta="1" aria-label="Плюс очко ${escapeHtml(awayName)}">+</button></div>
        </div>
      </div>
      <div class="quick-score__actions">
        <select data-quick-status data-match-id="${escapeHtml(match.id)}" aria-label="${t('status')}">${statusOptions(match.status)}</select>
        <button class="mini-button mini-button--touchdowns" type="button" data-touchdowns-match="${escapeHtml(match.id)}">${t('stats')} <span>${eventCount}</span></button>
      </div>
    </article>`;
}

function renderMatches() {
  const filtered = state.data.matches
    .filter((match) => state.matchStatus === 'all' || match.status === state.matchStatus)
    .filter((match) => state.matchDivision === 'all' || match.division === state.matchDivision)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return `
    <div class="toolbar">
      <div class="filters">
        <select id="matchDivisionFilter" aria-label="Фільтр"><option value="all">${t('allDivisions')}</option>${state.data.divisions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === state.matchDivision ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select>
        <select id="matchStatusFilter" aria-label="Фільтр"><option value="all">${t('allStatuses')}</option><option value="scheduled" ${state.matchStatus === 'scheduled' ? 'selected' : ''}>${t('scheduled')}</option><option value="live" ${state.matchStatus === 'live' ? 'selected' : ''}>${t('live')}</option><option value="halftime" ${state.matchStatus === 'halftime' ? 'selected' : ''}>${t('halftime')}</option><option value="finished" ${state.matchStatus === 'finished' ? 'selected' : ''}>${t('finished')}</option></select>
      </div>
      <button class="button button--primary" type="button" id="addMatchButton">${t('addMatch')}</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>${t('dateTime')}</th><th>${t('division')}</th><th>${t('home')}</th><th>${t('score')}</th><th>${t('away')}</th><th>${t('fieldRound')}</th><th>${t('status')}</th><th></th></tr></thead>
        <tbody>${filtered.map(matchRow).join('')}</tbody>
      </table>
    </div>`;
}

function matchRow(match) {
  const eventCount = scoringEvents(match).length;
  return `<tr data-match-row="${escapeHtml(match.id)}">
    <td><div class="table-actions"><input type="date" value="${escapeHtml(match.date)}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="date" aria-label="Дата"><input type="time" value="${escapeHtml(match.time)}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="time" aria-label="Час"></div></td>
    <td><select data-entity="match" data-id="${escapeHtml(match.id)}" data-field="division" aria-label="Дивізіон">${state.data.divisions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === match.division ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></td>
    <td><select data-entity="match" data-id="${escapeHtml(match.id)}" data-field="homeTeamId" aria-label="Господарі">${matchTeamOptions(match, match.homeTeamId)}</select></td>
    <td><div class="table-actions"><input class="score-input" type="number" min="0" step="1" value="${match.homeScore}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="homeScore" aria-label="Очки господарів"><input class="score-input" type="number" min="0" step="1" value="${match.awayScore}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="awayScore" aria-label="Очки гостей"></div></td>
    <td><select data-entity="match" data-id="${escapeHtml(match.id)}" data-field="awayTeamId" aria-label="Гості">${matchTeamOptions(match, match.awayTeamId)}</select></td>
    <td><div class="table-actions"><input value="${escapeHtml(match.field)}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="field" aria-label="Поле"><input value="${escapeHtml(match.round || '')}" data-entity="match" data-id="${escapeHtml(match.id)}" data-field="round" aria-label="Раунд"></div></td>
    <td><select data-entity="match" data-id="${escapeHtml(match.id)}" data-field="status" aria-label="Статус">${statusOptions(match.status)}</select></td>
    <td><div class="table-actions table-actions--vertical"><button class="mini-button mini-button--touchdowns" type="button" data-touchdowns-match="${escapeHtml(match.id)}">${t('stats')} <span>${eventCount}</span></button><button class="mini-button mini-button--danger" type="button" data-delete-match="${escapeHtml(match.id)}">${t('delete')}</button></div></td>
  </tr>`;
}

function renderTeams() {
  return `
    <div class="toolbar"><p class="settings-note">Команду, яка вже використовується в матчах, неможливо видалити. Спочатку видаліть або змініть відповідні матчі.</p><button class="button button--primary" id="addTeamButton" type="button">${t('addTeam')}</button></div>
    <div class="team-editor-grid">${state.data.teams.map((team) => `
      <article class="team-editor">
        <div class="team-editor__head"><div class="team-editor__identity">${teamBadge(team)}<span>${escapeHtml(team.name)}</span></div><button class="mini-button mini-button--danger" type="button" data-delete-team="${escapeHtml(team.id)}">${t('delete')}</button></div>
        <div class="team-editor__fields">
          <label>${t('name')}<input value="${escapeHtml(team.name)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="name" maxlength="60"></label>
          <label>${t('short')}<input value="${escapeHtml(team.short)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="short" maxlength="6"></label>
          <label class="team-editor__division">${t('division')}<select data-entity="team" data-id="${escapeHtml(team.id)}" data-field="division">${state.data.divisions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === team.division ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
          <label class="team-editor__division">${t('teamColor')}<input type="color" value="${escapeHtml(team.color)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="color"></label>
        </div>
      </article>`).join('')}</div>`;
}

function renderSettings() {
  const meta = state.data.meta;
  const halfMinutes = halfDurationSeconds(state.data) / 60;
  return `
    <section class="admin-panel">
      <div class="panel-heading"><div><span>РЕГЛАМЕНТ МАТЧУ</span><h2>${t('gameTime')}</h2></div></div>
      <div class="panel-body">
        <p class="settings-note">${t('gameTimeDesc')}</p>
        <div class="form-grid form-grid--compact">
          <label>${t('halfMinutes')}<input type="number" min="1" max="180" step="1" inputmode="numeric" value="${halfMinutes}" data-entity="settings" data-field="halfDurationMinutes"></label>
        </div>
      </div>
    </section>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ПУБЛІЧНА СТОРІНКА</span><h2>${t('aboutTournament')}</h2></div></div>
      <div class="panel-body">
        <p class="settings-note">${t('aboutDesc')}</p>
        <div class="form-grid">
          <label>${t('tournamentName')}<input value="${escapeHtml(meta.name)}" data-entity="meta" data-field="name" maxlength="100"></label>
          <label>${t('shortName')}<input value="${escapeHtml(meta.shortName || '')}" data-entity="meta" data-field="shortName" maxlength="24"></label>
          <label>${t('eyebrow')}<input value="${escapeHtml(meta.eyebrow || '')}" data-entity="meta" data-field="eyebrow" maxlength="60"></label>
          <label>${t('dates')}<input value="${escapeHtml(meta.dates || '')}" data-entity="meta" data-field="dates" maxlength="60"></label>
          <label class="field--wide">${t('location')}<input value="${escapeHtml(meta.venue || '')}" data-entity="meta" data-field="venue" maxlength="100"></label>
          <label class="field--wide">${t('mapLink')}<input type="url" value="${escapeHtml(meta.venueUrl || '')}" data-entity="meta" data-field="venueUrl" maxlength="300" placeholder="https://maps.app.goo.gl/..."></label>
          <label class="field--wide">${t('shortDesc')}<textarea data-entity="meta" data-field="description" maxlength="300">${escapeHtml(meta.description || '')}</textarea></label>
        </div>
      </div>
    </section>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ДОВІДКОВІ МАТЕРІАЛИ</span><h2>${t('refMaterials')}</h2></div></div>
      <div class="panel-body"><div class="form-grid">
        <label class="field--wide">${t('rules')}<textarea data-entity="content" data-field="rules">${escapeHtml(state.data.content?.rules || '')}</textarea></label>
        <label class="field--wide">${t('regulations')}<textarea data-entity="content" data-field="regulations">${escapeHtml(state.data.content?.regulations || '')}</textarea></label>
      </div></div>
    </section>`;
}

function renderSection() {
  const [kicker, titleKey] = sectionMeta[state.section];
  document.querySelector('#adminSectionKicker').textContent = kicker;
  document.querySelector('#adminSectionTitle').textContent = t(titleKey);
  document.querySelector('#adminEventName').textContent = state.data.meta.name;
  document.querySelectorAll('[data-section]').forEach((button) => {
    if (button.dataset.section === state.section) {
      button.setAttribute('aria-current', 'page');
    } else {
      button.removeAttribute('aria-current');
    }
  });
  adminContent.innerHTML = ({ overview: renderOverview, matches: renderMatches, teams: renderTeams, settings: renderSettings })[state.section]();
}

function buildMobileNav() {
  document.querySelector('#adminMobileSections').innerHTML = Object.entries(sectionMeta).map(([id, [, titleKey]]) => `<button type="button" data-section="${id}">${escapeHtml(t(titleKey))}</button>`).join('');
}

async function fetchTournament() {
  const response = await fetch('/api/tournament', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не вдалося завантажити турнір');
  state.data = await response.json();
  state.data.settings ||= { halfDurationMinutes: halfDurationSeconds(state.data) / 60 };
}

async function refreshAdminFromServer() {
  if (!state.data || state.dirty || document.hidden || touchdownDialog.open) return;
  try {
    const response = await fetch('/api/tournament', { cache: 'no-store' });
    if (!response.ok) return;
    const freshData = await response.json();
    if (freshData.meta.updatedAt === state.data.meta.updatedAt) return;
    state.data = freshData;
    updateChrome();
    renderSection();
    const label = document.querySelector('#saveState');
    label.textContent = t('updatedFromJudge');
    setTimeout(() => {
      if (!state.dirty) label.textContent = t('allSaved');
    }, 1800);
  } catch {
    // The next polling cycle will retry without interrupting the operator.
  }
}

async function verifyPassword(password) {
  const response = await fetch('/api/admin/verify', { method: 'POST', headers: { 'X-Admin-Password': password } });
  return response.ok;
}

async function enterAdmin(password) {
  const valid = await verifyPassword(password);
  if (!valid) throw new Error('Невірний пароль. Перевірте введення та спробуйте ще раз.');
  state.password = password;
  sessionStorage.setItem('flag-score-admin', password);
  await fetchTournament();
  loginScreen.hidden = true;
  adminApp.hidden = false;
  updateChrome();
  buildMobileNav();
  renderSection();
  markSaved();
}

async function saveTournament() {
  const button = document.querySelector('#saveButton');
  button.disabled = true;
  button.textContent = 'Зберігаємо…';
  try {
    const payload = {
      meta: state.data.meta,
      settings: state.data.settings,
      divisions: state.data.divisions,
      teams: state.data.teams,
      matches: state.data.matches,
      content: state.data.content,
    };
    const response = await fetch('/api/tournament', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Password': state.password,
        'X-Tournament-Version': state.data.meta.updatedAt || '',
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Збереження не вдалося');
    state.data.meta.updatedAt = result.updatedAt;
    markSaved();
    showToast(t('changesPublished'));
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = t('saveBtn');
  }
}

document.querySelector('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#passwordInput').value;
  const error = document.querySelector('#loginError');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  error.textContent = '';
  button.disabled = true;
  button.textContent = t('checking');
  try {
    await enterAdmin(password);
  } catch (loginError) {
    error.textContent = loginError.message;
  } finally {
    button.disabled = false;
    button.innerHTML = `${t('enterAdmin')} <span>→</span>`;
  }
});

document.addEventListener('click', (event) => {
  const sectionButton = event.target.closest('[data-section]');
  if (sectionButton && state.data) {
    state.section = sectionButton.dataset.section;
    renderSection();
    return;
  }

  const possessionCard = event.target.closest('[data-quick-possession-card]');
  if (possessionCard) {
    const match = state.data.matches.find((item) => item.id === possessionCard.dataset.matchId);
    togglePossession(match, possessionCard.dataset.quickPossessionCard);
    markDirty();
    renderSection();
    navigator.vibrate?.(20);
    return;
  }

  const bumpButton = event.target.closest('[data-bump]');
  if (bumpButton) {
    const match = state.data.matches.find((item) => item.id === bumpButton.dataset.matchId);
    const field = bumpButton.dataset.bump === 'home' ? 'homeScore' : 'awayScore';
    match[field] = Math.max(0, match[field] + Number(bumpButton.dataset.delta));
    markDirty();
    renderSection();
    return;
  }

  if (event.target.closest('#addMatchButton')) {
    const division = state.data.divisions[0];
    const teams = state.data.teams.filter((team) => team.division === division.id);
    if (teams.length < 2) return showToast(t('twoTeamsRequired'), 'error');
    const today = new Date().toISOString().slice(0, 10);
    state.data.matches.push({
      id: `match-${Date.now()}`, division: division.id, homeTeamId: teams[0].id, awayTeamId: teams[1].id,
      homeScore: 0, awayScore: 0, status: 'scheduled', date: today, time: '10:00', field: t('field1'), round: t('groupStage'), clock: formatClock(halfDurationSeconds(state.data)), touchdowns: [], conversions: [], safeties: [], possessionTeamId: null,
    });
    state.matchStatus = 'all';
    state.matchDivision = 'all';
    markDirty();
    renderSection();
    return;
  }

  const deleteMatchButton = event.target.closest('[data-delete-match]');
  if (deleteMatchButton) {
    if (!confirm(t('confirmDeleteMatch'))) return;
    state.data.matches = state.data.matches.filter((match) => match.id !== deleteMatchButton.dataset.deleteMatch);
    markDirty();
    renderSection();
    return;
  }

  const touchdownButton = event.target.closest('[data-touchdowns-match]');
  if (touchdownButton) {
    openTouchdownDialog(touchdownButton.dataset.touchdownsMatch);
    return;
  }

  const deleteScoringButton = event.target.closest('[data-delete-scoring]');
  if (deleteScoringButton) {
    const match = selectedStatsMatch();
    if (!match) return;
    if (deleteScoringButton.dataset.scoringType === 'conversion') {
      removeConversion(match, deleteScoringButton.dataset.deleteScoring);
    } else if (deleteScoringButton.dataset.scoringType === 'safety') {
      removeSafety(match, deleteScoringButton.dataset.deleteScoring);
    } else {
      removeTouchdown(match, deleteScoringButton.dataset.deleteScoring);
    }
    markDirty();
    renderSection();
    renderTouchdownDialog();
    return;
  }

  if (event.target.closest('#addTeamButton')) {
    const division = state.data.divisions[0];
    const name = `${t('newTeam')} ${state.data.teams.length + 1}`;
    state.data.teams.push({ id: `${slugify(name)}-${Date.now()}`, name, short: 'NEW', division: division.id, color: '#3f7891' });
    markDirty();
    renderSection();
    return;
  }

  const deleteTeamButton = event.target.closest('[data-delete-team]');
  if (deleteTeamButton) {
    const id = deleteTeamButton.dataset.deleteTeam;
    const inUse = state.data.matches.some((match) => match.homeTeamId === id || match.awayTeamId === id);
    if (inUse) return showToast(t('teamUsed'), 'error');
    if (!confirm(t('confirmDeleteTeam'))) return;
    state.data.teams = state.data.teams.filter((team) => team.id !== id);
    markDirty();
    renderSection();
  }
});

document.addEventListener('input', (event) => {
  const input = event.target.closest('[data-entity]');
  if (!input || !state.data) return;
  const { entity, id, field } = input.dataset;
  let target;
  if (entity === 'match') target = state.data.matches.find((item) => item.id === id);
  if (entity === 'team') target = state.data.teams.find((item) => item.id === id);
  if (entity === 'meta') target = state.data.meta;
  if (entity === 'settings') target = state.data.settings;
  if (entity === 'content') target = state.data.content;
  if (!target) return;
  target[field] = ['homeScore', 'awayScore', 'halfDurationMinutes'].includes(field) ? Math.max(0, Number.parseInt(input.value, 10) || 0) : input.value;
  markDirty();
});

document.addEventListener('change', (event) => {
  if (event.target.matches('#matchDivisionFilter')) {
    state.matchDivision = event.target.value;
    renderSection();
    return;
  }
  if (event.target.matches('#matchStatusFilter')) {
    state.matchStatus = event.target.value;
    renderSection();
    return;
  }
  if (event.target.matches('[data-quick-status]')) {
    const match = state.data.matches.find((item) => item.id === event.target.dataset.matchId);
    match.status = event.target.value;
    markDirty();
    renderSection();
    return;
  }
  if (event.target.matches('[data-entity="match"][data-field="division"]')) {
    const match = state.data.matches.find((item) => item.id === event.target.dataset.id);
    const teams = state.data.teams.filter((team) => team.division === match.division);
    if (teams.length >= 2) {
      match.homeTeamId = teams[0].id;
      match.awayTeamId = teams[1].id;
    }
    renderSection();
  }
});

document.querySelector('#saveButton').addEventListener('click', saveTournament);
document.querySelector('#touchdownForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const match = selectedStatsMatch();
  if (!match) return;
  const form = new FormData(event.currentTarget);
  try {
    const eventType = form.get('eventType');
    const input = {
      teamId: form.get('teamId'),
      scorer: form.get('scorer'),
      clock: form.get('clock'),
      period: form.get('period'),
    };
    if (eventType === 'touchdown') {
      recordTouchdown(match, input);
    } else if (eventType === 'safety') {
      recordSafety(match, input);
    } else {
      recordConversion(match, { ...input, points: Number(eventType === 'conversion-2' ? 2 : 1) });
    }
    markDirty();
    renderSection();
    renderTouchdownDialog();
    showToast(t('eventAdded'));
  } catch (error) {
    document.querySelector('#touchdownFormError').textContent = error.message;
  }
});
document.querySelector('#closeTouchdownDialog').addEventListener('click', () => touchdownDialog.close());
touchdownDialog.addEventListener('click', (event) => {
  if (event.target === touchdownDialog) touchdownDialog.close();
});
document.querySelector('#logoutButton').addEventListener('click', () => {
  sessionStorage.removeItem('flag-score-admin');
  location.reload();
});

document.querySelector('.admin-lang-toggle').addEventListener('click', (event) => {
  const button = event.target.closest('[data-lang]');
  if (!button) return;
  language = button.dataset.lang;
  localStorage.setItem('flag-score-admin-language', language);
  updateChrome();
  buildMobileNav();
  renderSection();
  if (state.statsMatchId) renderTouchdownDialog();
});

window.addEventListener('beforeunload', (event) => {
  if (!state.dirty) return;
  event.preventDefault();
});

if (state.password) {
  enterAdmin(state.password).catch(() => {
    sessionStorage.removeItem('flag-score-admin');
    state.password = '';
  });
}

setInterval(refreshAdminFromServer, 5000);
