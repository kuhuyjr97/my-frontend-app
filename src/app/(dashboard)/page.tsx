"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Types } from "@/app/enums/types";
import { format } from "date-fns";
import { Calendar, Clock, DollarSign, FileText, ListTodo, Plus } from "lucide-react";
import Link from "next/link";

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
  content: string;
  type: number;
  createdAt: string;
}

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const baseUrl = backendUrl();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    try {
      setLoading(true);
      const [tasksRes, transactionsRes, notesRes] = await Promise.all([
        axios.get(`${baseUrl}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/savings/2099-99`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/notes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setTasks(tasksRes.data);
      setTransactions(transactionsRes.data);
      setNotes(notesRes.data);
      setError("");
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === Types.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === Types.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const pendingTasks = tasks.filter((t) => t.status === 1).length;
  const completedTasks = tasks.filter((t) => t.status === 2).length;

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

  return (
    <div className="flex h-screen bg-gray-900">
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
              <p className="text-sm text-gray-400">Welcome to your personal dashboard</p>
            </div>
            <div className="text-sm text-gray-400">
              {format(new Date(), "EEEE, MMMM d, yyyy")}
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Balance</h3>
                <DollarSign className="h-5 w-5 text-blue-400" />
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {balance}
              </p>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Income: {totalIncome}</span>
                <span>Expense: {totalExpense}</span>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Tasks</h3>
                <ListTodo className="h-5 w-5 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-gray-100">{tasks.length}</p>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>Pending: {pendingTasks}</span>
                <span>Completed: {completedTasks}</span>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Notes</h3>
                <FileText className="h-5 w-5 text-yellow-400" />
              </div>
              <p className="text-2xl font-bold text-gray-100">{notes.length}</p>
              <div className="text-xs text-gray-400 mt-2">
                Last updated: {notes.length > 0 ? format(new Date(notes[0].createdAt), "MMM d") : "Never"}
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-400">Transactions</h3>
                <DollarSign className="h-5 w-5 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-gray-100">{transactions.length}</p>
              <div className="text-xs text-gray-400 mt-2">
                Last month: {format(new Date(), "MMMM")}
              </div>
            </div>
          </div>

          {/* Recent Activities */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Tasks */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Recent Tasks</h2>
                <Link href="/tasks" className="text-sm text-blue-400 hover:text-blue-300">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">{task.title}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(task.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        task.status === 1
                          ? "bg-yellow-900/50 text-yellow-300"
                          : "bg-green-900/50 text-green-300"
                      }`}
                    >
                      {task.status === 1 ? "Pending" : "Completed"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-100">Recent Transactions</h2>
                <Link href="/savings" className="text-sm text-blue-400 hover:text-blue-300">
                  View All
                </Link>
              </div>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-100">{transaction.description}</p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(transaction.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>
                    <p
                      className={`text-sm font-bold ${
                        transaction.type === Types.INCOME ? "text-green-400" : "text-red-400"
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

          {/* Quick Actions */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              href="/tasks"
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-900/50 rounded-lg">
                  <ListTodo className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100">Manage Tasks</h3>
                  <p className="text-xs text-gray-400">View and manage your tasks</p>
                </div>
              </div>
            </Link>

            <Link
              href="/savings"
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-900/50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100">Track Finances</h3>
                  <p className="text-xs text-gray-400">Manage your income and expenses</p>
                </div>
              </div>
            </Link>

            <Link
              href="/notes"
              className="bg-gray-800 p-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-900/50 rounded-lg">
                  <FileText className="h-5 w-5 text-yellow-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-100">View Notes</h3>
                  <p className="text-xs text-gray-400">Access your notes and documents</p>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 