"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X } from "lucide-react";

export default function GuestNamesInput({ guests, onChange, maxGuests }) {
  const update = (i, v) => onChange(guests.map((g, idx) => (idx === i ? v : g)));
  const canAddGuest = !maxGuests || guests.length < maxGuests;

  return (
    <div className="space-y-2">
      {guests.map((g, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={g}
            onChange={(e) => update(i, e.target.value)}
            placeholder={i === 0 ? "Primary guest name" : `Guest ${i + 1} name`}
            className="h-10 rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] shadow-none focus-visible:ring-[#cc785c]"
          />
          {guests.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className="shrink-0 rounded-full text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413]" onClick={() => onChange(guests.filter((_, idx) => idx !== i))}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {canAddGuest ? (
        <Button type="button" variant="outline" size="sm" className="rounded-[8px] border-[#e6dfd8] bg-[#faf9f5] text-[#141413] shadow-none hover:bg-[#efe9de]" onClick={() => onChange([...guests, ""])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Add guest
        </Button>
      ) : (
        <p className="text-xs leading-relaxed text-[#6c6a64]">Maximum {maxGuests} guests total, including children.</p>
      )}
    </div>
  );
}
