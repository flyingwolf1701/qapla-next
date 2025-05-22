
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, UserLevels } from '@/lib/types';
import { DEFAULT_TARGET_REPS, LEVEL_UP_THRESHOLD_REPS } from '@/lib/types';
import { getMovementByLevel } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // User's max unlocked level for this category
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  // Current unlocked level for this category, might update during session
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  
  // Level selected for the *current wave*
  const [currentWaveLevel, setCurrentWaveLevel] = useState(Math.max(1, unlockedLevelForCategory - 2));
  // Reps for the *current wave*
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  
  const [waveNumber, setWaveNumber] = useState(1);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const currentMovementDetails = useMemo(() => 
    getMovementByLevel(movementCategory, currentWaveLevel),
    [movementCategory, currentWaveLevel]
  );

  useEffect(() => {
    // Update unlocked level if global state changes (e.g. from another component or previous session)
    setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
  }, [userLevels, movementCategory.id]);

  useEffect(() => {
    // Recalculate starting level for wave if unlockedLevelForCategory changes
    // Only reset if it's the first wave and no reps are logged for current movement
    if (waveNumber === 1 && totalRepsThisMovement === 0) {
       const newStartLevel = Math.max(1, (userLevels[movementCategory.id] || 1) - 2);
       setCurrentWaveLevel(newStartLevel);
    }
  }, [userLevels, movementCategory.id, waveNumber, totalRepsThisMovement]);

  const handleLogWave = () => {
    if (!currentMovementDetails || !currentMovementDetails.isRepBased) {
      toast({ title: "Cannot Log Wave", description: "This exercise is not rep-based or level not found.", variant: "destructive" });
      return;
    }
    if (currentWaveReps <= 0) {
      toast({ title: "Invalid Reps", description: "Please enter a positive number of reps.", variant: "destructive" });
      return;
    }

    const newWaveData: WaveData = { wave: waveNumber, level: currentWaveLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, newWaveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);
    
    // Check for level up: 30 reps AT current UNLOCKED level
    const repsAtUnlockedLevel = [...wavesDoneThisSession, newWaveData]
      .filter(wave => wave.level === unlockedLevelForCategory)
      .reduce((sum, wave) => sum + wave.reps, 0);

    if (repsAtUnlockedLevel >= LEVEL_UP_THRESHOLD_REPS && unlockedLevelForCategory < 10) {
      const newUnlockedLevel = unlockedLevelForCategory + 1;
      updateUserLevel(movementCategory.id, newUnlockedLevel);
      setUnlockedLevelForCategory(newUnlockedLevel); // Update local state for UI
      toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
    }

    setWaveNumber(prev => prev + 1);
    setCurrentWaveReps(0); // Reset for next wave
    // User might want to continue at same level or change, so don't auto-change currentWaveLevel here
  };

  const handleCompleteMovement = () => {
    if (wavesDoneThisSession.length === 0 && totalRepsThisMovement === 0 && currentWaveReps > 0) {
        // If user clicks "Done" without logging the current wave but has reps entered
        handleLogWave(); // Log the current wave first
        // Then, after state updates, this function will be effectively called again by onMovementComplete
        // This is a bit of a workaround; ideally, state updates synchronously or a callback chain.
        // For now, we proceed, and the logged wave will be part of the entry.
    }
    if (wavesDoneThisSession.length === 0 && totalRepsThisMovement === 0 && currentWaveReps === 0) {
      toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
      return;
    }

    const finalWaves = (currentWaveReps > 0 && currentMovementDetails?.isRepBased) ? 
        [...wavesDoneThisSession, { wave: waveNumber, level: currentWaveLevel, reps: currentWaveReps }] : 
        wavesDoneThisSession;
    
    const finalTotalReps = (currentWaveReps > 0 && currentMovementDetails?.isRepBased) ?
        totalRepsThisMovement + currentWaveReps :
        totalRepsThisMovement;

    const entry: WorkoutEntry = {
      id: new Date().toISOString(),
      date: new Date().toISOString(),
      categoryName: movementCategory.name,
      movementName: getMovementByLevel(movementCategory, Math.max(...finalWaves.map(w => w.level), 1))?.name || "Unknown Movement",
      levelAchieved: Math.max(...finalWaves.map(w => w.level), 1),
      totalReps: finalTotalReps,
      waves: finalWaves,
    };
    onMovementComplete(entry);
  };

  const handleLevelChange = (level: number) => {
    setCurrentWaveLevel(level);
    setCurrentWaveReps(0); // Reset reps when level changes for the current wave
  };

  const decreaseLevel = () => {
    if (currentWaveLevel > 1) {
      handleLevelChange(currentWaveLevel - 1);
    }
  };

  const increaseLevel = () => {
    if (currentWaveLevel < unlockedLevelForCategory) { // Can only go up to unlocked level
      handleLevelChange(currentWaveLevel + 1);
    } else if (currentWaveLevel < 10 && unlockedLevelForCategory === currentWaveLevel) {
        toast({description: `Unlock Level ${unlockedLevelForCategory+1} by doing ${LEVEL_UP_THRESHOLD_REPS} reps at Level ${unlockedLevelForCategory}.`})
    }
  };

  const resetCurrentWave = () => {
    setCurrentWaveReps(0);
  }

  const isCurrentExerciseRepBased = currentMovementDetails?.isRepBased ?? false;

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
          Log your reps for each wave. Target: {DEFAULT_TARGET_REPS} total reps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isCurrentExerciseRepBased && currentMovementDetails && (
             <Alert variant="default" className="bg-accent/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Time-Based Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name} is time-based and not trackable in MVP. Select a rep-based exercise or adjust level.
                </AlertDescription>
            </Alert>
        )}

        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Current Wave Level & Exercise</Label>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={decreaseLevel} disabled={currentWaveLevel <= 1}>
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentWaveLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleLevelChange}
            />
            <Button variant="outline" size="icon" onClick={increaseLevel} disabled={currentWaveLevel >= unlockedLevelForCategory && currentWaveLevel >= 10}>
              <ChevronUp />
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="rep-input" className="block mb-1 font-medium">Reps for Wave {waveNumber}</Label>
          <div className="flex items-center gap-2">
            <RepInput reps={currentWaveReps} onRepsChange={setCurrentWaveReps} disabled={!isCurrentExerciseRepBased} />
            <Button variant="ghost" size="icon" onClick={resetCurrentWave} title="Reset reps for this wave"  disabled={!isCurrentExerciseRepBased}>
                <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <TargetTracker currentReps={totalRepsThisMovement + (isCurrentExerciseRepBased ? currentWaveReps : 0)} targetReps={DEFAULT_TARGET_REPS} />
        
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

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
        <Button variant="outline" onClick={handleLogWave} className="w-full sm:w-auto" disabled={!isCurrentExerciseRepBased || currentWaveReps <= 0}>
          Log Wave {waveNumber}
        </Button>
        <Button onClick={handleCompleteMovement} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
          <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
        </Button>
      </CardFooter>
    </Card>
  );
}
