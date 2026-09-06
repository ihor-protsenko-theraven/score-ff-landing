import {
  recordConversion,
  recordTouchdown,
  removeConversion,
  removeTouchdown,
  scoringEvents,
} from './match-events.js';

const loginScreen = document.querySelector('#loginScreen');
const adminApp = document.querySelector('#adminApp');
const adminContent = document.querySelector('#adminContent');
const toast = document.querySelector('#toast');
const touchdownDialog = document.querySelector('#touchdownDialog');

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
  overview: ['CONTROL ROOM', 'Огляд турніру'],
  matches: ['MATCH CENTER', 'Керування матчами'],
  teams: ['ROSTER', 'Команди'],
  settings: ['TOURNAMENT', 'Турнір і тексти'],
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
  label.textContent = 'Є незбережені зміни';
  label.classList.add('is-dirty');
}

function markSaved() {
  state.dirty = false;
  const label = document.querySelector('#saveState');
  label.textContent = 'Усі зміни збережено';
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
  const labels = { scheduled: 'Заплановано', live: 'Наживо', halftime: 'Перерва', finished: 'Завершено' };
  return Object.entries(labels).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
}

function selectedStatsMatch() {
  return state.data?.matches.find((match) => match.id === state.statsMatchId);
}

function pointsLabel(points) {
  const word = points === 1 ? 'очко' : (points === 2 ? 'очки' : 'очок');
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
    const eventLabel = scoringEvent.type === 'touchdown' ? 'Тачдаун' : 'Реалізація';
    const context = [`${eventLabel} · ${scoringEvent.points} оч.`, teamName(scoringEvent.teamId), scoringEvent.period ? `${scoringEvent.period === 'OT' ? 'овертайм' : `${scoringEvent.period} половина`}` : '', scoringEvent.clock || '']
      .filter(Boolean)
      .join(' · ');
    return `<article class="touchdown-admin-item">
      <span class="touchdown-admin-item__ball" aria-label="${pointsLabel(scoringEvent.points)}">${scoringEvent.points}</span>
      <div><strong>${escapeHtml(scoringEvent.scorer)}</strong><span>${escapeHtml(context)}</span></div>
      <button class="mini-button mini-button--danger" type="button" data-delete-scoring="${escapeHtml(scoringEvent.id)}" data-scoring-type="${scoringEvent.type}">Видалити</button>
    </article>`;
  }).join('') : '<div class="touchdown-admin-empty">Ще немає результативних дій.</div>';
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
      <article class="metric-card"><span>Команди</span><strong>${state.data.teams.length}</strong></article>
      <article class="metric-card"><span>Усі матчі</span><strong>${matches.length}</strong></article>
      <article class="metric-card"><span>На полях</span><strong>${liveMatches.length} <small>наживо</small></strong></article>
      <article class="metric-card"><span>Прогрес</span><strong>${finished}<small> / ${matches.length}</small></strong></article>
    </div>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ШВИДКЕ КЕРУВАННЯ</span><h2>Активні матчі</h2></div><span>${scheduled} заплановано</span></div>
      <div class="panel-body">
        ${liveMatches.length ? `<div class="quick-score-list">${liveMatches.map((match) => quickScore(match)).join('')}</div>` : '<div class="empty-state"><h3>Активних матчів немає</h3><p>Перейдіть у «Матчі» та змініть статус потрібної гри на «Наживо».</p></div>'}
      </div>
    </section>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ПІДКАЗКА</span><h2>Як оновлювати live</h2></div></div>
      <div class="panel-body"><p class="settings-note">Змінюйте рахунок кнопками +/− і натискайте «Зберегти зміни» у шапці. Публічний сайт перевіряє оновлення кожні 10 секунд. Турнірна таблиця перераховується автоматично після статусу «Завершено».</p></div>
    </section>`;
}

function quickScore(match) {
  const eventCount = scoringEvents(match).length;
  return `
    <article class="quick-score">
      <div class="quick-score__meta"><strong>${escapeHtml(match.field)}</strong><span>${escapeHtml(divisionName(match.division))} · ${escapeHtml(match.clock || '--:--')}</span></div>
      <div class="quick-score__teams">
        <div class="score-stepper"><span class="score-stepper__team">${escapeHtml(teamName(match.homeTeamId))}</span><button type="button" data-bump="home" data-match-id="${escapeHtml(match.id)}" data-delta="-1" aria-label="Мінус очко ${escapeHtml(teamName(match.homeTeamId))}">−</button><strong>${match.homeScore}</strong><button type="button" data-bump="home" data-match-id="${escapeHtml(match.id)}" data-delta="1" aria-label="Плюс очко ${escapeHtml(teamName(match.homeTeamId))}">+</button></div>
        <span class="score-divider">:</span>
        <div class="score-stepper"><span class="score-stepper__team">${escapeHtml(teamName(match.awayTeamId))}</span><button type="button" data-bump="away" data-match-id="${escapeHtml(match.id)}" data-delta="-1" aria-label="Мінус очко ${escapeHtml(teamName(match.awayTeamId))}">−</button><strong>${match.awayScore}</strong><button type="button" data-bump="away" data-match-id="${escapeHtml(match.id)}" data-delta="1" aria-label="Плюс очко ${escapeHtml(teamName(match.awayTeamId))}">+</button></div>
      </div>
      <div class="quick-score__actions">
        <select data-quick-status data-match-id="${escapeHtml(match.id)}" aria-label="Статус матчу">${statusOptions(match.status)}</select>
        <button class="mini-button mini-button--touchdowns" type="button" data-touchdowns-match="${escapeHtml(match.id)}">Статистика <span>${eventCount}</span></button>
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
        <select id="matchDivisionFilter" aria-label="Фільтр за дивізіоном"><option value="all">Усі дивізіони</option>${state.data.divisions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === state.matchDivision ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select>
        <select id="matchStatusFilter" aria-label="Фільтр за статусом"><option value="all">Усі статуси</option><option value="scheduled" ${state.matchStatus === 'scheduled' ? 'selected' : ''}>Заплановано</option><option value="live" ${state.matchStatus === 'live' ? 'selected' : ''}>Наживо</option><option value="halftime" ${state.matchStatus === 'halftime' ? 'selected' : ''}>Перерва</option><option value="finished" ${state.matchStatus === 'finished' ? 'selected' : ''}>Завершено</option></select>
      </div>
      <button class="button button--primary" type="button" id="addMatchButton">+ Додати матч</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead><tr><th>Дата / час</th><th>Дивізіон</th><th>Господарі</th><th>Рахунок</th><th>Гості</th><th>Поле / раунд</th><th>Статус</th><th></th></tr></thead>
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
    <td><div class="table-actions table-actions--vertical"><button class="mini-button mini-button--touchdowns" type="button" data-touchdowns-match="${escapeHtml(match.id)}">Статистика <span>${eventCount}</span></button><button class="mini-button mini-button--danger" type="button" data-delete-match="${escapeHtml(match.id)}">Видалити</button></div></td>
  </tr>`;
}

function renderTeams() {
  return `
    <div class="toolbar"><p class="settings-note">Команду, яка вже використовується в матчах, неможливо видалити. Спочатку видаліть або змініть відповідні матчі.</p><button class="button button--primary" id="addTeamButton" type="button">+ Додати команду</button></div>
    <div class="team-editor-grid">${state.data.teams.map((team) => `
      <article class="team-editor">
        <div class="team-editor__head"><div class="team-editor__identity">${teamBadge(team)}<span>${escapeHtml(team.name)}</span></div><button class="mini-button mini-button--danger" type="button" data-delete-team="${escapeHtml(team.id)}">Видалити</button></div>
        <div class="team-editor__fields">
          <label>Назва<input value="${escapeHtml(team.name)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="name" maxlength="60"></label>
          <label>Скорочення<input value="${escapeHtml(team.short)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="short" maxlength="6"></label>
          <label class="team-editor__division">Дивізіон<select data-entity="team" data-id="${escapeHtml(team.id)}" data-field="division">${state.data.divisions.map((item) => `<option value="${escapeHtml(item.id)}" ${item.id === team.division ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label>
          <label class="team-editor__division">Колір команди<input type="color" value="${escapeHtml(team.color)}" data-entity="team" data-id="${escapeHtml(team.id)}" data-field="color"></label>
        </div>
      </article>`).join('')}</div>`;
}

function renderSettings() {
  const meta = state.data.meta;
  return `
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ПУБЛІЧНА СТОРІНКА</span><h2>Про турнір</h2></div></div>
      <div class="panel-body">
        <p class="settings-note">Ці поля формують перший екран публічного сайту. Назву й опис можна змінювати будь-коли.</p>
        <div class="form-grid">
          <label>Назва турніру<input value="${escapeHtml(meta.name)}" data-entity="meta" data-field="name" maxlength="100"></label>
          <label>Назва в логотипі<input value="${escapeHtml(meta.shortName || '')}" data-entity="meta" data-field="shortName" maxlength="24"></label>
          <label>Надзаголовок<input value="${escapeHtml(meta.eyebrow || '')}" data-entity="meta" data-field="eyebrow" maxlength="60"></label>
          <label>Дати<input value="${escapeHtml(meta.dates || '')}" data-entity="meta" data-field="dates" maxlength="60"></label>
          <label class="field--wide">Локація<input value="${escapeHtml(meta.venue || '')}" data-entity="meta" data-field="venue" maxlength="100"></label>
          <label class="field--wide">Посилання на мапу<input type="url" value="${escapeHtml(meta.venueUrl || '')}" data-entity="meta" data-field="venueUrl" maxlength="300" placeholder="https://maps.app.goo.gl/..."></label>
          <label class="field--wide">Короткий опис<textarea data-entity="meta" data-field="description" maxlength="300">${escapeHtml(meta.description || '')}</textarea></label>
        </div>
      </div>
    </section>
    <section class="admin-panel">
      <div class="panel-heading"><div><span>ДОВІДКОВІ МАТЕРІАЛИ</span><h2>Правила та регламент</h2></div></div>
      <div class="panel-body"><div class="form-grid">
        <label class="field--wide">Правила гри<textarea data-entity="content" data-field="rules">${escapeHtml(state.data.content?.rules || '')}</textarea></label>
        <label class="field--wide">Регламент турніру<textarea data-entity="content" data-field="regulations">${escapeHtml(state.data.content?.regulations || '')}</textarea></label>
      </div></div>
    </section>`;
}

function renderSection() {
  const [kicker, title] = sectionMeta[state.section];
  document.querySelector('#adminSectionKicker').textContent = kicker;
  document.querySelector('#adminSectionTitle').textContent = title;
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
  document.querySelector('#adminMobileNav').innerHTML = Object.entries(sectionMeta).map(([id, [, title]]) => `<button type="button" data-section="${id}">${escapeHtml(title)}</button>`).join('');
}

async function fetchTournament() {
  const response = await fetch('/api/tournament', { cache: 'no-store' });
  if (!response.ok) throw new Error('Не вдалося завантажити турнір');
  state.data = await response.json();
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
      divisions: state.data.divisions,
      teams: state.data.teams,
      matches: state.data.matches,
      content: state.data.content,
    };
    const response = await fetch('/api/tournament', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Admin-Password': state.password },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Збереження не вдалося');
    state.data.meta.updatedAt = result.updatedAt;
    markSaved();
    showToast('Зміни опубліковано');
  } catch (error) {
    showToast(error.message, 'error');
  } finally {
    button.disabled = false;
    button.textContent = 'Зберегти зміни';
  }
}

document.querySelector('#loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const password = document.querySelector('#passwordInput').value;
  const error = document.querySelector('#loginError');
  const button = event.currentTarget.querySelector('button[type="submit"]');
  error.textContent = '';
  button.disabled = true;
  button.textContent = 'Перевіряємо…';
  try {
    await enterAdmin(password);
  } catch (loginError) {
    error.textContent = loginError.message;
  } finally {
    button.disabled = false;
    button.innerHTML = 'Увійти в адмінку <span>→</span>';
  }
});

