
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movement, MovementCategoryInfo } from "@/lib/types";

interface LevelSelectorProps {
  currentLevel: number;
  unlockedLevel: number;
  progressions: Movement[]; // Full list of progressions for the category
  onLevelChange: (level: number) => void;
  disabled?: boolean;
  isRepBasedMode?: boolean; // If true, only show rep-based exercises. If false, show all.
}

export function LevelSelector({
  currentLevel,
  unlockedLevel,
  progressions,
  onLevelChange,
  disabled,
  isRepBasedMode = true, // Default to showing only rep-based as per original behavior
}: LevelSelectorProps) {
  
  // Filter progressions:
  // 1. Level must be <= unlockedLevel OR level 0 (for special cases like warm-ups)
  // 2. If isRepBasedMode is true, only include exercises where isRepBased is true.
  const availableProgressions = progressions.filter(p => 
    (p.level <= unlockedLevel || p.level === 0) && // level 0 exercises are always available if present
    (isRepBasedMode ? p.isRepBased : true)
  );

  // Ensure the currently selected level is an option if it's valid, even if filters might exclude it (e.g. showing a time-based one when rep-mode is off)
  const currentProgression = progressions.find(p => p.level === currentLevel);
  if (currentProgression && !availableProgressions.some(p => p.level === currentLevel)) {
    if (currentProgression.level <= unlockedLevel || currentProgression.level === 0) {
         // Add it if it's unlocked and not against the rep-based mode if that mode is active.
         if (isRepBasedMode && currentProgression.isRepBased) {
            availableProgressions.push(currentProgression);
         } else if (!isRepBasedMode) {
            availableProgressions.push(currentProgression);
         }
         // Sort again if added
         availableProgressions.sort((a,b) => a.level - b.level);
    }
  }


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
          <SelectItem key={progression.level} value={progression.level.toString()}>
            Lvl {progression.level}: {progression.name} {progression.isRepBased ? "" : "(Time)"}
          </SelectItem>
        ))}
        
        {/* Fallback messages if no progressions are available based on filters */}
        {availableProgressions.length === 0 && currentProgression && (isRepBasedMode ? currentProgression.isRepBased : true) && (
             <SelectItem value={currentLevel.toString()} disabled>
                Lvl {currentLevel}: {currentProgression.name} {currentProgression.isRepBased ? "" : "(Time)"} (Locked or Mismatched Type)
             </SelectItem>
        )}
         {availableProgressions.length === 0 && !currentProgression && (
             <SelectItem value="disabled" disabled>
                No exercises available.
             </SelectItem>
        )}
        {availableProgressions.length === 0 && currentProgression && (isRepBasedMode && !currentProgression.isRepBased) &&(
             <SelectItem value="disabled-type" disabled>
                Time-based exercise selected; switch mode or choose rep-based.
             </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
