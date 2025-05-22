
"use client";

import { Progress } from "@/components/ui/progress";

interface TargetTrackerProps {
  currentReps: number;
  targetReps: number;
}

export function TargetTracker({ currentReps, targetReps }: TargetTrackerProps) {
  const progressPercentage = targetReps > 0 ? (currentReps / targetReps) * 100 : 0;
  const repsToGo = Math.max(0, targetReps - currentReps);

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>{currentReps} / {targetReps} Reps</span>
        {repsToGo > 0 && <span className="text-primary">{repsToGo} to go!</span>}
        {repsToGo === 0 && <span className="text-green-600">Target Reached!</span>}
      </div>
      <Progress value={progressPercentage} aria-label={`Progress: ${currentReps} of ${targetReps} reps`} className="h-3"/>
    </div>
  );
}
