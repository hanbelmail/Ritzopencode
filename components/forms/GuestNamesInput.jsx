"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function GuestNamesInput({ guests, onChange }) {
  const update = (i, v) => onChange(guests.map((g, idx) => (idx === i ? v : g)));
  return (
    <div className="space-y-2">
      {guests.map((g, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={g}
            onChange={(e) => update(i, e.target.value)}
            placeholder={i === 0 ? "Primary guest name" : `Guest ${i + 1} name`}
          />
          {guests.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => onChange(guests.filter((_, idx) => idx !== i))}>
              <X className="w-4 h-4 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...guests, ""])}>
        <Plus className="w-3.5 h-3.5 mr-1" /> Add guest
      </Button>
    </div>
  );
}
