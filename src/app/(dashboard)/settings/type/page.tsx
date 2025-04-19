"use client";

import React from "react";
import { useState, useEffect } from "react";
import axios from "axios";
import { backendUrl } from "@/app/baseUrl";

interface Type {
  id: string;
  type: string;
  subtype: string;
  description: string;
}

export default function TypeSettingsPage() {
  console.log('asdf', process.env.NODE_ENV)
  const [types, setTypes] = useState<Type[]>([]);
  const [formData, setFormData] = useState({
    type: "",
    subtype: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseUrl = backendUrl();

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    try {
      const response = await axios.get(`${baseUrl}/types`);
      console.log("response", response.data);
      setTypes(response.data);
    } catch (err) {
      console.error("Error fetching types:", err);
      setError("Failed to fetch types");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await axios.post(`${baseUrl}/types`, formData);
      setFormData({ type: "", subtype: "", description: "" });
      fetchTypes();
    } catch (err) {
      console.error("Error creating type:", err);
      setError("Failed to create type");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
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
      <h1 className="text-2xl font-bold mb-6">Type Settings</h1>

  

      {/* Display Section */}
      <div className="bg-white p-6 rounded-lg shadow-md">
      kasd
      </div>
      <br />

      {/* asdsadasd */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Existing Types</h2>
        {Object.entries(groupedTypes).map(([type, subtypes]) => (
          <div key={type} className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{type}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subtypes.map((subtype) => (
                <div key={subtype.id} className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-800">{subtype.subtype}</h4>
                  <p className="text-sm text-gray-600 mt-1">{subtype.description}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 