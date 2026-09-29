import { filterTasks, formatDateForInput, nextOccurrence, parseDateInput, sortTasks, toDate } from "./tasks";

const ts = (d) => ({ toDate: () => d }); // minimal Firestore Timestamp stand-in

describe("dates", () => {
  test("parseDateInput gives local midnight, not UTC", () => {
    const d = parseDateInput("2025-10-01");
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2025, 9, 1, 0]);
    expect(parseDateInput("")).toBeNull();
  });

  test("formatDateForInput round-trips through parseDateInput", () => {
    expect(formatDateForInput(parseDateInput("2024-02-29"))).toBe("2024-02-29");
    expect(formatDateForInput(ts(new Date(2025, 0, 5)))).toBe("2025-01-05");
    expect(formatDateForInput(null)).toBe("");
  });

  test("toDate accepts Timestamps, Dates and strings", () => {
    const d = new Date(2025, 5, 1);
    expect(toDate(ts(d))).toBe(d);
    expect(toDate(d)).toBe(d);
    expect(toDate("not a date")).toBeNull();
  });
});

describe("nextOccurrence", () => {
  test.each([
    ["daily", new Date(2025, 0, 31), new Date(2025, 1, 1)],
    ["weekly", new Date(2025, 0, 28), new Date(2025, 1, 4)],
    ["monthly", new Date(2025, 0, 15), new Date(2025, 1, 15)],
    // setMonth(+1) would give March 3; clamp to the last day of February
    ["monthly", new Date(2025, 0, 31), new Date(2025, 1, 28)],
    ["monthly", new Date(2024, 0, 31), new Date(2024, 1, 29)],
    ["monthly", new Date(2025, 11, 31), new Date(2026, 0, 31)],
  ])("%s from %s", (rule, from, expected) => {
    expect(nextOccurrence(from, rule)).toEqual(expected);
  });

  test("non-recurring returns null", () => {
    expect(nextOccurrence(new Date(), "none")).toBeNull();
  });
});

describe("filterTasks / sortTasks", () => {
  const now = new Date(2025, 5, 10, 15, 0);
  const tasks = [
    { id: "a", text: "Write report", priority: 1, dueDate: ts(new Date(2025, 5, 10, 9)) },
    { id: "b", text: "Buy seeds", priority: 3, dueDate: ts(new Date(2025, 5, 12)), projectId: "farm", tags: ["shop"] },
    { id: "c", text: "Call bank", priority: 2, completed: true },
    { id: "d", text: "Plan week", dueDate: ts(new Date(2025, 5, 9)) },
  ];
  const ids = (xs) => xs.map((t) => t.id);

  test.each([
    [{ type: "inbox" }, ["a", "c", "d"]],
    [{ type: "today" }, ["a"]],
    [{ type: "upcoming" }, ["b"]],
    [{ type: "project", id: "farm" }, ["b"]],
    [{ type: "tag", name: "shop" }, ["b"]],
  ])("view %o", (view, expected) => {
    expect(ids(filterTasks(tasks, { view, now }))).toEqual(expected);
  });

  test("search and priority filters combine", () => {
    expect(ids(filterTasks(tasks, { view: { type: "inbox" }, search: "PLAN", now }))).toEqual(["d"]);
    expect(ids(filterTasks(tasks, { view: { type: "inbox" }, priority: 4, now }))).toEqual(["d"]);
  });

  test("sort puts completed last and orders by the chosen key", () => {
    expect(ids(sortTasks(tasks, "priority"))).toEqual(["a", "b", "d", "c"]);
    expect(ids(sortTasks(tasks, "dueDate"))).toEqual(["d", "a", "b", "c"]);
  });
});
