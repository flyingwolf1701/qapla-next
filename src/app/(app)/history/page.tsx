
"use client";

import { WorkoutLog } from '@/components/workout/WorkoutLog';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { ScrollText, Loader2 } from 'lucide-react';

export default function HistoryPage() {
  const { workoutHistory, isLoading } = useWorkoutState();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading Workout History...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b">
        <ScrollText className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Full Workout History</h1>
      </div>
      
      {workoutHistory.length === 0 ? (
        <div className="text-center py-10 bg-card rounded-lg shadow">
            <ScrollText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl text-muted-foreground">Your workout history is empty.</p>
            <p className="text-sm text-muted-foreground mt-2">Complete some workouts to see your progress here!</p>
        </div>
      ) : (
        <WorkoutLog history={workoutHistory} title="All Logged Workouts" maxEntries={workoutHistory.length} />
      )}
    </div>
  );
}
