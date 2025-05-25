
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
import { ChevronDown, ChevronUp, CheckSquare, TimerIcon, Edit3, Lock } from 'lucide-react';
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

  useEffect(() => {
    // This effect runs when the movement category changes, or when initialUserLevel for this category is first provided.
    // It sets up the initial state for the session of this movement category.
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
  
    // Determine the starting exercise for the session
    let determinedStartingLevelAttempt = Math.max(1, globalCategoryUnlockedLevel - 2); // Default for rep-based Wave 1
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);
  
    // Fallback if the ideal starting level isn't found (e.g. if levels are sparse)
    if (!initialMovementForSession && globalCategoryUnlockedLevel > 0) {
      const availableProgressions = movementCategory.progressions
        .filter(p => p.level <= globalCategoryUnlockedLevel && p.level > 0)
        .sort((a, b) => b.level - a.level); // Get highest available unlocked
      if (availableProgressions.length > 0) {
        initialMovementForSession = availableProgressions[0];
        determinedStartingLevelAttempt = initialMovementForSession.level;
      }
    }
  
    // Further fallback: just pick the lowest level > 0 if nothing else found
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
      const sortedProgressions = movementCategory.progressions
        .filter(p => p.level > 0)
        .sort((a, b) => a.level - b.level);
      if (sortedProgressions.length > 0) {
        initialMovementForSession = sortedProgressions[0];
        determinedStartingLevelAttempt = initialMovementForSession.level;
      }
    }
  
    // Ultimate fallback: first progression defined (could be level 0)
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
      initialMovementForSession = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
      determinedStartingLevelAttempt = initialMovementForSession.level;
    }
  
    if (!initialMovementForSession) { // Should be very rare, implies empty progressions
      setCurrentExerciseLevel(1);
      setSessionFixedExerciseTypeIsRepBased(true);
      setSessionTargetSeconds(60);
    } else {
      const initialTypeIsRepBased = initialMovementForSession.isRepBased;
      if (initialTypeIsRepBased) {
         // For rep-based, Wave 1 starts two levels below current unlocked, min Lvl 1
        setCurrentExerciseLevel(Math.max(1, (userLevels[movementCategory.id] || 1) - 2));
      } else {
        // For time-based, start at the determined level
        setCurrentExerciseLevel(determinedStartingLevelAttempt);
        setSessionTargetSeconds(initialMovementForSession.defaultDurationSeconds || 60);
      }
      setSessionFixedExerciseTypeIsRepBased(initialTypeIsRepBased);
    }
  
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
    // Level-up hint and lock icon will be managed by the other useEffect
  
  }, [movementCategory, initialUserLevel]); // userLevels removed to prevent reset on level up
  
  useEffect(() => {
    // This effect syncs the local unlockedLevelForCategory with the global userLevels
    // without resetting the entire session progress.
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
      setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  useEffect(() => {
    // This effect manages level-up hints and the lock icon state.
    if (!currentMovementDetails || currentMovementDetails.level === 0) {
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }
  
    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10;
    const nextProgressionExists = movementCategory.progressions.some(
      p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
    );
  
    let hint = null;
    let showLock = false;
  
    if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
      if (sessionFixedExerciseTypeIsRepBased) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || DEFAULT_TARGET_REPS; // Fallback to default target
        hint = `${repsNeeded} reps at this level to unlock Lvl ${unlockedLevelForCategory + 1}.`;
        showLock = currentWaveReps < repsNeeded;
  
        // Auto-unlock if reps are met
        if (currentWaveReps >= repsNeeded && upArrowIconIsLock && !showLock) { // Check if it *was* locked and now isn't
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        }
      } else { // Time-based
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `Hold for ${formatTime(durationNeeded)} to unlock Lvl ${unlockedLevelForCategory + 1}.`;
        }
        // No lock icon for time-based arrow, unlock happens on logging sufficient time
      }
    }
  
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);
  
  }, [
    currentWaveReps,
    currentMovementDetails,
    unlockedLevelForCategory,
    sessionFixedExerciseTypeIsRepBased,
    movementCategory,
    updateUserLevel,
    upArrowIconIsLock, // Important: re-evaluate if lock state *was* true
    DEFAULT_TARGET_REPS // Added default target reps constant
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
      // If there are reps in the current input that haven't been logged by an arrow press, log them now.
      if (currentWaveReps > 0) { 
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;
      }
      if (finalWaves.length === 0 && finalTotalReps === 0) { // This checks if *any* reps were logged *at all* for this movement
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
      // If timer is running and has elapsed time, log it as the final wave segment
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
      // If the type changes, reset session progress (waves, totals)
      // because the nature of the work (reps vs time) has changed.
      if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now()); // Reset timer component fully
        if (!newTypeIsRepBased) { // If switching TO time-based
          setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
        }
      }
      setCurrentExerciseLevel(level);
      setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased); // Update the mode
    }
  };

  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) {
        toast({description: "Arrow level changes are for rep-based exercises."});
        return;
    }

    // Log the current wave's reps before changing level or wave number.
    // This ensures that any entered reps (even 0) are logged when an arrow is pressed.
    const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, waveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);
    
    const nextWaveNumber = waveNumber + 1;

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0) // Only rep-based, level > 0
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: `No other rep-based exercises available in this category. Reps for Lvl ${currentExerciseLevel} logged.` });
      setCurrentWaveReps(0); // Reset reps for "next" (non-existent) wave
      setWaveNumber(nextWaveNumber);
      return;
    }

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel; 

    if (direction === 'up') {
      if (upArrowIconIsLock) { // If lock is shown, user needs to meet rep target at current level
        const repsNeeded = currentMovementDetails.repsToUnlockNext || DEFAULT_TARGET_REPS;
        toast({ description: `You need ${repsNeeded} reps at Lvl ${currentExerciseLevel} to use this arrow for the next level. Your ${currentWaveReps} reps were logged for Lvl ${currentExerciseLevel}.` });
        setCurrentWaveReps(0);
        setWaveNumber(nextWaveNumber);
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
      if (!foundNext && currentIndex < relevantProgressions.length - 1 && relevantProgressions[currentIndex + 1].level > unlockedLevelForCategory) {
         toast({ description: `Next rep-based level (Lvl ${relevantProgressions[currentIndex + 1].level}) is not unlocked yet. Reps for Lvl ${currentExerciseLevel} logged.` });
      } else if (!foundNext && currentIndex === relevantProgressions.length -1) {
        toast({ description: `This is the highest currently available rep-based exercise up to your unlocked Lvl ${unlockedLevelForCategory}. Reps for Lvl ${currentExerciseLevel} logged.` });
      } else if (!foundNext) {
         // This case might occur if the only higher levels are of a different type, or somehow skipped.
         // Default to keeping current level if no valid next level is found.
         toast({ description: `No further rep-based progression available at or below Lvl ${unlockedLevelForCategory}. Reps for Lvl ${currentExerciseLevel} logged.` });
      }
    } else { // Direction is 'down'
      if (currentIndex > 0) {
        newLevelToDisplay = relevantProgressions[currentIndex - 1].level;
      } else {
        toast({ description: `This is the lowest rep-based exercise. Reps for Lvl ${currentExerciseLevel} logged.` });
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    setWaveNumber(nextWaveNumber);
    setCurrentWaveReps(0); // Reset reps for the new wave/level

  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, upArrowIconIsLock, updateUserLevel, DEFAULT_TARGET_REPS // Added DEFAULT_TARGET_REPS
  ]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setTimeout(() => { // Defer state updates to avoid issues
      if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

      const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: timeAchieved };
      setWavesDoneThisSession(prev => [...prev, newWaveData]);
      setTotalDurationThisMovement(prev => prev + timeAchieved);

      const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
      const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
      const canLevelUpFurther = unlockedLevelForCategory < 10;
      const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased // Check for next time-based
      );

      if (durationNeededForUnlock && isAtUnlockEdge && timeAchieved >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExists) {
        const newUnlockedLevel = unlockedLevelForCategory + 1;
        updateUserLevel(movementCategory.id, newUnlockedLevel);
        toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
      } else {
        toast({ title: `Wave ${waveNumber} Logged`, description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
      }
      setWaveNumber(prev => prev + 1);
      setTimerKey(Date.now()); // Reset timer for the next wave
      setCurrentElapsedTime(0); 
    }, 0);
  }, [
    currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased,
    waveNumber, currentExerciseLevel, 
  ]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
    setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if (currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
      setTimeout(() => { // Defer toast to avoid issues
        toast({
          title: "Session Target Reached!",
          description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
          variant: "default"
        });
      },0);
    }
  }, [currentMovementDetails, sessionFixedExerciseTypeIsRepBased, sessionTargetSeconds]);

  const handleTargetSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setSessionTargetSeconds(value);
    } else if (e.target.value === "") {
      setSessionTargetSeconds(0); // Or some minimum like 1 if 0 is not desired
    }
  };

  const downArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    // If lock is active, button is not "disabled" in the sense of functionality, but visually shows lock
    if (sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock) return false; 

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1) return relevantProgressions.length === 0; 

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
      if (relevantProgressions[i].level <= unlockedLevelForCategory) {
        return false; 
      }
    }
    return true; 
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails, upArrowIconIsLock]);

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
          {sessionFixedExerciseTypeIsRepBased ?
            `Exercise: Lvl ${currentExerciseLevel} - ${currentMovementDetails?.name || 'N/A'}. Overall Target: ${DEFAULT_TARGET_REPS} reps.` :
            (currentMovementDetails ? `${currentMovementDetails.name}. Wave ${waveNumber}. Session Target: ${formatTime(sessionTargetSeconds)}.` : `Wave ${waveNumber}`)
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Change Exercise & Level</Label>
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
                disabled={upArrowDisabled && !upArrowIconIsLock} // Disable if no higher level OR if lock is not active (means it's just a normal up arrow)
                aria-label="Increase level and log wave"
              >
                {sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock ? <Lock /> : <ChevronUp />}
              </Button>
            </div>
          )}
        </div>

        {sessionFixedExerciseTypeIsRepBased ? (
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
        ) : currentMovementDetails ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="target-seconds-input" className="block font-medium">Set Session Target for Wave {waveNumber} (seconds)</Label>
              <div className="flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-muted-foreground" />
                <ShadcnInput
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
              className="py-0"
            />
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            {!sessionFixedExerciseTypeIsRepBased &&
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
        {!sessionFixedExerciseTypeIsRepBased && ( // Only show this big button for time-based, rep-based uses icon button
          <Button
            onClick={handleMovementComplete}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
          </Button>
        )}
        {sessionFixedExerciseTypeIsRepBased && (
          <p className="text-sm text-muted-foreground w-full text-center">
            {(wavesDoneThisSession.length > 0 || currentWaveReps > 0) ? 
                `Use arrows to log waves & change level, or center button to finish.` :
                `Perform reps and use arrows or center button.`
            }
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

    