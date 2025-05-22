
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { WorkoutLog } from '@/components/workout/WorkoutLog';
import { AdaptiveRecommendations } from '@/components/workout/AdaptiveRecommendations';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { PlusSquare, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function HomePage() {
  const { workoutHistory, isLoading, userLevels, clearCurrentWorkout } = useWorkoutState();

  const handleNewWorkoutClick = () => {
    clearCurrentWorkout();
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading Qapla' Fitness...</div>;
  }

  // Calculate overall progress metric (e.g. average level)
  const totalLevels = Object.values(userLevels).reduce((sum, level) => sum + level, 0);
  const averageLevel = Object.keys(userLevels).length > 0 ? (totalLevels / Object.keys(userLevels).length).toFixed(1) : 0;


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl md:text-4xl font-bold">Welcome to Qapla' Fitness!</CardTitle>
          <CardDescription className="text-lg">Success is showing up. Ready to conquer your goals today?</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-4 items-center">
            <div>
                <p className="mb-2">Your current average mastery level across all categories is <strong className="text-primary">{averageLevel}</strong>.</p>
                <p className="text-sm text-muted-foreground mb-4">Keep pushing, one rep at a time. Every effort counts!</p>
                 <Link href="/workout/setup" passHref>
                    <Button size="lg" onClick={handleNewWorkoutClick} className="w-full md:w-auto">
                    <PlusSquare className="mr-2 h-5 w-5" /> Start New Workout
                    </Button>
                </Link>
            </div>
            <div className="flex justify-center items-center" data-ai-hint="fitness abstract">
                 <Activity size={100} className="text-primary opacity-30" />
            </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <AdaptiveRecommendations />
        <WorkoutLog history={workoutHistory} />
      </div>
    </div>
  );
}
