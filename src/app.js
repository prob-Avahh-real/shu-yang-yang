import { PROFILES } from './standards.js';
import {
  TABS,
  averageScore,
  healthAvailabilityText,
  nextTab,
  profileOptionsHtml,
  qualityBannerClass,
  reminderStatusMessage,
  stagePercents,
  symptomVisibility,
  trendScoreValues,
} from './view-helpers.js';
import { assessSession, formatDate, formatMetric, formatTime } from './assess.js';
import {
  addSession,
  loadSessions,
  loadSettings,
  removeSession,
  saveSessions,
  saveSettings,
} from './store.js';
import { generateSleepSession, generateWeekHistory } from './sleep-simulator.js';
import { createWearableInput } from './wearable-input.js';
import { syncReminders, cancelReminders } from './reminders-native.js';
import { attachNaturalWakeMonitor } from './natural-wake.js';
import { importHealthSleep, checkHealthAvailability } from './health-sync.js';

const $ = (id) => document.getElementById(id);

let sessions = loadSessions();
let settings = loadSettings();
let currentSession = sessions[0] || null;
let currentAssessment = null;

const statusEl = $('status');

function setStatus(msg) {
  statusEl.textContent = msg || '';
}

function persist() {
  sessions = saveSessions(sessions);
  saveSettings(settings);
}

function profile() {
  return PROFILES.find((p) => p.id === settings.profileId) || PROFILES[0];
}

function applyAssessment() {
  if (!currentSession) {
    currentAssessment = null;
    return;
  }
  currentAssessment = assessSession(currentSession, settings.profileId, {
    symptoms: settings.symptoms,
  });
  if (currentAssessment) {
    currentSession.score = currentAssessment.score;
    currentSession.grade = currentAssessment.grade;
  }
}

function switchTab(tabId, announce = true) {
  settings.activeTab = tabId;
  saveSettings(settings);
  document.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.panel').forEach((panel) => {
    panel.classList.toggle('active', panel.id === `panel-${tabId}`);
  });
  if (announce) {
    const tab = TABS.find((t) => t.id === tabId);
    setStatus(tab ? `${tab.icon} ${tab.label}` : '');
  }
  renderAll();
}

function cycleTab(delta) {
  switchTab(nextTab(TABS, settings.activeTab, delta).id);
}

function logSession(qualityId = 'good') {
  const session = generateSleepSession(settings, qualityId);
  applyAssessmentToSession(session);
  sessions = addSession(sessions, session);
  currentSession = sessions[0];
  applyAssessment();
  persist();
  renderAll();
  setStatus(`已记录 ${session.label || '昨夜睡眠'}`);
}

function applyAssessmentToSession(session) {
  const a = assessSession(session, settings.profileId, { symptoms: settings.symptoms });
  session.score = a.score;
  session.grade = a.grade;
}

function importWeekDemo() {
  const week = generateWeekHistory(settings);
  for (const s of week) applyAssessmentToSession(s);
  sessions = week;
  currentSession = sessions[0];
  applyAssessment();
  persist();
  renderAll();
  setStatus('已导入 7 晚演示数据');
}

function renderTabs() {
  const nav = $('tab-nav');
  nav.innerHTML = '';
  for (const t of TABS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab-btn' + (t.id === settings.activeTab ? ' active' : '');
    btn.dataset.tab = t.id;
    btn.innerHTML = `<span class="tab-icon">${t.icon}</span><span class="tab-label">${t.label}</span>`;
    btn.addEventListener('click', () => switchTab(t.id));
    nav.appendChild(btn);
  }
}

function renderOverview() {
  const assess = currentAssessment;
  const session = currentSession;

  if (!session || !assess) {
    $('grade-badge').textContent = '—';
    $('grade-badge').style.background = 'var(--ink-soft)';
    $('score-value').textContent = '—';
    $('grade-label').textContent = '暂无记录';
    $('summary-text').textContent = '点击「记录昨夜」或使用模拟数据开始分析睡眠质量。';
    $('quality-banner').className = 'quality-banner hidden';
    for (const key of ['totalMinutes', 'deepPct', 'remPct', 'efficiency']) {
      const el = $(`metric-${key}`);
      if (el) el.textContent = '—';
    }
    renderStageBar(null);
    return;
  }

  const g = assess.gradeInfo;
  $('grade-badge').textContent = assess.grade;
  $('grade-badge').style.background = g.color;
  $('score-value').textContent = String(assess.score);
  $('grade-label').textContent = `${g.emoji} ${g.label}`;

  const banner = $('quality-banner');
  banner.classList.remove('hidden', 'ok', 'warn', 'bad');
  banner.classList.add(qualityBannerClass(assess.grade));
  banner.textContent = assess.summary;

  $('summary-text').textContent = `${formatDate(session.wakeTime)} · ${formatTime(session.bedTime)} → ${formatTime(session.wakeTime)}`;

  for (const key of ['totalMinutes', 'deepPct', 'remPct', 'efficiency']) {
    const c = assess.checks.find((x) => x.id === key);
    const el = $(`metric-${key}`);
    if (!el || !c) continue;
    el.textContent = formatMetric(key, c.value) + (c.unit && key !== 'totalMinutes' ? c.unit : '');
    el.closest('.metric')?.classList.toggle('warn', !c.ok && c.score >= 40);
    el.closest('.metric')?.classList.toggle('bad', !c.ok && c.score < 40);
  }

  renderStageBar(session);
  renderConditionCallouts(assess);
}

