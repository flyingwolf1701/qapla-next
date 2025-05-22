
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Minus, Plus } from "lucide-react";

interface RepInputProps {
  reps: number;
  onRepsChange: (reps: number) => void;
  minReps?: number;
  maxReps?: number;
  disabled?: boolean;
}

export function RepInput({ reps, onRepsChange, minReps = 0, maxReps = 100, disabled }: RepInputProps) {
  const handleIncrement = () => {
    if (reps < maxReps) {
      onRepsChange(reps + 1);
    }
  };

  const handleDecrement = () => {
    if (reps > minReps) {
      onRepsChange(reps - 1);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value) && value >= minReps && value <= maxReps) {
      onRepsChange(value);
    } else if (event.target.value === "") {
        onRepsChange(minReps); // Or handle as empty, current behavior sets to minReps
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button variant="outline" size="icon" onClick={handleDecrement} disabled={disabled || reps <= minReps}>
        <Minus className="h-4 w-4" />
      </Button>
      <Input
        type="number"
        value={reps}
        onChange={handleChange}
        className="w-20 text-center"
        min={minReps}
        max={maxReps}
        disabled={disabled}
      />
      <Button variant="outline" size="icon" onClick={handleIncrement} disabled={disabled || reps >= maxReps}>
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
