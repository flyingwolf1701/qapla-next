
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer'; // New Import
import type { MovementCategoryInfo, WaveData, WorkoutEntry, UserLevels, Movement } from '@/lib/types';
import { DEFAULT_TARGET_REPS, LEVEL_UP_THRESHOLD_REPS } from '@/lib/types';
import { getMovementByLevel } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info, TimerIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // User's max unlocked level for this category
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(Math.max(1, unlockedLevelForCategory > 0 ? unlockedLevelForCategory -2 : 1)); // Level of the selected exercise (rep or time)
  
  // Rep-based state
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [waveNumber, setWaveNumber] = useState(1);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  // Time-based state
  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [timerKey, setTimerKey] = useState(Date.now()); // To re-mount timer on level change

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    // For level 0 (warm-ups from data), directly use that progression.
    // Otherwise, use the standard logic.
    const potentialMovement = movementCategory.progressions.find(p => p.level === currentExerciseLevel);
    if (potentialMovement) return potentialMovement;
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  const isCurrentExerciseRepBased = currentMovementDetails?.isRepBased ?? true; // Default to true if no details


  useEffect(() => {
    setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
  }, [userLevels, movementCategory.id]);

  useEffect(() => {
    if (waveNumber === 1 && totalRepsThisMovement === 0 && completedDuration === null) {
      const newStartLevel = Math.max(1, (userLevels[movementCategory.id] || 1) > 0 ? (userLevels[movementCategory.id] || 1) -2 : 1);
      setCurrentExerciseLevel(newStartLevel);
      setTimerKey(Date.now()); // Reset timer if level changes
    }
  }, [userLevels, movementCategory.id, waveNumber, totalRepsThisMovement, completedDuration]);


  const handleLogWave = () => {
    if (!currentMovementDetails || !isCurrentExerciseRepBased) {
      toast({ title: "Cannot Log Wave", description: "This exercise is not rep-based or level not found.", variant: "destructive" });
      return;
    }
    if (currentWaveReps <= 0) {
      toast({ title: "Invalid Reps", description: "Please enter a positive number of reps.", variant: "destructive" });
      return;
    }

    const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, newWaveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);
    
    const repsAtUnlockedLevel = [...wavesDoneThisSession, newWaveData]
      .filter(wave => wave.level === unlockedLevelForCategory)
      .reduce((sum, wave) => sum + wave.reps, 0);

    if (repsAtUnlockedLevel >= LEVEL_UP_THRESHOLD_REPS && unlockedLevelForCategory < 10 && movementCategory.progressions.some(p => p.level > unlockedLevelForCategory)) {
      const newUnlockedLevel = unlockedLevelForCategory + 1;
      updateUserLevel(movementCategory.id, newUnlockedLevel);
      setUnlockedLevelForCategory(newUnlockedLevel); 
      toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
    }

    setWaveNumber(prev => prev + 1);
    setCurrentWaveReps(0); 
  };

  const handleCompleteMovement = () => {
    if (!currentMovementDetails) {
        toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
        return;
    }

    let entry: WorkoutEntry;

    if (isCurrentExerciseRepBased) {
        if (wavesDoneThisSession.length === 0 && totalRepsThisMovement === 0 && currentWaveReps === 0) {
            toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
            return;
        }
        const finalWaves = (currentWaveReps > 0) ? 
            [...wavesDoneThisSession, { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps }] : 
            wavesDoneThisSession;
        
        const finalTotalReps = (currentWaveReps > 0) ?
            totalRepsThisMovement + currentWaveReps :
            totalRepsThisMovement;

        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: Math.max(...finalWaves.map(w => w.level), 1),
            totalReps: finalTotalReps,
            waves: finalWaves,
        };
    } else { // Time-based
        if (completedDuration === null || completedDuration === 0) {
            toast({ title: "Timer Not Completed", description: "Please complete the timer or skip it to log.", variant: "destructive" });
            return;
        }
        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: currentMovementDetails.level,
            durationSeconds: completedDuration,
            waves: [], // No waves for time-based
        };
    }
    onMovementComplete(entry);
  };

  const handleExerciseLevelChange = (level: number) => {
    setCurrentExerciseLevel(level);
    // Reset progress for the new level/exercise
    setCurrentWaveReps(0); 
    setCompletedDuration(null);
    setTimerKey(Date.now()); // Force re-mount of Timer
  };

  const decreaseLevel = () => {
    const currentProgressionIndex = movementCategory.progressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentProgressionIndex > 0) {
      handleExerciseLevelChange(movementCategory.progressions[currentProgressionIndex - 1].level);
    } else if (currentExerciseLevel > 1) { // Fallback for non-contiguous levels, though progressions should be primary
        handleExerciseLevelChange(currentExerciseLevel - 1);
    }
  };

  const increaseLevel = () => {
    const currentProgressionIndex = movementCategory.progressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentProgressionIndex < movementCategory.progressions.length - 1 && movementCategory.progressions[currentProgressionIndex + 1].level <= unlockedLevelForCategory) {
        handleExerciseLevelChange(movementCategory.progressions[currentProgressionIndex + 1].level);
    } else if (currentExerciseLevel < unlockedLevelForCategory && currentExerciseLevel < 10) { // Fallback
        handleExerciseLevelChange(currentExerciseLevel + 1);
    } else if (currentExerciseLevel === unlockedLevelForCategory && unlockedLevelForCategory < 10 && movementCategory.progressions.some(p => p.level > unlockedLevelForCategory)) {
         toast({description: `Unlock Level ${unlockedLevelForCategory+1} by doing ${LEVEL_UP_THRESHOLD_REPS} reps at Level ${unlockedLevelForCategory} (if rep-based).`})
    }
  };

  const resetCurrentWave = () => {
    setCurrentWaveReps(0);
  }
  
  const handleTimerComplete = useCallback(() => {
    setCompletedDuration(currentMovementDetails?.defaultDurationSeconds || 0);
    toast({ title: "Time Complete!", description: `${currentMovementDetails?.name} duration finished.`, variant: "default" });
  }, [currentMovementDetails]);

  const handleTimerUpdate = useCallback((timeLeft: number) => {
      // If timer is manually stopped early, this allows logging partial time if desired (not implemented for MVP)
      // For now, we only care about full completion via handleTimerComplete or skip.
      // If skipped, completedDuration will be set by the timer's skip function effect or here.
      if (timeLeft === 0 && !completedDuration) { // Handles skip scenario if onTimerComplete doesn't fire first
          setCompletedDuration(currentMovementDetails?.defaultDurationSeconds || 0);
      }
  }, [currentMovementDetails, completedDuration]);


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
            <movementCategory.icon className="h-7 w-7 text-primary" />
            {movementCategory.name}
            </CardTitle>
            <Badge variant="secondary">Unlocked Lvl: {unlockedLevelForCategory}</Badge>
        </div>
        <CardDescription>
          {isCurrentExerciseRepBased ? 
            `Log your reps for each wave. Target: ${DEFAULT_TARGET_REPS} total reps.` :
            `Complete the timed exercise: ${currentMovementDetails?.name || 'Timed Hold'}. Target: ${currentMovementDetails?.defaultDurationSeconds || 'N/A'}s`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isCurrentExerciseRepBased && currentMovementDetails && currentMovementDetails.level === 0 && (
             <Alert variant="default" className="bg-accent/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Warm-up/Special Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name} is a timed hold. Complete the duration.
                </AlertDescription>
            </Alert>
        )}
         {!isCurrentExerciseRepBased && currentMovementDetails && currentMovementDetails.level > 0 && (
             <Alert variant="default" className="bg-accent/30">
                <TimerIcon className="h-4 w-4" />
                <AlertTitle>Time-Based Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name} is time-based. Complete the timer.
                </AlertDescription>
            </Alert>
        )}


        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Current Exercise & Level</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={decreaseLevel} disabled={currentExerciseLevel <= Math.min(...movementCategory.progressions.map(p=>p.level), 1) && currentExerciseLevel <=1 }>
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChange}
            />
            <Button variant="outline" size="icon" onClick={increaseLevel} disabled={currentExerciseLevel >= unlockedLevelForCategory && currentExerciseLevel >= Math.max(...movementCategory.progressions.map(p=>p.level),10) }>
              <ChevronUp />
            </Button>
          </div>
        </div>

        {isCurrentExerciseRepBased ? (
          <>
            <div>
              <Label htmlFor="rep-input" className="block mb-1 font-medium">Reps for Wave {waveNumber}</Label>
              <div className="flex items-center gap-2">
                <RepInput reps={currentWaveReps} onRepsChange={setCurrentWaveReps} />
                <Button variant="ghost" size="icon" onClick={resetCurrentWave} title="Reset reps for this wave">
                    <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <TargetTracker currentReps={totalRepsThisMovement + currentWaveReps} targetReps={DEFAULT_TARGET_REPS} />
            {wavesDoneThisSession.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Logged Waves this Session:</h4>
                <ScrollArea className="h-[120px] border rounded-md p-2 bg-muted/30">
                  <ul className="space-y-1 text-sm">
                    {wavesDoneThisSession.map((wave, index) => (
                      <li key={index} className="flex justify-between">
                        <span>Wave {wave.wave}: {wave.reps} reps @ Lvl {wave.level} ({getMovementByLevel(movementCategory, wave.level)?.name})</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </>
        ) : currentMovementDetails?.defaultDurationSeconds ? (
          <Timer
            key={timerKey} // Re-mount timer when key changes (e.g. level change)
            initialDuration={currentMovementDetails.defaultDurationSeconds}
            onTimerComplete={handleTimerComplete}
            onTimeUpdate={handleTimerUpdate} // Store time if needed, e.g. if user pauses and completes early
            autoStart={false}
          />
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Exercise Configuration Error</AlertTitle>
                <AlertDescription>This time-based exercise is missing a default duration. Please check movement data.</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
        {isCurrentExerciseRepBased && (
          <Button variant="outline" onClick={handleLogWave} className="w-full sm:w-auto" disabled={currentWaveReps <= 0}>
            Log Wave {waveNumber}
          </Button>
        )}
        <Button onClick={handleCompleteMovement} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
          <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
        </Button>
      </CardFooter>
    </Card>
  );
}
