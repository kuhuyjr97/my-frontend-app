import * as React from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { customStyle } from "@/app/style/custom-style";
import { utimes } from "fs";

export function CustomSelect({
  data,
  onChange,
  placeholder,
  defaultValue,
}: {
  data: { id: number; value: string }[];
  onChange: (value: number) => void;
  placeholder?: string;
  defaultValue?: string;
}) {
  return (
    <Select
      defaultValue={defaultValue?.toString()}
      onValueChange={(val) => onChange(parseInt(val))}
    >
      <SelectTrigger
        className={`w-[180px] border ${customStyle.borderColor} ${customStyle.selectBg} ${customStyle.textContentWhite} hover:border-gray-600 focus:ring-2 focus:ring-blue-400`}
      >
        <SelectValue placeholder={placeholder || "Select"} />
      </SelectTrigger>
      <SelectContent
        className={`${customStyle.containerBg} shadow-lg border border-gray-300`}
      >
        <SelectGroup>
          {data.map((item: { id: number; value: string }) => (
            <SelectItem
              key={item.id}
              value={item.id.toString()}
              className="text-gray-900 hover:bg-blue-100 cursor-pointer"
            >
              {item.value} {item.id}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
