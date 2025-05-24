
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
  initialUserLevel: number; // This is effectively userLevels[category.id] || 1 from provider
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

  // Effect to initialize/reset states when the movementCategory prop changes
   useEffect(() => {
    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel);

    let determinedStartingLevelAttempt = Math.max(1, categoryUnlockedLevel); // Default to current unlocked
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);

    // Fallback logic if specific level not found (e.g. if levels are sparse)
    if (!initialMovementForSession && categoryUnlockedLevel > 0) {
        const availableProgressions = movementCategory.progressions
            .filter(p => p.level <= categoryUnlockedLevel && p.level > 0)
            .sort((a,b) => b.level - a.level); // highest unlocked first
        if (availableProgressions.length > 0) {
            initialMovementForSession = availableProgressions[0];
            determinedStartingLevelAttempt = initialMovementForSession.level;
        }
    }
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        // Absolute fallback to the lowest positive level progression if any exist
        const sortedProgressions = movementCategory.progressions
            .filter(p => p.level > 0)
            .sort((a,b) => a.level - b.level);
        if (sortedProgressions.length > 0) {
            initialMovementForSession = sortedProgressions[0];
            determinedStartingLevelAttempt = initialMovementForSession.level;
        }
    }
     if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        // Last resort: first progression defined (could be level 0)
        initialMovementForSession = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
        determinedStartingLevelAttempt = initialMovementForSession.level;
    }


    if (!initialMovementForSession) {
      setCurrentExerciseLevel(1);
      setSessionFixedExerciseTypeIsRepBased(true);
      setSessionTargetSeconds(60);
    } else {
      const initialTypeIsRepBased = initialMovementForSession.isRepBased;
      if (initialTypeIsRepBased) {
        // Wave 1 starting level: unlocked - 2 (min 1)
        setCurrentExerciseLevel(Math.max(1, categoryUnlockedLevel - 2));
      } else {
        // For time-based, use the determined starting level (usually the highest unlocked time-based)
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
  }, [movementCategory, userLevels]); // Using userLevels to re-calc if it changes for this category

  // Effect to sync local unlockedLevelForCategory with global userLevels from context (e.g., after level up)
  // This one does NOT reset the session progress.
  useEffect(() => {
    const globalCategoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (globalCategoryUnlockedLevel !== unlockedLevelForCategory) {
      setUnlockedLevelForCategory(globalCategoryUnlockedLevel);
    }
  }, [userLevels, movementCategory.id, unlockedLevelForCategory]);


  // Effect for automatic level-up and dynamic UI hints based on current exercise details
  useEffect(() => {
    if (!currentMovementDetails || currentMovementDetails.level === 0) {
      setLevelUpHintText(null);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentMovementDetails.level === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10; // Assuming 10 is max level

    if (sessionFixedExerciseTypeIsRepBased) {
      const repsNeededForUnlock = currentMovementDetails.repsToUnlockNext || 30;
      const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && p.isRepBased
      );

      if (isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
        setLevelUpHintText(`${repsNeededForUnlock} reps to unlock next level.`);
        const newUpArrowIconIsLock = currentWaveReps < repsNeededForUnlock;
        setUpArrowIconIsLock(newUpArrowIconIsLock);

        if (currentWaveReps >= repsNeededForUnlock && upArrowIconIsLock) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
          setUpArrowIconIsLock(false); // Unlock the icon immediately
        }
      } else {
        setLevelUpHintText(null);
        setUpArrowIconIsLock(false);
      }
    } else { // Time-based
       const durationNeededForUnlock = currentMovementDetails.durationToUnlockNext || currentMovementDetails.defaultDurationSeconds;
       const nextProgressionExists = movementCategory.progressions.some(
         p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased
       );
      if (durationNeededForUnlock && isAtUnlockEdge && canLevelUpFurther && nextProgressionExists) {
        setLevelUpHintText(`Hold for ${formatTime(durationNeededForUnlock)} to unlock next level.`);
      } else {
        setLevelUpHintText(null);
      }
      setUpArrowIconIsLock(false);
    }

  }, [
    currentWaveReps,
    currentMovementDetails,
    unlockedLevelForCategory,
    sessionFixedExerciseTypeIsRepBased,
    movementCategory,
    updateUserLevel,
    upArrowIconIsLock
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
      if (currentWaveReps > 0) { // Log pending reps for the current wave if any
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
    } else {
      if (currentElapsedTime > 0 && !wavesDoneThisSession.find(w => w.wave === waveNumber && w.durationSeconds === currentElapsedTime)) { // Log pending time
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
      if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
        // Reset progress if type changes (e.g., from rep to time)
        setWaveNumber(1);
        setWavesDoneThisSession([]);
        setCurrentWaveReps(0);
        setTotalRepsThisMovement(0);
        setCurrentElapsedTime(0);
        setTotalDurationThisMovement(0);
        setTimerKey(Date.now());
        if (!newTypeIsRepBased) {
          setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
        }
      }
      setCurrentExerciseLevel(level);
      // Update fixed type based on selection, but only if it's different from current.
      // This interaction could be complex if user switches types mid-session for a category.
      // For now, assuming sessionFixedExerciseTypeIsRepBased is set at category start and fixed.
      // Let's actually allow type switching via dropdown for flexibility.
      setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased);
    }
  };

  const handleArrowLevelChange = useCallback((direction: 'up' | 'down') => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) {
        toast({description: "Arrow level changes are for rep-based exercises."});
        return;
    }

    if (currentWaveReps <= 0) {
      toast({ title: "Log Reps First", description: "Please enter reps for the current wave before changing levels.", variant: "destructive" });
      return;
    }

    const waveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, waveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);
    setCurrentWaveReps(0);

    const nextWaveNumber = waveNumber + 1;

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    if (relevantProgressions.length === 0) {
      toast({ description: `No other rep-based exercises available in this category. Reps logged for current level.` });
      setWaveNumber(nextWaveNumber);
      return;
    }

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    let newLevelToDisplay = currentExerciseLevel; // Default to current level if no change

    if (direction === 'up') {
      if (upArrowIconIsLock) {
        const repsNeeded = currentMovementDetails.repsToUnlockNext || 30;
        toast({ description: `You need ${repsNeeded} reps at Lvl ${currentExerciseLevel} to use this arrow for the next level. Your reps were logged for Lvl ${currentExerciseLevel}.` });
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
      if (!foundNext && currentIndex < relevantProgressions.length -1 && relevantProgressions[currentIndex + 1].level > unlockedLevelForCategory) {
         toast({ description: `Next rep-based level (Lvl ${relevantProgressions[currentIndex + 1].level}) is not unlocked yet. Reps logged for Lvl ${currentExerciseLevel}.` });
      } else if (!foundNext) {
        toast({ description: `This is the highest currently available rep-based exercise up to your unlocked Lvl ${unlockedLevelForCategory}. Reps logged for Lvl ${currentExerciseLevel}.` });
      }
    } else { // direction 'down'
      if (currentIndex > 0) {
        newLevelToDisplay = relevantProgressions[currentIndex - 1].level;
      } else {
        toast({ description: `This is the lowest rep-based exercise. Reps logged for Lvl ${currentExerciseLevel}.` });
      }
    }
    
    // Apply wave-specific default levels
    const currentGlobalUnlockedLevel = userLevels[movementCategory.id] || 1;
    if (nextWaveNumber === 2) {
      // Wave 2 starts at the user's current unlocked level for the category (min 1)
      newLevelToDisplay = Math.max(1, currentGlobalUnlockedLevel);
    }
    // For Wave 1, the initial level is set in the main useEffect.
    // For Wave 3+, the level determined by the arrow (newLevelToDisplay) is used.

    setCurrentExerciseLevel(newLevelToDisplay);
    setWaveNumber(nextWaveNumber);

  }, [
    currentMovementDetails, sessionFixedExerciseTypeIsRepBased, currentWaveReps, currentExerciseLevel, waveNumber,
    movementCategory, unlockedLevelForCategory, upArrowIconIsLock, updateUserLevel, userLevels
  ]);


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
      const nextProgressionExists = movementCategory.progressions.some(
        p => p.level === unlockedLevelForCategory + 1 && !p.isRepBased
      );

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
    currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased,
    waveNumber, currentExerciseLevel,
  ]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
    setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if (currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
      setTimeout(() => {
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
      setSessionTargetSeconds(0);
    }
  };

  const downArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true;
    if (sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock) return false;

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased && p.level > 0)
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
    const remainingForOverallTarget = Math.max(0, DEFAULT_TARGET_REPS - (totalRepsThisMovement + currentWaveReps));
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
            `Current Exercise: Lvl ${currentExerciseLevel} - ${currentMovementDetails?.name || 'N/A'}. Overall Target: ${DEFAULT_TARGET_REPS} reps.` :
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
                disabled={upArrowDisabled && !upArrowIconIsLock}
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
        {!sessionFixedExerciseTypeIsRepBased && (
          <Button
            onClick={handleMovementComplete}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
          </Button>
        )}
        {sessionFixedExerciseTypeIsRepBased && (wavesDoneThisSession.length > 0 || currentWaveReps > 0) && (
          <p className="text-sm text-muted-foreground w-full text-center">
            Perform reps and use arrows to log waves/change level, or click the <CheckSquare className="inline h-4 w-4 mx-1" /> button to finish.
          </p>
        )}
         {sessionFixedExerciseTypeIsRepBased && wavesDoneThisSession.length === 0 && currentWaveReps === 0 && (
          <p className="text-sm text-muted-foreground w-full text-center">
            Perform reps and use arrows to log waves/change level, or click the <CheckSquare className="inline h-4 w-4 mx-1" /> button to finish.
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

