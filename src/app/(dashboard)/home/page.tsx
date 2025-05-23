"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Types } from "@/app/enums/types";
import { format } from "date-fns";
import { customStyle } from "@/app/style/custom-style";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Status } from "@/app/enums/status";
import { StatusLabels } from "@/app/enums/status";

interface Task {
  id: number;
  title: string;
  description: string;
  type: number;
  status: number;
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  type: number;
  subType: number;
  amount: number;
  description: string;
  createdAt: string;
}

interface Note {
  id: number;
  title: string;
  description: string;
  type: number;
  createdAt: string;
}

interface Plan {
  id: number;
  title: string;
  description: string;
  type: number;
  status: number;
  createdAt: string;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [types, setTypes] = useState<[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNoteType, setSelectedNoteType] = useState<number | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState<number | null>(null);
  const [selectedTaskType, setSelectedTaskType] = useState<number | null>(null);
  const [selectedTransactionType, setSelectedTransactionType] = useState<
    number | null
  >(null);

  const baseUrl = backendUrl();
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login");
        return;
      }

      try {
        const check = await axios.get(`${baseUrl}/auth/check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!check.data) {
          localStorage.removeItem("token");
          router.push("/login");
          return;
        }
        // If authentication successful, fetch data
        fetchData();
      } catch (error) {
        console.log("error", error);
        localStorage.removeItem("token");
        router.push("/login");
        return;
      }
    }

    checkAuth();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [tasksRes, transactionsRes, notesRes, plansRes, typesRes] =
        await Promise.all([
          axios.get(`${baseUrl}/tasks`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/savings/2099-99`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/notes`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/plans`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${baseUrl}/types`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

      setTasks(tasksRes.data);
      setTransactions(transactionsRes.data);
      setNotes(notesRes.data);
      setPlans(plansRes.data);
      setTypes(typesRes.data);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filteredNotes = selectedNoteType
    ? notes.filter((note) => note.type === selectedNoteType)
    : notes;

  const filteredPlans = selectedPlanType
    ? plans.filter((plan) => plan.type === selectedPlanType)
    : plans;

    const filteredTasks = tasks.filter((item) => {
      if (selectedTaskType === 0 || selectedTaskType === null) {
        return true; 
      }
      return Number(item.status) === selectedTaskType; 
    });

  const filteredTransactions = selectedTransactionType
    ? transactions.filter((t) => t.type === selectedTransactionType)
    : transactions;

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="bg-red-900/50 border-l-4 border-red-500 p-4 rounded-lg">
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case Status.NOT_STARTED.toString():
        return "Not Started"
      case Status.IN_PROGRESS.toString():
        return "In Progress"
      case Status.COMPLETED.toString():
        return "Completed"
      case Status.OVERDUE.toString():
        return "Overdue"
      default:
        return "Unknown"
    }
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
              <p className="text-sm text-gray-400">
                Welcome to your personal dashboard
              </p>
            </div>
            <div className="text-sm text-gray-400">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </div>
          </div>

          {/* Summary Cards */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 ${customStyle.pageBg} p-4 rounded-lg`}
          >
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Saving Records
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-100">
                {transactions.length}
              </p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Task Records
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-100">{tasks.length}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Note Records
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-100">{notes.length}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Plan Records
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-100">{plans.length}</p>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">
                  Type Records
                </h3>
              </div>
              <p className="text-2xl font-bold text-gray-100">{types.length}</p>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-36">
            {/* Recent Tasks */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  Recent Tasks
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTaskType || ""}
                    onChange={(e) =>
                      setSelectedTaskType(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="0">All Types</option>
                    <option value="1">Not Started</option>
                    <option value="2">In Progress</option>
                    <option value="3">Completed</option>
                    <option value="4">Overdue</option>
                  </select>
                  <Link
                    href="/tasks"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {filteredTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(task.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === Number(Status.NOT_STARTED)
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-green-900/50 text-green-300"
                      }`}
                    >
                      {getStatusLabel(task.status.toString())}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Notes */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  Recent Notes
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedNoteType || ""}
                    onChange={(e) =>
                      setSelectedNoteType(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="1">Not Started</option>
                    <option value="2">In Progress</option>
                    <option value="3">Completed</option>
                    <option value="4">Overdue</option>
                  </select>
                  <Link
                    href="/notes"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {filteredNotes.slice(0, 5).map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {note.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(note.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-900/50 text-blue-300">
                      Type {note.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Plans */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  Recent Plans
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedPlanType || ""}
                    onChange={(e) =>
                      setSelectedPlanType(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value="1">Type 1</option>
                    <option value="2">Type 2</option>
                    <option value="3">Type 3</option>
                  </select>
                  <Link
                    href="/plans"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {filteredPlans.slice(0, 5).map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {plan.title}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(plan.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        plan.status === 1
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-green-900/50 text-green-300"
                      }`}
                    >
                      {plan.status === 1 ? "In Progress" : "Completed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Savings */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">
                  Recent Savings
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedTransactionType || ""}
                    onChange={(e) =>
                      setSelectedTransactionType(
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="bg-gray-900 border border-gray-700 text-gray-100 text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    <option value={Types.INCOME}>Income</option>
                    <option value={Types.EXPENSE}>Expense</option>
                  </select>
                  <Link
                    href="/savings"
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    View All
                  </Link>
                </div>
              </div>
              <div className="space-y-3">
                {filteredTransactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">
                        {transaction.description}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        transaction.type === Types.INCOME
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {transaction.type === Types.INCOME ? "+ " : "- "}
                      {transaction.amount}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
