
"use client";

import type { WorkoutEntry } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Clock } from 'lucide-react';

interface WorkoutLogProps {
  history: WorkoutEntry[];
  title?: string;
  maxEntries?: number;
}

export function WorkoutLog({ history, title = "Recent Workouts", maxEntries = 5 }: WorkoutLogProps) {
  const displayedHistory = history.slice(0, maxEntries);

  if (displayedHistory.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No workouts logged yet. Time to get started!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {maxEntries === 5 && <CardDescription>Your last 5 completed movements.</CardDescription>}
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] pr-4">
          <div className="space-y-4">
            {displayedHistory.map((entry) => (
              <div key={entry.id} className="p-3 border rounded-lg shadow-sm bg-card/50">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold">{entry.categoryName} - {entry.movementName}</h4>
                  <Badge variant="outline">Lvl {entry.levelAchieved}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">
                  {format(new Date(entry.date), "MMM d, yyyy 'at' h:mm a")}
                </p>
                {entry.totalReps !== undefined && entry.totalReps > 0 && (
                  <p className="text-sm">Total Reps: <span className="font-medium">{entry.totalReps}</span></p>
                )}
                {entry.durationSeconds !== undefined && entry.durationSeconds > 0 && (
                  <p className="text-sm flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    Duration: <span className="font-medium">{entry.durationSeconds}s</span>
                  </p>
                )}
                {entry.waves && entry.waves.length > 0 && (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Wave Details</summary>
                    <ul className="pl-4 list-disc list-inside mt-1">
                      {entry.waves.map((wave, index) => (
                        <li key={index}>Wave {wave.wave}: {wave.reps} reps @ Lvl {wave.level}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
