
"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Movement, MovementCategoryInfo } from "@/lib/types";

interface LevelSelectorProps {
  currentLevel: number;
  unlockedLevel: number;
  progressions: Movement[]; 
  onLevelChange: (level: number) => void;
  disabled?: boolean;
  isRepBasedMode: boolean; // If true, show rep-based. If false, show time-based.
}

export function LevelSelector({
  currentLevel,
  unlockedLevel,
  progressions,
  onLevelChange,
  disabled,
  isRepBasedMode,
}: LevelSelectorProps) {
  
  // Filter progressions:
  // 1. Level must be <= unlockedLevel OR level 0 (for special cases like warm-ups)
  // 2. Exercise type (isRepBased) must match the isRepBasedMode.
  const availableProgressions = progressions.filter(p => 
    (p.level <= unlockedLevel || p.level === 0) && // level 0 exercises are always available if present
    (p.isRepBased === isRepBasedMode) // Show exercises matching the current mode
  ).sort((a,b) => a.level - b.level); // Ensure sorted by level

  // Ensure the currently selected level is an option if it's valid for the current mode
  const currentProgressionDetails = progressions.find(p => p.level === currentLevel);
  const isCurrentSelectionValidForMode = currentProgressionDetails && currentProgressionDetails.isRepBased === isRepBasedMode;

  // If current selection is valid for mode and unlocked, but somehow not in availableProgressions, add it.
  // This can happen if currentLevel is valid but the filter somehow missed it (unlikely with corrected logic but safe).
  if (currentProgressionDetails && 
      isCurrentSelectionValidForMode &&
      (currentProgressionDetails.level <= unlockedLevel || currentProgressionDetails.level === 0) &&
      !availableProgressions.some(p => p.level === currentLevel)) {
      availableProgressions.push(currentProgressionDetails);
      availableProgressions.sort((a,b) => a.level - b.level);
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
        
        {/* Fallback messages */}
        {availableProgressions.length === 0 && currentProgressionDetails && isCurrentSelectionValidForMode && (
             <SelectItem value={currentLevel.toString()} disabled>
                Lvl {currentLevel}: {currentProgressionDetails.name} {currentProgressionDetails.isRepBased ? "" : "(Time)"} (Locked or No Options)
             </SelectItem>
        )}
         {availableProgressions.length === 0 && (!currentProgressionDetails || !isCurrentSelectionValidForMode) && (
             <SelectItem value="disabled" disabled>
                No {isRepBasedMode ? 'rep-based' : 'time-based'} exercises available.
             </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}

