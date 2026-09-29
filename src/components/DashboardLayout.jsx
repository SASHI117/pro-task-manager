// src/components/DashboardLayout.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
  where,
  getDocs,
  orderBy,
  Timestamp
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { filterTasks, formatDateForInput, nextOccurrence, parseDateInput, sortTasks, toDate } from "../lib/tasks";

/* --------------------------
  Inline SVG helper
----------------------------*/
const Icon = ({ path, className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
);

const ICONS = {
  inbox: "M3 7.5v9A2.25 2.25 0 0 0 5.25 19.5h13.5A2.25 2.25 0 0 0 21 17.25v-9",
  plus: "M12 4.5v15m7.5-7.5h-15",
  trash: "M14.74 9l-.346 9M9.606 9l.346 9M3 6.75h18M8.25 6.75V5.25a2.25 2.25 0 0 1 2.25-2.25h3a2.25 2.25 0 0 1 2.25 2.25v1.5",
  search: "M21 21l-5.2-5.2M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z",
  logout: "M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 4.5 5.25v13.5A2.25 2.25 0 0 0 6.75 21h6a2.25 2.25 0 0 0 2.25-2.25V15",
  sun: "M12 3v2.25M12 18.75V21M3 12h2.25M18.75 12H21M4.5 4.5l1.5 1.5M18 18l1.5 1.5M4.5 19.5l1.5-1.5M18 6l1.5-1.5"
};

const priorityMap = { 1: "text-red-400", 2: "text-orange-400", 3: "text-cyan-300", 4: "text-gray-300" };
const themes = { light: "", dark: "dark", matrix: "matrix" };


/* -----------------------------
  Main Dashboard Component
------------------------------*/
export default function DashboardLayout() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [comments, setComments] = useState([]);
  const [currentView, setCurrentView] = useState({ type: "inbox", name: "Inbox" });
  const [selectedTask, setSelectedTask] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("priority");
  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");
  const [priorityFilter, setPriorityFilter] = useState(0); // 0 = all priorities
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState({ message: "", type: "success", visible: false });

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const path = useCallback((coll) => `users/${currentUser.uid}/${coll}`, [currentUser]);

  // Without an error callback a denied or failing listener leaves the UI on
  // "Loading Workspace..." forever with nothing in the console.
  const onListenError = useCallback((what) => (err) => {
    console.error(err);
    setError(`Could not load ${what}: ${err.code || err.message}`);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const projectsRef = collection(db, path("projects"));
    const tasksRef = collection(db, path("tasks"));

    const unsubProjects = onSnapshot(query(projectsRef, orderBy("createdAt", "asc")), (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, onListenError("projects"));

    const unsubTasks = onSnapshot(query(tasksRef), (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setIsLoading(false);
    }, onListenError("tasks"));

    return () => {
      unsubProjects();
      unsubTasks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !selectedTask) {
      setComments([]);
      return;
    }
    const commentsRef = collection(db, path("comments"));
    const q = query(commentsRef, where("taskId", "==", selectedTask.id), orderBy("createdAt", "desc"));
    // Needs the composite index in firestore.indexes.json (taskId + createdAt).
    const unsub = onSnapshot(q, (snap) => setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), onListenError("comments"));
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTask, currentUser]);

  // Keep theme class on root and persist
  useEffect(() => {
    // apply theme classes for any CSS that relies on documentElement classes
    document.documentElement.className = themes[theme] || "";
    localStorage.setItem("theme", theme);

    // Also set body styles for backward compatibility (keeps previous behavior)
    switch (theme) {
      case "dark":
        document.body.style.background = "linear-gradient(145deg, #0d1117, #161b22)";
        document.body.style.color = "#fff";
        break;
      case "light":
        document.body.style.background = "linear-gradient(145deg, #f2f2f2, #e6e6e6)";
        document.body.style.color = "#000";
        break;
      case "matrix":
        document.body.style.background = "#000";
        document.body.style.color = "#00ff88";
        break;
      default:
        break;
    }
  }, [theme]);

  const crudHandler = useCallback(
    async (action, collectionName, data) => {
      if (!currentUser) return;
      const collRef = collection(db, path(collectionName));
      try {
        if (action === "add") {
          await addDoc(collRef, { ...data });
          showToast(`${collectionName.slice(0, -1)} added`);
        } else if (action === "update") {
          const { id, payload } = data;
          const docRef = doc(db, path(collectionName), id);
          await updateDoc(docRef, payload);
          showToast(`${collectionName.slice(0, -1)} updated`);
        } else if (action === "delete") {
          const docRef = doc(db, path(collectionName), data.id);
          if (collectionName === "tasks") {
            const batch = writeBatch(db);
            const subtasksQ = query(collection(db, path("tasks")), where("parentId", "==", data.id));
            const commentsQ = query(collection(db, path("comments")), where("taskId", "==", data.id));
            const [subtasksSnap, commentsSnap] = await Promise.all([getDocs(subtasksQ), getDocs(commentsQ)]);
            subtasksSnap.forEach((d) => batch.delete(d.ref));
            commentsSnap.forEach((d) => batch.delete(d.ref));
            batch.delete(docRef);
            await batch.commit();
          } else {
            await deleteDoc(docRef);
          }
          showToast(`${collectionName.slice(0, -1)} deleted`, "error");
        }
      } catch (err) {
        console.error(err);
        setError(`Failed to ${action} ${collectionName}`);
      }
    },
    [currentUser, showToast, path]
  );

  const handleCompleteTask = useCallback(
    (task) => {
      if (!task) return;
      if (task.recurrence && task.recurrence !== "none" && task.dueDate && !task.completed) {
        const newDate = nextOccurrence(toDate(task.dueDate), task.recurrence);
        crudHandler("update", "tasks", { id: task.id, payload: { dueDate: Timestamp.fromDate(newDate), completed: false, lastCompletedAt: serverTimestamp() } });
        showToast(`Task "${task.text}" rescheduled.`);
      } else {
        crudHandler("update", "tasks", { id: task.id, payload: { completed: !task.completed, completedAt: !task.completed ? serverTimestamp() : null } });
      }
    },
    [crudHandler, showToast]
  );

  const filteredAndSortedTasks = useMemo(() => {
    const visible = ["calendar", "dashboard"].includes(currentView.type)
      ? tasks
      : filterTasks(tasks, { view: currentView, search: searchQuery, priority: priorityFilter });
    return sortTasks(visible, sortBy);
  }, [tasks, currentView, searchQuery, priorityFilter, sortBy]);

  const rootTasks = useMemo(() => filteredAndSortedTasks.filter((t) => !t.parentId), [filteredAndSortedTasks]);
  const getSubtasks = useCallback((taskId) => filteredAndSortedTasks.filter((t) => t.parentId === taskId), [filteredAndSortedTasks]);
  const allTags = useMemo(() => [...new Set(tasks.flatMap((t) => t.tags || []))].sort(), [tasks]);

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError("Failed to log out");
    }
  }

  if (isLoading) {
    return <div className="loading-screen">Loading Workspace...</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto grid grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="glass p-5 flex flex-col h-[80vh]">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold">Pro Task</h3>
              <div className="text-sm text-slate-300 opacity-80">v0.1</div>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => setCurrentView({ type: "inbox", name: "Inbox" })}
                className={`btn-glass w-full text-left flex items-center gap-3 ${currentView.type === "inbox" ? "ring-1 ring-indigo-400/30" : ""}`}
              >
                <Icon path={ICONS.inbox} />
                <span>Inbox</span>
              </button>

              <button
                onClick={() => setCurrentView({ type: "today", name: "Today" })}
                className={`btn-glass w-full text-left flex items-center gap-3 ${currentView.type === "today" ? "ring-1 ring-indigo-400/30" : ""}`}
              >
                <Icon path={ICONS.sun} />
                <span>Today</span>
              </button>

              <button
                onClick={() => setCurrentView({ type: "upcoming", name: "Upcoming" })}
                className={`btn-glass w-full text-left flex items-center gap-3 ${currentView.type === "upcoming" ? "ring-1 ring-indigo-400/30" : ""}`}
              >
                <Icon path={ICONS.search} />
                <span>Upcoming</span>
              </button>
            </div>

            <div className="mt-6 text-sm text-slate-300/80 font-semibold">Projects</div>
            <div className="mt-2 space-y-2">
              {projects.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setCurrentView({ type: "project", id: p.id, name: p.name })}
                  className={`p-2 rounded-md cursor-pointer ${currentView.type === "project" && currentView.id === p.id ? "bg-indigo-700/30" : "hover:bg-white/3"}`}
                >
                  {p.name}
                </div>
              ))}
            </div>

            <div className="mt-6 text-sm text-slate-300/80 font-semibold">Tags</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.map((t) => (
                <button key={t} onClick={() => setCurrentView({ type: "tag", name: t })} className="px-2 py-1 rounded-md btn-glass text-xs">
                  #{t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = e.target.projectName?.value?.trim();
                if (!name) return;
                crudHandler("add", "projects", { name, createdAt: serverTimestamp() }).then(() => (e.target.projectName.value = ""));
              }}
              className="mt-4 flex gap-2"
            >
              <input name="projectName" placeholder="New project" className="input-glass flex-1 text-sm" />
              <button type="submit" className="btn-glass px-3">
                <Icon path={ICONS.plus} />
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-300">
              <div className="mb-2 truncate">{currentUser?.email}</div>
              <button onClick={handleLogout} className="btn-glass w-full text-left flex items-center gap-2">
                <Icon path={ICONS.logout} />
                <span>Log out</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="glass-strong p-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold">{currentView.name}</h1>
              <p className="small-muted">Manage your tasks — organized and shiny ✨</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 glass px-2 rounded">
                <input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-glass text-sm bg-transparent border-0 focus:ring-0"
                />
                <Icon path={ICONS.search} />
              </div>

              {/* Priority filter */}
              <select
                aria-label="Filter by priority"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(Number(e.target.value))}
                style={{
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                  color: theme === "dark" ? "#fff" : "#000",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  appearance: "none",
                  backdropFilter: "blur(8px)",
                }}
              >
                <option value={0}>All priorities</option>
                <option value={1}>Priority 1</option>
                <option value={2}>Priority 2</option>
                <option value={3}>Priority 3</option>
                <option value={4}>Priority 4</option>
              </select>

              {/* Sort */}
              <select
                aria-label="Sort tasks"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-glass text-sm"
              >
                <option value="priority">Sort: priority</option>
                <option value="dueDate">Sort: due date</option>
                <option value="createdAt">Sort: newest</option>
              </select>

              {/* Theme Dropdown */}
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                style={{
                  backgroundColor: theme === "dark" ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)",
                  color: theme === "dark" ? "#fff" : "#000",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  outline: "none",
                  cursor: "pointer",
                  fontSize: "15px",
                  appearance: "none",
                  backdropFilter: "blur(8px)",
                }}
              >
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="matrix">Matrix</option>
              </select>
            </div>
          </div>

          {/* Add task form */}
          <div className="glass p-4">
            <form onSubmit={async (e) => {
              e.preventDefault();
              const text = e.target.taskText.value.trim();
              if (!text) return;
              const projectId = e.target.projectSelect.value === "inbox" ? null : e.target.projectSelect.value;
              const priority = Number(e.target.prioritySelect.value) || 4;
              const tags = e.target.tagsInput.value ? e.target.tagsInput.value.split(",").map(s => s.trim()).filter(Boolean) : [];
              const dueDate = parseDateInput(e.target.dueInput.value);
              const due = dueDate ? Timestamp.fromDate(dueDate) : null;
              await crudHandler("add", "tasks", { text, projectId, priority, tags, createdAt: serverTimestamp(), dueDate: due });
              e.target.reset();
            }} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
              <input name="taskText" placeholder="New task..." className="input-glass md:col-span-3" />
              <input name="dueInput" type="date" className="input-glass" />
              <select name="prioritySelect" className="input-glass" defaultValue={3}>
                <option value={1}>Priority 1</option>
                <option value={2}>Priority 2</option>
                <option value={3}>Priority 3</option>
                <option value={4}>Priority 4</option>
              </select>
              <select name="projectSelect" className="input-glass">
                <option value="inbox">Inbox</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input name="tagsInput" placeholder="tags (comma separated)" className="input-glass md:col-span-3" />
              <div className="md:col-span-3 flex gap-2">
                <button type="submit" className="btn-glass bg-indigo-600/30 hover:bg-indigo-600/40 text-white">Add Task</button>
                <button type="button" onClick={() => { /* clear handled by form reset */ }} className="btn-glass">Clear</button>
              </div>
            </form>
          </div>

          {/* Task list */}
          <div className="space-y-3">
            {rootTasks.length === 0 && <div className="p-6 text-center text-slate-300 glass">No tasks here — add one ✨</div>}
            {rootTasks.map((task) => (
              <div key={task.id} className="glass p-3 rounded-md flex items-start gap-4">
                <div className="mt-1">
                  <input checked={!!task.completed} onChange={() => handleCompleteTask(task)} type="checkbox" className="w-5 h-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className={`font-medium ${task.completed ? "line-through text-slate-400" : ""}`}>{task.text}</div>
                      <div className="text-xs small-muted">
                        {task.dueDate ? `Due: ${formatDateForInput(task.dueDate)}` : "No due date"}{" "}
                        {task.priority && <span className={`ml-2 ${priorityMap[task.priority]}`}>●</span>}
                      </div>

                      {task.tags && task.tags.length > 0 && (
                        <div className="mt-2 flex gap-2">
                          {task.tags.map(t => <span key={t} className="text-xs btn-glass px-2 py-1 rounded">#{t}</span>)}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelectedTask(task)} className="btn-glass">Details</button>
                      <button onClick={() => { crudHandler("delete", "tasks", { id: task.id }); if (selectedTask?.id === task.id) setSelectedTask(null); }} className="btn-glass text-red-400">Delete</button>
                    </div>
                  </div>

                  {getSubtasks(task.id).length > 0 && (
                    <div className="mt-3 ml-6">
                      {getSubtasks(task.id).map(s => <div key={s.id} className="text-sm small-muted">{s.text}</div>)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right detail pane */}
      {selectedTask && (
        <div className="fixed top-16 right-6 w-96 h-[70vh] glass p-4 overflow-auto rounded-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Task Details</h3>
            <button onClick={() => setSelectedTask(null)} className="btn-glass px-2">Close</button>
          </div>

          <TaskDetailPane
            task={tasks.find(t => t.id === selectedTask.id)}
            comments={comments}
            onUpdateTask={(id, payload) => crudHandler("update", "tasks", { id, payload })}
            onDeleteTask={(id) => { crudHandler("delete", "tasks", { id }); setSelectedTask(null); }}
            onAddComment={(text) => crudHandler("add", "comments", { text, taskId: selectedTask.id, createdAt: serverTimestamp(), user: currentUser.email })}
            showToast={showToast}
            onClose={() => setSelectedTask(null)}
          />
        </div>
      )}

      <ToastNotification message={toast.message} type={toast.type} isVisible={toast.visible} />

      {error && <div className="fixed top-5 right-5 p-4 bg-red-500 text-white rounded-lg shadow-lg">{error}</div>}
    </div>
  );
}

/* -----------------------------
  TaskDetailPane (internal)
------------------------------*/
function TaskDetailPane({ task, comments = [], onUpdateTask, onDeleteTask, onAddComment, showToast, onClose }) {
  const [editText, setEditText] = useState(task?.text || "");
  const [due, setDue] = useState(formatDateForInput(task?.dueDate));
  const [priority, setPriority] = useState(task?.priority || 3);
  const [recurrence, setRecurrence] = useState(task?.recurrence || "none");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    setEditText(task?.text || "");
    setDue(formatDateForInput(task?.dueDate));
    setPriority(task?.priority || 3);
    setRecurrence(task?.recurrence || "none");
  }, [task]);

  async function handleSave() {
    const payload = { text: editText, priority: Number(priority), recurrence: recurrence || "none" };
    if (due) payload.dueDate = Timestamp.fromDate(parseDateInput(due));
    else payload.dueDate = null;
    await onUpdateTask(task.id, payload);
    showToast("Task updated");
  }

  async function handleAddComment() {
    if (!newComment.trim()) return;
    await onAddComment(newComment.trim());
    setNewComment("");
  }

  return (
    <div>
      <div className="space-y-3">
        <div>
          <label className="label-muted">Title</label>
          <input value={editText} onChange={(e) => setEditText(e.target.value)} className="input-glass w-full" />
        </div>

        <div>
          <label className="label-muted">Due Date</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="input-glass w-full" />
        </div>

        <div className="flex gap-2">
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input-glass flex-1">
            <option value={1}>1 - Highest</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4 - Lowest</option>
          </select>

          <select value={recurrence} onChange={(e) => setRecurrence(e.target.value)} className="input-glass flex-1">
            <option value="none">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-glass flex-1 bg-indigo-600/30 text-white">Save</button>
          <button onClick={() => onDeleteTask(task.id)} className="btn-glass flex-1 text-red-400">Delete</button>
        </div>

        <div className="mt-4">
          <h4 className="font-semibold mb-2">Comments</h4>
          <div className="space-y-2">
            {comments.length === 0 && <div className="small-muted">No comments yet.</div>}
            {comments.map(c => (
              <div key={c.id} className="p-2 btn-glass rounded">
                <div className="text-xs small-muted">{c.user || "Unknown"}</div>
                <div>{c.text}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Write a comment..." className="input-glass flex-1" />
            <button onClick={handleAddComment} className="btn-glass">Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* -----------------------------
  ToastNotification Component
------------------------------*/
function ToastNotification({ message, type = "success", isVisible }) {
  if (!isVisible) return null;
  const bg = type === "error" ? "bg-red-500" : "bg-green-500";
  return (
    <div className={`fixed bottom-5 left-5 p-3 rounded text-white ${bg} shadow-lg`}>
      {message}
    </div>
  );
}
