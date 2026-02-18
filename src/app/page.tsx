"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

type TaskType = "todo" | "hapalan" | "planner" | "chat";

type Task = {
  id?: number;
  user_id: string;
  type: TaskType;
  content: string;
  day: number;
  progress: number;
};

const STATUS = (progress: number) =>
  progress === 0 ? "Not Ready" : progress < 100 ? "In Process" : "Success";

const STATUS_COLOR = (progress: number, mokel: boolean = false) =>
  mokel
    ? "bg-purple-600"
    : progress === 0
    ? "bg-red-600"
    : progress < 100
    ? "bg-yellow-500"
    : "bg-green-500";

export default function Page() {
  const [user, setUser] = useState(auth.currentUser);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Puasa / Mokel mode
  const [mokel, setMokel] = useState(false);

  // Form states
  const [todo, setTodo] = useState("");
  const [hapalan, setHapalan] = useState("");
  const [planner, setPlanner] = useState("");
  const [chat, setChat] = useState("");

  // Login / Logout
  const login = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      setUser(res.user);
    } catch (err: any) {
      console.error("Login error:", err.code, err.message);
      alert(err.message);
    }
  };
  const logout = () => {
    signOut(auth);
    setUser(null);
  };

  // Fetch tasks
  const fetchTasks = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/crud?user_id=${user.uid}`);
      if (!res.ok) throw new Error("Failed fetch tasks");
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user]);

  // Submit task
  const handleSubmit = async (type: TaskType, content: string, setProgressTo?: number) => {
    if (!user || !content || selectedDay === null) return;

    const existingTask = tasks.find(
      (t) => t.day === selectedDay && t.type === type
    );

    const payload: Task = existingTask
      ? { ...existingTask, content, progress: setProgressTo ?? existingTask.progress }
      : { user_id: user.uid, type, content, day: selectedDay, progress: setProgressTo ?? 0 };

    try {
      const res = await fetch("/api/crud", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed submit task");
      fetchTasks();
      setEditingId(null);
      setTodo(""); setHapalan(""); setPlanner(""); setChat("");
    } catch (err) {
      console.error(err);
      alert("Failed to submit task");
    }
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const res = await fetch(`/api/crud?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed delete task");
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id || null);
    if (task.type === "todo") setTodo(task.content);
    if (task.type === "hapalan") setHapalan(task.content);
    if (task.type === "planner") setPlanner(task.content);
    if (task.type === "chat") setChat(task.content);
    setSelectedDay(task.day);
  };

  // Aggregate
  const tasksByDay = Array.from({ length: 30 }, (_, i) =>
    tasks.filter((t) => t.day === i + 1)
  );

  const statusCount = { notReady: 0, inProcess: 0, success: 0 };
  tasks.forEach((t) => {
    if (t.progress === 0) statusCount.notReady++;
    else if (t.progress < 100) statusCount.inProcess++;
    else statusCount.success++;
  });

  const progressByType = (type: TaskType) => {
    const ts = tasks.filter((t) => t.type === type);
    if (!ts.length) return 0;
    return Math.round(ts.reduce((a, b) => a + b.progress, 0) / ts.length);
  };

  if (!user)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white">
        <h1 className="text-3xl font-bold mb-6">Login with Google</h1>
        <button
          onClick={login}
          className="bg-yellow-600 hover:bg-yellow-500 transition px-6 py-3 rounded shadow-lg text-xl neon-glow"
        >
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard Ramadan</h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setMokel(!mokel)}
            className={`px-4 py-2 rounded transition ${
              mokel ? "bg-purple-600 hover:bg-purple-500" : "bg-green-600 hover:bg-green-500"
            }`}
          >
            {mokel ? "Mokel Mode" : "Puasa Mode"}
          </button>
          <button onClick={logout} className="bg-red-600 px-4 py-2 rounded hover:bg-red-500 transition">
            Logout
          </button>
        </div>
      </div>

      {/* Kalender */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {tasksByDay.map((dayTasks, idx) => {
          const day = idx + 1;
          let color = "bg-gray-800";
          if (!dayTasks.length) color = mokel ? "bg-purple-600" : "bg-red-600";
          else {
            const maxProgress = Math.max(...dayTasks.map((t) => t.progress));
            color = STATUS_COLOR(maxProgress, mokel);
          }
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`p-4 rounded shadow text-white font-semibold ${color} hover:scale-105 transition relative`}
            >
              {day}
              {dayTasks.some((t) => t.progress === 100) && !mokel && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-400" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Forms */}
      {selectedDay && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Day {selectedDay} Tasks</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["todo","hapalan","planner","chat"] as TaskType[]).map((t) => {
              const value = t === "todo" ? todo : t === "hapalan" ? hapalan : t === "planner" ? planner : chat;
              const setValue = t === "todo" ? setTodo : t === "hapalan" ? setHapalan : t === "planner" ? setPlanner : setChat;
              return (
                <form
                  key={t}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSubmit(t, value);
                  }}
                  className="flex flex-col gap-2 p-4 bg-gray-800 rounded shadow-md hover:shadow-lg transition"
                >
                  <h3 className="font-semibold text-lg">{t.charAt(0).toUpperCase() + t.slice(1)}</h3>
                  <input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={t}
                    className="p-2 rounded bg-gray-700 focus:ring-2 focus:ring-yellow-500 outline-none"
                  />
                  <button type="submit" className="bg-yellow-500 hover:bg-yellow-400 transition px-4 py-2 rounded">
                    {editingId ? "Update" : "Add"} {t}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Summary</h2>
        <div className="flex flex-wrap gap-4">
          <div className="px-4 py-2 bg-red-700 rounded">Not Ready: {statusCount.notReady}</div>
          <div className="px-4 py-2 bg-yellow-600 rounded">In Process: {statusCount.inProcess}</div>
          <div className="px-4 py-2 bg-green-600 rounded">Success: {statusCount.success}</div>
        </div>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
          {(["todo","hapalan","planner","chat"] as TaskType[]).map((type) => (
            <div key={type} className="p-2 bg-gray-800 rounded text-center">
              <div className="font-semibold">{type.charAt(0).toUpperCase() + type.slice(1)}</div>
              <div>{progressByType(type)}%</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.filter((t) => selectedDay ? t.day === selectedDay : true).map((task) => (
          <div
            key={task.id}
            className={`p-3 rounded flex justify-between items-center transition ${
              mokel ? "bg-purple-600 hover:bg-purple-500" : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <div>
              <span className="font-bold">{task.type}</span>: {task.content} (Day {task.day}) - <span className="font-semibold">{STATUS(task.progress)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-700 h-4 rounded overflow-hidden">
                <div className={`${STATUS_COLOR(task.progress, mokel)} h-4`} style={{ width: `${task.progress}%` }} />
              </div>
              {!mokel && task.progress < 100 && (
                <button
                  onClick={() => handleSubmit(task.type, task.content, 50)}
                  className="bg-yellow-600 px-2 rounded text-sm hover:bg-yellow-500 transition"
                >
                  In Process
                </button>
              )}
              {!mokel && task.progress < 100 && task.progress > 0 && (
                <button
                  onClick={() => handleSubmit(task.type, task.content, 100)}
                  className="bg-green-600 px-2 rounded text-sm hover:bg-green-500 transition"
                >
                  Success
                </button>
              )}
              <button
                onClick={() => startEdit(task)}
                className="bg-blue-600 px-2 rounded text-sm hover:bg-blue-500 transition"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(task.id)}
                className="bg-red-600 px-2 rounded text-sm hover:bg-red-500 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-10 text-center text-gray-400 text-sm">© Ramadan Dashboard</footer>
    </div>
  );
}
