
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
import { ChevronDown, ChevronUp, CheckSquare, TimerIcon, Lock, Minus, Plus, RotateCcw } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input as ShadcnInput } from '@/components/ui/input'; 
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // This is the global unlocked level for the category when the session starts
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  // Local state to track the unlocked level for this category, initialized by prop and updated by context changes
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel); 
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  const [waveNumber, setWaveNumber] = useState(1);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  // Rep-based state
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  
  // Time-based state
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0); // Time elapsed in current running timer
  const [timerKey, setTimerKey] = useState(Date.now()); // To force reset Timer component
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60); // User-set target for current timer
  const [totalDurationThisMovement, setTotalDurationThisMovement] = useState<number>(0); // Sum of all logged timed waves

  const [levelUpHintText, setLevelUpHintText] = useState<string | null>(null);
  const [upArrowIconIsLock, setUpArrowIconIsLock] = useState(false);

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);


  // Effect for initializing or resetting state ONLY when movementCategory or initialUserLevel prop changes
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1; // Get latest from context
    setUnlockedLevelForCategory(globalCategoryUnlockedLevel); // Sync local unlocked level

    // Determine initial exercise and type for the session
    let determinedStartingLevelAttempt = globalCategoryUnlockedLevel;
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);
    let isRepBasedForSession = initialMovementForSession?.isRepBased ?? true; // Default to rep if no movement found

    if (waveNumber === 1 && movementCategory.id === 'push' || movementCategory.id === 'legs' || movementCategory.id === 'dips') { // Common rep-based
        determinedStartingLevelAttempt = Math.max(1, globalCategoryUnlockedLevel - 2);
        initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt && p.isRepBased);
        if (initialMovementForSession) isRepBasedForSession = true;
    } else if (waveNumber === 1 && (movementCategory.id === 'pull' || movementCategory.id === 'core')) { // Categories that might start with time-based
        // Try to find a time-based exercise first at globalUnlocked-2 or globalUnlocked
        let timeBasedStartLevel = Math.max(1, globalCategoryUnlockedLevel -2);
        let timeBasedInitial = movementCategory.progressions.find(p => p.level === timeBasedStartLevel && !p.isRepBased);
        if (!timeBasedInitial) {
            timeBasedStartLevel = globalCategoryUnlockedLevel;
            timeBasedInitial = movementCategory.progressions.find(p => p.level === timeBasedStartLevel && !p.isRepBased);
        }

        if (timeBasedInitial) {
            initialMovementForSession = timeBasedInitial;
            determinedStartingLevelAttempt = timeBasedInitial.level;
            isRepBasedForSession = false;
        } else { // Fallback to rep-based if no suitable time-based found for start
            determinedStartingLevelAttempt = Math.max(1, globalCategoryUnlockedLevel - 2);
            initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt && p.isRepBased);
            if (initialMovementForSession) isRepBasedForSession = true;
        }
    }
    
    // Fallback if no specific initial movement found yet
    if (!initialMovementForSession) {
        const availableProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a, b) => a.level - b.level);
        if (availableProgressions.length > 0) {
            initialMovementForSession = availableProgressions.find(p => p.level === globalCategoryUnlockedLevel) ||
                                        availableProgressions.filter(p => p.level <= globalCategoryUnlockedLevel).pop() ||
                                        availableProgressions[0];
            if (initialMovementForSession) {
                determinedStartingLevelAttempt = initialMovementForSession.level;
                isRepBasedForSession = initialMovementForSession.isRepBased;
            }
        }
    }
    
    if (!initialMovementForSession && movementCategory.progressions.some(p => p.level === 0)) {
        initialMovementForSession = movementCategory.progressions.find(p => p.level === 0);
        if (initialMovementForSession) {
            determinedStartingLevelAttempt = 0;
            isRepBasedForSession = initialMovementForSession.isRepBased;
        }
    }
    
    setCurrentExerciseLevel(determinedStartingLevelAttempt);
    setSessionFixedExerciseTypeIsRepBased(isRepBasedForSession);
    if (!isRepBasedForSession && initialMovementForSession) {
        setSessionTargetSeconds(initialMovementForSession.defaultDurationSeconds || 60);
    }

    // Reset session progress states
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
    setLevelUpHintText(null);
    setUpArrowIconIsLock(false);

  }, [movementCategory, initialUserLevel]); // Removed userLevels from here

  // Effect to sync local unlockedLevelForCategory when global userLevels change (e.g., due to level up)
  // This effect does NOT reset other session progress.
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
      setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  // Effect for Level Up Hint and Lock Icon
  useEffect(() => {
    if (!currentMovementDetails || currentMovementDetails.level === 0) {
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Max level is 10
    
    let nextProgressionExists = false;
    if (sessionFixedExerciseTypeIsRepBased) {
        nextProgressionExists = movementCategory.progressions.some(
            p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
        );
    } else { // Time-based
        nextProgressionExists = movementCategory.progressions.some(
            p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased
        );
    }
    
    let hint = null;
    let showLockForRepBased = false;

    if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
      if (sessionFixedExerciseTypeIsRepBased) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
        hint = `${repsNeeded} reps to unlock next level`;
        showLockForRepBased = currentWaveReps < repsNeeded;

        // Auto-unlock logic for rep-based exercises
        if (currentWaveReps >= repsNeeded && upArrowIconIsLock && !showLockForRepBased) { 
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        }
      } else { // Time-based hint (based on default duration for level up)
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `${formatTime(durationNeeded)} to unlock next level`;
        }
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLockForRepBased);

  }, [
    currentWaveReps, currentElapsedTime,
    currentMovementDetails,
    unlockedLevelForCategory,
    sessionFixedExerciseTypeIsRepBased,
    movementCategory,
    updateUserLevel,
    upArrowIconIsLock, 
    LEVEL_UP_THRESHOLD_REPS 
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
      if (currentWaveReps > 0) { 
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;
      }
      if (finalWaves.length === 0 && finalTotalReps === 0) {
        toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
        return;
      }
      entry = {
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name,
        movementName: currentMovementDetails.name,
        levelAchieved: Math.max(...finalWaves.map(w => w.level), finalWaves.length > 0 ? 1 : currentExerciseLevel),
        totalReps: finalTotalReps, waves: finalWaves,
      };
    } else { 
      // If timer is running for time-based, log its currentElapsedTime as the final wave segment.
      if (currentElapsedTime > 0 && !wavesDoneThisSession.some(w => w.wave === waveNumber && w.durationSeconds === currentElapsedTime)) {
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalDuration += currentElapsedTime;
      }
      if (finalWaves.length === 0 && finalTotalDuration === 0) {
        toast({ title: "No Time Logged", description: "Please log some time before completing.", variant: "destructive" });
        return;
      }
      entry = {
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name,
        movementName: currentMovementDetails.name,
        levelAchieved: Math.max(...finalWaves.map(w => w.level), finalWaves.length > 0 ? 1 : currentExerciseLevel),
        durationSeconds: finalTotalDuration, waves: finalWaves,
      };
    }
    onMovementComplete(entry);
  };

  const handleExerciseLevelChangeFromDropdown = (level: number) => {
    const newMovementDetails = getMovementByLevel(movementCategory, level);
    if (newMovementDetails) {
      const newTypeIsRepBased = newMovementDetails.isRepBased;
      
      if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
        // Reset progress if fundamental type (rep vs time) changes via dropdown
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now()); 
      }
      setCurrentExerciseLevel(level);
      setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased); 
      if (!newTypeIsRepBased) {
          setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
          setTimerKey(Date.now()); // Also reset timer if new time-based exercise selected
      }
    }
  };

  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) return;

    if (currentWaveReps <= 0) {
      toast({ title: "No Reps Entered", description: "Please enter some reps before logging the wave.", variant: "destructive" });
      return;
    }

    const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, waveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);

    const nextWaveNumber = waveNumber + 1;
    
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0) 
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: `No other rep-based exercises. Reps for Lvl ${currentExerciseLevel} logged.` });
      setCurrentWaveReps(0); setWaveNumber(nextWaveNumber); return;
    }

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel;

    if (direction === 'up') {
      if (upArrowIconIsLock) { 
        const repsNeeded = currentMovementDetails.repsToUnlockNext || LEVEL_UP_THRESHOLD_REPS;
        toast({ description: `Need ${repsNeeded} reps at Lvl ${currentExerciseLevel} to unlock Lvl ${currentExerciseLevel + 1}. Current wave reps logged.` });
      } else { 
        let foundNext = false;
        for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
          if (relevantProgressions[i].level <= unlockedLevelForCategory) { 
            newLevelToDisplay = relevantProgressions[i].level; foundNext = true; break;
          }
        }
        if (!foundNext) toast({ description: `Highest unlocked rep-based level reached. Reps logged.` });
      }
    } else { // down
      let foundPrevious = false;
      for (let i = currentIndex - 1; i >= 0; i--) {
        if (relevantProgressions[i].level > 0) { // Ensure we don't go to level 0 unless explicitly selected
            newLevelToDisplay = relevantProgressions[i].level;
            foundPrevious = true;
            break;
        }
      }
      if (!foundPrevious) toast({ description: `Lowest rep-based exercise. Reps logged.` });
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    setWaveNumber(nextWaveNumber);
    setCurrentWaveReps(0);
  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, upArrowIconIsLock, LEVEL_UP_THRESHOLD_REPS, userLevels
  ]);
  
  const handleTimeBasedLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

    const relevantProgressions = movementCategory.progressions
      .filter(p => !p.isRepBased && p.level > 0) 
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: "No other time-based exercises in this category." });
      return;
    }

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel;
    let newMovementForLevel: Movement | undefined = undefined;

    if (direction === 'up') {
      let foundNext = false;
      for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
          newLevelToDisplay = relevantProgressions[i].level;
          newMovementForLevel = relevantProgressions[i];
          foundNext = true;
          break;
        }
      }
      if (!foundNext) toast({ description: "Highest unlocked time-based level reached." });
    } else { // 'down'
      let foundPrevious = false;
        for (let i = currentIndex - 1; i >= 0; i--) {
            if (relevantProgressions[i].level > 0) { // Ensure we don't go to level 0
                newLevelToDisplay = relevantProgressions[i].level;
                newMovementForLevel = relevantProgressions[i];
                foundPrevious = true;
                break;
            }
        }
      if (!foundPrevious) toast({ description: "Lowest time-based exercise reached." });
    }

    if (newLevelToDisplay !== currentExerciseLevel && newMovementForLevel) {
      setCurrentExerciseLevel(newLevelToDisplay);
      setSessionTargetSeconds(newMovementForLevel.defaultDurationSeconds || 60);
      setTimerKey(Date.now()); 
    }
  }, [currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentExerciseLevel, movementCategory, unlockedLevelForCategory]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setTimeout(() => {
      if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

      const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: timeAchieved };
      setWavesDoneThisSession(prev => [...prev, newWaveData]);
      setTotalDurationThisMovement(prev => prev + timeAchieved);

      const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
      const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
      const canLevelUpFurther = unlockedLevelForCategory < 10;
      const nextProgressionExists = movementCategory.progressions.some(p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased);

      if (durationNeededForUnlock && isAtUnlockEdge && timeAchieved >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExists) {
        const newUnlockedLevel = unlockedLevelForCategory + 1;
        updateUserLevel(movementCategory.id, newUnlockedLevel);
        toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
      } else {
        toast({ title: `Wave ${waveNumber} Logged`, description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
      }
      setWaveNumber(prev => prev + 1);
      setTimerKey(Date.now()); 
      setCurrentElapsedTime(0); 
    }, 0);
  }, [
    currentMovementDetails, unlockedLevelForCategory, movementCategory.id, movementCategory.name, movementCategory.progressions,
    updateUserLevel, sessionFixedExerciseTypeIsRepBased, waveNumber, currentExerciseLevel,
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
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true; // Should not be active for time-based
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true; // Should not be active for time-based
    if (upArrowIconIsLock) return false; 

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1 || currentIndex === relevantProgressions.length -1) return true; 

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].isRepBased) { 
            return relevantProgressions[i].level > unlockedLevelForCategory;
        }
    }
    return true; 
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails, upArrowIconIsLock]);


  const timeBasedDownArrowDisabled = useMemo(() => {
    if (sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => !p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  },[currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const timeBasedUpArrowDisabled = useMemo(() => {
    if (sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => !p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1 || currentIndex === relevantProgressions.length - 1) return true;

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (!relevantProgressions[i].isRepBased) { 
            return relevantProgressions[i].level > unlockedLevelForCategory;
        }
    }
    return true; 
  },[currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);


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
          {currentMovementDetails ? 
            `Exercise: Lvl ${currentExerciseLevel} - ${currentMovementDetails.name}. ` : ''}
          {sessionFixedExerciseTypeIsRepBased ? 
            `Overall Target: ${DEFAULT_TARGET_REPS} reps.` : 
            (currentMovementDetails ? `Current Wave ${waveNumber}.` : '') 
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
            // Pass fixed type to level selector to restrict options if needed, or let it show all
            // For now, LevelSelector shows all unlocked by default based on previous changes
          />
        </div>

        {sessionFixedExerciseTypeIsRepBased && (
          <>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button variant="outline" size="icon" onClick={() => handleArrowLevelChange('down')} disabled={downArrowDisabled} aria-label="Previous Level">
                <ChevronDown />
              </Button>
              <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
                <CheckSquare className="h-5 w-5 text-primary" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleArrowLevelChange('up')} disabled={upArrowDisabled} aria-label="Next Level">
                {upArrowIconIsLock ? <Lock /> : <ChevronUp />}
              </Button>
            </div>
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

        {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && (
          <div className="space-y-4">
             <div className="flex items-center justify-center gap-2 mt-2">
                <Button variant="outline" size="icon" onClick={() => handleTimeBasedLevelChange('down')} disabled={timeBasedDownArrowDisabled} aria-label="Previous Time-Based Level">
                    <ChevronDown />
                </Button>
                <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
                    <CheckSquare className="h-5 w-5 text-primary" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleTimeBasedLevelChange('up')} disabled={timeBasedUpArrowDisabled} aria-label="Next Time-Based Level">
                    <ChevronUp />
                </Button>
            </div>
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
                {/* Removed: <span className="text-muted-foreground">({formatTime(sessionTargetSeconds)})</span> */}
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
            <p className="text-sm text-muted-foreground text-center">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
          </div>
        )}
        {!currentMovementDetails && !sessionFixedExerciseTypeIsRepBased && (
            <p className="text-muted-foreground text-center">Select a time-based exercise to begin.</p>
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
         {sessionFixedExerciseTypeIsRepBased ? (
          <p className="text-sm text-muted-foreground w-full text-center">
            {(totalRepsThisMovement > 0 || currentWaveReps > 0) ?
                `Use arrows to log waves & change level, or ✓ to finish.` :
                `Perform reps and use arrows or ✓ button.`
            }
          </p>
        ) : (
           <p className="text-sm text-muted-foreground w-full text-center">
            Use level arrows or Log Wave. Finish with ✓ button above.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}
