
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, Movement } from '@/lib/types';
import { DEFAULT_TARGET_REPS } from '@/lib/types';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, Lock, Minus, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, onMovementComplete }: MovementSessionControlsProps) {
  const { userLevels, updateUserLevel } = useWorkoutState();

  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(1);

  const [waveNumber, setWaveNumber] = useState(1);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);

  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60);
  const [totalDurationThisMovement, setTotalDurationThisMovement] = useState<number>(0);

  const [levelUpHintText, setLevelUpHintText] = useState<string | null>(null);
  const [upArrowIconIsLock, setUpArrowIconIsLock] = useState(false);


  // Effect to initialize/reset state when the movementCategory prop itself changes.
  // It reads userLevels at the time of change for initial setup.
  useEffect(() => {
    if (!movementCategory || !movementCategory.id || !Array.isArray(movementCategory.progressions)) {
      return;
    }
    if (movementCategory.progressions.length === 0) {
        // Handle case where a category might have no progressions defined
        setCurrentExerciseLevel(1); // Default, though no exercise will match
        setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now());
        setSessionTargetSeconds(60);
        return;
    }

    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel);

    let determinedInitialMovement: Movement | undefined = undefined;
    const sortedProgressions = [...movementCategory.progressions].sort((a, b) => a.level - b.level);

    // Try to start at the unlocked level, then one below, then two below (min level 1)
    for (let offset = 0; offset <= 2; offset++) {
        const targetLevel = Math.max(1, categoryUnlockedLevel - offset);
        determinedInitialMovement = sortedProgressions.find(p => p.level === targetLevel);
        if (determinedInitialMovement) break;
    }

    if (!determinedInitialMovement) {
        determinedInitialMovement = sortedProgressions
            .filter(p => p.level <= categoryUnlockedLevel && p.level > 0)
            .sort((a,b) => b.level - a.level)[0];
    }
    
    if (!determinedInitialMovement) {
        determinedInitialMovement = sortedProgressions.find(p => p.level > 0);
    }

    if (!determinedInitialMovement && sortedProgressions.length > 0) {
        determinedInitialMovement = sortedProgressions[0];
    }
    
    // If still no movement found (e.g. empty progressions, though guarded), default to level 1.
    // The currentMovementDetails useMemo will then be undefined, showing the "select an exercise" message.
    const initialLevelToSet = determinedInitialMovement?.level || 1; 
    setCurrentExerciseLevel(initialLevelToSet);

    const initialMovementDetailsForSetup = movementCategory.progressions.find(p => p.level === initialLevelToSet);
    if (initialMovementDetailsForSetup && !initialMovementDetailsForSetup.isRepBased) {
      setSessionTargetSeconds(initialMovementDetailsForSetup.defaultDurationSeconds || 60);
    } else {
      setSessionTargetSeconds(60);
    }

    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
  }, [movementCategory]); // Only re-run full setup when category changes. userLevels are read for initial state.

   // Separate Effect to sync local unlockedLevelForCategory with global userLevels from context
   // This should NOT reset other session progress.
   useEffect(() => {
    if (movementCategory?.id) { 
        const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
        if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
          setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
        }
    }
   }, [userLevels, movementCategory?.id, unlockedLevelForCategory]);

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    if (!movementCategory || !Array.isArray(movementCategory.progressions)) {
        return undefined;
    }
    return movementCategory.progressions.find(p => p.level === currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);


  // Effect for level up hints and lock icon
  useEffect(() => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions)) {
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Max level assumption
    
    let nextProgressionExists = false;
    const currentTypeIsRepBased = currentMovementDetails.isRepBased;
    if (canLevelUpFurther) {
        nextProgressionExists = movementCategory.progressions.some(
            p => p.level === unlockedLevelForCategory + 1 // Check if any progression exists at next level
        );
    }
    
    let hint = null;
    let showLock = false;

    if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
      if (currentTypeIsRepBased) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || 30;
        hint = `${repsNeeded} reps to unlock next level`;
        showLock = currentWaveReps < repsNeeded; 
        if (currentWaveReps >= repsNeeded && userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
           updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
           toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
           showLock = false; 
        }
      } else { 
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `Hold for ${formatTime(durationNeeded)} to unlock next level`;
           // Level up for time-based exercises is handled when wave is logged
        }
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);

  }, [
    currentWaveReps, currentElapsedTime, currentMovementDetails, unlockedLevelForCategory,
    movementCategory, updateUserLevel, userLevels, toast 
  ]);

  const handleMovementComplete = () => {
    if (!currentMovementDetails || !movementCategory) {
      toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
      return;
    }

    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;
    let finalEffectiveLevel = currentExerciseLevel;

    if (currentMovementDetails.isRepBased) {
        if (currentWaveReps > 0) { 
            const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
            finalWaves = [...finalWaves, lastWaveData];
            finalTotalReps += currentWaveReps;

            const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
            if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
                if ((userLevels[movementCategory.id] || 1) < unlockedLevelForCategory + 1) {
                    updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                }
            }
        }
        if (finalWaves.length === 0 && finalTotalReps === 0) { 
            toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
            return;
        }
        finalEffectiveLevel = finalWaves.length > 0 ? Math.max(...finalWaves.map(w => w.level).filter(l => l > 0), 1) : currentExerciseLevel;
        onMovementComplete({
            id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name as any,
            movementName: currentMovementDetails.name,
            levelAchieved: finalEffectiveLevel,
            totalReps: finalTotalReps, waves: finalWaves,
        });

    } else { // Time-based
        if (currentElapsedTime > 0) { 
            const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
            finalWaves = [...finalWaves, lastWaveData];
            finalTotalDuration += currentElapsedTime;

            const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
            if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
                if ((userLevels[movementCategory.id] || 1) < unlockedLevelForCategory + 1) {
                    updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                }
            }
        }
        if (finalWaves.length === 0 && finalTotalDuration === 0) {
            toast({ title: "No Time Logged", description: "Please log some time before completing.", variant: "destructive" });
            return;
        }
        finalEffectiveLevel = finalWaves.length > 0 ? Math.max(...finalWaves.map(w => w.level).filter(l => l > 0), 1) : currentExerciseLevel;
        onMovementComplete({
            id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name as any,
            movementName: currentMovementDetails.name,
            levelAchieved: finalEffectiveLevel,
            durationSeconds: finalTotalDuration, waves: finalWaves,
        });
    }
  };

  const handleProgressionViaArrow = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions) || movementCategory.progressions.length === 0) {
        toast({ title: "Error", description: "Cannot change level, movement details missing.", variant: "destructive" });
        return;
    }
    
    let workValue = 0;
    let waveLogged = false;
    let nextWaveNumber = waveNumber;

    if (currentMovementDetails.isRepBased) {
        if (currentWaveReps <= 0) {
            toast({ title: "No Reps Entered", description: "Please enter reps before changing level.", variant: "destructive" });
            return;
        }
        workValue = currentWaveReps;
        const loggedWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        setWavesDoneThisSession(prev => [...prev, loggedWaveData]);
        setTotalRepsThisMovement(prev => prev + currentWaveReps);
        waveLogged = true;
        nextWaveNumber = waveNumber + 1;


        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
        if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
             if ((userLevels[movementCategory.id] || 1) < unlockedLevelForCategory + 1) {
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
    } else { // Time-based
        if (currentElapsedTime <= 0) {
            toast({ title: "No Time Recorded", description: "Timer has not run. Start timer or log time before changing level.", variant: "destructive" });
            return;
        }
        workValue = currentElapsedTime;
        const loggedWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        setWavesDoneThisSession(prev => [...prev, loggedWaveData]);
        setTotalDurationThisMovement(prev => prev + currentElapsedTime);
        waveLogged = true;
        nextWaveNumber = waveNumber + 1;


        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
             if ((userLevels[movementCategory.id] || 1) < unlockedLevelForCategory + 1){
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
    }
    
    if (waveLogged) {
        setWaveNumber(nextWaveNumber);
    }

    const progressionsSorted = movementCategory.progressions
        .filter(p => p.level > 0) // Exclude level 0 warm-ups from arrow cycling
        .sort((a, b) => a.level - b.level);

    if (progressionsSorted.length === 0) {
        toast({ description: `No other exercises in this category. Wave ${waveNumber} logged.` });
        setCurrentWaveReps(0); setCurrentElapsedTime(0); setTimerKey(Date.now());
        return;
    }

    let currentMappedIndex = progressionsSorted.findIndex(p => p.level === currentExerciseLevel);
    if (currentMappedIndex === -1 && currentExerciseLevel > 0) { // If currentExerciseLevel is > 0 but not in sorted list (e.g. a warmup was selected)
        // Find closest actual progression to determine direction
        if (direction === 'up') { // find first progression level >= current actual exercise level
             currentMappedIndex = progressionsSorted.findIndex(p => p.level >= currentExerciseLevel) -1; // -1 to search from "before"
             if(currentMappedIndex < -1) currentMappedIndex = -1; // ensure not too low
        } else { // find first progression level <= current actual
             currentMappedIndex = progressionsSorted.findIndex(p => p.level <= currentExerciseLevel);
             if(currentMappedIndex === -1 && progressionsSorted.length > 0) currentMappedIndex = progressionsSorted.length; // ensure not too high
        }
    }


    let newMovementForLevel: Movement | undefined = undefined;
    let foundNext = false;

    if (direction === 'up') {
        for (let i = currentMappedIndex + 1; i < progressionsSorted.length; i++) {
             if (progressionsSorted[i].level <= unlockedLevelForCategory || (progressionsSorted[i].level === unlockedLevelForCategory + 1 && progressionsSorted[currentMappedIndex]?.level === unlockedLevelForCategory) ) {
                newMovementForLevel = progressionsSorted[i];
                foundNext = true;
                break;
            }
        }
         if (!foundNext) {
            toast({ description: `Highest unlocked level reached for this type. Wave ${waveNumber} logged.` });
        }
    } else { // direction 'down'
        for (let i = currentMappedIndex - 1; i >= 0; i--) {
            newMovementForLevel = progressionsSorted[i];
            foundNext = true;
            break;
        }
        if (!foundNext) {
            toast({ description: `Lowest level reached. Wave ${waveNumber} logged.` });
        }
    }

    if (foundNext && newMovementForLevel) {
        setCurrentExerciseLevel(newMovementForLevel.level);
        if (!newMovementForLevel.isRepBased) {
            setSessionTargetSeconds(newMovementForLevel.defaultDurationSeconds || 60);
        }
    }
    
    setCurrentWaveReps(0);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now());

}, [
    currentMovementDetails, currentWaveReps, currentElapsedTime, waveNumber, currentExerciseLevel,
    movementCategory, unlockedLevelForCategory, updateUserLevel, userLevels, toast 
]);


  const handleExerciseLevelChangeFromDropdown = (level: number) => {
    if (!movementCategory || !Array.isArray(movementCategory.progressions)) return;

    const newMovementDetails = movementCategory.progressions.find(p => p.level === level);
    if (newMovementDetails) {
        setCurrentExerciseLevel(level);
        setWaveNumber(1); 
        setWavesDoneThisSession([]); 
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now());
        if (!newMovementDetails.isRepBased) {
            setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
        } else {
            setSessionTargetSeconds(60); // Default for rep based if switching
        }
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimerUpdate = useCallback((elapsed: number) => {
    setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if (currentMovementDetails && !currentMovementDetails.isRepBased) {
      setTimeout(() => { 
        toast({
          title: "Session Target Reached!",
          description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
        });
      },0);
    }
  }, [currentMovementDetails, sessionTargetSeconds, toast]);

  const handleTargetSecondsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setSessionTargetSeconds(value);
    } else if (e.target.value === "") {
      setSessionTargetSeconds(0); 
    }
  };
  
  const adjustTargetSeconds = (amount: number) => {
    setSessionTargetSeconds(prev => Math.max(0, prev + amount));
  };

  const downArrowDisabled = useMemo(() => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions)) return true;
    const relevantProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory, currentMovementDetails]);

 const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions)) return true;

    // If it's rep-based and the icon is a lock, the button is NOT disabled (it's an action to unlock)
    if (currentMovementDetails.isRepBased && upArrowIconIsLock) {
      return false; 
    }
    // For time-based, or rep-based not at lock edge:
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.level > 0) // Exclude level 0 warm-ups
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 || currentIndex >= relevantProgressions.length - 1) {
      return true; // At highest or current not in main progression
    }
    
    const nextProgression = relevantProgressions[currentIndex + 1];
    // Check if next progression is within unlocked OR if it's the very next and current is the unlock edge
    if (nextProgression.level <= unlockedLevelForCategory || 
        (nextProgression.level === unlockedLevelForCategory + 1 && currentMovementDetails.level === unlockedLevelForCategory)
       ) { 
      return false; // Can move up
    }
    return true; // Next level is locked and not at the immediate unlock edge
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory, currentMovementDetails, upArrowIconIsLock]);


  const displayedCurrentRepsForTracker = totalRepsThisMovement + currentWaveReps;

  let currentWaveTargetRepsDisplay: string;
  if (currentMovementDetails?.isRepBased) {
    const wave1TargetReps = 10;
    const wave2TargetReps = 10;
    if (waveNumber === 1) {
      currentWaveTargetRepsDisplay = `Wave 1: Target ${wave1TargetReps} reps`;
    } else if (waveNumber === 2) {
      currentWaveTargetRepsDisplay = `Wave 2: Target ${wave2TargetReps} reps`;
    } else {
      const remainingForOverallTarget = Math.max(0, DEFAULT_TARGET_REPS - (totalRepsThisMovement));
      currentWaveTargetRepsDisplay = `Wave ${waveNumber}: Target ${remainingForOverallTarget} reps`;
    }
  } else {
     currentWaveTargetRepsDisplay = `Wave ${waveNumber}: Session Target (seconds)`;
  }


  if (!movementCategory || !movementCategory.progressions || movementCategory.progressions.length === 0) {
    return (
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center gap-2">
                    {movementCategory?.icon && <movementCategory.icon className="h-7 w-7 text-primary" />}
                    {movementCategory?.name || "Workout"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground text-center py-4">No exercises available for this category.</p>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl flex items-center gap-2">
            {movementCategory?.icon && <movementCategory.icon className="h-7 w-7 text-primary" />}
            {movementCategory?.name || "Loading..."}
          </CardTitle>
          <Badge variant="secondary">Unlocked Lvl: {unlockedLevelForCategory}</Badge>
        </div>
        <CardDescription>
          {currentMovementDetails ? `Current: Lvl ${currentMovementDetails.level} - ${currentMovementDetails.name}. ` : ''}
          {currentMovementDetails?.isRepBased ?
            `Overall Rep Target: ${DEFAULT_TARGET_REPS}.` :
            (currentMovementDetails ? '' : '')
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-col items-center space-y-1">
          <Label htmlFor="level-selector" className="block mb-1 font-medium text-center">Change Exercise & Level</Label>
          <LevelSelector
            currentLevel={currentExerciseLevel}
            unlockedLevel={unlockedLevelForCategory}
            progressions={movementCategory?.progressions || []}
            onLevelChange={handleExerciseLevelChangeFromDropdown}
          />
        </div>
        
        {/* Unified Button Row */}
        <div className="flex items-center justify-center gap-2 mt-2">
            <Button variant="outline" size="icon" onClick={() => handleProgressionViaArrow('down')} disabled={downArrowDisabled} aria-label="Previous Level & Log Wave">
                <ChevronDown />
            </Button>
            <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
                <CheckSquare className="h-5 w-5 text-primary" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => handleProgressionViaArrow('up')} disabled={upArrowDisabled} aria-label="Next Level & Log Wave">
                {currentMovementDetails?.isRepBased && upArrowIconIsLock ? <Lock /> : <ChevronUp />}
            </Button>
        </div>


        {currentMovementDetails?.isRepBased && (
            <>
                <div>
                    <Label htmlFor="rep-input" className="block mb-1 font-medium text-center">
                        {currentWaveTargetRepsDisplay}
                    </Label>
                    <div className="flex items-center justify-center gap-2">
                        <RepInput reps={currentWaveReps} onRepsChange={setCurrentWaveReps} />
                    </div>
                </div>
                {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
                <TargetTracker currentReps={displayedCurrentRepsForTracker} targetReps={DEFAULT_TARGET_REPS} />
            </>
        )}

        {!currentMovementDetails?.isRepBased && currentMovementDetails && (
          <div className="space-y-4">
            <div>
                <Label htmlFor="target-seconds-input" className="block font-medium text-center">
                    {currentWaveTargetRepsDisplay}
                </Label>
                <div className="flex items-center justify-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => adjustTargetSeconds(-10)} disabled={sessionTargetSeconds <= 0} aria-label="Decrease target time by 10 seconds">
                        <Minus className="h-4 w-4" />
                    </Button>
                    <ShadcnInput
                        id="target-seconds-input"
                        type="number"
                        value={sessionTargetSeconds.toString()}
                        onChange={handleTargetSecondsInputChange}
                        min="0"
                        className="w-20 text-center"
                        aria-label="Session target seconds"
                    />
                    <Button variant="outline" size="icon" onClick={() => adjustTargetSeconds(10)} aria-label="Increase target time by 10 seconds">
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>
            <Timer
              key={timerKey}
              targetDuration={sessionTargetSeconds}
              onTimeUpdate={handleTimerUpdate}
              onTargetReached={handleTimerTargetReached}
              autoStart={false}
              waveNumber={waveNumber} 
              className="py-0"
            />
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            <p className="text-sm text-muted-foreground text-center">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
          </div>
        )}

        {!currentMovementDetails && (
            <p className="text-muted-foreground text-center">
              Select an exercise to begin or if session is complete, go to Home.
            </p>
        )}

        {wavesDoneThisSession.length > 0 && (
          <div className="pt-2">
            <h4 className="font-medium mb-2 text-sm">Logged Waves this Session:</h4>
            <ScrollArea className="h-[100px] border rounded-md p-2 bg-muted/20">
              <ul className="space-y-1 text-xs">
                {wavesDoneThisSession.map((wave, index) => {
                  const movementLogged = movementCategory?.progressions?.find(p => p.level === wave.level);
                  return (
                    <li key={index} className="flex justify-between items-center">
                      <span>
                        Wave {wave.wave}: Lvl {wave.level} ({movementLogged?.name || 'N/A'})
                      </span>
                      <span>
                        {wave.reps !== undefined && `${wave.reps} reps`}
                        {wave.durationSeconds !== undefined && `${formatTime(wave.durationSeconds)}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col sm:flex-row justify-center items-center gap-2 pt-4 border-t">
         <p className="text-sm text-muted-foreground w-full text-center">
            {!currentMovementDetails ? "Setup your workout." : 
                (currentMovementDetails.isRepBased ? 
                    `Enter reps and use arrows or ✓ button.` : 
                    `Set target, start timer, then use arrows or ✓ button.`
                )
            }
          </p>
      </CardFooter>
    </Card>
  );
}
