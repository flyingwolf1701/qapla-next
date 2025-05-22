
"use client";

import { useEffect, useState } from 'react';
import { Wand2, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';

export function AdaptiveRecommendations() {
  const { getAiRecommendations, workoutHistory, userLevels } = useWorkoutState();
  const [recommendations, setRecommendations] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setRecommendations(null); // Clear previous recommendations
    const recs = await getAiRecommendations();
    setRecommendations(recs);
    setIsLoading(false);
  };
  
  useEffect(() => {
    // Auto-fetch on initial load or significant data change
    // For MVP, let's rely on manual fetch to avoid too many API calls during dev/testing.
    // if (workoutHistory.length > 0 || Object.values(userLevels).some(level => level > 1)) {
    //   fetchRecommendations();
    // }
  }, []); // Removed workoutHistory, userLevels from deps for manual fetch

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Adaptive Recommendations
          </CardTitle>
          <Button onClick={fetchRecommendations} disabled={isLoading} size="sm" variant="outline">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Get Advice
          </Button>
        </div>
        <CardDescription>AI-powered suggestions to optimize your progress.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">Generating recommendations...</p>
          </div>
        )}
        {recommendations && !isLoading && (
          <div className="prose prose-sm max-w-none whitespace-pre-wrap">
            <p>{recommendations}</p>
          </div>
        )}
        {!recommendations && !isLoading && (
          <p className="text-muted-foreground">Click "Get Advice" to generate personalized workout recommendations based on your history and current levels.</p>
        )}
      </CardContent>
    </Card>
  );
}
