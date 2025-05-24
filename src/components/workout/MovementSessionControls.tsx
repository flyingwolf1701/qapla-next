
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
import { ChevronDown, ChevronUp, CheckSquare, RotateCcw, Info, TimerIcon, Edit3 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface MovementSessionControlsProps {
  movementCategory: MovementCategoryInfo;
  initialUserLevel: number; // This is userLevels[category.id]
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1); // Initialized in useEffect
  
  // State to determine if the current session for this category is rep-based or time-based. Fixed once set.
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [waveNumber, setWaveNumber] = useState(1);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60); // Default for time-based

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  useEffect(() => {
    setUnlockedLevelForCategory(userLevels[movementCategory.id] || 1);
  }, [userLevels, movementCategory.id]);

  useEffect(() => {
    // This effect establishes the mode (rep/time) for the current category's session
    // and resets state when the category or its initialUserLevel (from provider) changes.

    const startingLevelForSession = Math.max(1, initialUserLevel > 0 ? initialUserLevel - 2 : 1);
    const initialMovement = getMovementByLevel(movementCategory, startingLevelForSession);

    if (initialMovement) {
      setSessionFixedExerciseTypeIsRepBased(initialMovement.isRepBased);
      if (!initialMovement.isRepBased) {
        setSessionTargetSeconds(initialMovement.defaultDurationSeconds || 60);
      }
    } else {
      const firstProgression = movementCategory.progressions.find(p => p.level > 0) || movementCategory.progressions[0];
      if (firstProgression) {
        setSessionFixedExerciseTypeIsRepBased(firstProgression.isRepBased);
        if (!firstProgression.isRepBased) {
          setSessionTargetSeconds(firstProgression.defaultDurationSeconds || 60);
        }
      }
    }

    setCurrentExerciseLevel(startingLevelForSession);

    // Reset all session-specific progress for this category
    setCurrentWaveReps(0);
    setWaveNumber(1);
    setTotalRepsThisMovement(0);
    setWavesDoneThisSession([]);
    setCompletedDuration(null);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now()); 

  }, [movementCategory, initialUserLevel]);


  const handleLogWave = () => {
    if (!currentMovementDetails || !sessionFixedExerciseTypeIsRepBased) {
      toast({ title: "Cannot Log Wave", description: "This exercise is not rep-based or level not found.", variant: "destructive" });
      return;
    }
    if (currentWaveReps <= 0) {
      toast({ title: "Invalid Reps", description: "Please enter a positive number of reps.", variant: "destructive" });
      return;
    }

    const newWaveData: WaveData = { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps };
    setWavesDoneThisSession(prev => [...prev, newWaveData]);
    setTotalRepsThisMovement(prev => prev + currentWaveReps);
    
    const repsAtUnlockedLevel = [...wavesDoneThisSession, newWaveData]
      .filter(wave => wave.level === unlockedLevelForCategory)
      .reduce((sum, wave) => sum + wave.reps, 0);

    if (repsAtUnlockedLevel >= LEVEL_UP_THRESHOLD_REPS && unlockedLevelForCategory < 10 && movementCategory.progressions.some(p => p.level > unlockedLevelForCategory && p.isRepBased === sessionFixedExerciseTypeIsRepBased)) {
      const newUnlockedLevel = unlockedLevelForCategory + 1;
      updateUserLevel(movementCategory.id, newUnlockedLevel);
      // setUnlockedLevelForCategory(newUnlockedLevel); // This will be updated via useEffect on userLevels change
      toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
    }

    setWaveNumber(prev => prev + 1);
    setCurrentWaveReps(0); 
  };

  const handleCompleteMovement = () => {
    if (!currentMovementDetails) {
        toast({ title: "Error", description: "No movement details found.", variant: "destructive" });
        return;
    }

    let entry: WorkoutEntry;

    if (sessionFixedExerciseTypeIsRepBased) {
        if (wavesDoneThisSession.length === 0 && totalRepsThisMovement === 0 && currentWaveReps === 0) {
            toast({ title: "No Reps Logged", description: "Please log at least one wave or some reps before completing.", variant: "destructive" });
            return;
        }
        const finalWaves = (currentWaveReps > 0) ? 
            [...wavesDoneThisSession, { wave: waveNumber, level: currentExerciseLevel, reps: currentWaveReps }] : 
            wavesDoneThisSession;
        
        const finalTotalReps = (currentWaveReps > 0) ?
            totalRepsThisMovement + currentWaveReps :
            totalRepsThisMovement;

        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: Math.max(...finalWaves.map(w => w.level), 1),
            totalReps: finalTotalReps,
            waves: finalWaves,
        };
    } else { 
        const durationToLog = completedDuration ?? currentElapsedTime; 
        if (durationToLog === null || durationToLog === 0) {
            toast({ title: "Timer Not Used", description: "Please start the timer or log some time before completing.", variant: "destructive" });
            return;
        }
        entry = {
            id: new Date().toISOString(),
            date: new Date().toISOString(),
            categoryName: movementCategory.name,
            movementName: currentMovementDetails.name,
            levelAchieved: currentMovementDetails.level,
            durationSeconds: durationToLog,
            waves: [], 
        };
    }
    onMovementComplete(entry);
  };

  const handleExerciseLevelChange = (level: number) => {
    setCurrentExerciseLevel(level);
    const newMovementDetails = getMovementByLevel(movementCategory, level);
    if (newMovementDetails && !newMovementDetails.isRepBased) {
      setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
    }
    // For rep-based, no target duration to set here.
    // Reset wave-specific or timer-specific states if needed, though useEffect for category change handles broader resets.
    if (sessionFixedExerciseTypeIsRepBased) {
      setCurrentWaveReps(0); // Reset reps for new rep-based exercise level
    } else {
      setTimerKey(Date.now()); // Reset timer for new time-based exercise level
      setCompletedDuration(null);
      setCurrentElapsedTime(0);
    }
  };

  const decreaseLevel = () => {
    const progressionsOfType = movementCategory.progressions.filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased);
    const currentExerciseIndexInTypedList = progressionsOfType.findIndex(p => p.level === currentExerciseLevel);

    if (currentExerciseIndexInTypedList > 0) {
      handleExerciseLevelChange(progressionsOfType[currentExerciseIndexInTypedList - 1].level);
    } else if (currentExerciseLevel > 1 && progressionsOfType.length > 0 && currentExerciseLevel > progressionsOfType[0].level) {
      // Fallback if currentExerciseLevel is somehow not in the typed list but above its minimum
      const closestLower = progressionsOfType.filter(p => p.level < currentExerciseLevel).pop();
      if (closestLower) {
        handleExerciseLevelChange(closestLower.level);
      }
    }
  };

  const increaseLevel = () => {
    const progressionsOfType = movementCategory.progressions.filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level <= unlockedLevelForCategory);
    const currentExerciseIndexInTypedList = progressionsOfType.findIndex(p => p.level === currentExerciseLevel);

    if (currentExerciseIndexInTypedList < progressionsOfType.length - 1 && currentExerciseIndexInTypedList !== -1) {
        handleExerciseLevelChange(progressionsOfType[currentExerciseIndexInTypedList + 1].level);
    } else if (currentExerciseLevel === unlockedLevelForCategory && unlockedLevelForCategory < 10) {
        const nextLevelOverall = unlockedLevelForCategory + 1;
        const nextProgressionOverall = movementCategory.progressions.find(p => p.level === nextLevelOverall);
        if (nextProgressionOverall && nextProgressionOverall.isRepBased === sessionFixedExerciseTypeIsRepBased) { // Check if next available level up is of current type
            const currentActualMovementDetails = getMovementByLevel(movementCategory, unlockedLevelForCategory); // Details of the current unlocked level exercise
            const levelUpCriteria = sessionFixedExerciseTypeIsRepBased ?
                `${LEVEL_UP_THRESHOLD_REPS} reps at Level ${unlockedLevelForCategory} (${currentActualMovementDetails?.name || ''})` :
                (currentActualMovementDetails?.defaultDurationSeconds ?
                    `holding Level ${unlockedLevelForCategory} (${currentActualMovementDetails.name}) for ${formatTime(currentActualMovementDetails.defaultDurationSeconds)}` :
                    `completing Level ${unlockedLevelForCategory} (${currentActualMovementDetails?.name || ''}) timed exercise`);
            toast({description: `Unlock Level ${nextLevelOverall} (${nextProgressionOverall.name}) by ${levelUpCriteria}.`})
        } else if (nextProgressionOverall) { // Next level is different type
             toast({description: `Next available exercise (Level ${nextLevelOverall} ${nextProgressionOverall.name}) is ${nextProgressionOverall.isRepBased ? 'rep-based' : 'time-based'}. Current session is ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'}.`})
        } else { // No more progressions at all
            toast({description: `You've maxed out Level ${unlockedLevelForCategory} for ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} ${movementCategory.name} exercises!`});
        }
    }
  };


  const resetCurrentWave = () => {
    setCurrentWaveReps(0);
  }
  
  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setTimeout(() => {
        setCompletedDuration(timeAchieved); 
        setCurrentElapsedTime(timeAchieved);
        
        if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

        const milestoneDuration = currentMovementDetails.defaultDurationSeconds || 0;
        
        if (timeAchieved >= milestoneDuration && 
            currentMovementDetails.level === unlockedLevelForCategory &&
            unlockedLevelForCategory < 10 &&
            movementCategory.progressions.some(p => p.level > unlockedLevelForCategory && p.isRepBased === sessionFixedExerciseTypeIsRepBased)
            ) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          // setUnlockedLevelForCategory(newUnlockedLevel); // Handled by useEffect on userLevels
          toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        } else {
            toast({ title: "Time Logged", description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
        }
    }, 0);
  }, [currentMovementDetails, unlockedLevelForCategory, movementCategory.id, movementCategory.name, updateUserLevel, sessionFixedExerciseTypeIsRepBased, completedDuration, currentElapsedTime]);

  const handleTimerUpdate = useCallback((elapsed: number) => {
      setCurrentElapsedTime(elapsed);
  }, []);

  const handleTimerTargetReached = useCallback(() => {
    if(currentMovementDetails && !sessionFixedExerciseTypeIsRepBased) {
        setTimeout(() => { // Defer toast to avoid state update issues
            toast({
                title: "Session Target Reached!",
                description: `${currentMovementDetails.name} held for ${formatTime(sessionTargetSeconds)}. Keep going if you can!`,
                variant: "default"
            });
        }, 0);
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

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
            <CardTitle className="text-2xl flex items-center gap-2">
            <movementCategory.icon className="h-7 w-7 text-primary" />
            {movementCategory.name} ({sessionFixedExerciseTypeIsRepBased ? 'Reps' : 'Time'})
            </CardTitle>
            <Badge variant="secondary">Unlocked Lvl: {unlockedLevelForCategory}</Badge>
        </div>
        <CardDescription>
          {sessionFixedExerciseTypeIsRepBased ? 
            `Log your reps for each wave. Target: ${DEFAULT_TARGET_REPS} total reps.` :
            `Hold exercise: ${currentMovementDetails?.name || 'Timed Hold'}. Session Target: ${formatTime(sessionTargetSeconds)}.`
          }
          {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails?.defaultDurationSeconds && currentMovementDetails.defaultDurationSeconds !== sessionTargetSeconds && (
            <span className="block text-xs text-muted-foreground">(Level-up milestone: {formatTime(currentMovementDetails.defaultDurationSeconds)})</span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && currentMovementDetails.level === 0 && (
             <Alert variant="default" className="bg-accent/30">
                <Info className="h-4 w-4" />
                <AlertTitle>Warm-up/Special Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Session Target: {formatTime(sessionTargetSeconds)}.
                     {currentMovementDetails.defaultDurationSeconds && currentMovementDetails.defaultDurationSeconds !== sessionTargetSeconds && ` (Milestone: ${formatTime(currentMovementDetails.defaultDurationSeconds)})`}
                </AlertDescription>
            </Alert>
        )}
         {!sessionFixedExerciseTypeIsRepBased && currentMovementDetails && currentMovementDetails.level > 0 && (
             <Alert variant="default" className="bg-accent/30">
                <TimerIcon className="h-4 w-4" />
                <AlertTitle>Time-Based Exercise</AlertTitle>
                <AlertDescription>
                    {currentMovementDetails.name}. Session Target: {formatTime(sessionTargetSeconds)}.
                    {currentMovementDetails.defaultDurationSeconds && currentMovementDetails.defaultDurationSeconds !== sessionTargetSeconds && ` (Milestone: ${formatTime(currentMovementDetails.defaultDurationSeconds)})`}
                </AlertDescription>
            </Alert>
        )}

        <div>
          <Label htmlFor="level-selector" className="block mb-1 font-medium">Current Exercise & Level</Label>
          <div className="flex items-center gap-2">
            <Button 
                variant="outline" 
                size="icon" 
                onClick={decreaseLevel} 
                disabled={
                    currentExerciseLevel <= (movementCategory.progressions.filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)[0]?.level || 1)
                }
            >
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChange}
              isRepBasedMode={sessionFixedExerciseTypeIsRepBased} 
            />
            <Button 
                variant="outline" 
                size="icon" 
                onClick={increaseLevel} 
                disabled={currentExerciseLevel >= unlockedLevelForCategory && currentExerciseLevel >= Math.max(...movementCategory.progressions.filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased).map(p=>p.level),10) }
            >
              <ChevronUp />
            </Button>
          </div>
           {currentMovementDetails && <p className="text-sm text-muted-foreground mt-1 ml-12">Selected: Lvl {currentMovementDetails.level} - {currentMovementDetails.name}</p>}
        </div>

        {sessionFixedExerciseTypeIsRepBased ? (
          <>
            <div>
              <Label htmlFor="rep-input" className="block mb-1 font-medium">Reps for Wave {waveNumber}</Label>
              <div className="flex items-center gap-2">
                <RepInput reps={currentWaveReps} onRepsChange={setCurrentWaveReps} />
                <Button variant="ghost" size="icon" onClick={resetCurrentWave} title="Reset reps for this wave">
                    <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <TargetTracker currentReps={totalRepsThisMovement + currentWaveReps} targetReps={DEFAULT_TARGET_REPS} />
            {wavesDoneThisSession.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Logged Waves this Session:</h4>
                <ScrollArea className="h-[120px] border rounded-md p-2 bg-muted/30">
                  <ul className="space-y-1 text-sm">
                    {wavesDoneThisSession.map((wave, index) => (
                      <li key={index} className="flex justify-between">
                        <span>Wave {wave.wave}: {wave.reps} reps @ Lvl {wave.level} ({getMovementByLevel(movementCategory, wave.level)?.name})</span>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            )}
          </>
        ) : currentMovementDetails ? (
          <>
            <div className="space-y-2">
                <Label htmlFor="target-seconds-input" className="block font-medium">Set Session Target (seconds)</Label>
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
            />
          </>
        ) : (
            <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Exercise Configuration Error</AlertTitle>
                <AlertDescription>This time-based exercise is missing a target duration or details. Please check movement data.</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between gap-2">
        {sessionFixedExerciseTypeIsRepBased && (
          <Button variant="outline" onClick={handleLogWave} className="w-full sm:w-auto" disabled={currentWaveReps <= 0}>
            Log Wave {waveNumber}
          </Button>
        )}
        <Button onClick={handleCompleteMovement} className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground">
          <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
        </Button>
      </CardFooter>
    </Card>
  );
}