document.addEventListener('click', (event) => {
  const sectionButton = event.target.closest('[data-section]');
  if (sectionButton && state.data) {
    state.section = sectionButton.dataset.section;
    renderSection();
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
    if (teams.length < 2) return showToast('Спочатку додайте щонайменше дві команди', 'error');
    const today = new Date().toISOString().slice(0, 10);
    state.data.matches.push({
      id: `match-${Date.now()}`, division: division.id, homeTeamId: teams[0].id, awayTeamId: teams[1].id,
      homeScore: 0, awayScore: 0, status: 'scheduled', date: today, time: '10:00', field: 'Поле 1', round: 'Груповий етап', clock: '40:00', touchdowns: [], conversions: [],
    });
    state.matchStatus = 'all';
    state.matchDivision = 'all';
    markDirty();
    renderSection();
    return;
  }

  const deleteMatchButton = event.target.closest('[data-delete-match]');
  if (deleteMatchButton) {
    if (!confirm('Видалити цей матч? Дію можна скасувати, якщо не зберігати зміни.')) return;
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
    const name = `Нова команда ${state.data.teams.length + 1}`;
    state.data.teams.push({ id: `${slugify(name)}-${Date.now()}`, name, short: 'NEW', division: division.id, color: '#3f7891' });
    markDirty();
    renderSection();
    return;
  }

  const deleteTeamButton = event.target.closest('[data-delete-team]');
  if (deleteTeamButton) {
    const id = deleteTeamButton.dataset.deleteTeam;
    const inUse = state.data.matches.some((match) => match.homeTeamId === id || match.awayTeamId === id);
    if (inUse) return showToast('Ця команда вже використовується в матчах', 'error');
    if (!confirm('Видалити цю команду?')) return;
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
  if (entity === 'content') target = state.data.content;
  if (!target) return;
  target[field] = ['homeScore', 'awayScore'].includes(field) ? Math.max(0, Number.parseInt(input.value, 10) || 0) : input.value;
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
    } else {
      recordConversion(match, { ...input, points: Number(eventType === 'conversion-2' ? 2 : 1) });
    }
    markDirty();
    renderSection();
    renderTouchdownDialog();
    showToast('Результативну дію додано до статистики');
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
