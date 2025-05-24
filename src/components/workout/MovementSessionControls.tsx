
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
import { getMovementByLevel } from '@/data/movements';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info, TimerIcon, Edit3, Lock } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number;
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1);
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  const [waveNumber, setWaveNumber] = useState(1);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);

  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60);
  const [totalDurationThisMovement, setTotalDurationThisMovement] = useState<number>(0);

  const [showLevelUpHint, setShowLevelUpHint] = useState(false);
  const [levelUpHintText, setLevelUpHintText] = useState("");
  const [upArrowIconIsLock, setUpArrowIconIsLock] = useState(false);


  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  useEffect(() => {
    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel);

    let determinedStartingLevelAttempt = Math.max(1, categoryUnlockedLevel > 2 ? categoryUnlockedLevel - 2 : 1);
    let initialMovementForSession = movementCategory.progressions.find(p => p.level === determinedStartingLevelAttempt);

    if (!initialMovementForSession) {
        initialMovementForSession = movementCategory.progressions
                                    .filter(p => p.level > 0)
                                    .sort((a,b) => a.level - b.level)[0];
    }
    if (!initialMovementForSession && movementCategory.progressions.length > 0) {
        initialMovementForSession = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
    }

    if (!initialMovementForSession) {
        console.error(`No valid progressions found for ${movementCategory.name}`);
        setSessionFixedExerciseTypeIsRepBased(true);
        setCurrentExerciseLevel(1);
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

  }, [movementCategory, userLevels]);


  // Effect for automatic level-up and dynamic UI hints for rep-based exercises
  useEffect(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) {
      setShowLevelUpHint(false);
      setUpArrowIconIsLock(false);
      return;
    }

    const isAtUnlockEdge = currentExerciseLevel === unlockedLevelForCategory;
    const canLevelUpFurther = unlockedLevelForCategory < 10;
    const nextProgression = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory + 1);

    if (isAtUnlockEdge && canLevelUpFurther && nextProgression) {
      setShowLevelUpHint(true);
      const nextLevelName = nextProgression.name;
      setLevelUpHintText(`Log ${LEVEL_UP_THRESHOLD_REPS} reps at Lvl ${currentExerciseLevel} (${currentMovementDetails.name}) to unlock Lvl ${unlockedLevelForCategory + 1} (${nextLevelName}).`);
      
      if (currentWaveReps >= LEVEL_UP_THRESHOLD_REPS) {
        setUpArrowIconIsLock(false);
        // Auto-level up
        const newUnlockedLevel = unlockedLevelForCategory + 1;
        updateUserLevel(movementCategory.id, newUnlockedLevel);
        setUnlockedLevelForCategory(newUnlockedLevel); // Update local state immediately
        toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        setShowLevelUpHint(false); // Hide hint once leveled up
      } else {
        setUpArrowIconIsLock(true);
      }
    } else {
      setShowLevelUpHint(false);
      setUpArrowIconIsLock(false);
    }

  }, [
    currentWaveReps, 
    currentExerciseLevel, 
    unlockedLevelForCategory, 
    sessionFixedExerciseTypeIsRepBased, 
    movementCategory.id, 
    movementCategory.progressions, 
    updateUserLevel,
    currentMovementDetails
  ]);


  const handleCompleteMovement = () => {
    if (!currentMovementDetails) {
        toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
        return;
    }

    let entry: WorkoutEntry;
    let finalWaves = [...wavesDoneThisSession];
    let finalTotalReps = totalRepsThisMovement;
    let finalTotalDuration = totalDurationThisMovement;

    if (sessionFixedExerciseTypeIsRepBased) {
        if (currentWaveReps > 0) { // Log any unlogged reps from the current wave
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
        if (currentElapsedTime > 0) { // Log current timer if it has time and wasn't already logged as a full wave
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
        setCurrentExerciseLevel(level);
        const newTypeIsRepBased = newMovementDetails.isRepBased;
        if (sessionFixedExerciseTypeIsRepBased !== newTypeIsRepBased) {
            setSessionFixedExerciseTypeIsRepBased(newTypeIsRepBased);
            setWaveNumber(1);
            setWavesDoneThisSession([]);
            setCurrentWaveReps(0);
            setTotalRepsThisMovement(0);
            setCurrentElapsedTime(0);
            setTotalDurationThisMovement(0);
            if (!newTypeIsRepBased) {
                setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
            }
        }
        setTimerKey(Date.now());
    }
  };

  const handleArrowLevelChange = (direction: 'up' | 'down') => {
    if (!currentMovementDetails) return;

    const repsForThisWave = currentWaveReps;
    const levelOfThisWave = currentExerciseLevel;

    // Log current wave if rep-based and reps > 0
    if (sessionFixedExerciseTypeIsRepBased && repsForThisWave > 0) {
      const waveData: WaveData = { wave: waveNumber, level: levelOfThisWave, reps: repsForThisWave };
      setWavesDoneThisSession(prev => [...prev, waveData]);
      setTotalRepsThisMovement(prev => prev + repsForThisWave);
      setWaveNumber(prev => prev + 1);
    } else if (!sessionFixedExerciseTypeIsRepBased) {
        // For time-based, arrow keys just change level, wave logging is via Timer's button
    }


    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    let currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1 && relevantProgressions.length > 0) { // If current level is 0 or not in the filtered list
        currentIndex = direction === 'up' ? -1 : 0; // Start from beginning if going up, or stay if going down from an odd state
    }


    let newLevelToDisplay = currentExerciseLevel;

    if (direction === 'up') {
      let foundNext = false;
      for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
          newLevelToDisplay = relevantProgressions[i].level;
          foundNext = true;
          break;
        }
      }
      if (!foundNext) {
        // If already at highest unlocked of this type, or trying to go past it without reps
        if (currentExerciseLevel === unlockedLevelForCategory && unlockedLevelForCategory < 10 && sessionFixedExerciseTypeIsRepBased && !upArrowIconIsLock) {
            // This case implies they just unlocked the next level by reps, so try to select it
             const justUnlocked = movementCategory.progressions.find(p => p.level === unlockedLevelForCategory && p.isRepBased === sessionFixedExerciseTypeIsRepBased);
             if (justUnlocked) newLevelToDisplay = justUnlocked.level;

        } else if (currentExerciseLevel === unlockedLevelForCategory && unlockedLevelForCategory < 10 && sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock) {
            toast({ description: `Log ${LEVEL_UP_THRESHOLD_REPS} reps at Lvl ${currentExerciseLevel} to use this level for the next wave or unlock the next level.` });
            return; // Don't change level, don't reset reps.
        } else {
            toast({ description: `This is the highest currently available ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise up to your unlocked Lvl ${unlockedLevelForCategory}.` });
            // For rep-based, we don't reset reps here if no level change, as they might be trying to hit threshold
            if (!sessionFixedExerciseTypeIsRepBased) setCurrentWaveReps(0); // Reset for time-based if no change.
            return;
        }
      }
    } else { // direction 'down'
      if (currentIndex > 0) {
        newLevelToDisplay = relevantProgressions[currentIndex - 1].level;
      } else {
        toast({ description: `This is the lowest ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise.` });
        if (!sessionFixedExerciseTypeIsRepBased) setCurrentWaveReps(0);
        return;
      }
    }
    
    setCurrentExerciseLevel(newLevelToDisplay);
    if(sessionFixedExerciseTypeIsRepBased) { // Only reset reps for rep-based. Timed is handled by timerKey.
      setCurrentWaveReps(0);
    }
  };


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetCurrentRepWave = () => {
    setCurrentWaveReps(0);
  }

  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setTimeout(() => {
        if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

        const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, durationSeconds: timeAchieved };
        setWavesDoneThisSession(prev => [...prev, newWaveData]);
        setTotalDurationThisMovement(prev => prev + timeAchieved);

        const milestoneDuration = currentMovementDetails.defaultDurationSeconds || 0;

        if (milestoneDuration > 0 &&
            currentExerciseLevel === unlockedLevelForCategory &&
            timeAchieved >= milestoneDuration &&
            unlockedLevelForCategory < 10 &&
            movementCategory.progressions.some(p => p.level === unlockedLevelForCategory + 1 && p.isRepBased === sessionFixedExerciseTypeIsRepBased)
            ) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          setUnlockedLevelForCategory(newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Lvl ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        } else {
            toast({ title: `Wave ${waveNumber} Logged`, description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
        }
        setWaveNumber(prev => prev + 1);
        setTimerKey(Date.now());
        setCurrentElapsedTime(0);
    }, 0);
  }, [currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased, waveNumber, currentExerciseLevel, formatTime]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
      setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if(currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
        setTimeout(() => {
            toast({
                title: "Session Target Reached!",
                description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
                variant: "default"
            });
        },0);
    }
  }, [currentMovementDetails, sessionFixedExerciseTypeIsRepBased, sessionTargetSeconds, formatTime]);

  const handleTargetSecondsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 0) {
      setSessionTargetSeconds(value);
    } else if (e.target.value === "") {
      setSessionTargetSeconds(0);
    }
  };

  const downArrowDisabled = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased && !currentMovementDetails) return true;
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);

  const upArrowDisabledRepBased = useMemo(() => {
    if (!sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true; //Should be true if not rep based for this specific memo
    
    // If lock icon is shown, it means they are at edge but haven't met reps, effectively "disabled" for normal progression by arrow
    if (upArrowIconIsLock) return false; // The button is active, but shows a lock. Clicking it has special behavior (toast). Or should it be true? Let's make it false so it's clickable.

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 && relevantProgressions.length > 0) return false; 
    if (currentIndex === -1) return true;

    // Check if there's any higher level unlocked
    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            return false;
        }
    }
    // If current level is already the highest unlocked or no higher progressions exist
    return currentExerciseLevel >= unlockedLevelForCategory || currentIndex === relevantProgressions.length - 1 ;
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails, upArrowIconIsLock]);


  const upArrowDisabledTimeBased = useMemo(() => {
    if (sessionFixedExerciseTypeIsRepBased || !currentMovementDetails) return true; // Should be true if rep based for this specific memo

    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1 && relevantProgressions.length > 0) return false;
    if (currentIndex === -1) return true; 

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            return false;
        }
    }
    return true;
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased, currentMovementDetails]);


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
          {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails?.defaultDurationSeconds && currentMovementDetails.level > 0 && (
            <span className="block text-xs text-muted-foreground">(Level-up milestone for Lvl {currentMovementDetails.level}: {formatTime(currentMovementDetails.defaultDurationSeconds)} in one wave)</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sessionFixedExerciseTypeIsRepBased && showLevelUpHint && (
            <Alert variant="default" className="bg-accent/20 border-accent">
                 <Info className="h-4 w-4 text-accent-foreground" />
                <AlertTitle className="text-accent-foreground">Unlock Next Level</AlertTitle>
                <AlertDescription className="text-accent-foreground/80">
                    {levelUpHintText}
                </AlertDescription>
            </Alert>
        )}
        {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && currentMovementDetails.level === 0 && (
             <Alert variant="default" className="bg-accent/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Warm-up/Special Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Wave {waveNumber}. Session Target: {formatTime(sessionTargetSeconds)}.
                </AlertDescription>
            </Alert>
        )}
         {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && currentMovementDetails.level > 0 && (
             <Alert variant="default" className="bg-accent/30">
                <TimerIcon className="h-4 w-4" />
                <AlertTitle>Time-Based Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Wave {waveNumber}. Session Target: {formatTime(sessionTargetSeconds)}.
                    {currentMovementDetails.defaultDurationSeconds &&
                     <span className="block text-xs">Level-up milestone for Lvl {currentMovementDetails.level}: {formatTime(currentMovementDetails.defaultDurationSeconds)} in one wave.</span>
                    }
                </AlertDescription>
            </Alert>
        )}

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
                disabled={sessionFixedExerciseTypeIsRepBased ? upArrowDisabledRepBased && !upArrowIconIsLock : upArrowDisabledTimeBased}
                aria-label="Increase level and log wave"
            >
              {sessionFixedExerciseTypeIsRepBased && upArrowIconIsLock ? <Lock/> : <ChevronUp />}
            </Button>
            {sessionFixedExerciseTypeIsRepBased && (
                 <Button onClick={handleCompleteMovement} variant="ghost" size="icon" title="Finish this movement">
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
            <TargetTracker currentReps={totalRepsThisMovement + currentWaveReps} targetReps={DEFAULT_TARGET_REPS} />
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
            { !sessionFixedExerciseTypeIsRepBased &&
              <p className="text-sm text-muted-foreground">Total time this movement: {formatTime(totalDurationThisMovement + currentElapsedTime)}</p>
            }
          </div>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Exercise Configuration Error</AlertTitle>
                <AlertDescription>This time-based exercise is missing a target duration or details. Please check movement data.</AlertDescription>
            </Alert>
        )}

        {wavesDoneThisSession.length > 0 && (
            <div>
            <h4 className="font-medium mb-2">Logged Waves this Session:</h4>
            <ScrollArea className="h-[120px] border rounded-md p-2 bg-muted/30">
                <ul className="space-y-1 text-sm">
                {wavesDoneThisSession.map((wave, index) => (
                    <li key={index} className="flex justify-between">
                    <span>
                        Wave {wave.wave}: Lvl {wave.level} ({getMovementByLevel(movementCategory, wave.level)?.name})
                        {wave.reps !== undefined && ` - ${wave.reps} reps`}
                        {wave.durationSeconds !== undefined && ` - ${formatTime(wave.durationSeconds)}`}
                    </span>
                    </li>
                ))}
                </ul>
            </ScrollArea>
            </div>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
        {!sessionFixedExerciseTypeIsRepBased && ( // Only show this footer button for time-based
          <Button
            onClick={handleCompleteMovement}
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
          </Button>
        )}
         {sessionFixedExerciseTypeIsRepBased && wavesDoneThisSession.length > 0 && (
            <p className="text-sm text-muted-foreground w-full text-center">
                Press the <CheckSquare className="inline h-4 w-4 mx-1" /> button above to finish this movement.
            </p>
         )}
      </CardFooter>
    </Card>
  );
}
