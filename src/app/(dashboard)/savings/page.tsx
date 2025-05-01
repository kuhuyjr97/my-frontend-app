"use client";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Types } from "@/app/enums/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { customStyle } from "@/app/style/custom-style";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  type: number;
  subType: number;
  amount: number;
  description: string;
  createdAt: string;
  date: string;
}

export default function SavingsPage() {
  //
  const [subtypeList, setSubtypeList] = useState<
    { name: string; value: string }[]
  >([]);

  const [totalChartData, setTotalChartData] = useState<any[]>([]);
  const [monthChartData, setMonthChartData] = useState<any[]>([]);
  //

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [sumTransactions, setSumTransactions] = useState<
    Record<string, number>
  >({});
  const [monthTransactions, setMonthTransactions] = useState<Transaction[]>([]);

  const [formData, setFormData] = useState({
    type: Types.EXPENSE.toString(),
    subtype: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), "yyyy-MM")
  );
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    type: "",
    subtype: "",
    amount: "",
    description: "",
    date: "",
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const baseUrl = backendUrl();
  const router = useRouter();
  useEffect(() => {
    async function fetchData() {
      const token = localStorage.getItem("token");
      if (!token) {
        localStorage.removeItem("token");
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
      } catch (error) {
        console.log("error", error);
        localStorage.removeItem("token");
        console.log("navifte to login");
        router.push("/login");
        return;
      }
    }
    fetchTransactions(selectedMonth);
    fetchAllSubtypes();
    fetchData();
  }, []);
  const [savingResponse, setSavingResponse] = useState<any[]>([]);
  useEffect(() => {
    fetchTransactions(selectedMonth);
    fetchAllSubtypes();
    handleTypeChange(formData.type);
  }, [selectedMonth]);

  const fetchTransactions = async (yearMonth: string) => {
    console.log("yearMonth", yearMonth);
    const token = localStorage.getItem("token");
    try {
      const totalResponse = await axios.get(`${baseUrl}/savings/2099-99`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const monthResponse = await axios.get(`${baseUrl}/savings/${yearMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const typeResponse = await axios.get(`${baseUrl}/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setTransactions(totalResponse.data);
      const result = totalResponse.data.reduce(
        (acc: Record<number, number>, item: Transaction) => {
          acc[item.subType] = (acc[item.subType] || 0) + item.amount;
          return acc;
        },
        {} as Record<number, number>
      );

      const nameMap = Object.fromEntries(
        typeResponse.data.map((item: any) => [item.subType, item.description])
      );
      const renamedResult = Object.entries(result).reduce(
        (acc, [subType, total]) => {
          const name = nameMap[Number(subType)] || subType;
          acc[name] = total as number;
          return acc;
        },
        {} as Record<string, number>
      );
      setSumTransactions(renamedResult);

      const totalChartData = Object.entries(renamedResult).map(([name, total]) => ({
        name,
        total: total as number,
      }));

      const monthResult = monthResponse.data.reduce(
        (acc: Record<number, number>, item: Transaction) => {
          acc[item.subType] = (acc[item.subType] || 0) + item.amount;
          return acc;
        },
        {} as Record<number, number>
      );

      const monthChartData = Object.entries(monthResult).map(([name, total]) => ({
        name,
        total: total as number,
      }));

      console.log("totalChartData", totalChartData);
      console.log("monthChartData", monthChartData);

      setTotalChartData(totalChartData);
      setMonthChartData(monthChartData);


      setMonthTransactions(monthResponse.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast.error("Failed to fetch transactions");
    }
  };

  const fetchAllSubtypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const savingResponse = await axios.get(`${baseUrl}/types`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("saving sum from type", sumTransactions);
      setSavingResponse(savingResponse.data);
    } catch (err) {
      console.error("Error fetching subtypes:", err);
      toast.error("Failed to fetch subtypes");
    }
  };

  const handleTypeChange = (value: string) => {
    if (value === Types.INCOME.toString()) {
      const incomeSubtypes = savingResponse
        .filter((item: any) => item.type === Types.INCOME)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));

      setSubtypeList(incomeSubtypes);
    } else if (value === Types.EXPENSE.toString()) {
      const expenseSubtypes = savingResponse
        .filter((item: any) => item.type === Types.EXPENSE)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));
      setSubtypeList(expenseSubtypes);
    }

    setFormData((prev) => ({ ...prev, type: value, subtype: "" }));
  };

  const handleEditTypeChange = (value: string) => {
    if (value === Types.INCOME.toString()) {
      const incomeSubtypes = savingResponse
        .filter((item: any) => item.type === Types.INCOME)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));
      setSubtypeList(incomeSubtypes);
    } else if (value === Types.EXPENSE.toString()) {
      const expenseSubtypes = savingResponse
        .filter((item: any) => item.type === Types.EXPENSE)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));
      setSubtypeList(expenseSubtypes);
    }
    setEditFormData((prev) => ({ ...prev, type: value, subtype: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    console.log(formData);
    if (
      formData.subtype === "" ||
      formData.amount === "" ||
      formData.description === ""
    ) {
      toast.error("Please fill all the fields");
      return;
    }
    try {
      await axios.post(
        `${baseUrl}/savings`,
        {
          type: Number(formData.type),
          subType: Number(formData.subtype),
          amount: Number(formData.amount),
          description: formData.description,
          createdAt: formData.date,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Transaction created successfully");
      setFormData({
        type: Types.EXPENSE.toString(),
        subtype: "",
        amount: "",
        description: "",
        date: "",
      });
      fetchTransactions(selectedMonth);
    } catch (err) {
      console.error("Error creating transaction:", err);
      toast.error("Failed to create transaction");
    }
  };

  const totalIncome = transactions
    .filter((t) => t.type === Types.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === Types.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpense;

  const monthIncome = monthTransactions
    .filter((t) => t.type === Types.INCOME)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpense = monthTransactions
    .filter((t) => t.type === Types.EXPENSE)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthBalance = monthIncome - monthExpense;

  const handleDeleteTransaction = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/savings/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Transaction deleted successfully");
      fetchTransactions(selectedMonth);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error deleting transaction:", err);
      toast.error("Failed to delete transaction");
    }
  };

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransaction) return;

    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `${baseUrl}/savings/${selectedTransaction.id}`,
        {
          type: Number(editFormData.type),
          subType: Number(editFormData.subtype),
          amount: Number(editFormData.amount),
          description: editFormData.description,
          createdAt: new Date(editFormData.date),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Transaction updated successfully");
      fetchTransactions(selectedMonth);
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error updating transaction:", err);
      toast.error("Failed to update transaction");
    }
  };

  const openTransactionModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    console.log("transaction", transaction);

    // Set subtypeList based on transaction type
    if (transaction.type === Types.INCOME) {
      const incomeSubtypes = savingResponse
        .filter((item: any) => item.type === Types.INCOME)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));
      setSubtypeList(incomeSubtypes);
    } else if (transaction.type === Types.EXPENSE) {
      const expenseSubtypes = savingResponse
        .filter((item: any) => item.type === Types.EXPENSE)
        .map((item: any) => ({
          name: item.description,
          value: String(item.subType),
        }));
      setSubtypeList(expenseSubtypes);
    }

    // Set default values for edit form
    const defaultSubtype = transaction.subType.toString();
    setEditFormData({
      type: transaction.type.toString(),
      subtype: defaultSubtype,
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.createdAt,
    });

    // Set default subtype in the form
    setFormData((prev) => ({
      ...prev,
      type: transaction.type.toString(),
      subtype: defaultSubtype,
    }));

    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setFormData({
      type: Types.EXPENSE.toString(),
      subtype: "",
      amount: "",
      description: "",
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setIsCreateModalOpen(true);
  };

  return (
    <div className={`flex h-screen ${customStyle.containerBg}`}>
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Header Section */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className={`text-xl font-bold ${customStyle.textTitle}`}>
                Savings
              </h1>
            </div>
          </div>

          {/* Summary total */}

          <div
            className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 ${customStyle.pageBg} rounded-lg mb-4`}
          >
            {/* Total Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Total Income</p>
                <p className="text-lg font-bold text-green-400">
                  {totalIncome}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Expense</p>
                <p className="text-lg font-bold text-red-400">{totalExpense}</p>
              </div>
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Balance</p>
                <p
                  className={`text-lg font-bold ${
                    balance >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {balance}
                </p>
              </div>
            </div>

            {/* Monthly Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Month Income</p>
                <p className="text-lg font-bold text-green-400">
                  {monthIncome}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Expense</p>
                <p className="text-lg font-bold text-red-400">{monthExpense}</p>
              </div>
              <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
                <p className="text-sm text-gray-400">Balance</p>
                <p
                  className={`text-lg font-bold ${
                    balance >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {monthBalance}
                </p>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col sm:flex-row gap-3 h-[600px] sm:h-[300px]">
            {/* Chart total */}
            <div className="w-full sm:w-1/2 h-1/2 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={totalChartData}>
                <XAxis dataKey="name" tick={{ fill: '#FFFFFF' }} /> 
                  <YAxis tick={{ fill: '#FFFFFF' }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Chart month */}
            <div className="w-full sm:w-1/2 h-1/2 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthChartData}>
                  <XAxis dataKey="name" tick={{ fill: '#FFFFFF' }} />
                  <YAxis tick={{ fill: '#FFFFFF' }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* New Transaction Button and Modal */}
          <div className="flex justify-end mb-4">
            <Button
              onClick={handleOpenCreateModal}
              className="bg-blue-600 hover:bg-blue-700"
            >
              New Transaction
            </Button>
          </div>
          <p></p>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-100">
                  New Transaction
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select
                      value={formData.type}
                      onValueChange={handleTypeChange}
                    >
                      <SelectTrigger
                        className={`w-full ${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textTitleWhite} h-9`}
                      >
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent
                        className={`${customStyle.selectBg} ${customStyle.borderColor}`}
                      >
                        <SelectGroup>
                          <SelectItem
                            value={Types.INCOME.toString()}
                            className={`${customStyle.textContentGrey} hover:bg-gray-700`}
                          >
                            Income
                          </SelectItem>
                          <SelectItem
                            value={Types.EXPENSE.toString()}
                            className={`${customStyle.textContentGrey} hover:bg-gray-700`}
                          >
                            Expense
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/*  todo*/}
                  <div className="flex-1">
                    <Select
                      value={formData.subtype}
                      onValueChange={(value) => {
                        console.log("value", value);
                        setFormData((prev) => ({ ...prev, subtype: value }));
                      }}
                    >
                      <SelectTrigger
                        className={`w-full ${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textTitleWhite} h-9`}
                      >
                        <SelectValue placeholder="Subtype" />
                      </SelectTrigger>
                      <SelectContent
                        className={`${customStyle.selectBg} ${customStyle.borderColor}`}
                      >
                        <SelectGroup>
                          {subtypeList.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.name} {item.value}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      placeholder="Amount"
                      required
                      value={formData.amount}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      className="bg-gray-900 border-gray-700 text-gray-100 h-9"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="date"
                      placeholder="Date"
                      required
                      value={formData.date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          date: e.target.value,
                        }))
                      }
                      className={`${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textContentGrey} h-9`}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    placeholder="Description"
                    required
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    className={`${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textContentGrey} h-9`}
                  />
                </div>
                <DialogFooter className="flex justify-end">
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 h-9"
                  >
                    Add
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Transaction History */}
          <div className={`p-4 rounded-lg ${customStyle.cardBg} mt-4 mb-32`}>
            <div className="flex justify-between items-center mb-3">
              <h2
                className={`text-lg font-semibold ${customStyle.textTitleWhite}`}
              >
                Transactions
              </h2>
              <div className="flex gap-2">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className={`${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textContentGrey} h-8 w-32`}
                />
                <Button
                  onClick={() => setSelectedMonth("2099-99")}
                  variant="outline"
                  className="h-8"
                >
                  All
                </Button>
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList
                className={`grid w-full grid-cols-3 ${customStyle.selectBg}`}
              >
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
                >
                  All
                </TabsTrigger>
                <TabsTrigger
                  value="income"
                  className="data-[state=active]:bg-green-600 data-[state=active]:text-white"
                >
                  Income
                </TabsTrigger>
                <TabsTrigger
                  value="expense"
                  className="data-[state=active]:bg-red-600 data-[state=active]:text-white"
                >
                  Expense
                </TabsTrigger>
              </TabsList>
              <TabsContent value="all">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                  {monthTransactions.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => openTransactionModal(t)}
                      className={`p-3 rounded-lg cursor-pointer ${
                        t.type === Types.INCOME
                          ? "bg-gray-900/50 border border-green-900/50"
                          : "bg-gray-900/50 border border-red-900/50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-100">
                            {t.description}
                          </p>
                          <p className="text-xs text-gray-400">
                            {format(new Date(t.createdAt), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <p
                          className={`text-sm font-bold ${
                            t.type === Types.INCOME
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {t.type === Types.INCOME ? "+ " : "- "}
                          {t.amount}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="income">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                  {monthTransactions
                    .filter((t) => t.type === Types.INCOME)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-gray-900/50 border border-green-900/50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-100">
                              {t.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(t.createdAt), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-green-400">
                            + {t.amount}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
              <TabsContent value="expense">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                  {monthTransactions
                    .filter((t) => t.type === Types.EXPENSE)
                    .map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg bg-gray-900/50 border border-red-900/50"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-medium text-gray-100">
                              {t.description}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(t.createdAt), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-red-400">
                            - {t.amount}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit Transaction Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-gray-100">
              Edit Transaction
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Make changes to your transaction here. Click save when you re
              done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditTransaction} className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <Select
                  value={editFormData.type}
                  onValueChange={handleEditTypeChange}
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectGroup>
                      <SelectItem
                        value={Types.INCOME.toString()}
                        className="text-gray-100 hover:bg-gray-700"
                      >
                        Income
                      </SelectItem>
                      <SelectItem
                        value={Types.EXPENSE.toString()}
                        className="text-gray-100 hover:bg-gray-700"
                      >
                        Expense
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select
                  value={editFormData.subtype}
                  onValueChange={(value) =>
                    setEditFormData((prev) => ({ ...prev, subtype: value }))
                  }
                >
                  <SelectTrigger className="bg-gray-900 border-gray-700 text-gray-100">
                    <SelectValue placeholder="Subtype" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectGroup>
                      {subtypeList.map((item) => (
                        <SelectItem
                          key={item.value}
                          value={item.value}
                          className="text-gray-100 hover:bg-gray-700"
                        >
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-4">
                <Input
                  type="number"
                  placeholder="Amount"
                  required
                  value={editFormData.amount}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  className="bg-gray-900 border-gray-700 text-gray-100"
                />
                <Input
                  type="date"
                  placeholder="Date"
                  value={
                    editFormData.date ? editFormData.date.slice(0, 10) : ""
                  }
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="bg-gray-900 border-gray-700 text-gray-100"
                />
              </div>
              <Input
                type="text"
                placeholder="Description"
                required
                value={editFormData.description}
                onChange={(e) =>
                  setEditFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="bg-gray-900 border-gray-700 text-gray-100"
              />
            </div>
            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  selectedTransaction &&
                  handleDeleteTransaction(selectedTransaction.id)
                }
              >
                Delete
              </Button>
              <Button type="submit">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
