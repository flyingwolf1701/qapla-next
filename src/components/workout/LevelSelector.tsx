
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movement } from '@/data/movements'; // Updated import for Movement type

interface LevelSelectorProps {
  currentLevel: number;
  unlockedLevel: number;
  progressions: Movement[]; // This should be an array of Movement objects
  onLevelChange: (level: number) => void;
  disabled?: boolean;
}

export function LevelSelector({
  currentLevel,
  unlockedLevel,
  progressions,
  onLevelChange,
  disabled,
}: LevelSelectorProps) {
  
  // Defensive check: ensure progressions is an array before calling .filter or .sort
  const safeProgressions = Array.isArray(progressions) ? progressions : [];

  const availableProgressions = safeProgressions.filter(p => 
    (p.level <= unlockedLevel || p.level === 0) // Filter only by unlocked level (and level 0)
  ).sort((a,b) => a.level - b.level); // Ensure sorted by level
  
  return (
    <Select
      value={currentLevel.toString()}
      onValueChange={(value) => onLevelChange(parseInt(value))}
      disabled={disabled || availableProgressions.length === 0}
    >
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder="Select Level/Exercise" />
      </SelectTrigger>
      <SelectContent>
        {availableProgressions.map((progression) => (
          <SelectItem key={progression.name} value={progression.level.toString()}>
            Lvl {progression.level}: {progression.name} {progression.isRepBased ? "" : "(Time)"}
          </SelectItem>
        ))}
        
        {availableProgressions.length === 0 && (
             <SelectItem value="disabled" disabled>
                No exercises available for this category.
             </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
