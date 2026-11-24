/** Shared test utilities — mock storage, DOM, timers. */

function createClassList() {
  const set = new Set();
  return {
    add: (...cls) => cls.forEach((c) => set.add(c)),
    remove: (...cls) => cls.forEach((c) => set.delete(c)),
    toggle: (c, force) => {
      if (force === true) set.add(c);
      else if (force === false) set.delete(c);
      else if (set.has(c)) set.delete(c);
      else set.add(c);
    },
    contains: (c) => set.has(c),
  };
}

function createElement(tag = 'div') {
  const listeners = {};
  const children = [];
  const el = {
    tagName: tag.toUpperCase(),
    textContent: '',
    innerHTML: '',
    value: '',
    checked: false,
    type: 'button',
    dataset: {},
    classList: createClassList(),
    style: {},
    width: 400,
    height: 64,
    children,
    appendChild(child) {
      children.push(child);
      return child;
    },
    addEventListener(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    },
    click() {
      (listeners.click || []).forEach((fn) => fn({ target: el }));
    },
    change(checked) {
      if (checked !== undefined) el.checked = checked;
      (listeners.change || []).forEach((fn) => fn({ target: el }));
    },
    closest() {
      return { classList: createClassList() };
    },
    getContext() {
      return {
        clearRect() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        arc() {},
        fill() {},
        strokeStyle: '',
        fillStyle: '',
        lineWidth: 1,
      };
    },
  };
  return el;
}

const DEFAULT_IDS = [
  'status',
  'grade-badge',
  'score-value',
  'grade-label',
  'summary-text',
  'quality-banner',
  'condition-callouts',
  'stage-bar',
  'metric-totalMinutes',
  'metric-deepPct',
  'metric-remPct',
  'metric-efficiency',
  'tab-nav',
  'panel-overview',
  'panel-analysis',
  'panel-advice',
  'panel-history',
  'trend-chart',
  'profile-select',
  'bed-hour',
  'wake-hour',
  'symptom-section',
  'symptoms-osa',
  'symptoms-parkinson',
  'symptom-snoring',
  'symptom-sleepiness',
  'symptom-tremor',
  'symptom-rbd',
  'bedtime-reminder',
  'wake-natural',
  'wake-lead',
  'reminder-status',
  'btn-reminders',
  'health-status',
  'btn-health',
  'btn-log',
  'btn-week',
  'btn-sensors',
  'btn-sim-great',
  'btn-sim-poor',
  'btn-clear',
  'analysis-list',
  'advice-list',
  'week-avg',
  'history-list',
];

function createMockDom(extraIds = []) {
  const map = new Map();
  for (const id of [...DEFAULT_IDS, ...extraIds]) {
    const el = createElement();
    el.id = id;
    if (id === 'profile-select') el.tagName = 'SELECT';
    if (id.startsWith('panel-')) el.id = id;
    map.set(id, el);
  }

  const document = {
    getElementById(id) {
      return map.get(id) || null;
    },
    querySelectorAll(sel) {
      if (sel === '.tab-btn') {
        return [...map.values()].filter((e) => e.classList.contains('tab-btn'));
      }
      if (sel === '.panel') {
        return ['panel-overview', 'panel-analysis', 'panel-advice', 'panel-history']
          .map((id) => map.get(id))
          .filter(Boolean);
      }
      return [];
    },
    createElement(tag) {
      const el = createElement(tag);
      if (tag === 'button') {
        el.type = 'button';
        el.classList.add('tab-btn');
      }
      return el;
    },
  };

  return { document, map };
}

function createMockStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, val) {
      data.set(key, String(val));
    },
    removeItem(key) {
      data.delete(key);
    },
    _data: data,
  };
}

async function loadEsm(specifier) {
  return import(specifier);
}

module.exports = {
  createMockDom,
  createMockStorage,
  createElement,
  loadEsm,
  DEFAULT_IDS,
};
