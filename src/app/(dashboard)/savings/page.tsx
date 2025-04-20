"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Types } from "@/app/enums/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface Transaction {
  id: string;
  type: number;
  amount: number;
  description: string;
  createdAt: string;
}

export default function SavingsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: Types.EXPENSE.toString(),
    subtype: "",
    amount: "",
    description: "",
  });
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const baseUrl = backendUrl();

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth]);

  const fetchTransactions = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/transactions?month=${selectedMonth}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast.error("Failed to fetch transactions");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    try {
      await axios.post(
        `${baseUrl}/transactions`,
        {
          type: Number(formData.type),
          subtype: formData.subtype,
          amount: Number(formData.amount),
          description: formData.description,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Transaction created successfully");
      setFormData({ 
        type: Types.EXPENSE.toString(), 
        subtype: "",
        amount: "", 
        description: "" 
      });
      fetchTransactions();
    } catch (err) {
      console.error("Error creating transaction:", err);
      toast.error("Failed to create transaction");
    }
  };

  const totalIncome = transactions
    .filter(t => t.type === Types.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === Types.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Savings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-800">Total Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">${totalExpense.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className={`bg-gradient-to-br ${balance >= 0 ? 'from-green-50 to-green-100 border-green-200' : 'from-red-50 to-red-100 border-red-200'}`}>
          <CardHeader>
            <CardTitle className={balance >= 0 ? 'text-green-800' : 'text-red-800'}>Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${balance.toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Create Record Form */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg shadow-md mb-8 border border-blue-200">
        <h2 className="text-xl font-semibold mb-4 text-blue-800">Create New Record</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-4">
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger className="bg-white w-32">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={Types.INCOME.toString()}>Income</SelectItem>
                    <SelectItem value={Types.EXPENSE.toString()}>Expense</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Select
                value={formData.subtype}
                onValueChange={(value) => setFormData(prev => ({ ...prev, subtype: value }))}
              >
                <SelectTrigger className="bg-white w-32">
                  <SelectValue placeholder="Subtype" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="salary">Salary</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="entertainment">Entertainment</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-4 flex-1">
              <Input
                type="number"
                placeholder="Amount"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-white w-32"
              />
              <Input
                type="text"
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white flex-1"
              />
            </div>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Add Record</Button>
          </div>
        </form>
      </div>

      {/* Transaction History */}
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-lg shadow-md border border-purple-200">
        <h2 className="text-xl font-semibold mb-4 text-purple-800">Transaction History</h2>
        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="mb-4 bg-white"
        />
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-purple-200">
            <TabsTrigger value="all" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white">All</TabsTrigger>
            <TabsTrigger value="income" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">Income</TabsTrigger>
            <TabsTrigger value="expense" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">Expense</TabsTrigger>
          </TabsList>
          <TabsContent value="all">
            <div className="space-y-4">
              {transactions.map((t) => (
                <div
                  key={t.id}
                  className={`p-4 rounded-lg ${
                    t.type === Types.INCOME 
                      ? "bg-gradient-to-r from-green-50 to-green-100 border border-green-200" 
                      : "bg-gradient-to-r from-red-50 to-red-100 border border-red-200"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{t.description}</p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(t.createdAt), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <p
                      className={`font-bold ${
                        t.type === Types.INCOME ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {t.type === Types.INCOME ? "+" : "-"}${t.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="income">
            <div className="space-y-4">
              {transactions
                .filter((t) => t.type === Types.INCOME)
                .map((t) => (
                  <div key={t.id} className="p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(t.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <p className="font-bold text-green-600">
                        +${t.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
          <TabsContent value="expense">
            <div className="space-y-4">
              {transactions
                .filter((t) => t.type === Types.EXPENSE)
                .map((t) => (
                  <div key={t.id} className="p-4 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{t.description}</p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(t.createdAt), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <p className="font-bold text-red-600">
                        -${t.amount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 