function renderConditionCallouts(assess) {
  const wrap = $('condition-callouts');
  if (!wrap) return;
  wrap.innerHTML = '';
  if (!assess?.conditionCallouts?.length) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');
  for (const c of assess.conditionCallouts) {
    const el = document.createElement('div');
    el.className = 'condition-callout' + (c.warn ? ' warn' : '');
    el.innerHTML = `<span class="callout-label">${c.label}</span><span class="callout-value">${c.value}</span>`;
    wrap.appendChild(el);
  }
}

function renderStageBar(session) {
  const bar = $('stage-bar');
  if (!session) {
    bar.innerHTML = '<div class="stage-empty">—</div>';
    return;
  }
  const { deep, rem, light } = stagePercents(session);
  bar.innerHTML = `
    <div class="stage deep" style="width:${deep.toFixed(1)}%" title="深睡 ${deep.toFixed(0)}%"></div>
    <div class="stage rem" style="width:${rem.toFixed(1)}%" title="REM ${rem.toFixed(0)}%"></div>
    <div class="stage light" style="width:${light.toFixed(1)}%" title="浅睡 ${light.toFixed(0)}%"></div>
  `;
}

function renderAnalysis() {
  const list = $('analysis-list');
  list.innerHTML = '';
  if (!currentAssessment) {
    list.innerHTML = '<p class="empty">暂无分析数据</p>';
    return;
  }

  if (currentAssessment.risks?.length) {
    const riskBlock = document.createElement('div');
    riskBlock.className = 'risk-block';
    riskBlock.innerHTML = currentAssessment.risks
      .map(
        (r) =>
          `<div class="risk-banner ${r.level}"><strong>${r.title}</strong><p>${r.detail}</p></div>`
      )
      .join('');
    list.appendChild(riskBlock);
  }

  if (currentAssessment.clinicalSummary) {
    const clinical = document.createElement('div');
    clinical.className = 'clinical-summary';
    clinical.textContent = currentAssessment.clinicalSummary;
    list.appendChild(clinical);
  }

  for (const c of currentAssessment.checks) {
    const row = document.createElement('div');
    row.className = 'check-row' + (c.ok ? '' : c.score < 50 ? ' bad' : ' warn');
    row.innerHTML = `
      <div class="check-head">
        <span class="check-label">${c.label}</span>
        <span class="check-value">${formatMetric(c.id, c.value)}${c.unit && c.id !== 'totalMinutes' ? c.unit : ''}</span>
      </div>
      <div class="check-bar"><div class="check-fill" style="width:${c.score}%;background:${c.ok ? 'var(--ok)' : c.score < 50 ? 'var(--alert)' : 'var(--warn)'}"></div></div>
      <span class="check-note">${c.note} · ${c.score}分</span>
    `;
    list.appendChild(row);
  }

  if (currentAssessment.warnings.length) {
    const warn = document.createElement('div');
    warn.className = 'warnings';
    warn.innerHTML = currentAssessment.warnings.map((w) => `<p>⚠ ${w}</p>`).join('');
    list.appendChild(warn);
  }

  if (currentAssessment.disclaimer) {
    const disc = document.createElement('p');
    disc.className = 'disclaimer';
    disc.textContent = currentAssessment.disclaimer;
    list.appendChild(disc);
  }
}

function renderAdvice() {
  const list = $('advice-list');
  list.innerHTML = '';
  if (!currentAssessment?.advice?.length && !currentAssessment?.conditionAdvice?.length) {
    list.innerHTML = '<p class="empty">记录睡眠后将生成个性化建议</p>';
    return;
  }

  if (currentAssessment.conditionAdvice?.length) {
    for (const block of currentAssessment.conditionAdvice) {
      const card = document.createElement('article');
      card.className = 'advice-card condition-card';
      card.innerHTML = `
        <h3>${block.title}</h3>
        <ul>${block.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
      `;
      list.appendChild(card);
    }
  }

  for (const block of currentAssessment.advice) {
    const card = document.createElement('article');
    card.className = 'advice-card';
    card.innerHTML = `
      <h3>${block.title}</h3>
      <ul>${block.tips.map((t) => `<li>${t}</li>`).join('')}</ul>
    `;
    list.appendChild(card);
  }

  if (currentAssessment?.disclaimer) {
    const disc = document.createElement('p');
    disc.className = 'disclaimer';
    disc.textContent = currentAssessment.disclaimer;
    list.appendChild(disc);
  }
}

