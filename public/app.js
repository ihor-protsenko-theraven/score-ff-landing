const content = document.querySelector('#content');
const infoDialog = document.querySelector('#infoDialog');
const toast = document.querySelector('#toast');

const ui = {
  data: null,
  activeTab: ['live', 'standings', 'schedule'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'live',
  language: localStorage.getItem('flag-score-language') || 'uk',
  scheduleView: 'list',
};

const copy = {
  uk: {
    onAir: 'НАЖИВО', rules: 'Правила', regulations: 'Регламент', when: 'Коли', where: 'Де',
    live: 'Наживо', standings: 'Таблиці', schedule: 'Розклад', footer: 'Один турнір. Усі рахунки. Наживо.',
    onFields: 'На полях', liveGames: 'матчі тривають', noLive: 'Зараз немає активних матчів',
    noLiveHint: 'Розклад матчів з’явиться після публікації організаторами — сторінка оновлюється автоматично.', nextGames: 'Наступні ігри',
    attack: 'атака', half: '2 половина', winChance: 'Шанси на перемогу', lastPlay: 'Останній поінт',
    played: 'зіграно', team: 'Команда', games: 'І', record: 'В–П', difference: '+/−', points: 'Очки',
    playoff: 'Сітка плей-оф формується за підсумками групового етапу.', list: 'Список', byFields: 'За полями',
    gamesCount: 'ігор', scheduled: 'Заплановано', liveStatus: 'Наживо', halftime: 'Перерва', finished: 'Завершено',
    info: 'Інформація', rulesTitle: 'Правила гри', regulationsTitle: 'Регламент турніру',
    loadError: 'Не вдалося завантажити дані турніру.', retry: 'Спробувати ще раз', versus: 'проти',
    noSchedule: 'Розклад готується', noScheduleHint: 'Матчі з’являться тут щойно організатори опублікують сітку.',
  },
  en: {
    onAir: 'LIVE', rules: 'Rules', regulations: 'Regulations', when: 'When', where: 'Where',
    live: 'Live', standings: 'Standings', schedule: 'Schedule', footer: 'One tournament. Every score. Live.',
    onFields: 'On the fields', liveGames: 'games in progress', noLive: 'No games are live right now',
    noLiveHint: 'The match schedule will appear after it is published — this page refreshes automatically.', nextGames: 'Next games',
    attack: 'possession', half: '2nd half', winChance: 'Win probability', lastPlay: 'Latest point',
    played: 'played', team: 'Team', games: 'GP', record: 'W–L', difference: '+/−', points: 'Points',
    playoff: 'The playoff bracket will be formed after the group stage.', list: 'List', byFields: 'By field',
    gamesCount: 'games', scheduled: 'Scheduled', liveStatus: 'Live', halftime: 'Halftime', finished: 'Final',
    info: 'Information', rulesTitle: 'Game rules', regulationsTitle: 'Tournament regulations',
    loadError: 'Tournament data could not be loaded.', retry: 'Try again', versus: 'vs',
    noSchedule: 'Schedule in progress', noScheduleHint: 'Matches will appear here as soon as the organizers publish the draw.',
  },
};

const t = (key) => copy[ui.language][key] || key;
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
})[character]);
const safeColor = (value) => /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#30343d';
const team = (id) => ui.data.teams.find((item) => item.id === id) || { id, name: 'TBD', short: 'TBD', color: '#30343d' };
const division = (id) => ui.data.divisions.find((item) => item.id === id) || { id, name: id, nameEn: id };
const divisionName = (id) => ui.language === 'en' ? division(id).nameEn : division(id).name;

function sortedMatches(matches = ui.data.matches) {
  return [...matches].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
}

function groupBy(items, getKey) {
  return items.reduce((groups, item) => {
    const key = getKey(item);
    (groups[key] ||= []).push(item);
    return groups;
  }, {});
}

function formatDate(date) {
  const locale = ui.language === 'uk' ? 'uk-UA' : 'en-GB';
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(parsed);
}

function statusText(status) {
  return ({ scheduled: t('scheduled'), live: t('liveStatus'), halftime: t('halftime'), finished: t('finished') })[status] || status;
}

function teamBadge(item, small = false) {
  return `<span class="team-badge${small ? ' team-badge--small' : ''}" style="--team-color:${safeColor(item.color)}">${escapeHtml(item.short)}</span>`;
}

