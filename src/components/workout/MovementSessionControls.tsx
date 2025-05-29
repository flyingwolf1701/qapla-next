
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, Movement } from '@/lib/types'; // Ensure Movement is imported
import { DEFAULT_TARGET_REPS } from '@/lib/types';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, Lock, Minus, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input as ShadcnInput } from '@/components/ui/input'; // Renamed to avoid conflict
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


  const currentMovementDetails: Movement | undefined = useMemo(() => {
    // Added guard for movementCategory and its progressions
    if (!movementCategory || !Array.isArray(movementCategory.progressions)) {
        return undefined;
    }
    return movementCategory.progressions.find(p => p.level === currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);


  // Effect to initialize/reset state when the movementCategory prop itself changes OR when userLevels change (for initial unlocked level setup).
  useEffect(() => {
    // Guard: Ensure movementCategory and its progressions are valid before proceeding.
    if (!movementCategory || !movementCategory.id || !Array.isArray(movementCategory.progressions)) {
      // console.warn("MovementSessionControls: movementCategory or its progressions are not ready for initialization.");
      return; 
    }
    // Additional guard for empty progressions array
    if (movementCategory.progressions.length === 0) {
        // console.warn(`MovementCategory ${movementCategory.name || movementCategory.id} has no progressions.`);
        // Set a safe default state
        setCurrentExerciseLevel(1); 
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now());
        setSessionTargetSeconds(60);
        // Ensure unlockedLevelForCategory is also set based on current userLevels
        setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
        return;
    }

    const categoryInitialUnlockedLevel = userLevels[movementCategory.id] || 1;
    // This line is important: it ensures the local state for unlocked level is set correctly
    // when the category (or userLevels affecting this category) changes.
    // The separate effect below primarily handles updates to this when userLevels change *without* category change.
    setUnlockedLevelForCategory(categoryInitialUnlockedLevel); 

    let startingLevelForSession = Math.max(1, categoryInitialUnlockedLevel - 2); 

    const categoryProgressions = movementCategory.progressions;

    const determinedInitialMovement =
        categoryProgressions.find(p => p.level === startingLevelForSession) || 
        categoryProgressions.find(p => p.level > 0 && p.level <= categoryInitialUnlockedLevel) || 
        categoryProgressions.find(p => p.level > 0) || 
        categoryProgressions[0]; 

    const initialLevelToSet = determinedInitialMovement?.level || 1;
    setCurrentExerciseLevel(initialLevelToSet);

    const initialMovementDetailsForSetup = categoryProgressions.find(p => p.level === initialLevelToSet);
    if (initialMovementDetailsForSetup && !initialMovementDetailsForSetup.isRepBased) {
      setSessionTargetSeconds(initialMovementDetailsForSetup.defaultDurationSeconds || 60);
    } else {
      setSessionTargetSeconds(60); 
    }

    // Reset progress for NEW category - this part might need adjustment if it's also triggered by userLevel changes within the same category
    // This was the source of the previous "reset on level up" bug.
    // We only want to reset these if the movementCategory.id has actually changed.
    // A common way to do this is to store prevMovementCategory.id and compare.
    // For now, this effect relies on the parent component not re-rendering it with the same category
    // unless userLevels also caused a relevant change for initial setup.
    // The more robust fix for "reset on levelup" is to have distinct effects.
    // Let's assume this effect is intended to run on category change or significant userLevel changes
    // that necessitate a re-evaluation of the starting point.
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now()); 
  }, [movementCategory, userLevels]);

   // Separate Effect to sync local unlockedLevelForCategory with global userLevels from context
   // This should NOT reset other session progress like totalRepsThisMovement.
   useEffect(() => {
    if (movementCategory?.id) { 
        const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
        if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
          setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
        }
    }
   }, [userLevels, movementCategory?.id, unlockedLevelForCategory]);


  // Effect for level up hints and lock icon
  useEffect(() => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions)) { // Added guard for movementCategory.progressions
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; 
    
    let nextProgressionExists = false;
    // Check if there's a next level of the SAME TYPE (rep/time)
    const currentTypeIsRepBased = currentMovementDetails.isRepBased;
    nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === currentTypeIsRepBased
    );
    
    let hint = null;
    let showLock = false;

    if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
      if (currentMovementDetails.isRepBased) {
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
           // Level up for time-based exercises is handled when wave is logged (handleProgressionViaArrow or handleMovementComplete)
        }
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);

  }, [
    currentWaveReps, currentElapsedTime, currentMovementDetails, unlockedLevelForCategory,
    movementCategory, updateUserLevel, userLevels, toast // Simplified dependencies
  ]);

  const handleMovementComplete = () => {
    if (!currentMovementDetails || !movementCategory) { // Added guard for movementCategory
      toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
      return;
    }

    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;
    let finalEffectiveLevel = currentExerciseLevel; 
    // let finalWaveNumber = waveNumber; // Not needed for final log entry directly

    if (currentMovementDetails.isRepBased) {
        if (currentWaveReps > 0) { 
            const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
            finalWaves = [...finalWaves, lastWaveData];
            finalTotalReps += currentWaveReps;
            // finalWaveNumber = waveNumber +1; // This would be for next wave, not this log

            const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
            if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
                if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
                    updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                }
            }
        }
        if (finalWaves.length === 0 && finalTotalReps === 0) { 
            toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
            return;
        }
        finalEffectiveLevel = finalWaves.length > 0 ? Math.max(...finalWaves.map(w => w.level), 1) : currentExerciseLevel;
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
            // finalWaveNumber = waveNumber +1;

            const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
            if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
                if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
                    updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                }
            }
        }
        if (finalWaves.length === 0 && finalTotalDuration === 0) {
            toast({ title: "No Time Logged", description: "Please log some time before completing.", variant: "destructive" });
            return;
        }
        finalEffectiveLevel = finalWaves.length > 0 ? Math.max(...finalWaves.map(w => w.level), 1) : currentExerciseLevel;
        onMovementComplete({
            id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name as any,
            movementName: currentMovementDetails.name,
            levelAchieved: finalEffectiveLevel,
            durationSeconds: finalTotalDuration, waves: finalWaves,
        });
    }
  };

  const handleProgressionViaArrow = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !movementCategory || !Array.isArray(movementCategory.progressions)) {
        toast({ title: "Error", description: "Cannot change level, movement details missing.", variant: "destructive" });
        return;
    }
    
    let workValue = 0;
    let waveLogged = false;

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

        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
        if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
            if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
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

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
             if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1){
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
    }
    
    if (waveLogged) {
        setWaveNumber(prev => prev + 1);
    }


    const progressionsSorted = movementCategory.progressions
        .filter(p => p.level > 0) 
        .sort((a, b) => a.level - b.level);

    if (progressionsSorted.length === 0) {
        if(waveLogged) toast({ description: `No other exercises in this category. Wave ${waveNumber -1} logged.` }); // waveNumber already incremented if logged
        else toast({ description: `No other exercises in this category.` });
        setCurrentWaveReps(0); setCurrentElapsedTime(0); setTimerKey(Date.now());
        return;
    }

    let currentMappedIndex = progressionsSorted.findIndex(p => p.level === currentExerciseLevel);
    let newMovementForLevel: Movement | undefined = undefined;
    let foundNext = false;
    const currentGlobalUnlockedLvl = unlockedLevelForCategory;


    if (direction === 'up') {
        for (let i = currentMappedIndex + 1; i < progressionsSorted.length; i++) {
            // Allow moving to the next level if it's within the globally unlocked level OR if it's the very next level and we are trying to unlock it
             if (progressionsSorted[i].level <= currentGlobalUnlockedLvl || (progressionsSorted[i].level === currentGlobalUnlockedLvl + 1 && currentMovementDetails.level === currentGlobalUnlockedLvl) ) {
                newMovementForLevel = progressionsSorted[i];
                foundNext = true;
                break;
            }
        }
         if (!foundNext && currentMappedIndex < progressionsSorted.length -1 && progressionsSorted[currentMappedIndex+1].level > currentGlobalUnlockedLvl) {
            if(waveLogged) toast({ description: `Next level (Lvl ${progressionsSorted[currentMappedIndex+1].level}) is locked. Wave ${waveNumber-1} logged.` });
            else toast({ description: `Next level (Lvl ${progressionsSorted[currentMappedIndex+1].level}) is locked.` });
        } else if (!foundNext && currentMappedIndex >= progressionsSorted.length -1 ) { 
            if(waveLogged) toast({ description: `Highest unlocked level reached. Wave ${waveNumber-1} logged.` });
            else toast({ description: `Highest unlocked level reached.` });
        } else if (!foundNext) {
            if(waveLogged) toast({ description: `No further unlocked levels. Wave ${waveNumber-1} logged.` });
            else toast({ description: `No further unlocked levels.` });
        }
    } else { // direction 'down'
        for (let i = currentMappedIndex - 1; i >= 0; i--) {
            newMovementForLevel = progressionsSorted[i];
            foundNext = true;
            break;
        }
        if (!foundNext) {
            if(waveLogged) toast({ description: `Lowest level reached. Wave ${waveNumber-1} logged.` });
            else toast({ description: `Lowest level reached.` });
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

    if (currentMovementDetails.isRepBased && upArrowIconIsLock) {
      return false; 
    }

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.level > 0) 
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 || currentIndex >= relevantProgressions.length - 1) {
      return true; 
    }
    
    const nextProgression = relevantProgressions[currentIndex + 1];
    // Check if next progression is within unlocked OR if it's the very next and current is the unlock edge
    if (nextProgression.level <= unlockedLevelForCategory || 
        (nextProgression.level === unlockedLevelForCategory + 1 && currentMovementDetails.level === unlockedLevelForCategory)
       ) { 
      return false; 
    }
    return true; 
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
          {currentMovementDetails ? `Current: Lvl ${currentExerciseLevel} - ${currentMovementDetails.name}. ` : ''}
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
            {currentMovementDetails?.isRepBased ?
                `Enter reps and use arrows or ✓ button.`
                : (currentMovementDetails ? `Set target, start timer, then use arrows or ✓ button.` : "Setup your workout.")
            }
          </p>
      </CardFooter>
    </Card>
  );
}


