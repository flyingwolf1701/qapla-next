
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
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info, TimerIcon, Edit3, Lock } from 'lucide-react';
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

  // State for the currently selected exercise's level within this session component
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  // State for the user's overall unlocked level for this category (mirrors/derived from initialUserLevel and can be updated by level-ups)
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  // State to fix whether the current session for this movement is rep-based or time-based
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  const [waveNumber, setWaveNumber] = useState(1);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  // For rep-based
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);

  // For time-based
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0); // Tracks time from Timer's onTimeUpdate
  const [timerKey, setTimerKey] = useState(Date.now()); // Used to reset the Timer component
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60); // User-settable target for current timed wave
  const [totalDurationThisMovement, setTotalDurationThisMovement] = useState<number>(0); // Accumulates duration from logged timed waves


  const [levelUpHintText, setLevelUpHintText] = useState<string | null>(null);
  const [upArrowIconIsLock, setUpArrowIconIsLock] = useState(false);


  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  useEffect(() => {
    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel);

    // Determine initial exercise level for the session
    // Try to start 2 levels below unlocked, but not less than 1, and ensure it exists.
    let determinedStartingLevelAttempt = Math.max(1, categoryUnlockedLevel > 2 ? categoryUnlockedLevel - 2 : 1);
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);

    // If the -2 level doesn't exist (e.g. gaps in progression), try the unlocked level itself
    if (!initialMovementForSession) {
        initialMovementForSession = movementCategory.progressions.find(p => p.level === categoryUnlockedLevel);
    }
    // If still not found, find the lowest level > 0
    if (!initialMovementForSession) {
        initialMovementForSession = movementCategory.progressions
                                    .filter(p => p.level > 0)
                                    .sort((a,b) => a.level - b.level)[0];
    }
     // If still no positive level, take the first available (could be level 0)
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        initialMovementForSession = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
    }


    if (!initialMovementForSession) {
        console.error(`No valid progressions found for ${movementCategory.name}. Defaulting to rep-based Lvl 1.`);
        setCurrentExerciseLevel(1); // Fallback
        setSessionFixedExerciseTypeIsRepBased(true); // Fallback
        setSessionTargetSeconds(60); // Fallback for timer
    } else {
        setCurrentExerciseLevel(initialMovementForSession.level);
        const initialTypeIsRepBased = initialMovementForSession.isRepBased;
        setSessionFixedExerciseTypeIsRepBased(initialTypeIsRepBased);
        if (!initialTypeIsRepBased) {
            setSessionTargetSeconds(initialMovementForSession.defaultDurationSeconds || 60);
        }
    }

    // Reset session-specific states
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
    setLevelUpHintText(null);
    setUpArrowIconIsLock(false);

  }, [movementCategory, userLevels]); // Rerun if category or global unlocked level changes


  // Effect for automatic level-up and dynamic UI hints
  useEffect(() => {
    if (!currentMovementDetails || currentMovementDetails.level === 0) { // No hints for level 0
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentExerciseLevel === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Max level 10
    
    // Check if a next progression of the SAME type exists
    const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
    );

    if (sessionFixedExerciseTypeIsRepBased) {
        const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
        if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
            setLevelUpHintText(`${repsNeededForUnlock} reps to unlock next level.`);
            const newUpArrowIconIsLock = currentWaveReps < repsNeededForUnlock;
            setUpArrowIconIsLock(newUpArrowIconIsLock);

            if (currentWaveReps >= repsNeededForUnlock && !newUpArrowIconIsLock) { // Ensure lock was previously false or just turned false
                const newUnlockedLevel = unlockedLevelForCategory + 1;
                updateUserLevel(movementCategory.id, newUnlockedLevel);
                setUnlockedLevelForCategory(newUnlockedLevel); // Update local state immediately
                toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
                setLevelUpHintText(null); // Hide hint once leveled up
                setUpArrowIconIsLock(false); // Ensure lock icon is off
            }
        } else {
            setLevelUpHintText(null);
            setUpArrowIconIsLock(false);
        }
    } else { // Time-based
        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists && durationNeededForUnlock) {
             setLevelUpHintText(`${formatTime(durationNeededForUnlock)} to unlock next level (in one wave).`);
        } else {
            setLevelUpHintText(null);
        }
        setUpArrowIconIsLock(false); // No lock icon for time-based up arrow
    }

  }, [
    currentWaveReps, // For rep-based checks
    currentExerciseLevel,
    unlockedLevelForCategory,
    sessionFixedExerciseTypeIsRepBased,
    movementCategory,
    currentMovementDetails,
    updateUserLevel, // from context
    // totalDurationThisMovement and currentElapsedTime are not directly needed here, level up for time is in handleTimerComplete
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

    if (sessionFixedExerciseTypeIsRepBased) {
        if (currentWaveReps > 0) { // Log any unlogged reps from the current wave if "Done" is clicked
            const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
            finalWaves = [...finalWaves, lastWaveData];
            finalTotalReps += currentWaveReps;
        }
        if (finalWaves.length === 0 && finalTotalReps === 0) {
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
        // If timer is running and has time when "Done" is clicked, log it as the last wave segment.
        if (currentElapsedTime > 0 && !wavesDoneThisSession.find(w => w.wave === waveNumber && w.durationSeconds === currentElapsedTime)) {
             const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
             finalWaves = [...finalWaves, lastWaveData];
             finalTotalDuration += currentElapsedTime;
        }
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
        // If type changes, reset wave/rep/duration/timer states
        if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
            setWaveNumber(1);
            setWavesDoneThisSession([]);
            setCurrentWaveReps(0);
            setTotalRepsThisMovement(0);
            setCurrentElapsedTime(0);
            setTotalDurationThisMovement(0);
            setTimerKey(Date.now());
             if (!newTypeIsRepBased) { // Switching to time-based
                setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
            }
        }
        setCurrentExerciseLevel(level);
        setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased);
    }
  };

  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails) return;

    const repsForThisWave = currentWaveReps; // Capture before reset
    const levelOfThisWave = currentExerciseLevel;

    // Log current wave for rep-based if reps > 0
    if (sessionFixedExerciseTypeIsRepBased && repsForThisWave > 0) {
      const waveData: WaveData = { wave: waveNumber, level: levelOfThisWave, reps: repsForThisWave };
      setWavesDoneThisSession(prev => [...prev, waveData]);
      setTotalRepsThisMovement(prev => prev + repsForThisWave);
      setWaveNumber(prev => prev + 1);
      // Reps for current wave are now logged, reset for next potential wave input
      setCurrentWaveReps(0);
    } else if (!sessionFixedExerciseTypeIsRepBased) {
      // For time-based, arrows only change level. Wave logging is via Timer's button.
      // If timer is running and user changes level, we might want to reset timer or handle differently.
      // For now, changing level in time-based mode will also reset the timer via timerKey change.
      setTimerKey(Date.now());
      setCurrentElapsedTime(0); // Reset elapsed time display locally too
    }

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0) // Exclude level 0 from arrow cycling
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
        toast({description: `No other ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercises available in this category.`});
        if (sessionFixedExerciseTypeIsRepBased) setCurrentWaveReps(0); // Reset if stuck due to no other levels
        return;
    }
    
    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    let newLevelToDisplay = currentExerciseLevel;

    if (direction === 'up') {
        if (upArrowIconIsLock && sessionFixedExerciseTypeIsRepBased) { // Specific check for locked rep-based up arrow
            const repsNeeded = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
            toast({ description: `Log ${repsNeeded} reps at Lvl ${currentExerciseLevel} to use this level for the next wave or unlock the next level.` });
            return; // Don't change level, don't reset reps further.
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
        // Already at highest unlocked of this type or no higher types available up to unlocked level
         toast({ description: `This is the highest currently available ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise up to your unlocked Lvl ${unlockedLevelForCategory}.` });
        if (sessionFixedExerciseTypeIsRepBased) setCurrentWaveReps(0); // Reset for rep-based if no change.
        return;
      }
    } else { // direction 'down'
      if (currentIndex > 0) {
        newLevelToDisplay = relevantProgressions[currentIndex - 1].level;
      } else if (currentIndex === 0) { // Already at the lowest level > 0
        toast({ description: `This is the lowest ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise (excluding warm-ups).` });
        if (sessionFixedExerciseTypeIsRepBased) setCurrentWaveReps(0);
        return;
      } else { // currentIndex is -1, currentExerciseLevel might be 0 or not in relevantProgressions
        // This case should be rare if currentExerciseLevel is always from relevantProgressions
        newLevelToDisplay = relevantProgressions[0].level; // Go to the first relevant one
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    // For rep-based, currentWaveReps was already reset if reps were logged.
    // For time-based, timerKey change handles timer reset.
    // If switching to a new time-based exercise via arrows, update its target duration
    if(!sessionFixedExerciseTypeIsRepBased) {
        const newMovement = getMovementByLevel(movementCategory, newLevelToDisplay);
        if(newMovement) {
            setSessionTargetSeconds(newMovement.defaultDurationSeconds || 60);
        }
    }

  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, setUnlockedLevelForCategory, updateUserLevel,
    setWavesDoneThisSession, setTotalRepsThisMovement, setWaveNumber, setCurrentExerciseLevel,
    setCurrentWaveReps, toast, upArrowIconIsLock
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
    // This is called when "Log Wave X" is clicked in the Timer component
    setTimeout(() => {
        if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

        const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: timeAchieved };
        setWavesDoneThisSession(prev => [...prev, newWaveData]);
        setTotalDurationThisMovement(prev => prev + timeAchieved);

        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        const isAtUnlockEdge = currentExerciseLevel === unlockedLevelForCategory;
        const canLevelUpFurther = unlockedLevelForCategory < 10;
        const nextProgressionExists = movementCategory.progressions.some(
             p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
        );

        if (durationNeededForUnlock && isAtUnlockEdge && timeAchieved >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExists) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          setUnlockedLevelForCategory(newUnlockedLevel); // Update local state for immediate UI feedback
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
          setLevelUpHintText(null); // Hide hint
        } else {
            toast({ title: `Wave ${waveNumber} Logged`, description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
        }
        setWaveNumber(prev => prev + 1);
        setTimerKey(Date.now()); // Reset timer for next wave
        setCurrentElapsedTime(0); // Reset local elapsed time tracker
    }, 0);
  }, [
      currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased,
      waveNumber, currentExerciseLevel, formatTime, toast, setUnlockedLevelForCategory
    ]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
      setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if(currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
        setTimeout(() => { // Defer toast to avoid issues during render
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
    } else if (e.target.value === "") { // Allow empty input, treat as 0 or handle as needed
      setSessionTargetSeconds(0);
    }
  };

  const downArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0) // Exclude level 0
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails) return true;
    if (sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock) return false; // Clickable to show toast

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0) // Exclude level 0
      .sort((a, b) => a.level - b.level);
    
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1) return relevantProgressions.length === 0; // No relevant levels or current level is 0

    // Check if there's any higher level *of the same type* that is unlocked
    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            return false; // Found a higher, unlocked level of the same type
        }
    }
    // If no higher unlocked level of the same type is found
    return true;
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
          <div className="flex items-center gap-2">
            <Button
                variant="outline"
                size="icon"
                onClick={() => handleArrowLevelChange('down')}
                disabled={downArrowDisabled}
                aria-label="Decrease level and log wave"
            >
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChangeFromDropdown}
            />
            <Button
                variant="outline"
                size="icon"
                onClick={() => handleArrowLevelChange('up')}
                disabled={upArrowDisabled}
                aria-label="Increase level and log wave"
            >
              {sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock ? <Lock/> : <ChevronUp />}
            </Button>
            {sessionFixedExerciseTypeIsRepBased && (
                 <Button onClick={handleMovementComplete} variant="ghost" size="icon" title="Finish this movement">
                    <CheckSquare className="h-6 w-6 text-primary" />
                 </Button>
            )}
          </div>
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
                Perform reps and use arrows to log waves, or click <CheckSquare className="inline h-4 w-4 mx-1" /> above to finish.
            </p>
         )}
         {sessionFixedExerciseTypeIsRepBased && (wavesDoneThisSession.length > 0 || currentWaveReps > 0) && (
            <p className="text-sm text-muted-foreground w-full text-center">
                Use arrows to log waves and change level, or click <CheckSquare className="inline h-4 w-4 mx-1" /> above to finish.
            </p>
         )}
      </CardFooter>
    </Card>
  );
}