function sectionHeading(title, meta = '', action = '') {
  return `<div class="section-heading"><div class="section-heading__title"><h2>${escapeHtml(title)}</h2>${meta ? `<span>${escapeHtml(meta)}</span>` : ''}</div>${action}</div>`;
}

function infoLinks() {
  return `<div class="info-links"><span>${escapeHtml(t('info'))}</span><button type="button" data-info="rules">${escapeHtml(t('rulesTitle'))}</button><button type="button" data-info="regulations">${escapeHtml(t('regulationsTitle'))}</button></div>`;
}

function liveCard(match) {
  const home = team(match.homeTeamId);
  const away = team(match.awayTeamId);
  const total = Math.max(1, match.homeScore + match.awayScore);
  const homeChance = match.homeScore === match.awayScore ? 50 : Math.max(18, Math.min(82, Math.round((match.homeScore / total) * 100)));
  const awayChance = 100 - homeChance;
  const status = match.status === 'halftime' ? t('halftime') : `${escapeHtml(match.period || t('half'))} · ${escapeHtml(match.clock || '--:--')}`;
  return `
    <article class="live-card">
      <div class="live-card__top">
        <span class="live-card__field">${escapeHtml(match.field)} · ${escapeHtml(divisionName(match.division))}</span>
        <span class="status-chip">${escapeHtml(statusText(match.status))}</span>
      </div>
      <div class="scoreboard">
        <div class="scoreboard__team">
          ${teamBadge(home)}
          <strong title="${escapeHtml(home.name)}">${escapeHtml(home.name)}</strong>
          <span class="possession">${match.possessionTeamId === home.id ? `◀ ${escapeHtml(t('attack'))}` : '&nbsp;'}</span>
        </div>
        <div class="scoreboard__score"><span>${match.homeScore}</span><i>:</i><span>${match.awayScore}</span></div>
        <div class="scoreboard__team">
          ${teamBadge(away)}
          <strong title="${escapeHtml(away.name)}">${escapeHtml(away.name)}</strong>
          <span class="possession">${match.possessionTeamId === away.id ? `${escapeHtml(t('attack'))} ▶` : '&nbsp;'}</span>
        </div>
      </div>
      <div class="live-card__clock"><span>${escapeHtml(status)}</span></div>
      <div class="win-meter">
        <div class="win-meter__labels"><span>${escapeHtml(home.short)} ${homeChance}%</span><span>${escapeHtml(t('winChance'))}</span><span>${awayChance}% ${escapeHtml(away.short)}</span></div>
        <div class="win-meter__track"><span class="win-meter__home" style="width:${homeChance}%"></span><span class="win-meter__away"></span></div>
      </div>
      <div class="live-card__last"><span>${escapeHtml(t('lastPlay'))}</span><strong>${escapeHtml(match.lastPlay || '—')}</strong></div>
    </article>`;
}

function upcomingCard(match) {
  const home = team(match.homeTeamId);
  const away = team(match.awayTeamId);
  return `
    <article class="upcoming-card">
      <div class="upcoming-card__top"><span>${escapeHtml(divisionName(match.division))} · ${escapeHtml(match.field)}</span><strong>${escapeHtml(match.time)}</strong></div>
      <div class="upcoming-card__teams"><span>${escapeHtml(home.name)}</span><i>${escapeHtml(t('versus'))}</i><span>${escapeHtml(away.name)}</span></div>
    </article>`;
}

function renderLive() {
  const live = sortedMatches().filter((match) => ['live', 'halftime'].includes(match.status));
  const upcoming = sortedMatches().filter((match) => match.status === 'scheduled').slice(0, 3);
  return `
    <section class="section-block">
      ${sectionHeading(t('onFields'), `${live.length} ${t('liveGames')}`)}
      ${live.length ? `<div class="live-grid">${live.map(liveCard).join('')}</div>` : `<div class="empty-state"><h3>${escapeHtml(t('noLive'))}</h3><p>${escapeHtml(t('noLiveHint'))}</p></div>`}
    </section>
    ${upcoming.length ? `<section class="section-block">${sectionHeading(t('nextGames'), `${upcoming.length} ${t('gamesCount')}`)}<div class="upcoming-strip">${upcoming.map(upcomingCard).join('')}</div></section>` : ''}
    ${infoLinks()}`;
}

