"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import { Types } from "@/app/enums/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { customStyle } from "@/app/style/custom-style";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
  id: string;
  type: number;
  subType: number;
  amount: number;
  description: string;
  createdAt: string;
  date: string;
}

interface Subtype {
  id: number;
  name: string;
  description: string;
  subType: number;
}

interface SubtypesMap {
  [key: number]: Subtype[];
}

export default function SavingsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [subtypes, setSubtypes] = useState<SubtypesMap>({
    [Types.INCOME]: [],
    [Types.EXPENSE]: [],
  });
  const [createSelectedMonth, setCreateSelectedMonth] = useState(
    format(new Date(), "yyyy-MM-dd")
  );
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
  const [newTransaction, setNewTransaction] = useState({
    type: Types.EXPENSE,
    amount: "",
    description: "",
    subType: 0,
    date: format(new Date(), "yyyy-MM-dd"),
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const baseUrl = backendUrl();

  useEffect(() => {
    fetchTransactions(selectedMonth);
    fetchAllSubtypes();
  }, [selectedMonth]);

  const fetchTransactions = async (yearMonth: string) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/savings/${yearMonth}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTransactions(response.data);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      toast.error("Failed to fetch transactions");
    }
  };

  const fetchAllSubtypes = async () => {
    const token = localStorage.getItem("token");
    try {
      const [incomeResponse, expenseResponse] = await Promise.all([
        axios.get(`${baseUrl}/types/${Types.INCOME}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/types/${Types.EXPENSE}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSubtypes({
        [Types.INCOME]: incomeResponse.data,
        [Types.EXPENSE]: expenseResponse.data,
      });
    } catch (err) {
      console.error("Error fetching subtypes:", err);
      toast.error("Failed to fetch subtypes");
    }
  };

  const handleTypeChange = (value: string) => {
    setFormData((prev) => ({ ...prev, type: value, subtype: "" }));
  };

  const handleEditTypeChange = (value: string) => {
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
    const date = new Date(formData.date);
    const currentDate = date.toISOString().slice(0, 10);

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
    setEditFormData({
      type: transaction.type.toString(),
      subtype: transaction.subType.toString(),
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.createdAt,
    });
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

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
              <p className="text-sm text-gray-400">Total Income</p>
              <p className="text-lg font-bold text-green-400">{totalIncome}</p>
            </div>
            <div className={`p-3 rounded-lg ${customStyle.cardBg}`}>
              <p className="text-sm text-gray-400">Total Expense</p>
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

          {/* New Transaction Button and Modal */}
          <div className="flex justify-end mb-4">
            <Button onClick={handleOpenCreateModal} className="bg-blue-600 hover:bg-blue-700">
              New Transaction
            </Button>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-100">New Transaction</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Select value={formData.type} onValueChange={handleTypeChange}>
                      <SelectTrigger className={`w-full ${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textTitleWhite} h-9`}>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className={`${customStyle.selectBg} ${customStyle.borderColor}`}>
                        <SelectGroup>
                          <SelectItem value={Types.INCOME.toString()} className={`${customStyle.textContentGrey} hover:bg-gray-700`}>
                            Income
                          </SelectItem>
                          <SelectItem value={Types.EXPENSE.toString()} className={`${customStyle.textContentGrey} hover:bg-gray-700`}>
                            Expense
                          </SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <Select
                      value={formData.subtype}
                      onValueChange={(value) =>
                        setFormData((prev) => ({ ...prev, subtype: value }))
                      }
                    >
                      <SelectTrigger className={`w-full ${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textTitleWhite} h-9`}>
                        <SelectValue placeholder="Subtype" />
                      </SelectTrigger>
                      <SelectContent className={`${customStyle.selectBg} ${customStyle.borderColor}`}>
                        <SelectGroup>
                          {(subtypes[Number(formData.type)] || []).map(
                            (subtype: Subtype) => (
                              <SelectItem
                                key={subtype.id}
                                value={subtype.id.toString()}
                                className={`${customStyle.textContentGrey} hover:bg-gray-700`}
                              >
                                {subtype.description}
                              </SelectItem>
                            )
                          )}
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
                        setFormData((prev) => ({ ...prev, amount: e.target.value }))
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
                        setFormData((prev) => ({ ...prev, date: e.target.value }))
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
                      setFormData((prev) => ({ ...prev, description: e.target.value }))
                    }
                    className={`${customStyle.selectBg} ${customStyle.borderColor} ${customStyle.textContentGrey} h-9`}
                  />
                </div>
                <DialogFooter className="flex justify-end">
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700 h-9">
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
                  {transactions.map((t) => (
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
                  {transactions
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
                  {transactions
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
                      {(subtypes[Number(editFormData.type)] || []).map(
                        (subtype: Subtype) => (
                          <SelectItem
                            key={subtype.id}
                            value={subtype.id.toString()}
                            className="text-gray-100 hover:bg-gray-700"
                          >
                            {subtype.description}
                          </SelectItem>
                        )
                      )}
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
