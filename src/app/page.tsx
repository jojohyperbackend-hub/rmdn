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

const STATUS_COLOR = (progress: number, mokel = false) =>
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
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [user]);

  const handleSubmit = async (
    type: TaskType,
    content: string,
    setProgressTo?: number
  ) => {
    if (!user || !content || selectedDay === null) return;

    const existingTask = tasks.find((t) => t.id === editingId);

    const payload: Task =
      editingId && existingTask
        ? {
            ...existingTask,
            content,
            progress: setProgressTo ?? existingTask.progress,
          }
        : {
            user_id: user.uid,
            type,
            content,
            day: selectedDay,
            progress: setProgressTo ?? 0,
          };

    const res = await fetch("/api/crud", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) return;

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
    setSelectedDay(task.day);
    if (task.type === "todo") setTodo(task.content);
    if (task.type === "hapalan") setHapalan(task.content);
    if (task.type === "planner") setPlanner(task.content);
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

  if (!user)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white px-4">
        <button
          onClick={login}
          className="px-8 py-4 rounded-xl bg-yellow-600 hover:bg-yellow-500 transition shadow-xl text-lg"
        >
          Sign in with Google
        </button>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-950 text-white px-4 py-6 md:px-8">
      <div className="max-w-7xl mx-auto flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
          <h1 className="text-2xl md:text-3xl font-bold">
            Ramadan Dashboard
          </h1>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-500 transition"
          >
            Logout
          </button>
        </div>

        {/* Kalender */}
        <div className="grid grid-cols-5 sm:grid-cols-7 gap-2">
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
                className={`aspect-square rounded-lg ${color} flex items-center justify-center font-semibold hover:scale-105 transition`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Forms */}
        {selectedDay && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit("todo", todo); }}
              className="bg-gray-900 p-4 rounded-xl flex flex-col gap-2">
              <h3 className="font-semibold">Todo</h3>
              <input value={todo} onChange={(e)=>setTodo(e.target.value)}
                className="p-2 rounded bg-gray-800 outline-none focus:ring-2 focus:ring-yellow-500"/>
              <button className="bg-yellow-600 py-2 rounded hover:bg-yellow-500 transition">
                {editingId ? "Update" : "Add"}
              </button>
            </form>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit("hapalan", hapalan); }}
              className="bg-gray-900 p-4 rounded-xl flex flex-col gap-2">
              <h3 className="font-semibold">Hapalan</h3>
              <input value={hapalan} onChange={(e)=>setHapalan(e.target.value)}
                className="p-2 rounded bg-gray-800 outline-none focus:ring-2 focus:ring-yellow-500"/>
              <button className="bg-yellow-600 py-2 rounded hover:bg-yellow-500 transition">
                {editingId ? "Update" : "Add"}
              </button>
            </form>

            <form onSubmit={(e) => { e.preventDefault(); handleSubmit("planner", planner); }}
              className="bg-gray-900 p-4 rounded-xl flex flex-col gap-2">
              <h3 className="font-semibold">Planner</h3>
              <input value={planner} onChange={(e)=>setPlanner(e.target.value)}
                className="p-2 rounded bg-gray-800 outline-none focus:ring-2 focus:ring-yellow-500"/>
              <button className="bg-yellow-600 py-2 rounded hover:bg-yellow-500 transition">
                {editingId ? "Update" : "Add"}
              </button>
            </form>

            <div className="bg-gray-900 p-4 rounded-xl flex flex-col gap-2 sm:col-span-2 lg:col-span-3">
              <h3 className="font-semibold">Chat (not saved)</h3>
              <input value={chat} onChange={(e)=>setChat(e.target.value)}
                className="p-2 rounded bg-gray-800 outline-none"/>
            </div>

          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-red-700 rounded-lg p-3 text-center">Not Ready: {statusCount.notReady}</div>
          <div className="bg-yellow-600 rounded-lg p-3 text-center">In Process: {statusCount.inProcess}</div>
          <div className="bg-green-600 rounded-lg p-3 text-center">Success: {statusCount.success}</div>
        </div>

        {/* Task List */}
        <div className="flex flex-col gap-3">
          {tasks.filter(t => selectedDay ? t.day === selectedDay : true).map(task => (
            <div key={task.id}
              className="bg-gray-900 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

              <div className="text-sm md:text-base">
                <span className="font-semibold">{task.type}</span> • {task.content}
                <span className="ml-2 text-gray-400">({STATUS(task.progress)})</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {task.progress < 100 && (
                  <button onClick={()=>handleSubmit(task.type, task.content, 50)}
                    className="bg-yellow-600 px-3 py-1 rounded hover:bg-yellow-500 transition">
                    Process
                  </button>
                )}
                {task.progress < 100 && task.progress > 0 && (
                  <button onClick={()=>handleSubmit(task.type, task.content, 100)}
                    className="bg-green-600 px-3 py-1 rounded hover:bg-green-500 transition">
                    Success
                  </button>
                )}
                <button onClick={()=>startEdit(task)}
                  className="bg-blue-600 px-3 py-1 rounded hover:bg-blue-500 transition">
                  Edit
                </button>
                <button onClick={()=>handleDelete(task.id)}
                  className="bg-red-600 px-3 py-1 rounded hover:bg-red-500 transition">
                  Delete
                </button>
              </div>

            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