function standingsTable(divisionItem) {
  const rows = ui.data.standings[divisionItem.id] || [];
  const finishedCount = ui.data.matches.filter((match) => match.division === divisionItem.id && match.status === 'finished').length;
  const totalCount = ui.data.matches.filter((match) => match.division === divisionItem.id).length;
  return `
    <section class="section-block">
      ${sectionHeading(ui.language === 'en' ? divisionItem.nameEn : divisionItem.name, `${t('played')} ${finishedCount}/${totalCount}`)}
      <div class="table-card">
        <table class="standings-table">
          <thead><tr><th>${escapeHtml(t('team'))}</th><th>${escapeHtml(t('games'))}</th><th>${escapeHtml(t('record'))}</th><th>${escapeHtml(t('difference'))}</th><th>${escapeHtml(t('points'))}</th></tr></thead>
          <tbody>${rows.map((row, index) => {
            const item = team(row.id);
            const differenceClass = row.difference > 0 ? 'difference--positive' : row.difference < 0 ? 'difference--negative' : '';
            return `<tr><td><div class="table-team"><span class="position">${index + 1}</span>${teamBadge(item, true)}<span>${escapeHtml(row.name)}</span></div></td><td>${row.played}</td><td class="record">${row.wins}–${row.losses}</td><td class="${differenceClass}">${row.difference > 0 ? '+' : ''}${row.difference}</td><td>${row.pointsFor}:${row.pointsAgainst}</td></tr>`;
          }).join('')}</tbody>
        </table>
      </div>
      <div class="playoff-note"><span>↗</span><p>${escapeHtml(t('playoff'))}</p></div>
    </section>`;
}

function renderStandings() {
  return `<div class="standings-stack">${ui.data.divisions.map(standingsTable).join('')}</div>${infoLinks()}`;
}

function scheduleRow(match) {
  const home = team(match.homeTeamId);
  const away = team(match.awayTeamId);
  const score = match.status === 'scheduled' ? '' : `<span class="schedule-row__score">${match.homeScore} : ${match.awayScore}</span>`;
  return `
    <article class="schedule-row">
      <time class="schedule-row__time" datetime="${escapeHtml(match.date)}T${escapeHtml(match.time)}">${escapeHtml(match.time)}</time>
      <div class="schedule-row__main"><span class="schedule-row__round">${escapeHtml(match.round || statusText(match.status))}</span><span class="schedule-row__teams">${escapeHtml(home.name)}<i>—</i>${escapeHtml(away.name)}</span></div>
      <span class="match-meta schedule-row__field">${escapeHtml(divisionName(match.division))} · ${escapeHtml(match.field)}</span>
      ${score || `<span class="match-meta">${escapeHtml(statusText(match.status))}</span>`}
    </article>`;
}

function scheduleList() {
  const groups = groupBy(sortedMatches(), (match) => match.date);
  return Object.entries(groups).map(([date, matches]) => `
    <section class="schedule-day">
      ${sectionHeading(formatDate(date), `${matches.length} ${t('gamesCount')}`)}
      <div class="schedule-list">${matches.map(scheduleRow).join('')}</div>
    </section>`).join('');
}

function scheduleFields() {
  const groups = groupBy(sortedMatches(), (match) => match.field);
  return `<div class="field-columns">${Object.entries(groups).map(([field, matches]) => `
    <section class="field-column">
      <div class="field-column__head">${escapeHtml(field)}</div>
      <div class="field-column__matches">${matches.map((match) => {
        const home = team(match.homeTeamId);
        const away = team(match.awayTeamId);
        return `<article class="field-match"><time>${escapeHtml(formatDate(match.date))} · ${escapeHtml(match.time)}</time><strong>${escapeHtml(home.name)} — ${escapeHtml(away.name)}</strong><span>${escapeHtml(divisionName(match.division))} · ${escapeHtml(match.round)}</span></article>`;
      }).join('')}</div>
    </section>`).join('')}</div>`;
}

function renderSchedule() {
  const actions = `<div class="segmented"><button type="button" data-schedule-view="list" aria-pressed="${ui.scheduleView === 'list'}">${escapeHtml(t('list'))}</button><button type="button" data-schedule-view="fields" aria-pressed="${ui.scheduleView === 'fields'}">${escapeHtml(t('byFields'))}</button></div>`;
  if (!ui.data.matches.length) {
    return `<div class="empty-state"><h3>${escapeHtml(t('noSchedule'))}</h3><p>${escapeHtml(t('noScheduleHint'))}</p></div>${infoLinks()}`;
  }
  return `<div class="schedule-tools">${actions}</div>${ui.scheduleView === 'list' ? scheduleList() : scheduleFields()}${infoLinks()}`;
}

