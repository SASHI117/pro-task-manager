// Pure task logic, kept out of the component so it can be unit-tested.

/** Firestore Timestamp | Date | string | null -> Date | null */
export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * "2025-10-01" from <input type="date"> -> local midnight.
 * new Date("2025-10-01") would be UTC midnight, i.e. the previous day in
 * any timezone west of UTC, which puts tasks under the wrong day.
 */
export function parseDateInput(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

/** Date-like -> "yyyy-mm-dd" in local time, for <input type="date"> */
export function formatDateForInput(value) {
  const d = toDate(value);
  if (!d) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Next due date for a recurring task. Monthly clamps to the month's last day. */
export function nextOccurrence(date, recurrence) {
  const d = new Date(date);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") {
    // setMonth(+1) on Jan 31 overflows to Mar 3; clamp instead.
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, lastDay));
  } else {
    return null;
  }
  return d;
}

function startOfDay(now) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * view: {type: "inbox"|"today"|"upcoming"|"project"|"tag", id?, name?}
 * priority: 0 = all, otherwise 1-4
 */
export function filterTasks(tasks, { view, search = "", priority = 0, now = new Date() }) {
  const today = startOfDay(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const q = search.trim().toLowerCase();

  return tasks.filter((t) => {
    const due = toDate(t.dueDate);
    switch (view.type) {
      case "inbox":
        if (t.projectId && t.projectId !== "inbox") return false;
        break;
      case "today":
        if (!due || due < today || due >= tomorrow) return false;
        break;
      case "upcoming":
        if (!due || due < tomorrow) return false;
        break;
      case "project":
        if (t.projectId !== view.id) return false;
        break;
      case "tag":
        if (!(t.tags || []).includes(view.name)) return false;
        break;
      default:
        break;
    }
    if (priority && (t.priority || 4) !== priority) return false;
    if (q && !(t.text || "").toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Incomplete first, then by the chosen key. Returns a new array. */
export function sortTasks(tasks, sortBy = "priority") {
  const time = (v, fallback) => toDate(v)?.getTime() ?? fallback;
  return [...tasks].sort((a, b) => {
    if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
    switch (sortBy) {
      case "dueDate":
        return time(a.dueDate, Infinity) - time(b.dueDate, Infinity);
      case "createdAt":
        return time(b.createdAt, 0) - time(a.createdAt, 0);
      default:
        return (a.priority || 4) - (b.priority || 4);
    }
  });
}
