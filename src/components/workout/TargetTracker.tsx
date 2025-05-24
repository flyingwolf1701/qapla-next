
"use client";

import { Progress } from "@/components/ui/progress";

interface TargetTrackerProps {
  currentReps: number;
  targetReps: number;
}

export function TargetTracker({ currentReps, targetReps }: TargetTrackerProps) {
  // Calculate the percentage for the visual progress bar, capped at 100%
  const visualProgressPercentage = targetReps > 0 ? Math.min(100, (currentReps / targetReps) * 100) : 0;
  const repsToGo = Math.max(0, targetReps - currentReps);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{currentReps} / {targetReps} Reps</span>
        {/* Display "Target Reached!" when currentReps meet or exceed targetReps */}
        {currentReps >= targetReps && targetReps > 0 && (
          <span className="text-green-600">Target Reached!</span>
        )}
        {/* Display "X to go!" only if target is not yet reached */}
        {currentReps < targetReps && repsToGo > 0 && (
          <span className="text-primary">{repsToGo} to go!</span>
        )}
      </div>
      <Progress value={visualProgressPercentage} aria-label={`Progress: ${currentReps} of ${targetReps} reps`} className="h-3"/>
    </div>
  );
}
