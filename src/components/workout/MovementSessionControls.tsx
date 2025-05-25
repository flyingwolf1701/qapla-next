
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { LevelSelector } from './LevelSelector';
import { RepInput } from './RepInput';
import { TargetTracker } from './TargetTracker';
import { Timer } from './Timer';
import type { MovementCategoryInfo, WaveData, WorkoutEntry, Movement } from '@/lib/types';
import { DEFAULT_TARGET_REPS } from '@/lib/types'; // LEVEL_UP_THRESHOLD_REPS removed as now from data
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
  initialUserLevel: number; // This is the global unlocked level for the category when the session starts
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  // State for the currently selected exercise details
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1); // The specific level of the exercise being performed
  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel); // Tracks the category's max unlocked level locally

  // Determines if the *current session segment* for this category is rep-based or time-based
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  // Wave and progress tracking
  const [waveNumber, setWaveNumber] = useState(1);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  // Rep-based specific state
  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);

  // Time-based specific state
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0); // Time elapsed in current timer run
  const [timerKey, setTimerKey] = useState(Date.now()); // Used to reset Timer component
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60); // User-configurable target for current timed wave
  const [totalDurationThisMovement, setTotalDurationThisMovement] = useState<number>(0); // Accumulated time from all logged timed waves

  // UI hints and icons
  const [levelUpHintText, setLevelUpHintText] = useState<string | null>(null);
  const [upArrowIconIsLock, setUpArrowIconIsLock] = useState(false);


  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  // Effect for initializing or resetting state when movementCategory changes
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(globalCategoryUnlockedLevel);

    let determinedStartingLevelAttempt = globalCategoryUnlockedLevel;
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);
    let isRepBasedForSession = initialMovementForSession?.isRepBased ?? true;

    // Determine if the session for this category should start as rep-based or time-based
    // Default to 2 levels below current unlocked, min level 1, preferring rep-based for some, time-based for others
    if (['push', 'legs', 'dips'].includes(movementCategory.id)) {
        determinedStartingLevelAttempt = Math.max(1, globalCategoryUnlockedLevel - 2);
        initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt && p.isRepBased);
        isRepBasedForSession = true; // Prioritize rep-based for these
    } else if (['pull', 'core'].includes(movementCategory.id)) {
        let timeBasedStartLevel = Math.max(1, globalCategoryUnlockedLevel - 2);
        let timeBasedInitial = movementCategory.progressions.find(p => p.level === timeBasedStartLevel && !p.isRepBased);
        if (timeBasedInitial) {
            initialMovementForSession = timeBasedInitial;
            determinedStartingLevelAttempt = timeBasedInitial.level;
            isRepBasedForSession = false;
        } else { // Fallback to rep-based if no suitable time-based found
            determinedStartingLevelAttempt = Math.max(1, globalCategoryUnlockedLevel - 2);
            initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt && p.isRepBased);
            isRepBasedForSession = true;
        }
    }

    // If no specific movement found with the above logic, find any valid starting point
    if (!initialMovementForSession) {
        const availableProgressions = movementCategory.progressions.filter(p => p.level > 0).sort((a,b) => a.level - b.level);
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
    // Include level 0 exercises if no other option and they exist
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

    // Reset progress for the new category
    setWaveNumber(1);
    setWavesDoneThisSession([]);
    setCurrentWaveReps(0);
    setTotalRepsThisMovement(0);
    setCurrentElapsedTime(0);
    setTotalDurationThisMovement(0);
    setTimerKey(Date.now());
    setLevelUpHintText(null);
    setUpArrowIconIsLock(false);

  }, [movementCategory, initialUserLevel]); // Removed userLevels from here to prevent full reset on level up

  // Effect to update local unlockedLevelForCategory when global userLevels change (e.g., after a level-up)
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
      setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  // Effect for level-up hints and lock icon (primarily for rep-based)
  useEffect(() => {
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
        const repsNeeded = currentMovementDetails.repsToUnlockNext || 30; // Fallback to 30
        hint = `${repsNeeded} reps to unlock next level`;
        showLock = currentWaveReps < repsNeeded;

        // Auto-unlock if reps met and lock was previously shown (meaning user just hit the target)
        if (!showLock && upArrowIconIsLock && currentWaveReps >= repsNeeded) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        }
      } else { // Time-based
        const durationNeeded = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        if (durationNeeded) {
          hint = `Hold for ${formatTime(durationNeeded)} to unlock next level`;
        }
        // Lock icon is not used for time-based up-arrow in the same way
      }
    }
    setLevelUpHintText(hint);
    setUpArrowIconIsLock(showLock);

  }, [
    currentWaveReps, currentElapsedTime, currentMovementDetails, unlockedLevelForCategory,
    sessionFixedExerciseTypeIsRepBased, movementCategory, updateUserLevel, upArrowIconIsLock
  ]);


  const handleMovementComplete = () => {
    if (!currentMovementDetails) {
      toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
      return;
    }

    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;
    let entry: WorkoutEntry;

    if (sessionFixedExerciseTypeIsRepBased) {
      if (currentWaveReps > 0) { // Log current reps if any
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalReps += currentWaveReps;
      }
      if (finalWaves.length === 0 && finalTotalReps === 0) { // Must have some progress
        toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
        return;
      }
      entry = {
        id: new Date().toISOString(), date: new Date().toISOString(), categoryName: movementCategory.name,
        movementName: currentMovementDetails.name,
        levelAchieved: Math.max(...finalWaves.map(w => w.level), finalWaves.length > 0 ? 1 : currentExerciseLevel), // Ensure levelAchieved is at least 1 or current selected
        totalReps: finalTotalReps, waves: finalWaves,
      };
    } else { // Time-based
      if (currentElapsedTime > 0) { // Log current timer time if any
        const lastWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
        finalWaves = [...finalWaves, lastWaveData];
        finalTotalDuration += currentElapsedTime;

        // Check level up on final segment log
        const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
        const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
        const canLevelUpFurther = unlockedLevelForCategory < 10;
        const nextProgressionExistsTime = movementCategory.progressions.some(p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased);
        if (durationNeededForUnlock && isAtUnlockEdge && currentElapsedTime >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExistsTime) {
            const newUnlockedLevel = unlockedLevelForCategory + 1;
            updateUserLevel(movementCategory.id, newUnlockedLevel);
            toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        }
      }
      if (finalWaves.length === 0 && finalTotalDuration === 0) { // Must have some progress
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
      // If type changes, reset progress for this new type within the same category session
      if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now()); // Reset timer
      }
      setCurrentExerciseLevel(level);
      setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased); // Update the "mode"
      if (!newTypeIsRepBased) { // If switched to time-based
        setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
        setTimerKey(Date.now()); // Ensure timer resets if already on time-based but different exercise
      }
    }
  };

  // Handles rep-based level changes using arrow buttons
  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) return;

    if (currentWaveReps <= 0) {
      toast({ title: "No Reps Entered", description: "Please enter some reps before logging the wave.", variant: "destructive" });
      return;
    }

    // Log current wave
    const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, waveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);

    // Check for level-up from this wave
    const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10;
    const nextProgressionExistsRep = movementCategory.progressions.some(p => p.level === unlockedLevelForCategory + 1 && p.isRepBased);

    if (isAtUnlockEdge && currentWaveReps >= repsNeededForUnlock && canLevelUpFurther && nextProgressionExistsRep) {
      // Unlock already handled by useEffect/upArrowIconIsLock logic, this is redundant here
      // but ensures toast if direct arrow press causes it. Usually, typing reps triggers it.
      if (!upArrowIconIsLock) { // if lock was already gone due to typing reps
          // const newUnlockedLevel = unlockedLevelForCategory + 1;
          // updateUserLevel(movementCategory.id, newUnlockedLevel); // Already done by useEffect
          // toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
      }
    }
    
    const nextWaveNumber = waveNumber + 1;
    
    // Determine next level based on arrow direction
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0) // Only rep-based, exclude level 0
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: `No other rep-based exercises. Reps for Lvl ${currentExerciseLevel} logged.` });
      setCurrentWaveReps(0); setWaveNumber(nextWaveNumber); return;
    }

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel;

    if (direction === 'up') {
      if (upArrowIconIsLock) { // Should not happen if currentWaveReps > 0, but as a safeguard
        toast({ description: `Need ${repsNeededForUnlock} reps at Lvl ${currentExerciseLevel} to unlock Lvl ${currentExerciseLevel + 1}. Current wave reps logged.` });
      } else {
        let foundNext = false;
        for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
          if (relevantProgressions[i].level <= unlockedLevelForCategory) { // Can only move to unlocked levels
            newLevelToDisplay = relevantProgressions[i].level; foundNext = true; break;
          }
        }
        if (!foundNext && newLevelToDisplay == currentExerciseLevel) { // Check if level actually changed
            toast({ description: `Highest unlocked rep-based level reached. Wave logged.` });
        }
      }
    } else { // direction 'down'
      let foundPrevious = false;
      for (let i = currentIndex - 1; i >= 0; i--) {
         if (relevantProgressions[i].level > 0) { // Ensure not going to level 0 via arrows
            newLevelToDisplay = relevantProgressions[i].level;
            foundPrevious = true;
            break;
         }
      }
      if (!foundPrevious && newLevelToDisplay == currentExerciseLevel) { // Check if level actually changed
         toast({ description: `Lowest rep-based exercise. Wave logged.` });
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    setWaveNumber(nextWaveNumber);
    setCurrentWaveReps(0); // Reset reps for the new wave/level

  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, upArrowIconIsLock, userLevels, updateUserLevel // Added userLevels and updateUserLevel
  ]);
  
  // Handles time-based level changes using arrow buttons
  const handleTimeBasedLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

    // If no time has been recorded for the current wave, do not log or advance level/wave.
    if (currentElapsedTime <= 0) {
      toast({ 
        title: "No Time Recorded", 
        description: "Timer has not run for the current wave. Start timer or select another exercise.", 
        variant: "destructive" 
      });
      return;
    }

    // Log the completed time for the current wave
    const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: currentElapsedTime };
    setWavesDoneThisSession(prev => [...prev, waveData]);
    setTotalDurationThisMovement(prev => prev + currentElapsedTime);

    // Check for level up based on this wave's performance
    const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10;
    const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased // Check for same type
    );

    if (durationNeededForUnlock && isAtUnlockEdge && currentElapsedTime >= durationNeededForUnlock && canLevelUpFurther && nextProgressionExists) {
      const newUnlockedLevel = unlockedLevelForCategory + 1;
      updateUserLevel(movementCategory.id, newUnlockedLevel);
      toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
    }

    // Increment wave number for the next attempt
    const nextWaveNumber = waveNumber + 1;
    setWaveNumber(nextWaveNumber);

    // Determine the next exercise level
    const relevantProgressions = movementCategory.progressions
      .filter(p => !p.isRepBased && p.level > 0) // Only time-based, exclude level 0
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: "No other time-based exercises in this category. Wave logged." });
      setCurrentElapsedTime(0);
      setTimerKey(Date.now()); // Reset timer for another attempt at the same level
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
      if (!foundNext && newLevelToDisplay === currentExerciseLevel) { 
         toast({ description: "Highest unlocked time-based level reached. Wave logged." });
      }
    } else { // direction 'down'
      let foundPrevious = false;
      for (let i = currentIndex - 1; i >= 0; i--) {
         if (relevantProgressions[i].level > 0) { 
            newLevelToDisplay = relevantProgressions[i].level;
            newMovementForLevel = relevantProgressions[i];
            foundPrevious = true;
            break;
         }
      }
      if (!foundPrevious && newLevelToDisplay === currentExerciseLevel) { 
         toast({ description: "Lowest time-based exercise reached. Wave logged." });
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    // Update target seconds based on the new level, or current if level didn't change
    const exerciseToSetTargetFor = newMovementForLevel || relevantProgressions.find(p => p.level === newLevelToDisplay);
    if (exerciseToSetTargetFor) {
        setSessionTargetSeconds(exerciseToSetTargetFor.defaultDurationSeconds || 60);
    }

    setCurrentElapsedTime(0); // Reset elapsed time for the new wave/level
    setTimerKey(Date.now()); // Reset timer
  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentElapsedTime, waveNumber, currentExerciseLevel,
    unlockedLevelForCategory, movementCategory.id, movementCategory.progressions, updateUserLevel // Removed userLevels, already covered by unlockedLevelForCategory
  ]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleTimerUpdate = useCallback((elapsed: number) => {
    setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if (currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
      setTimeout(() => { // Defer toast to avoid React update issues
        toast({
          title: "Session Target Reached!",
          description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
        });
      },0);
    }
  }, [currentMovementDetails, sessionFixedExerciseTypeIsRepBased, sessionTargetSeconds]);

  const handleTargetSecondsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setSessionTargetSeconds(value);
    } else if (e.target.value === "") {
      setSessionTargetSeconds(0); // Or some minimum like 5 seconds
    }
  };
  
  const adjustTargetSeconds = (amount: number) => {
    setSessionTargetSeconds(prev => Math.max(0, prev + amount));
  };


  // --- Memoized values for button disabled states ---
  const downArrowDisabled = useMemo(() => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) return true; // Should not be visible if not rep based
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) return true; // Should not be visible
    if (upArrowIconIsLock) return false; // If it's a lock, it means it's pressable to unlock (or should be once reps are met)

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1 || currentIndex === relevantProgressions.length -1) return true; // No higher levels or not found

    // Check if the next actual rep-based progression is beyond unlocked
    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].isRepBased) { // Ensure it's rep based
            return relevantProgressions[i].level > unlockedLevelForCategory; // Disabled if next is higher than unlocked
        }
    }
    return true; // If no further rep-based progression found
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
        if (!relevantProgressions[i].isRepBased) { // Ensure it's time based
            return relevantProgressions[i].level > unlockedLevelForCategory; // Disabled if next is higher than unlocked
        }
    }
    return true; // If no further time-based progression found
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
          {currentMovementDetails ? `Exercise: Lvl ${currentExerciseLevel} - ${currentMovementDetails.name}. ` : ''}
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
            // isRepBasedMode prop removed as LevelSelector now shows all based on unlockedLevel
          />
        </div>

        {/* Rep-Based Controls */}
        {sessionFixedExerciseTypeIsRepBased && currentMovementDetails && (
          <>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button variant="outline" size="icon" onClick={() => handleArrowLevelChange('down')} disabled={downArrowDisabled} aria-label="Previous Level & Log Wave">
                <ChevronDown />
              </Button>
              <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
                <CheckSquare className="h-5 w-5 text-primary" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => handleArrowLevelChange('up')} disabled={upArrowDisabled && !upArrowIconIsLock} aria-label="Next Level & Log Wave">
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

        {/* Time-Based Controls */}
        {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && (
          <div className="space-y-4">
             <div className="flex items-center justify-center gap-2 mt-2">
                <Button variant="outline" size="icon" onClick={() => handleTimeBasedLevelChange('down')} disabled={timeBasedDownArrowDisabled} aria-label="Previous Time-Based Level & Log Wave">
                    <ChevronDown />
                </Button>
                <Button onClick={handleMovementComplete} variant="outline" size="icon" title="Finish this movement" aria-label="Finish this movement">
                    <CheckSquare className="h-5 w-5 text-primary" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => handleTimeBasedLevelChange('up')} disabled={timeBasedUpArrowDisabled} aria-label="Next Time-Based Level & Log Wave">
                    <ChevronUp /> {/* Lock icon not typically used for time-based up arrow this way */}
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
              </div>
            </div>
            <Timer
              key={timerKey}
              targetDuration={sessionTargetSeconds} // Timer counts up towards this
              onTimeUpdate={handleTimerUpdate}
              onTargetReached={handleTimerTargetReached}
              autoStart={false}
              className="py-0"
              // waveNumber={waveNumber} // No longer needed by Timer itself
            />
            {levelUpHintText && <p className="text-xs text-muted-foreground text-center mt-1">{levelUpHintText}</p>}
            <p className="text-sm text-muted-foreground text-center">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
          </div>
        )}
        {/* Fallback if no movement details (e.g. category has no progressions of the selected type) */}
        {!currentMovementDetails && (
            <p className="text-muted-foreground text-center">
              {sessionFixedExerciseTypeIsRepBased ? "Select a rep-based exercise." : "Select a time-based exercise."}
            </p>
        )}


        {/* Logged Waves Display */}
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
            Use level arrows or ✓ to finish. Start/Pause timer for current wave.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

    