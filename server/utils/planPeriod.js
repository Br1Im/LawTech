/**
 * Rolling office-plan period helper.
 *
 * An office plan (office_plans) defines a *recurring* cycle whose length is
 * (period_end - period_start + 1) days, starting at period_start. As real time
 * passes, the active window automatically rolls forward to the next cycle of the
 * same length — e.g. a 14-day plan becomes the next 14 days once the current
 * window ends. Office/operator statistics are then computed over the active
 * (current) window. The optional `offset` lets a UI step to previous cycles
 * (offset = -1 → previous period, -2 → the one before, etc.).
 *
 * All date math is done on UTC midnight to avoid timezone drift.
 */

function toIso(d) {
  return d.toISOString().slice(0, 10);
}

function parseIso(iso) {
  return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
}

function addDaysIso(iso, days) {
  const d = parseIso(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

function diffDays(aIso, bIso) {
  return Math.floor((parseIso(aIso) - parseIso(bIso)) / 86400000);
}

// Inclusive length of the plan window, in days (>= 1).
function planDurationDays(startIso, endIso) {
  const d = diffDays(endIso, startIso) + 1;
  return d > 0 ? d : 1;
}

// Index of the cycle that contains `today` (>= 0). 0 = the original [start,end] window.
function currentCycleIndex(startIso, durationDays, todayIso) {
  const delta = diffDays(todayIso, startIso);
  if (delta < 0) return 0; // plan starts in the future → stay on the first window
  return Math.floor(delta / durationDays);
}

// {from,to} window for a given cycle index.
function cycleWindow(startIso, durationDays, index) {
  const from = addDaysIso(startIso, index * durationDays);
  const to = addDaysIso(from, durationDays - 1);
  return { from, to };
}

/**
 * Resolve the rolling plan window.
 * @param {string} startIso  plan period_start (YYYY-MM-DD)
 * @param {string} endIso    plan period_end (YYYY-MM-DD)
 * @param {string} todayIso  today (YYYY-MM-DD)
 * @param {number} offset    cycle offset relative to the current window (0 = current, -1 = previous)
 * @returns {{from,to,duration_days,cycle_index,current_cycle_index}}
 */
function resolveRollingWindow(startIso, endIso, todayIso, offset = 0) {
  const dur = planDurationDays(startIso, endIso);
  const curIdx = currentCycleIndex(startIso, dur, todayIso);
  let idx = curIdx + Number(offset || 0);
  if (idx < 0) idx = 0;          // can't go before the very first cycle
  if (idx > curIdx) idx = curIdx; // can't view the future
  const win = cycleWindow(startIso, dur, idx);
  return {
    from: win.from,
    to: win.to,
    duration_days: dur,
    cycle_index: idx,
    current_cycle_index: curIdx,
  };
}

function todayIsoInTz(tz) {
  if (!tz) return new Date().toISOString().slice(0, 10);
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  } catch (e) {
    return new Date().toISOString().slice(0, 10);
  }
}

module.exports = {
  resolveRollingWindow,
  todayIsoInTz,
  planDurationDays,
  currentCycleIndex,
  cycleWindow,
  addDaysIso,
  diffDays,
};