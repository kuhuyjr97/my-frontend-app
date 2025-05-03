"use client";

import { CustomButton } from "@/components/common/button";
import { useState } from "react";
import { CustomSelect } from "@/components/common/select";
import axios from "axios";
import { Types } from "@/app/enums/types";
import { backendUrl } from "@/app/baseUrl";
import { useEffect } from "react";

interface SelectItem {
  id: number;
  value: string;
}

export default function ChartPage() {
  const [number, setNumber] = useState(0);
  const [selectedValue, setSelectedValue] = useState("");
  const [token, setToken] = useState("");
  const [selectData, setSelectData] = useState<SelectItem[]>([]);
  const baseUrl = backendUrl();
  useEffect(() => {
    setToken(token || "");
    fetchTypes();
  }, []);

  const fetchTypes = async (type?: Types) => {
    const token = localStorage.getItem("token");
    try {
      const response = await axios.get(`${baseUrl}/types`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = response.data.map(
        (item: { id: number; content: string }) => ({
          id: item.id,
          value: item.content,
        })
      );
      setSelectData(data);

      console.log("select data", data[0].id);
    } catch (err) {
      console.error("Error fetching types:", err);
    }
  };

  const handleButton = () => {
    setNumber(number + 1);
  };
  const handleChange = (value: number) => {
    setSelectedValue(value.toString());
  };
  return (
    <div className="flex justify-center items-center  h-screen">
      <CustomButton
        text="Get all types"
        variant="destructive"
        onClick={handleButton}
      />

      <div>
        <p>number upp</p>
        <p>{number}</p>
      </div>
      <div>asdasd test</div>

      <p>value {selectedValue}</p>
    </div>
  );
}
