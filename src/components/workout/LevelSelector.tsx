
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movement } from "@/lib/types";

interface LevelSelectorProps {
  currentLevel: number;
  unlockedLevel: number;
  progressions: Movement[];
  onLevelChange: (level: number) => void;
  disabled?: boolean;
}

export function LevelSelector({ currentLevel, unlockedLevel, progressions, onLevelChange, disabled }: LevelSelectorProps) {
  const availableLevels = progressions.filter(p => p.level <= unlockedLevel && p.isRepBased);

  return (
    <Select
      value={currentLevel.toString()}
      onValueChange={(value) => onLevelChange(parseInt(value))}
      disabled={disabled || availableLevels.length === 0}
    >
      <SelectTrigger className="w-full md:w-[280px]">
        <SelectValue placeholder="Select Level" />
      </SelectTrigger>
      <SelectContent>
        {availableLevels.map((progression) => (
          <SelectItem key={progression.level} value={progression.level.toString()}>
            Level {progression.level}: {progression.name}
          </SelectItem>
        ))}
        {availableLevels.length === 0 && progressions.find(p => p.level === currentLevel && p.isRepBased) && (
             <SelectItem value={currentLevel.toString()} disabled>
                Level {currentLevel}: {progressions.find(p => p.level === currentLevel)?.name}
             </SelectItem>
        )}
         {availableLevels.length === 0 && !progressions.find(p => p.level === currentLevel && p.isRepBased) && (
             <SelectItem value="disabled" disabled>
                No rep-based exercises available at this level.
             </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
