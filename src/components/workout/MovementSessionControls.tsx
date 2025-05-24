
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, Movement } from '@/lib/types';
import { DEFAULT_TARGET_REPS, LEVEL_UP_THRESHOLD_REPS } from '@/lib/types';
import { getMovementByLevel, MOVEMENT_CATEGORIES_DATA } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, TimerIcon, Edit3, Lock } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // This is the actual unlocked level for the category from context
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

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

  // Effect to initialize/reset when the movement category changes
   useEffect(() => {
    setUnlockedLevelForCategory(initialUserLevel);

    let determinedStartingLevelAttempt = initialUserLevel; 
    // Try current unlocked level first
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);

    // If not found, try 2 levels below (min 1)
    if (!initialMovementForSession) {
        determinedStartingLevelAttempt = Math.max(1, initialUserLevel > 2 ? initialUserLevel - 2 : 1);
        initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);
    }
    
    // If still not found (e.g. Lvl 1 is time-based, user is Lvl 1), find first available of any type at unlocked or below
    if (!initialMovementForSession) {
        initialMovementForSession = movementCategory.progressions
                                    .filter(p => p.level <= initialUserLevel && p.level > 0)
                                    .sort((a,b) => b.level - a.level)[0]; // Get highest available
    }

    // Fallback to absolute first progression if nothing else matches
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        initialMovementForSession = movementCategory.progressions
                                    .filter(p => p.level > 0) // Exclude warm-ups for default start
                                    .sort((a,b) => a.level - b.level)[0];
    }
    // Final fallback if only warm-ups exist or empty progressions
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        initialMovementForSession = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
    }


    if (!initialMovementForSession) {
        // Should not happen if category has progressions
        setCurrentExerciseLevel(1); 
        setSessionFixedExerciseTypeIsRepBased(true); 
        setSessionTargetSeconds(60);
    } else {
        setCurrentExerciseLevel(initialMovementForSession.level);
        const initialTypeIsRepBased = initialMovementForSession.isRepBased;
        setSessionFixedExerciseTypeIsRepBased(initialTypeIsRepBased);
        if (!initialTypeIsRepBased) {
            setSessionTargetSeconds(initialMovementForSession.defaultDurationSeconds || 60);
        }
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

  }, [movementCategory, initialUserLevel]);

  // Effect to sync local unlockedLevelForCategory with global userLevels from context
  // This runs when userLevels change (e.g. after a level-up elsewhere or on initial load)
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
        setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  // Effect for automatic level-up and dynamic UI hints based on current exercise details
  useEffect(() => {
    if (!currentMovementDetails || currentMovementDetails.level === 0) { // No hints for warm-ups (level 0)
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Max level
    
    // Check if there's a next progression OF THE SAME TYPE to unlock
    const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
    );

    if (sessionFixedExerciseTypeIsRepBased) {
        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
        if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
            setLevelUpHintText(`${repsNeededForUnlock} reps to unlock next level.`);
            const newUpArrowIconIsLock = currentWaveReps < repsNeededForUnlock;
            setUpArrowIconIsLock(newUpArrowIconIsLock);

            if (currentWaveReps >= repsNeededForUnlock && !newUpArrowIconIsLock) { // reps met and lock was previously on or is now off
                const newUnlockedLevel = unlockedLevelForCategory + 1;
                updateUserLevel(movementCategory.id, newUnlockedLevel);
                // unlockedLevelForCategory will be updated by the sync effect, which will re-evaluate this useEffect
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
                // No need to setLevelUpHintText to null here, it will re-evaluate
            }
        } else {
            setLevelUpHintText(null);
            setUpArrowIconIsLock(false);
        }
    } else { // Time-based
        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeededForUnlock && isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
             setLevelUpHintText(`${formatTime(durationNeededForUnlock)} to unlock next level (in one wave).`);
        } else {
            setLevelUpHintText(null);
        }
        setUpArrowIconIsLock(false); // No lock icon for time-based up-arrow currently
    }

  }, [
    currentWaveReps, // For rep-based
    currentMovementDetails, 
    unlockedLevelForCategory, 
    sessionFixedExerciseTypeIsRepBased,
    movementCategory, // For progressions data
    updateUserLevel, // To call level up
    toast // For notifications
  ]);


  const handleMovementComplete = () => {
    if (!currentMovementDetails) {
        toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
        return;
    }

    let entry: WorkoutEntry;
    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;

    // If there are pending reps/time for the current wave, log them before completing
    if (sessionFixedExerciseTypeIsRepBased && currentWaveReps > 0) {
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;
    } else if (!sessionFixedExerciseTypeIsRepBased && currentElapsedTime > 0 && !wavesDoneThisSession.find(w => w.wave === waveNumber && w.durationSeconds === currentElapsedTime)) {
        // Check if this specific wave instance has already been logged via "Log Wave X"
        // This handles the case where user clicks "Done with Movement" while timer is running but hasn't been explicitly logged.
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalDuration += currentElapsedTime;
    }


    if (sessionFixedExerciseTypeIsRepBased) {
        if (finalWaves.length === 0 && finalTotalReps === 0) { // Check if anything was actually done
            toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
            return;
        }
        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: Math.max(...finalWaves.map(w => w.level), finalWaves.length > 0 ? 1 : currentExerciseLevel),
            totalReps: finalTotalReps,
            waves: finalWaves,
        };
    } else { // Time-based
        if (finalWaves.length === 0 && finalTotalDuration === 0) {
            toast({ title: "No Time Logged", description: "Please log some time before completing.", variant: "destructive" });
            return;
        }
        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: Math.max(...finalWaves.map(w => w.level), finalWaves.length > 0 ? 1 : currentExerciseLevel),
            durationSeconds: finalTotalDuration,
            waves: finalWaves,
        };
    }
    onMovementComplete(entry);
  };

  const handleExerciseLevelChangeFromDropdown = (level: number) => {
    const newMovementDetails = getMovementByLevel(movementCategory, level);
    if (newMovementDetails) {
        const newTypeIsRepBased = newMovementDetails.isRepBased;
        // If type changes, we reset session progress as it's a different kind of effort
        if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
            setWaveNumber(1);
            setWavesDoneThisSession([]);
            setCurrentWaveReps(0);
            setTotalRepsThisMovement(0);
            setCurrentElapsedTime(0);
            setTotalDurationThisMovement(0);
            setTimerKey(Date.now()); // Reset timer
             if (!newTypeIsRepBased) { // If switching to time-based
                setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
            }
        }
        setCurrentExerciseLevel(level);
        setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased); // Update the fixed type for the session
    }
  };

  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails) return;

    // Log current wave if rep-based and reps > 0
    if (sessionFixedExerciseTypeIsRepBased && currentWaveReps > 0) {
      const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
      setWavesDoneThisSession(prev => [...prev, waveData]);
      setTotalRepsThisMovement(prev => prev + currentWaveReps);
    }
    // For time-based, logging wave happens via Timer's "Log Wave" button. Arrows just change level.
    // Reset current wave inputs for the new level/wave
    setCurrentWaveReps(0); // Reset for rep-based
    setTimerKey(Date.now()); // Reset timer display/state for time-based
    setCurrentElapsedTime(0); // Reset elapsed time for time-based display

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0) // Filter by current fixed type and exclude warm-ups
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
        toast({description: `No other ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercises available in this category.`});
        return;
    }
    
    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel;

    if (direction === 'up') {
        if (upArrowIconIsLock && sessionFixedExerciseTypeIsRepBased) { // Specifically for rep-based lock
            const repsNeeded = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
            toast({ description: `Log ${repsNeeded} reps at Lvl ${currentExerciseLevel} to use this level for the next wave or unlock the next level.` });
            return;
        }
      let foundNext = false;
      for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
          newLevelToDisplay = relevantProgressions[i].level;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
         toast({ description: `This is the highest currently available ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise up to your unlocked Lvl ${unlockedLevelForCategory}.` });
        return;
      }
    } else { // direction === 'down'
      if (currentIndex > 0) {
        newLevelToDisplay = relevantProgressions[currentIndex - 1].level;
      } else if (currentIndex === 0) { // Already at the first relevant exercise
        toast({ description: `This is the lowest ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise (excluding warm-ups).` });
        return;
      } else { // Should not happen if currentExerciseLevel is in relevantProgressions
        newLevelToDisplay = relevantProgressions[0]?.level || currentExerciseLevel;
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    if(!sessionFixedExerciseTypeIsRepBased) { // If time-based, update target seconds for new exercise
        const newMovement = getMovementByLevel(movementCategory, newLevelToDisplay);
        if(newMovement) {
            setSessionTargetSeconds(newMovement.defaultDurationSeconds || 60);
        }
    }
    setWaveNumber(prev => prev + 1); // Increment wave number after changing level

  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, setWavesDoneThisSession, setTotalRepsThisMovement, setWaveNumber, 
    setCurrentExerciseLevel, setCurrentWaveReps, toast, upArrowIconIsLock
  ]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetCurrentRepWave = () => {
    setCurrentWaveReps(0);
  }

  const handleTimerComplete = useCallback((timeAchieved: number) => {
    // This is called when "Log Wave X" is pressed in Timer component
    setTimeout(() => { // Defer state updates
        if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

        const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: timeAchieved };
        setWavesDoneThisSession(prev => [...prev, newWaveData]);
        setTotalDurationThisMovement(prev => prev + timeAchieved);

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
        const canLevelUpFurther = unlockedLevelForCategory < 10;
        const nextProgressionExists = movementCategory.progressions.some(
             p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased // Check for same type
        );

        if (durationNeededForUnlock && isAtUnlockEdge && timeAchieved >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExists) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          // unlockedLevelForCategory will be updated by the sync effect
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        } else {
            toast({ title: `Wave ${waveNumber} Logged`, description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
        }
        setWaveNumber(prev => prev + 1);
        setTimerKey(Date.now()); // Reset timer for next wave by changing its key
        setCurrentElapsedTime(0); // Reset for display consistency
    }, 0);
  }, [
      currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased,
      waveNumber, currentExerciseLevel, formatTime, toast // Added dependencies
    ]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
      setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if(currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
        setTimeout(() => { // Defer toast
            toast({
                title: "Session Target Reached!",
                description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
                variant: "default"
            });
        },0);
    }
  }, [currentMovementDetails, sessionFixedExerciseTypeIsRepBased, sessionTargetSeconds, formatTime, toast]);

  const handleTargetSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setSessionTargetSeconds(value);
    } else if (e.target.value === "") {
      setSessionTargetSeconds(0); // Or some other default like previous value
    }
  };

  // Determine if down arrow should be disabled
  const downArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  // Determine if up arrow should be disabled
  const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    if (sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock) return false; // If lock is showing, button should be "enabled" to show lock

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0) // Must be same type
      .sort((a, b) => a.level - b.level);
    
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1) return relevantProgressions.length === 0; // No relevant progressions means disabled

    // Check if there's a next higher level *of the same type* within unlocked range
    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            return false; // Found a higher, available level of the same type
        }
    }
    return true; // No higher, available level of the same type found
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails, upArrowIconIsLock]);


  const displayedCurrentRepsForTracker = totalRepsThisMovement + currentWaveReps;

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
          {sessionFixedExerciseTypeIsRepBased ?
            `Wave ${waveNumber}. Target: ${DEFAULT_TARGET_REPS} total reps for movement.` :
            (currentMovementDetails ? `${currentMovementDetails.name}. Wave ${waveNumber}. Session Target: ${formatTime(sessionTargetSeconds)}.` : `Wave ${waveNumber}`)
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Current Exercise & Level</Label>
          <div className="mb-2">
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChangeFromDropdown}
            />
          </div>
          
          {sessionFixedExerciseTypeIsRepBased && (
            <div className="flex items-center justify-center gap-2 mt-2">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleArrowLevelChange('down')}
                    disabled={downArrowDisabled}
                    aria-label="Decrease level and log wave"
                >
                <ChevronDown />
                </Button>
                <Button 
                    onClick={handleMovementComplete} 
                    variant="outline" 
                    size="icon" 
                    title="Finish this movement"
                    aria-label="Finish this movement"
                >
                    <CheckSquare className="h-5 w-5 text-primary" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleArrowLevelChange('up')}
                    disabled={upArrowDisabled}
                    aria-label="Increase level and log wave"
                >
                {sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock ? <Lock/> : <ChevronUp />}
                </Button>
            </div>
          )}
        </div>

        {sessionFixedExerciseTypeIsRepBased ? (
          <>
            <div>
              <Label htmlFor="rep-input" className="block mb-1 font-medium">Reps for Wave {waveNumber}</Label>
              <div className="flex items-center gap-2">
                <RepInput reps={currentWaveReps} onRepsChange={setCurrentWaveReps} />
                <Button variant="ghost" size="icon" onClick={resetCurrentRepWave} title="Reset reps for this wave">
                    <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            <TargetTracker currentReps={displayedCurrentRepsForTracker} targetReps={DEFAULT_TARGET_REPS} />
          </>
        ) : currentMovementDetails ? (
          <div className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="target-seconds-input" className="block font-medium">Set Session Target for Wave {waveNumber} (seconds)</Label>
                <div className="flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-muted-foreground" />
                    <Input
                        id="target-seconds-input"
                        type="number"
                        value={sessionTargetSeconds}
                        onChange={handleTargetSecondsChange}
                        min="0"
                        className="w-24"
                    />
                    <span className="text-muted-foreground">({formatTime(sessionTargetSeconds)})</span>
                </div>
            </div>
            <Timer
                key={timerKey}
                targetDuration={sessionTargetSeconds}
                onTimerComplete={handleTimerComplete}
                onTimeUpdate={handleTimerUpdate}
                onTargetReached={handleTimerTargetReached}
                autoStart={false}
                waveNumber={waveNumber}
            />
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            { !sessionFixedExerciseTypeIsRepBased &&
              <p className="text-sm text-muted-foreground text-center">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
            }
          </div>
        ) : (
             <p className="text-muted-foreground">Select an exercise to begin.</p>
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
        {!sessionFixedExerciseTypeIsRepBased && (
          <Button
            onClick={handleMovementComplete}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
          </Button>
        )}
         {sessionFixedExerciseTypeIsRepBased && wavesDoneThisSession.length === 0 && currentWaveReps === 0 && (
            <p className="text-sm text-muted-foreground w-full text-center">
                Perform reps and use arrows to log waves/change level, or click the <CheckSquare className="inline h-4 w-4 mx-1" /> button above to finish.
            </p>
         )}
         {sessionFixedExerciseTypeIsRepBased && (wavesDoneThisSession.length > 0 || currentWaveReps > 0) && (
            <p className="text-sm text-muted-foreground w-full text-center">
                Use arrows to log waves/change level, or click the <CheckSquare className="inline h-4 w-4 mx-1" /> button above to finish.
            </p>
         )}
      </CardFooter>
    </Card>
  );
}

