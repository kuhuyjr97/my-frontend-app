"use client";

import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Types, TypeLabels } from "@/app/enums/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoCard } from "@/components/common/infoCard";
import { toast } from "sonner";

import { DialogComponent } from "@/components/common/dialog";
import { SheetSide } from "@/components/common/sheet";
interface Type {
  id: string;
  type: string;
  subtype: string;
  content: string;
}

export default function TypeSettingsPage() {
  const [types, setTypes] = useState<Type[]>([]);
  const [description, setDescription] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [token, setToken] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    subtype: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = backendUrl();

  const typeOptions = [
    {
      label: "NOTE",
      value: Types.NOTE,
    },
    {
      label: "PLAN",
      value: Types.PLAN,
    },
    {
      label: "TASK",
      value: Types.TASK,
    },
    {
      label: "INCOME",
      value: Types.INCOME,
    },
    {
      label: "EXPENSE",
      value: Types.EXPENSE,
    },
  ];

  useEffect(() => {
    setToken(token || "");
    fetchTypes();
  }, []);

  const fetchTypes = async (type?: Types) => {
    const token = localStorage.getItem("token");

    try {
      let response;

      if (type) {
        response = await axios.get(`${baseUrl}/types/${type}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        response = await axios.get(`${baseUrl}/types`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      setTypes(response.data);
    } catch (err) {
      console.error("Error fetching types:", err);
      setError("Failed to fetch types");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    const token = localStorage.getItem("token");

    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await axios.post(
        `${baseUrl}/types`,
        {
          type: Number(selectedType),
          description: description,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.success("Type has been created successfully!");
      fetchTypes();
    } catch (err) {
      console.error("Error creating type:", err);
      toast.error("Failed to create type. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id: string, description: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(`${baseUrl}/types/${id}`, { description }, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchTypes();
    } catch (err) {
      console.error("Error deleting type:", err);
      setError("Failed to delete type");
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`${baseUrl}/types/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      fetchTypes();
      toast.success("Type has been deleted ");
    } catch (err) {
      console.error("Error deleting type:", err);
      setError("Failed to delete type");
    }
  };

  // Group types by their main type
  const groupedTypes = types.reduce((acc, type) => {
    if (!acc[type.type]) {
      acc[type.type] = [];
    }
    acc[type.type].push(type);
    return acc;
  }, {} as Record<string, Type[]>);

  return (
    <div className="container mx-auto px-4 py-8 bg-gray-900">
      <DialogComponent title="Type Settings" description="Type Settings" />
      <h1 className="text-2xl font-bold mb-6 text-gray-100">Type Settings</h1>

      {/* Display Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Main Type</h2>

        <Select
          value={selectedType}
          onValueChange={(value) => {
            setSelectedType(value);
            setFormData((prev) => ({ ...prev, type: value }));
          }}
        >
          <SelectTrigger className="w-full bg-gray-900 border-gray-700 text-gray-100">
            <SelectValue placeholder="Select a main type" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectGroup>
              {typeOptions.map((option) => (
                <SelectItem 
                  key={option.value} 
                  value={option.value.toString()}
                  className="text-gray-100 hover:bg-gray-700"
                >
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Input
          className="my-3 bg-gray-900 border-gray-700 text-gray-100"
          type="text"
          placeholder="Description"
          name="description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button 
          onClick={handleSubmit}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Add
        </Button>
      </div>

      {/* Types List Section */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Existing Types</h2>
        {/* button for filter types */}
        <div className="flex flex-wrap gap-3">
          {[
            { label: "All", value: null },
            { label: TypeLabels[Types.NOTE], value: Types.NOTE },
            { label: TypeLabels[Types.PLAN], value: Types.PLAN },
            { label: TypeLabels[Types.TASK], value: Types.TASK },
            { label: TypeLabels[Types.INCOME], value: Types.INCOME },
            { label: TypeLabels[Types.EXPENSE], value: Types.EXPENSE },
          ].map((item, index) => {
            const isSelected = item.value === null 
              ? selectedType === "" 
              : selectedType === item.value.toString();
            
            return (
              <Button
                key={index}
                onClick={() => fetchTypes(item.value as unknown as Types)}
                className={`px-4 py-2 min-w-[100px] sm:min-w-[120px] text-sm sm:text-base ${
                  isSelected 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-gray-700 hover:bg-gray-600 text-gray-100"
                }`}
              >
                {item.label}
              </Button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-3 mt-4">
          {types.map((type) => (
            <div key={type.id} className="p-2">
              <SheetSide 
                handleEdit={(newDescription) => handleEdit(type.id, newDescription)} 
                title={TypeLabels[type.type as unknown as Types]} 
                description={type.content} 
                handleDelete={() => handleDelete(type.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
