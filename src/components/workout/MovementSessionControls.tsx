
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
import { getMovementByLevel, ALL_MOVEMENTS } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, Lock, Minus, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';


interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // This prop might be less critical if we derive from context always
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
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
    return getMovementByLevel({ progressions: movementCategory.progressions }, currentExerciseLevel);
  }, [movementCategory.progressions, currentExerciseLevel]);


  useEffect(() => {
    // This effect ONLY resets when the movementCategory prop itself changes.
    // It sets up the initial state for a NEW movement category.
    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel); // Set initial unlocked level for the category

    let startingLevelForSession = Math.max(1, categoryUnlockedLevel - 2); // Wave 1 starts 2 levels below, min 1

    const determinedInitialMovement = 
        movementCategory.progressions.find(p => p.level === startingLevelForSession) || // Try the calculated starting level
        movementCategory.progressions.find(p => p.level > 0 && p.level <= categoryUnlockedLevel) || // Fallback to first unlocked > 0
        movementCategory.progressions.find(p => p.level > 0) || // Fallback to first > 0
        movementCategory.progressions[0]; // Fallback to very first

    const initialLevelToSet = determinedInitialMovement?.level || 1;
    setCurrentExerciseLevel(initialLevelToSet);

    const initialMovementDetailsForSetup = getMovementByLevel({ progressions: movementCategory.progressions }, initialLevelToSet);
    if (initialMovementDetailsForSetup && !initialMovementDetailsForSetup.isRepBased) {
      setSessionTargetSeconds(initialMovementDetailsForSetup.defaultDurationSeconds || 60);
    } else {
      setSessionTargetSeconds(60); // Default target for rep-based or if no duration
    }

    // Reset progress for NEW category
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now()); // Reset timer
    // Level up hint and lock icon states will be derived in their own effect
    // setLevelUpHintText(null); 
    // setUpArrowIconIsLock(false);

  }, [movementCategory]); // ONLY depends on movementCategory


  // Effect to keep local unlockedLevelForCategory in sync with global context changes
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
      setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  useEffect(() => {
    if (!currentMovementDetails) {
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Assuming max level is 10
    
    // Find if there's a next progression of the *same type* to determine if an unlock is possible
    let nextProgressionExists = false;
    if (currentMovementDetails.isRepBased) {
        nextProgressionExists = movementCategory.progressions.some(
            p => p.level === unlockedLevelForCategory + 1 && p.isRepBased
        );
    } else {
         nextProgressionExists = movementCategory.progressions.some(
            p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased
        );
    }
    // For generic arrow progression, just check if *any* next level exists.
    const anyNextProgressionExists = movementCategory.progressions.some(p => p.level === unlockedLevelForCategory + 1);


    let hint = null;
    let showLock = false;

    if (isAtUnlockEdge && canLevelUpFurther && anyNextProgressionExists) {
      if (currentMovementDetails.isRepBased) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || 30;
        hint = `${repsNeeded} reps to unlock next level`;
        showLock = currentWaveReps < repsNeeded; 
        if (currentWaveReps >= repsNeeded && userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
           updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
           toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
           showLock = false; // Unlocked
        }
      } else { // Time-based
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `Hold for ${formatTime(durationNeeded)} to unlock next level`;
          // Lock icon isn't typically used for time-based in this way, as log is manual
        }
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);

  }, [
    currentWaveReps, currentElapsedTime, currentMovementDetails, unlockedLevelForCategory,
    movementCategory.progressions, movementCategory.id, updateUserLevel, userLevels
  ]);

  const handleMovementComplete = () => {
    if (!currentMovementDetails) {
      toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
      return;
    }

    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;
    let finalEffectiveLevel = currentExerciseLevel; // Start with current selected level

    if (currentMovementDetails.isRepBased) {
      if (currentWaveReps > 0) { // Log current wave if reps are entered
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;

        // Check for level up on this final wave
        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
        if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
            if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1) {
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                // Toast is good here, but might be redundant if already shown by useEffect
            }
        }
      }
      if (finalWaves.length === 0 && finalTotalReps === 0) { // Check if anything was logged at all
        toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
        return;
      }
      finalEffectiveLevel = finalWaves.length > 0 ? Math.max(...finalWaves.map(w => w.level), 1) : currentExerciseLevel; // Use max logged level or current
      onMovementComplete({
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name as any,
        movementName: currentMovementDetails.name,
        levelAchieved: finalEffectiveLevel,
        totalReps: finalTotalReps, waves: finalWaves,
      });

    } else { // Time-based
      if (currentElapsedTime > 0) { // Log current timer if it has run
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalDuration += currentElapsedTime;

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
    if (!currentMovementDetails) return;

    let workDoneThisWave = false;

    if (currentMovementDetails.isRepBased) {
        if (currentWaveReps <= 0) {
            toast({ title: "No Reps Entered", description: "Please enter some reps before changing level.", variant: "destructive" });
            return;
        }
        const loggedWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        setWavesDoneThisSession(prev => [...prev, loggedWaveData]);
        setTotalRepsThisMovement(prev => prev + currentWaveReps);
        workDoneThisWave = true;

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
        const loggedWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        setWavesDoneThisSession(prev => [...prev, loggedWaveData]);
        setTotalDurationThisMovement(prev => prev + currentElapsedTime);
        workDoneThisWave = true;

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
             if (userLevels[movementCategory.id] < unlockedLevelForCategory + 1){
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
    }

    setWaveNumber(prev => prev + 1);

    const progressionsSorted = movementCategory.progressions
        .filter(p => p.level > 0) // Exclude level 0 warm-ups from direct arrow progression
        .sort((a, b) => a.level - b.level);

    if (progressionsSorted.length === 0) {
        toast({ description: `No other exercises in this category. Wave logged.` });
        setCurrentWaveReps(0); setCurrentElapsedTime(0); setTimerKey(Date.now());
        return;
    }

    let currentMappedIndex = progressionsSorted.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel;
    let newMovementForLevel: Movement | undefined = undefined;
    let foundNext = false;

    // Use the LATEST unlockedLevelForCategory from state for these checks
    const currentGlobalUnlockedLvl = unlockedLevelForCategory;


    if (direction === 'up') {
        for (let i = currentMappedIndex + 1; i < progressionsSorted.length; i++) {
            if (progressionsSorted[i].level <= currentGlobalUnlockedLvl) {
                newMovementForLevel = progressionsSorted[i];
                foundNext = true;
                break;
            }
        }
         if (!foundNext && currentMappedIndex < progressionsSorted.length - 1 && progressionsSorted[currentMappedIndex+1].level > currentGlobalUnlockedLvl) {
            toast({ description: `Next level (Lvl ${progressionsSorted[currentMappedIndex+1].level}) is locked. Wave logged.` });
        } else if (!foundNext && currentMappedIndex === progressionsSorted.length -1) {
            toast({ description: `Highest unlocked level reached. Wave logged.` });
        } else if (!foundNext) {
            toast({ description: `No further unlocked levels in this direction. Wave logged.` });
        }
    } else { // direction 'down'
        for (let i = currentMappedIndex - 1; i >= 0; i--) {
            newMovementForLevel = progressionsSorted[i];
            foundNext = true;
            break;
        }
        if (!foundNext) {
            toast({ description: `Lowest level reached. Wave logged.` });
        }
    }

    if (foundNext && newMovementForLevel) {
        setCurrentExerciseLevel(newMovementForLevel.level);
        if (!newMovementForLevel.isRepBased) {
            setSessionTargetSeconds(newMovementForLevel.defaultDurationSeconds || 60);
        }
    } else {
        // If no next level was found but work was logged, keep current level or reset to a sensible default if necessary
        // For now, it will stay on the current level if no next valid found.
    }

    setCurrentWaveReps(0);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now()); // Reset timer for the new exercise/wave

}, [
    currentMovementDetails, currentWaveReps, currentElapsedTime, waveNumber, currentExerciseLevel,
    movementCategory.progressions, unlockedLevelForCategory, updateUserLevel, movementCategory.id, toast, userLevels
]);


  const handleExerciseLevelChangeFromDropdown = (level: number) => {
    const newMovementDetails = getMovementByLevel({ progressions: movementCategory.progressions }, level);
    if (newMovementDetails) {
        setCurrentExerciseLevel(level);
        // Reset wave progress when explicitly changing exercise via dropdown
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
      setTimeout(() => { // Defer toast to avoid state update issues
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
      setSessionTargetSeconds(0); // Allow clearing to 0
    }
  };
  
  const adjustTargetSeconds = (amount: number) => {
    setSessionTargetSeconds(prev => Math.max(0, prev + amount));
  };


  const downArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, currentMovementDetails]);

 const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;

    if (currentMovementDetails.isRepBased && upArrowIconIsLock) {
      return false; // Pressing it attempts unlock
    }

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 || currentIndex >= relevantProgressions.length - 1) {
      return true; // No higher progression exists at all
    }
    
    // Check if the *next* actual progression is within the globally unlocked level for the category
    const nextProgression = relevantProgressions[currentIndex + 1];
    if (nextProgression.level <= unlockedLevelForCategory) { 
      return false; // There's a higher, unlocked level
    }

    return true; // Next higher level is locked (and not at unlock edge for reps)
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, currentMovementDetails, upArrowIconIsLock]);


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
            <movementCategory.icon className="h-7 w-7 text-primary" />
            {movementCategory.name}
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
            progressions={movementCategory.progressions}
            onLevelChange={handleExerciseLevelChangeFromDropdown}
            // movementCategory={movementCategory} // No longer needed with direct progressions
          />
        </div>

        {/* Buttons for progression - common for both rep and time based */}
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
              waveNumber={waveNumber} // Pass wave number if Timer uses it
              className="py-0"
            />
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            <p className="text-sm text-muted-foreground text-center">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
          </div>
        )}

        {!currentMovementDetails && (
            <p className="text-muted-foreground text-center">
              Select an exercise to begin.
            </p>
        )}

        {wavesDoneThisSession.length > 0 && (
          <div className="pt-2">
            <h4 className="font-medium mb-2 text-sm">Logged Waves this Session:</h4>
            <ScrollArea className="h-[100px] border rounded-md p-2 bg-muted/20">
              <ul className="space-y-1 text-xs">
                {wavesDoneThisSession.map((wave, index) => {
                  const movementLogged = getMovementByLevel({ progressions: movementCategory.progressions }, wave.level);
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
                : `Set target, start timer, then use arrows or ✓ button.`
            }
          </p>
      </CardFooter>
    </Card>
  );
}
