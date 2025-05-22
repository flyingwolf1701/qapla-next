
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MovementSessionControls } from '@/components/workout/MovementSessionControls';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import type { WorkoutEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Home } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WorkoutLog } from '@/components/workout/WorkoutLog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';


export default function WorkoutSessionPage() {
  const router = useRouter();
  const {
    currentWorkoutSession,
    isLoading,
    error,
    getCurrentMovement,
    completeMovement,
    moveToNextMovement,
    clearCurrentWorkout,
    userLevels,
    workoutHistory,
  } = useWorkoutState();

  useEffect(() => {
    if (!isLoading && !currentWorkoutSession) {
      // No active session, redirect to setup
      router.replace('/workout/setup');
    }
  }, [currentWorkoutSession, isLoading, router]);

  const currentSelectedMovement = getCurrentMovement();

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[calc(100vh-200px)]"><Loader2 className="h-12 w-12 animate-spin text-primary" /> <span className="ml-4 text-xl">Loading Session...</span></div>;
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!currentSelectedMovement) {
     // This case should ideally be caught by useEffect redirect, but as a fallback:
    return (
      <div className="text-center py-10">
        <p className="text-xl mb-4">No workout session active or all movements completed.</p>
        <Button onClick={() => router.push('/')} variant="outline">
          <Home className="mr-2 h-4 w-4" /> Go to Home
        </Button>
      </div>
    );
  }

  const { category, startingLevel } = currentSelectedMovement;
  const initialUserLevelForCategory = userLevels[category.id] || 1;


  const handleMovementComplete = (entry: WorkoutEntry) => {
    completeMovement(entry);
    if (!moveToNextMovement()) {
      // No more movements
      clearCurrentWorkout();
      router.push('/'); // Navigate to home after the last movement
    }
    // If moveToNextMovement is true, the context updates and this component re-renders with the new movement
  };

  const handleEndSessionEarly = () => {
    if (confirm("Are you sure you want to end this workout session early? Any progress on the current movement won't be saved.")) {
        clearCurrentWorkout();
        router.push('/');
    }
  }

  return (
    <div className="space-y-8">
        <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Workout Session</h1>
            <Button onClick={handleEndSessionEarly} variant="outline" size="sm">
                End Session Early
            </Button>
        </div>
      
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <MovementSessionControls
            movementCategory={category}
            initialUserLevel={initialUserLevelForCategory}
            onMovementComplete={handleMovementComplete}
          />
        </div>
        <div className="lg:col-span-1">
            <WorkoutLog history={workoutHistory} title="Session Log" maxEntries={5} />
        </div>
      </div>

      {currentWorkoutSession && currentWorkoutSession.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Session Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              Movement {currentWorkoutSession.findIndex(m => m.category.id === category.id) + 1} of {currentWorkoutSession.length}
            </p>
            <ul className="space-y-1">
              {currentWorkoutSession.map((mov, index) => (
                <li key={mov.category.id} className={`flex items-center gap-2 p-2 rounded-md ${mov.category.id === category.id ? 'bg-primary/10 text-primary font-semibold' : 'opacity-70'}`}>
                  <mov.category.icon className="h-5 w-5" />
                  {mov.category.name}
                  {index < currentWorkoutSession.findIndex(m => m.category.id === category.id) && <span className="ml-auto text-xs">(Completed)</span>}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-8 flex justify-start">
        <Button onClick={() => router.push('/workout/setup')} variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Setup
        </Button>
      </div>
    </div>
  );
}