function renderHistory() {
  const list = $('history-list');
  list.innerHTML = '';
  if (!sessions.length) {
    list.innerHTML = '<p class="empty">暂无历史记录</p>';
    return;
  }

  const avg = averageScore(sessions);
  $('week-avg').textContent = avg ? String(avg) : '—';

  for (const s of sessions.slice(0, 30)) {
    const a = assessSession(s, settings.profileId, { symptoms: settings.symptoms });
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'history-row' + (currentSession?.id === s.id ? ' active' : '');
    row.innerHTML = `
      <span class="hist-date">${formatDate(s.wakeTime)}</span>
      <span class="hist-grade" style="background:${a.gradeInfo.color}">${a.grade}</span>
      <span class="hist-score">${a.score}</span>
      <span class="hist-dur">${formatMetric('totalMinutes', s.totalMinutes)}</span>
    `;
    row.addEventListener('click', () => {
      currentSession = s;
      applyAssessment();
      switchTab('overview');
    });
    list.appendChild(row);
  }
}

function renderProfileSelect() {
  const sel = $('profile-select');
  sel.innerHTML = profileOptionsHtml(PROFILES, settings.profileId);
}

function renderTrend() {
  const canvas = $('trend-chart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const scores = trendScoreValues(sessions, (s) =>
    assessSession(s, settings.profileId, { symptoms: settings.symptoms }).score
  );
  if (!scores.length) return;
  const max = 100;
  const pad = 8;
  const step = (w - pad * 2) / Math.max(1, scores.length - 1);

  ctx.strokeStyle = 'rgba(168, 140, 255, 0.25)';
  ctx.lineWidth = 1;
  for (const y of [50, 70, 90]) {
    const py = h - pad - (y / max) * (h - pad * 2);
    ctx.beginPath();
    ctx.moveTo(pad, py);
    ctx.lineTo(w - pad, py);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.strokeStyle = '#a88cff';
  ctx.lineWidth = 2;
  scores.forEach((score, i) => {
    const x = pad + i * step;
    const y = h - pad - (score / max) * (h - pad * 2);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = '#c4b5fd';
  scores.forEach((score, i) => {
    const x = pad + i * step;
    const y = h - pad - (score / max) * (h - pad * 2);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderSymptomToggles() {
  const section = $('symptom-section');
  const osaBlock = $('symptoms-osa');
  const pdBlock = $('symptoms-parkinson');
  if (!section) return;

  const vis = symptomVisibility(profile());
  section.classList.toggle('hidden', !vis.showSection);
  if (osaBlock) osaBlock.classList.toggle('hidden', !vis.showOsa);
  if (pdBlock) pdBlock.classList.toggle('hidden', !vis.showParkinson);

  if ($('symptom-snoring')) $('symptom-snoring').checked = !!settings.symptoms?.snoring;
  if ($('symptom-sleepiness')) $('symptom-sleepiness').checked = !!settings.symptoms?.daytimeSleepiness;
  if ($('symptom-tremor')) $('symptom-tremor').checked = !!settings.symptoms?.tremorAtNight;
  if ($('symptom-rbd')) $('symptom-rbd').checked = !!settings.symptoms?.actingOutDreams;
}

function renderAll() {
  applyAssessment();
  renderOverview();
  renderAnalysis();
  renderAdvice();
  renderHistory();
  renderTrend();
  renderSymptomToggles();
}

function bindActions() {
  $('btn-log').addEventListener('click', () => logSession('good'));
  $('btn-sim-great').addEventListener('click', () => logSession('great'));
  $('btn-sim-poor').addEventListener('click', () => logSession('poor'));
  $('btn-week').addEventListener('click', importWeekDemo);
  $('btn-clear').addEventListener('click', () => {
    if (!sessions.length) return;
    if (!confirm('清除全部睡眠记录？')) return;
    sessions = [];
    currentSession = null;
    currentAssessment = null;
    persist();
    renderAll();
    setStatus('已清除记录');
  });

  $('profile-select').addEventListener('change', async (e) => {
    settings.profileId = e.target.value;
    const p = profile();
    settings.targetBedHour = p.targetBedHour;
    settings.targetWakeHour = p.targetWakeHour;
    $('bed-hour').value = String(settings.targetBedHour);
    $('wake-hour').value = String(settings.targetWakeHour);
    persist();
    renderAll();
    await maybeSyncReminders();
    setStatus(`档案：${p.name}`);
  });

  for (const [id, key] of [
    ['symptom-snoring', 'snoring'],
    ['symptom-sleepiness', 'daytimeSleepiness'],
    ['symptom-tremor', 'tremorAtNight'],
    ['symptom-rbd', 'actingOutDreams'],
  ]) {
    const el = $(id);
    if (!el) continue;
    el.addEventListener('change', (e) => {
      settings.symptoms = { ...settings.symptoms, [key]: e.target.checked };
      persist();
      renderAll();
      setStatus('症状自评已更新');
    });
  }

  $('bed-hour').addEventListener('change', async (e) => {
    settings.targetBedHour = Number(e.target.value);
    persist();
    await maybeSyncReminders();
  });
  $('wake-hour').addEventListener('change', async (e) => {
    settings.targetWakeHour = Number(e.target.value);
    persist();
    await maybeSyncReminders();
  });

  $('bedtime-reminder').addEventListener('change', async (e) => {
    settings.bedtimeReminderEnabled = e.target.checked;
    persist();
    await maybeSyncReminders();
  });
  $('wake-natural').addEventListener('change', async (e) => {
    settings.wakeNaturalEnabled = e.target.checked;
    persist();
    await maybeSyncReminders();
  });
  $('wake-lead').addEventListener('change', async (e) => {
    settings.wakeLeadMinutes = Number(e.target.value);
    persist();
    await maybeSyncReminders();
  });

  $('btn-reminders').addEventListener('click', () => syncRemindersNow());
  $('btn-health').addEventListener('click', () => importFromHealth());

  $('btn-sensors').addEventListener('click', async () => {
    const ok = await wearable.requestPermission();
    if (ok) {
      wearable.start();
      setStatus('戒指/手杖传感已启用');
    } else {
      setStatus('传感权限未授予');
    }
  });
}

const wearable = createWearableInput({
  onRingTiltLeft: () => cycleTab(-1),
  onRingTiltRight: () => cycleTab(1),
  onRingShake: () => logSession(['great', 'good', 'average', 'poor'][Math.floor(Math.random() * 4)]),
  onCaneTap: () => logSession('good'),
});

function initSettingsUI() {
  $('bed-hour').value = String(settings.targetBedHour ?? 23);
  $('wake-hour').value = String(settings.targetWakeHour ?? 7);
  $('bedtime-reminder').checked = settings.bedtimeReminderEnabled !== false;
  $('wake-natural').checked = settings.wakeNaturalEnabled !== false;
  $('wake-lead').value = String(settings.wakeLeadMinutes ?? 30);
}

async function maybeSyncReminders() {
  if (settings.bedtimeReminderEnabled === false && settings.wakeNaturalEnabled === false) {
    await cancelReminders();
    $('reminder-status').textContent = '提醒已关闭';
    return;
  }
  await syncRemindersNow(true);
}

async function syncRemindersNow(silent = false) {
  const r = await syncReminders(settings);
  settings.remindersSyncedAt = Date.now();
  persist();
  const msg = reminderStatusMessage(r);
  $('reminder-status').textContent = msg;
  if (!silent) setStatus(msg);
}

async function importFromHealth() {
  setStatus('正在从健康应用导入…');
  const r = await importHealthSleep(settings, 14);
  if (r.error && !r.sessions.length) {
    setStatus(r.error);
    $('health-status').textContent = r.error;
    return;
  }
  for (const s of r.sessions) {
    applyAssessmentToSession(s);
    sessions = addSession(sessions, s);
  }
  currentSession = sessions[0] || currentSession;
  applyAssessment();
  persist();
  renderAll();
  const msg = `已导入 ${r.sessions.length} 条 (${r.platform})`;
  $('health-status').textContent = msg;
  setStatus(msg);
}

async function initHealthStatus() {
  const h = await checkHealthAvailability();
  $('health-status').textContent = healthAvailabilityText(h);
}

export function boot() {
  renderProfileSelect();
  initSettingsUI();
  renderTabs();
  switchTab(settings.activeTab || 'overview', false);

  if (sessions.length) {
    applyAssessment();
    renderAll();
  } else {
    renderAll();
  }

  bindActions();
  initHealthStatus();
  attachNaturalWakeMonitor(() => settings, 45000);
  if (settings.bedtimeReminderEnabled !== false || settings.wakeNaturalEnabled !== false) {
    syncRemindersNow(true);
  }
  setStatus('戒指左右切换 · 摇晃刷新 · 手杖敲击记录');
}

if (typeof document !== 'undefined' && !globalThis.__SHUYANGYANG_TEST__) {
  boot();
}
