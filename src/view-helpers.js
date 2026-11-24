/** Pure UI helpers extracted from app.js for testability. */

export const TABS = [
  { id: 'overview', label: '概览', icon: '🌙' },
  { id: 'analysis', label: '分析', icon: '📊' },
  { id: 'advice', label: '建议', icon: '💡' },
  { id: 'history', label: '历史', icon: '📅' },
];

export function stagePercents(session) {
  if (!session) return { deep: 0, rem: 0, light: 0 };
  const total = session.totalMinutes || 1;
  const deep = ((session.deepMinutes || 0) / total) * 100;
  const rem = ((session.remMinutes || 0) / total) * 100;
  const light = Math.max(0, 100 - deep - rem);
  return { deep, rem, light };
}

export function qualityBannerClass(grade) {
  if (grade === 'A' || grade === 'B') return 'ok';
  if (grade === 'C') return 'warn';
  return 'bad';
}

export function averageScore(sessions) {
  const scored = (sessions || []).filter((x) => x.score);
  if (!scored.length) return 0;
  return Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length);
}

export function nextTab(tabs, currentId, delta) {
  const list = tabs || TABS;
  const idx = list.findIndex((t) => t.id === currentId);
  if (idx < 0) return list[0];
  return list[(idx + delta + list.length) % list.length];
}

export function profileOptionsHtml(profiles, selectedId) {
  return (profiles || [])
    .map(
      (p) =>
        `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${p.icon} ${p.name}</option>`
    )
    .join('');
}

export function symptomVisibility(profile) {
  const isOsa = profile?.condition === 'osa';
  const isPd = profile?.condition === 'parkinson';
  return {
    showSection: isOsa || isPd,
    showOsa: isOsa,
    showParkinson: isPd,
  };
}

export function trendScoreValues(sessions, scoreFn, limit = 7) {
  const data = (sessions || []).slice(0, limit).reverse();
  return data.map((s) => scoreFn(s));
}

export function reminderStatusMessage(result) {
  if (result.mode === 'denied') return '请授予通知权限';
  if (result.scheduled) return `已排程 ${result.scheduled} 条提醒 (${result.mode})`;
  return '暂无未来提醒';
}

export function healthAvailabilityText(info) {
  if (info.available) return `可用：${info.label || info.platform}`;
  if (info.platform === 'web') return '浏览器模式：请用 APK/IPA';
  return '健康数据不可用';
}
