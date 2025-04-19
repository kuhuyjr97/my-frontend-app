"use client";

import React, { useState } from "react";
import { MoreVertical, Edit, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

interface InfoCardProps {
  title: string;
  content: string;
  onEdit: () => void;
  onDelete: () => void;
}

export const InfoCard: React.FC<InfoCardProps> = ({ title, content, onEdit, onDelete }) => {
  return (
    <Card className="relative shadow-md rounded-2xl border p-4 hover:shadow-lg transition duration-300">
      {/* Menu 3 chấm */}
      <div className="absolute top-2 right-2 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <MoreVertical className="h-5 w-5 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-28">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-4 h-4 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete}>
              <Trash2 className="w-4 h-4 mr-2 text-red-500" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Nội dung card */}
      <CardContent className="space-y-2">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">{content}</p>
      </CardContent>
    </Card>
  );
};
