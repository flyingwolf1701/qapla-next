
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
import { getMovementByLevel, MOVEMENT_CATEGORIES_DATA } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, Lock, Minus, Plus } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input as ShadcnInput } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number;
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { userLevels, updateUserLevel } = useWorkoutState();

  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);

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
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    let startingLevelForSession = Math.max(1, globalCategoryUnlockedLevel - 2);
    const startingMovement = getMovementByLevel(movementCategory, startingLevelForSession) || movementCategory.progressions.find(p => p.level > 0) || movementCategory.progressions[0];

    if (startingMovement) {
      setCurrentExerciseLevel(startingMovement.level);
      if (!startingMovement.isRepBased) {
        setSessionTargetSeconds(startingMovement.defaultDurationSeconds || 60);
      }
    } else {
      // Fallback if category has no progressions somehow
      setCurrentExerciseLevel(1);
    }
    
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
    setLevelUpHintText(null);
    setUpArrowIconIsLock(false);
  }, [movementCategory, initialUserLevel]); // initialUserLevel dependency ensures reset if that base changes

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
    const canLevelUpFurther = unlockedLevelForCategory < 10;
    const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1
    );
    
    let hint = null;
    let showLock = false;

    if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
      if (currentMovementDetails.isRepBased) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || 30;
        hint = `${repsNeeded} reps to unlock next level`;
        showLock = currentWaveReps < repsNeeded;

        if (!showLock && upArrowIconIsLock && currentWaveReps >= repsNeeded) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        }
      } else {
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `Hold for ${formatTime(durationNeeded)} to unlock next level`;
        }
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);

  }, [
    currentWaveReps, currentElapsedTime, currentMovementDetails, unlockedLevelForCategory,
    movementCategory, updateUserLevel, upArrowIconIsLock
  ]);

  const handleMovementComplete = () => {
    if (!currentMovementDetails) {
      toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
      return;
    }

    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;
    let lastWaveLogged = false;

    if (currentMovementDetails.isRepBased) {
      if (currentWaveReps > 0) {
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;
        lastWaveLogged = true;
        
        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
        if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
            const nextActualProgression = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory + 1);
            if (nextActualProgression) {
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
      }
      if (finalWaves.length === 0 && finalTotalReps === 0) {
        toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
        return;
      }
      onMovementComplete({
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name,
        movementName: currentMovementDetails.name,
        levelAchieved: Math.max(...finalWaves.map(w => w.level), 1),
        totalReps: finalTotalReps, waves: finalWaves,
      });
    } else { // Time-based
      if (currentElapsedTime > 0) {
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalDuration += currentElapsedTime;
        lastWaveLogged = true;

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
            const nextActualProgression = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory + 1);
            if (nextActualProgression){
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${unlockedLevelForCategory + 1} for ${movementCategory.name}! Qapla'!` });
            }
        }
      }
      if (finalWaves.length === 0 && finalTotalDuration === 0) {
        toast({ title: "No Time Logged", description: "Please log some time before completing.", variant: "destructive" });
        return;
      }
      onMovementComplete({
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name,
        movementName: currentMovementDetails.name,
        levelAchieved: Math.max(...finalWaves.map(w => w.level), 1),
        durationSeconds: finalTotalDuration, waves: finalWaves,
      });
    }
  };
  
  const handleProgressionViaArrow = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails) return;

    let workDoneThisSegment = false;
    if (currentMovementDetails.isRepBased) {
        if (currentWaveReps <= 0) {
            toast({ title: "No Reps Entered", description: "Please enter some reps before changing level.", variant: "destructive" });
            return;
        }
        const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        setWavesDoneThisSession(prev => [...prev, waveData]);
        setTotalRepsThisMovement(prev => prev + currentWaveReps);
        workDoneThisSegment = true;

        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
        if (currentMovementDetails.level === unlockedLevelForCategory && currentWaveReps >= repsNeededForUnlock && unlockedLevelForCategory < 10) {
            const nextActualProgression = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory + 1);
            if (nextActualProgression) { // Check if next level actually exists
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                // Toast is handled by useEffect for levelUpHintText/upArrowIconIsLock
            }
        }
    } else { // Time-based
        if (currentElapsedTime <= 0) {
            toast({ title: "No Time Recorded", description: "Timer has not run for this wave. Start timer or select another exercise before changing level.", variant: "destructive" });
            return;
        }
        const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        setWavesDoneThisSession(prev => [...prev, waveData]);
        setTotalDurationThisMovement(prev => prev + currentElapsedTime);
        workDoneThisSegment = true;

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && currentMovementDetails.level === unlockedLevelForCategory && currentElapsedTime >= durationNeededForUnlock && unlockedLevelForCategory < 10) {
            const nextActualProgression = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory + 1);
             if (nextActualProgression){
                updateUserLevel(movementCategory.id, unlockedLevelForCategory + 1);
                // Toast handled by useEffect
            }
        }
    }

    setWaveNumber(prev => prev + 1);

    const progressionsSorted = movementCategory.progressions
        .filter(p => p.level > 0) // Exclude level 0 from arrow cycling
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

    if (direction === 'up') {
        for (let i = currentMappedIndex + 1; i < progressionsSorted.length; i++) {
            if (progressionsSorted[i].level <= unlockedLevelForCategory) {
                newLevelToDisplay = progressionsSorted[i].level;
                newMovementForLevel = progressionsSorted[i];
                foundNext = true;
                break;
            }
        }
         if (!foundNext && currentMappedIndex < progressionsSorted.length -1 && progressionsSorted[currentMappedIndex+1].level > unlockedLevelForCategory) {
             // If next level exists but is locked
            toast({ description: `Next level (Lvl ${progressionsSorted[currentMappedIndex+1].level}) is locked. Wave logged.` });
        } else if (!foundNext) {
            toast({ description: `Highest unlocked level reached. Wave logged.` });
        }
    } else { // direction 'down'
        for (let i = currentMappedIndex - 1; i >= 0; i--) {
            // No unlock check needed for going down, just find previous existing
            newLevelToDisplay = progressionsSorted[i].level;
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
    }
    // Reset inputs for the new segment (wave/level)
    setCurrentWaveReps(0);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now());

}, [
    currentMovementDetails, currentWaveReps, currentElapsedTime, waveNumber, currentExerciseLevel,
    movementCategory, unlockedLevelForCategory, updateUserLevel 
]);


  const handleExerciseLevelChangeFromDropdown = (level: number) => {
    const newMovementDetails = getMovementByLevel(movementCategory, level);
    if (newMovementDetails) {
        setCurrentExerciseLevel(level);
        if (!newMovementDetails.isRepBased) {
            setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
        }
        // Reset progress when manually changing exercise via dropdown
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now());
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
  }, [currentMovementDetails, sessionTargetSeconds]);

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
    if (!currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    if (currentMovementDetails.isRepBased && upArrowIconIsLock) return false; 

    const relevantProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a, b) => a.level - b.level);
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 || currentIndex === relevantProgressions.length - 1) return true;

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) return false;
    }
    return true; 
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, currentMovementDetails, upArrowIconIsLock]);

  const displayedCurrentRepsForTracker = totalRepsThisMovement + currentWaveReps;

  let currentWaveTargetRepsDisplay: string;
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
            `Overall Target: ${DEFAULT_TARGET_REPS} reps.` :
            (currentMovementDetails ? `Wave ${waveNumber}.` : '')
          }
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Change Exercise & Level</Label>
          <LevelSelector
            currentLevel={currentExerciseLevel}
            unlockedLevel={unlockedLevelForCategory}
            progressions={movementCategory.progressions}
            onLevelChange={handleExerciseLevelChangeFromDropdown}
          />
        </div>
        
        {/* Common Arrow and Done Buttons */}
        <div className="flex items-center justify-center gap-2 mt-2">
          <Button variant="outline" size="icon" onClick={() => handleProgressionViaArrow('down')} disabled={downArrowDisabled} aria-label="Previous Level & Log Wave">
            <ChevronDown />
          </Button>
          <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
            <CheckSquare className="h-5 w-5 text-primary" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleProgressionViaArrow('up')} disabled={upArrowDisabled && !(currentMovementDetails?.isRepBased && upArrowIconIsLock)} aria-label="Next Level & Log Wave">
            {(currentMovementDetails?.isRepBased && upArrowIconIsLock) ? <Lock /> : <ChevronUp />}
          </Button>
        </div>

        {/* Rep-Based Controls */}
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

        {/* Time-Based Controls */}
        {!currentMovementDetails?.isRepBased && currentMovementDetails && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-seconds-input" className="block font-medium text-center">Wave {waveNumber}: Session Target (seconds)</Label>
              <div className="flex items-center justify-center gap-2">
                 <Button variant="outline" size="icon" onClick={() => adjustTargetSeconds(-10)} disabled={sessionTargetSeconds <= 0} aria-label="Decrease target time by 10 seconds">
                    <Minus className="h-4 w-4" />
                </Button>
                <ShadcnInput
                  id="target-seconds-input"
                  type="number"
                  value={sessionTargetSeconds}
                  onChange={handleTargetSecondsInputChange}
                  min="0"
                  className="w-20 text-center"
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
              Select an exercise.
            </p>
        )}

        {wavesDoneThisSession.length > 0 && (
          <div className="pt-2">
            <h4 className="font-medium mb-2 text-sm">Logged Waves this Session:</h4>
            <ScrollArea className="h-[100px] border rounded-md p-2 bg-muted/20">
              <ul className="space-y-1 text-xs">
                {wavesDoneThisSession.map((wave, index) => {
                  const movementLogged = getMovementByLevel(movementCategory, wave.level);
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
                (totalRepsThisMovement > 0 || currentWaveReps > 0) ?
                    `Use arrows to log waves & change level, or ✓ to finish.` :
                    `Perform reps and use arrows or ✓ button.`
                : (totalDurationThisMovement > 0 || currentElapsedTime > 0) ?
                    `Use arrows to log waves & change level, or ✓ to finish.` :
                    `Start timer, then use arrows or ✓ button.`
            }
          </p>
      </CardFooter>
    </Card>
  );
}

    