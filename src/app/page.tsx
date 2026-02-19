"use client";

import { useState, useEffect } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

type TaskType = "todo" | "hapalan" | "planner";

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

  const [mokelDays, setMokelDays] = useState<number[]>([]);

  const [todo, setTodo] = useState("");
  const [hapalan, setHapalan] = useState("");
  const [planner, setPlanner] = useState("");
  const [chat, setChat] = useState("");

  const login = async () => {
    const res = await signInWithPopup(auth, googleProvider);
    setUser(res.user);
  };

  const logout = () => {
    signOut(auth);
    setUser(null);
  };

  const fetchTasks = async () => {
    if (!user) return;
    const res = await fetch(`/api/crud?user_id=${user.uid}`);
    const data = await res.json();
    setTasks(data);
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

  // ✅ FIX UTAMA DI SINI
  const handleSubmit = async (
    type: TaskType,
    content: string,
    setProgressTo?: number
  ) => {
    if (!user || !content || selectedDay === null) return;

    const existingTask = tasks.find((t) => t.id === editingId);

    let payload: Task;

    if (editingId && existingTask) {
      // UPDATE TASK SPESIFIK
      payload = {
        ...existingTask,
        content,
        progress: setProgressTo ?? existingTask.progress,
      };
    } else {
      // CREATE TASK BARU (STACK)
      payload = {
        user_id: user.uid,
        type,
        content,
        day: selectedDay,
        progress: setProgressTo ?? 0,
      };
    }

    const res = await fetch("/api/crud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed submit task");

    fetchTasks();
    setEditingId(null);
    setTodo("");
    setHapalan("");
    setPlanner("");
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    await fetch(`/api/crud?id=${id}`, { method: "DELETE" });
    fetchTasks();
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id || null);
    if (task.type === "todo") setTodo(task.content);
    if (task.type === "hapalan") setHapalan(task.content);
    if (task.type === "planner") setPlanner(task.content);
    setSelectedDay(task.day);
  };

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
        <button onClick={login} className="bg-yellow-600 px-6 py-3 rounded">
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div className="p-4 max-w-6xl mx-auto min-h-screen bg-gray-900 text-white flex flex-col gap-6">

      <div className="flex justify-between">
        <h1 className="text-3xl font-bold">Dashboard Ramadan</h1>
        <button onClick={logout} className="bg-red-600 px-4 py-2 rounded">
          Logout
        </button>
      </div>

      {/* Kalender */}
      <div className="grid grid-cols-7 gap-2">
        {tasksByDay.map((dayTasks, idx) => {
          const day = idx + 1;
          const isMokel = mokelDays.includes(day);

          let color = "bg-gray-800";

          if (!dayTasks.length) color = "bg-red-600";
          else {
            const maxProgress = Math.max(...dayTasks.map((t) => t.progress));
            color = STATUS_COLOR(maxProgress, isMokel);
          }

          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`p-4 rounded ${color}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Forms */}
      {selectedDay && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("todo", todo); }} className="bg-gray-800 p-4 rounded">
            <h3>Todo</h3>
            <input value={todo} onChange={(e) => setTodo(e.target.value)} className="p-2 w-full bg-gray-700 rounded"/>
            <button className="bg-yellow-500 px-4 py-2 mt-2 rounded">
              {editingId ? "Update" : "Add"}
            </button>
          </form>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("hapalan", hapalan); }} className="bg-gray-800 p-4 rounded">
            <h3>Hapalan</h3>
            <input value={hapalan} onChange={(e) => setHapalan(e.target.value)} className="p-2 w-full bg-gray-700 rounded"/>
            <button className="bg-yellow-500 px-4 py-2 mt-2 rounded">
              {editingId ? "Update" : "Add"}
            </button>
          </form>

          <form onSubmit={(e) => { e.preventDefault(); handleSubmit("planner", planner); }} className="bg-gray-800 p-4 rounded">
            <h3>Planner</h3>
            <input value={planner} onChange={(e) => setPlanner(e.target.value)} className="p-2 w-full bg-gray-700 rounded"/>
            <button className="bg-yellow-500 px-4 py-2 mt-2 rounded">
              {editingId ? "Update" : "Add"}
            </button>
          </form>

          {/* Chat tidak disimpan */}
          <div className="bg-gray-800 p-4 rounded">
            <h3>Chat</h3>
            <input
              value={chat}
              onChange={(e) => setChat(e.target.value)}
              className="p-2 w-full bg-gray-700 rounded"
            />
          </div>

        </div>
      )}

      {/* Summary */}
      <div className="flex gap-4">
        <div className="bg-red-700 px-4 py-2 rounded">Not Ready: {statusCount.notReady}</div>
        <div className="bg-yellow-600 px-4 py-2 rounded">In Process: {statusCount.inProcess}</div>
        <div className="bg-green-600 px-4 py-2 rounded">Success: {statusCount.success}</div>
      </div>

      {/* Task List */}
      <div className="flex flex-col gap-2">
        {tasks.filter(t => selectedDay ? t.day === selectedDay : true).map(task => (
          <div key={task.id} className="bg-gray-800 p-3 rounded flex justify-between">
            <div>
              {task.type}: {task.content} - {STATUS(task.progress)}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSubmit(task.type, task.content, 50)} className="bg-yellow-600 px-2 rounded">Process</button>
              <button onClick={() => handleSubmit(task.type, task.content, 100)} className="bg-green-600 px-2 rounded">Success</button>
              <button onClick={() => startEdit(task)} className="bg-blue-600 px-2 rounded">Edit</button>
              <button onClick={() => handleDelete(task.id)} className="bg-red-600 px-2 rounded">Delete</button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}
