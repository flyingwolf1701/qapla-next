
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, UserLevels, Movement } from '@/lib/types';
import { DEFAULT_TARGET_REPS, LEVEL_UP_THRESHOLD_REPS } from '@/lib/types';
import { getMovementByLevel, MOVEMENT_CATEGORIES_DATA } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info, TimerIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number;
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(Math.max(1, unlockedLevelForCategory > 0 ? unlockedLevelForCategory -2 : 1));
  
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [waveNumber, setWaveNumber] = useState(1);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const [completedDuration, setCompletedDuration] = useState<number | null>(null); // Duration achieved from timer's onComplete
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0); // Continuously updated by timer's onTimeUpdate
  const [timerKey, setTimerKey] = useState(Date.now());

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    const potentialMovement = movementCategory.progressions.find(p => p.level === currentExerciseLevel);
    if (potentialMovement) return potentialMovement;
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  const isCurrentExerciseRepBased = currentMovementDetails?.isRepBased ?? true;

  useEffect(() => {
    setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
  }, [userLevels, movementCategory.id]);

  useEffect(() => {
    // Reset state when the component initializes or movement category changes significantly
    // This ensures a fresh start if the user navigates back or changes exercise type.
    if (waveNumber === 1 && totalRepsThisMovement === 0 && completedDuration === null && currentElapsedTime === 0) {
      const newStartLevel = Math.max(1, (userLevels[movementCategory.id] || 1) > 0 ? (userLevels[movementCategory.id] || 1) -2 : 1);
      setCurrentExerciseLevel(newStartLevel);
      setTimerKey(Date.now()); 
      setCompletedDuration(null);
      setCurrentElapsedTime(0);
    }
  }, [userLevels, movementCategory.id]);


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
        const durationToLog = completedDuration ?? currentElapsedTime;
        if (durationToLog === null || durationToLog === 0) {
            toast({ title: "Timer Not Used", description: "Please start the timer or log some time before completing.", variant: "destructive" });
            return;
        }
        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: currentMovementDetails.level,
            durationSeconds: durationToLog,
            waves: [], 
        };
    }
    onMovementComplete(entry);
  };

  const handleExerciseLevelChange = (level: number) => {
    setCurrentExerciseLevel(level);
    setCurrentWaveReps(0); 
    setCompletedDuration(null);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now()); 
  };

  const decreaseLevel = () => {
    const currentProgressionIndex = movementCategory.progressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentProgressionIndex > 0) {
      handleExerciseLevelChange(movementCategory.progressions[currentProgressionIndex - 1].level);
    } else if (currentExerciseLevel > 1) {
        handleExerciseLevelChange(currentExerciseLevel - 1);
    }
  };

  const increaseLevel = () => {
    const currentProgressionIndex = movementCategory.progressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentProgressionIndex < movementCategory.progressions.length - 1 && movementCategory.progressions[currentProgressionIndex + 1].level <= unlockedLevelForCategory) {
        handleExerciseLevelChange(movementCategory.progressions[currentProgressionIndex + 1].level);
    } else if (currentExerciseLevel < unlockedLevelForCategory && currentExerciseLevel < 10) {
        handleExerciseLevelChange(currentExerciseLevel + 1);
    } else if (currentExerciseLevel === unlockedLevelForCategory && unlockedLevelForCategory < 10 && movementCategory.progressions.some(p => p.level > unlockedLevelForCategory)) {
         const nextLevelInfo = movementCategory.progressions.find(p=>p.level === unlockedLevelForCategory + 1);
         const levelUpCriteria = isCurrentExerciseRepBased ? 
            `${LEVEL_UP_THRESHOLD_REPS} reps at Level ${unlockedLevelForCategory}` :
            currentMovementDetails?.defaultDurationSeconds ? `holding Level ${unlockedLevelForCategory} for ${currentMovementDetails.defaultDurationSeconds}s` : `completing Level ${unlockedLevelForCategory}`;
         toast({description: `Unlock Level ${unlockedLevelForCategory+1}${nextLevelInfo ? ' ('+nextLevelInfo.name+')' : ''} by ${levelUpCriteria}.`})
    }
  };

  const resetCurrentWave = () => {
    setCurrentWaveReps(0);
  }
  
  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setCompletedDuration(timeAchieved);
    setCurrentElapsedTime(timeAchieved); // Sync elapsed time
    
    if (!currentMovementDetails || currentMovementDetails.isRepBased) return;

    const targetDuration = currentMovementDetails.defaultDurationSeconds || 0;
    
    // Level up logic for time-based exercises
    // Example: Dead Hang (level 1 of Pull) needs 60s to level up if at current unlocked level.
    if (timeAchieved >= targetDuration && 
        currentMovementDetails.level === unlockedLevelForCategory &&
        unlockedLevelForCategory < 10 &&
        movementCategory.progressions.some(p => p.level > unlockedLevelForCategory)
        // Add specific check if only certain time-based exercises grant level-ups
        // For now, any time-based exercise meeting its target at the current unlocked level can level up.
        // (e.g. currentMovementDetails.name === "Dead Hang" || currentMovementDetails.name === "Support Hold (Parallel Bars)")
        ) {
      const newUnlockedLevel = unlockedLevelForCategory + 1;
      updateUserLevel(movementCategory.id, newUnlockedLevel);
      setUnlockedLevelForCategory(newUnlockedLevel); 
      toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
    } else if (timeAchieved >= targetDuration) {
        toast({ title: "Target Reached!", description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
    } else {
        toast({ title: "Time Logged", description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
    }
  }, [currentMovementDetails, unlockedLevelForCategory, movementCategory.id, movementCategory.name, updateUserLevel]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
      setCurrentElapsedTime(elapsed);
  }, []);

  // Function to format time for display (MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
            `Hold exercise: ${currentMovementDetails?.name || 'Timed Hold'}. Target: ${formatTime(currentMovementDetails?.defaultDurationSeconds || 0)}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isCurrentExerciseRepBased && currentMovementDetails && currentMovementDetails.level === 0 && (
             <Alert variant="default" className="bg-accent/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Warm-up/Special Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Target: {formatTime(currentMovementDetails.defaultDurationSeconds || 0)}.
                </AlertDescription>
            </Alert>
        )}
         {!isCurrentExerciseRepBased && currentMovementDetails && currentMovementDetails.level > 0 && (
             <Alert variant="default" className="bg-accent/30">
                <TimerIcon className="h-4 w-4" />
                <AlertTitle>Time-Based Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Target: {formatTime(currentMovementDetails.defaultDurationSeconds || 0)}.
                </AlertDescription>
            </Alert>
        )}

        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Current Exercise & Level</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={decreaseLevel} disabled={currentExerciseLevel <= Math.min(...movementCategory.progressions.map(p=>p.level).filter(l => l > 0), 1) && currentExerciseLevel <=1 }>
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChange}
              isRepBasedMode={isCurrentExerciseRepBased} // Pass mode to filter selector
            />
            <Button variant="outline" size="icon" onClick={increaseLevel} disabled={currentExerciseLevel >= unlockedLevelForCategory && currentExerciseLevel >= Math.max(...movementCategory.progressions.map(p=>p.level),10) }>
              <ChevronUp />
            </Button>
          </div>
           {currentMovementDetails && <p className="text-sm text-muted-foreground mt-1 ml-12">Selected: Lvl {currentMovementDetails.level} - {currentMovementDetails.name}</p>}
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
            key={timerKey} 
            targetDuration={currentMovementDetails.defaultDurationSeconds}
            onTimerComplete={handleTimerComplete}
            onTimeUpdate={handleTimerUpdate}
            autoStart={false} // User should explicitly start timed holds
          />
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Exercise Configuration Error</AlertTitle>
                <AlertDescription>This time-based exercise is missing a target duration. Please check movement data.</AlertDescription>
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