function updateChrome() {
  document.documentElement.lang = ui.language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-lang]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.lang === ui.language)));
  document.querySelectorAll('[data-tab]').forEach((button) => {
    const active = button.dataset.tab === ui.activeTab;
    if (button.getAttribute('role') === 'tab') button.setAttribute('aria-selected', String(active));
    button.toggleAttribute('aria-current', active);
  });
}

function updateMeta() {
  const { meta } = ui.data;
  document.title = `${meta.shortName || 'FLAG SCORE'} · ${meta.name}`;
  document.querySelector('#brandName').textContent = meta.shortName || 'FLAG SCORE';
  document.querySelector('#eventEyebrow').textContent = meta.eyebrow || '';
  document.querySelector('#eventEyebrowMobile').textContent = meta.eyebrow || '';
  document.querySelector('#eventTitle').textContent = meta.name;
  document.querySelector('#eventDescription').textContent = meta.description || '';
  document.querySelector('#eventDates').textContent = meta.dates || '—';
  const venue = document.querySelector('#eventVenue');
  venue.replaceChildren();
  if (meta.venueUrl && /^https:\/\//.test(meta.venueUrl)) {
    const link = document.createElement('a');
    link.href = meta.venueUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = meta.venue || '—';
    link.setAttribute('aria-label', `${meta.venue || 'Локація турніру'} — відкрити на карті`);
    venue.append(link);
  } else {
    venue.textContent = meta.venue || '—';
  }
}

function render() {
  if (!ui.data) return;
  updateChrome();
  updateMeta();
  content.setAttribute('aria-busy', 'false');
  content.innerHTML = ({ live: renderLive, standings: renderStandings, schedule: renderSchedule })[ui.activeTab]();
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('is-visible'), 2800);
}

async function loadData({ silent = false } = {}) {
  try {
    const response = await fetch('/api/tournament', { cache: 'no-store' });
    if (!response.ok) throw new Error('Load failed');
    ui.data = await response.json();
    render();
  } catch {
    if (!silent) {
      content.innerHTML = `<div class="error-state"><h2>${escapeHtml(t('loadError'))}</h2><button class="button button--primary" type="button" data-retry>${escapeHtml(t('retry'))}</button></div>`;
    }
  }
}

document.addEventListener('click', (event) => {
  const tabButton = event.target.closest('[data-tab]');
  if (tabButton) {
    ui.activeTab = tabButton.dataset.tab;
    history.replaceState(null, '', `#${ui.activeTab}`);
    render();
    scrollTo({ top: document.querySelector('.subnav').offsetTop, behavior: 'smooth' });
    return;
  }

  const languageButton = event.target.closest('[data-lang]');
  if (languageButton) {
    ui.language = languageButton.dataset.lang;
    localStorage.setItem('flag-score-language', ui.language);
    render();
    return;
  }

  const viewButton = event.target.closest('[data-schedule-view]');
  if (viewButton) {
    ui.scheduleView = viewButton.dataset.scheduleView;
    render();
    return;
  }

  const infoButton = event.target.closest('[data-info]');
  if (infoButton && ui.data) {
    const type = infoButton.dataset.info;
    document.querySelector('#dialogTitle').textContent = type === 'rules' ? t('rulesTitle') : t('regulationsTitle');
    document.querySelector('#dialogBody').replaceChildren(...String(ui.data.content?.[type] || '').split(/\n\s*\n/).map((text) => {
      const paragraph = document.createElement('p');
      paragraph.textContent = text;
      return paragraph;
    }));
    infoDialog.showModal();
  }

  if (event.target.closest('[data-retry]')) loadData();
});

document.querySelector('#closeDialog').addEventListener('click', () => infoDialog.close());
infoDialog.addEventListener('click', (event) => {
  if (event.target === infoDialog) infoDialog.close();
});

window.addEventListener('hashchange', () => {
  const nextTab = location.hash.slice(1);
  if (['live', 'standings', 'schedule'].includes(nextTab)) {
    ui.activeTab = nextTab;
    render();
  }
});

loadData();
setInterval(() => loadData({ silent: true }), 10_000);
