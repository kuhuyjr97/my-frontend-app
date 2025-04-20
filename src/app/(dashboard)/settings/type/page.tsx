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
interface Type {
  id: string;
  type: string;
  subtype: string;
  description: string;
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    <div className="container mx-auto px-4 py-8">
      <DialogComponent title="Type Settings" description="Type Settings" />
      <h1 className="text-2xl font-bold mb-6">Type Settings</h1>

      {/* Display Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-4">Main Type</h2>

        <Select
          value={selectedType}
          onValueChange={(value) => {
            setSelectedType(value);
            setFormData((prev) => ({ ...prev, type: value }));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a main type" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {typeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Input
          className="my-3"
          type="text"
          placeholder="Description"
          name="description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <Button onClick={handleSubmit}>Add</Button>
      </div>
      <br />

      {/* asdsadasd */}
      <div className=" bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Existing Types</h2>
        {/* button for filter types */}
        <div className="flex flex-wrap gap-3 ">
          {[
            { label: "All", value: null },
            { label: TypeLabels[Types.NOTE], value: Types.NOTE },
            { label: TypeLabels[Types.PLAN], value: Types.PLAN },
            { label: TypeLabels[Types.TASK], value: Types.TASK },
            { label: TypeLabels[Types.INCOME], value: Types.INCOME },
            { label: TypeLabels[Types.EXPENSE], value: Types.EXPENSE },
          ].map((item, index) => (
            <Button
              key={index}
              onClick={() => fetchTypes(item.value as unknown as Types)}
              className="bg-blue-500 text-white px-4 py-2 min-w-[100px] sm:min-w-[120px] text-sm sm:text-base"
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className=" flex flex-wrap gap-3 mt-4">
          {types.map((type) => (
            <div key={type.id} className="p-2">
              <InfoCard
                title={TypeLabels[type.type as unknown as Types]}
                content={type.description}
                onEdit={() => console.log("Edit clicked")}
                onDelete={() => handleDelete(type.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
