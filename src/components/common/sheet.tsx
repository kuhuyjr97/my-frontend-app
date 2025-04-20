"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
const SHEET_SIDES = ["top"] as const;

type SheetSide = (typeof SHEET_SIDES)[number];

interface SheetSideProps {
  title: string;
  description: string;
  handleDelete: () => void;
  handleEdit: (newDescription: string) => void;
}

export function SheetSide({ title, description, handleDelete, handleEdit }: SheetSideProps) {
    const [editedDescription, setEditedDescription] = useState(description);
    
  return (
    <div className="  grid grid-cols-2 gap-2">
      {SHEET_SIDES.map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">{description}</Button>
          </SheetTrigger>
          <SheetContent
            className="left-1/2 top-1/2 w-[500px] sm:w-[640px] -translate-x-1/2 -translate-y-1/2 fixed bg-white rounded-lg shadow-lg"
            side={side}
          >
            <SheetHeader>
              <SheetTitle>Edit {title}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-4 py-4 p-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="type" className="text-right">
                  Type
                </Label>
                <Input
                  id="type"
                  value={title}
                  className="col-span-3"
                  disabled
                  onChange={() => {}}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  defaultValue={description}
                  className="col-span-3"
                  onChange={(e) => setEditedDescription(e.target.value)}
                />
              </div>
            </div>
            <SheetFooter className="flex flex-row w-full justify-end gap-2">
              <Button variant="destructive" onClick={handleDelete}>Delete</Button>
              <SheetClose asChild>
                <Button type="submit"  onClick={() => handleEdit(editedDescription)}>Save changes</Button>
              </SheetClose>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  );
}
