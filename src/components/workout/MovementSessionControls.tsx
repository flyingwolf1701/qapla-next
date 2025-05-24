
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
  initialUserLevel: number; 
  onMovementComplete: (entry: WorkoutEntry) => void;
}

export function MovementSessionControls({ movementCategory, initialUserLevel, onMovementComplete }: MovementSessionControlsProps) {
  const { updateUserLevel, userLevels } = useWorkoutState();

  const [unlockedLevelForCategory, setUnlockedLevelForCategory] = useState(initialUserLevel);
  const [currentExerciseLevel, setCurrentExerciseLevel] = useState(1); 
  
  const [sessionFixedExerciseTypeIsRepBased, setSessionFixedExerciseTypeIsRepBased] = useState<boolean>(true);

  const [currentWaveReps, setCurrentWaveReps] = useState(0);
  const [waveNumber, setWaveNumber] = useState(1);
  const [totalRepsThisMovement, setTotalRepsThisMovement] = useState(0);
  const [wavesDoneThisSession, setWavesDoneThisSession] = useState<WaveData[]>([]);

  const [completedDuration, setCompletedDuration] = useState<number | null>(null);
  const [currentElapsedTime, setCurrentElapsedTime] = useState<number>(0);
  const [timerKey, setTimerKey] = useState(Date.now());
  const [sessionTargetSeconds, setSessionTargetSeconds] = useState<number>(60); 

  const currentMovementDetails: Movement | undefined = useMemo(() => {
    return getMovementByLevel(movementCategory, currentExerciseLevel);
  }, [movementCategory, currentExerciseLevel]);

  useEffect(() => {
    const categoryUnlockedLevel = userLevels[movementCategory.id] || 1;
    setUnlockedLevelForCategory(categoryUnlockedLevel);

    let determinedStartingLevelAttempt = Math.max(1, categoryUnlockedLevel > 2 ? categoryUnlockedLevel - 2 : 1);
    
    // Try to find a progression matching the determined starting level
    let initialMovementForSession = movementCategory.progressions
                                      .filter(p => p.level > 0) // Exclude level 0 warm-ups for initial type setting
                                      .find(p => p.level === determinedStartingLevelAttempt);

    // If no direct match, try to find the *first available* progression (level > 0)
    if (!initialMovementForSession) {
        initialMovementForSession = movementCategory.progressions
                                    .filter(p => p.level > 0)
                                    .sort((a,b) => a.level - b.level)[0];
    }
    
    // If still no progression (e.g., category has only level 0 or is empty), fallback.
    if (!initialMovementForSession) {
        const firstAnyProg = movementCategory.progressions.sort((a,b) => a.level - b.level)[0];
        if (firstAnyProg) {
            initialMovementForSession = firstAnyProg;
        } else {
            console.error(`No valid progressions found for ${movementCategory.name}`);
            setSessionFixedExerciseTypeIsRepBased(true); // Default to rep-based
            setCurrentExerciseLevel(1);
            setSessionTargetSeconds(60);
             // Reset other states
            setCurrentWaveReps(0);
            setWaveNumber(1);
            setTotalRepsThisMovement(0);
            setWavesDoneThisSession([]);
            setCompletedDuration(null);
            setCurrentElapsedTime(0);
            setTimerKey(Date.now()); 
            return;
        }
    }
    
    setCurrentExerciseLevel(initialMovementForSession.level);
    setSessionFixedExerciseTypeIsRepBased(initialMovementForSession.isRepBased);
    if (!initialMovementForSession.isRepBased) {
        setSessionTargetSeconds(initialMovementForSession.defaultDurationSeconds || 60);
    }

    setCurrentWaveReps(0);
    setWaveNumber(1);
    setTotalRepsThisMovement(0);
    setWavesDoneThisSession([]);
    setCompletedDuration(null);
    setCurrentElapsedTime(0);
    setTimerKey(Date.now()); 

  }, [movementCategory, userLevels]);


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
            toast({ title: "Timer Not Used", description: "Please log some time before completing.", variant: "destructive" });
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
    const newMovementDetails = getMovementByLevel(movementCategory, level);

    if (newMovementDetails) {
        setCurrentExerciseLevel(level); // Set level first
        setSessionFixedExerciseTypeIsRepBased(newMovementDetails.isRepBased); // Then type
        if (!newMovementDetails.isRepBased) { 
            setSessionTargetSeconds(newMovementDetails.defaultDurationSeconds || 60);
            setTimerKey(Date.now()); 
            setCompletedDuration(null);
            setCurrentElapsedTime(0);
        } else { 
            setCurrentWaveReps(0);
        }
    } else {
        console.warn(`No movement details found for level ${level} in ${movementCategory.name}`);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const decreaseLevel = () => {
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex > 0) {
      handleExerciseLevelChange(relevantProgressions[currentIndex - 1].level);
    }
  };

  const increaseLevel = () => {
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);

    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);

    if (currentIndex === -1) return; 

    let nextUnlockedProgressionThisType = null;
    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            nextUnlockedProgressionThisType = relevantProgressions[i];
            break;
        }
    }

    if (nextUnlockedProgressionThisType) {
        handleExerciseLevelChange(nextUnlockedProgressionThisType.level);
    } else {
        if (currentExerciseLevel >= unlockedLevelForCategory && unlockedLevelForCategory < 10) {
             const nextLevelToUnlockOverall = unlockedLevelForCategory + 1;
             const nextProgressionToUnlockDetails = movementCategory.progressions.find(p => p.level === nextLevelToUnlockOverall);
             if (nextProgressionToUnlockDetails) {
                 if (nextProgressionToUnlockDetails.isRepBased === sessionFixedExerciseTypeIsRepBased) {
                     const criteriaExercise = getMovementByLevel(movementCategory, unlockedLevelForCategory);
                     const levelUpCriteria = sessionFixedExerciseTypeIsRepBased ?
                         `${LEVEL_UP_THRESHOLD_REPS} reps at Level ${unlockedLevelForCategory} (${criteriaExercise?.name || 'current level'})` :
                         (criteriaExercise?.defaultDurationSeconds ?
                             `holding Level ${unlockedLevelForCategory} (${criteriaExercise.name}) for ${formatTime(criteriaExercise.defaultDurationSeconds)}` :
                             `completing Level ${unlockedLevelForCategory} (${criteriaExercise?.name || 'current level'}) timed exercise`);
                     toast({ description: `You're at Level ${currentExerciseLevel}. Unlock Level ${nextLevelToUnlockOverall} (${nextProgressionToUnlockDetails.name}) by ${levelUpCriteria}.` });
                 } else {
                     toast({ description: `You're at Level ${currentExerciseLevel} (highest unlocked ${sessionFixedExerciseTypeIsRepBased ? 'rep' : 'time'}-based). Next level to unlock (${nextLevelToUnlockOverall} - ${nextProgressionToUnlockDetails.name}) is ${nextProgressionToUnlockDetails.isRepBased ? 'rep' : 'time'}-based. You can switch to it via the dropdown if you meet criteria.` });
                 }
             } else {
                 toast({description: `You've maxed out Level ${unlockedLevelForCategory}! This is the highest level for ${movementCategory.name}.`});
             }
        } else if (unlockedLevelForCategory === 10) {
             toast({ description: `You've reached the max unlockable level (10) for ${movementCategory.name}!` });
        } else {
             toast({ description: `This is the highest currently available ${sessionFixedExerciseTypeIsRepBased ? 'rep-based' : 'time-based'} exercise for ${movementCategory.name} up to your unlocked Level ${unlockedLevelForCategory}. Perform current level to unlock higher.`})
        }
    }
  };

  const upArrowDisabled = useMemo(() => {
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    const currentIndex = relevantProgressions.findIndex(p => p.level === currentExerciseLevel);
    if (currentIndex === -1) return true; 

    for (let i = currentIndex + 1; i < relevantProgressions.length; i++) {
        if (relevantProgressions[i].level <= unlockedLevelForCategory) {
            return false; 
        }
    }
    return true; 
  }, [currentExerciseLevel, unlockedLevelForCategory, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased]);

  const downArrowDisabled = useMemo(() => {
    const relevantProgressions = movementCategory.progressions
      .filter(p => p.isRepBased === sessionFixedExerciseTypeIsRepBased && p.level > 0)
      .sort((a, b) => a.level - b.level);
    if (!relevantProgressions.length) return true;
    const firstRelevantLevel = relevantProgressions[0].level;
    return currentExerciseLevel <= firstRelevantLevel;
  }, [currentExerciseLevel, movementCategory.progressions, sessionFixedExerciseTypeIsRepBased]);


  const resetCurrentWave = () => {
    setCurrentWaveReps(0);
  }
  
  const handleTimerComplete = useCallback((timeAchieved: number) => {
    setTimeout(() => { 
        setCompletedDuration(timeAchieved); 
        setCurrentElapsedTime(timeAchieved);
        
        if (!currentMovementDetails || sessionFixedExerciseTypeIsRepBased) return;

        const milestoneDuration = currentMovementDetails.defaultDurationSeconds || 0;
        
        if (milestoneDuration > 0 && // Ensure there is a milestone to meet
            timeAchieved >= milestoneDuration && 
            currentMovementDetails.level === unlockedLevelForCategory &&
            unlockedLevelForCategory < 10 &&
            movementCategory.progressions.some(p => p.level > unlockedLevelForCategory && p.isRepBased === sessionFixedExerciseTypeIsRepBased) 
            ) {
          const newUnlockedLevel = unlockedLevelForCategory + 1;
          updateUserLevel(movementCategory.id, newUnlockedLevel);
          toast({ title: "Level Up!", description: `You've unlocked Level ${newUnlockedLevel} for ${movementCategory.name}! Qapla'!` });
        } else {
            toast({ title: "Time Logged", description: `${currentMovementDetails.name} held for ${formatTime(timeAchieved)}.`, variant: "default" });
        }
    }, 0);
  }, [currentMovementDetails, unlockedLevelForCategory, movementCategory, updateUserLevel, sessionFixedExerciseTypeIsRepBased, formatTime]);

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
                disabled={downArrowDisabled}
                aria-label="Decrease level"
            >
              <ChevronDown />
            </Button>
            <LevelSelector
              currentLevel={currentExerciseLevel}
              unlockedLevel={unlockedLevelForCategory}
              progressions={movementCategory.progressions}
              onLevelChange={handleExerciseLevelChange}
              // isRepBasedMode is no longer needed here as LevelSelector shows all
            />
            <Button 
                variant="outline" 
                size="icon" 
                onClick={increaseLevel} 
                disabled={upArrowDisabled}
                aria-label="Increase level"
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
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4">
        {sessionFixedExerciseTypeIsRepBased && (
          <Button variant="outline" onClick={handleLogWave} className="w-full sm:w-auto" disabled={currentWaveReps <= 0}>
            Log Wave {waveNumber}
          </Button>
        )}
        {/* For time-based, the "Log Time" button is inside Timer.tsx */}
        {/* The "Done with Movement" button is always present and is the primary action in the footer for completing the category */}
        <Button 
            onClick={handleCompleteMovement} 
            className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground ml-auto"
            // If not rep-based and LogWave button isn't there, it might not need ml-auto if it's the only main button
        >
          <CheckSquare className="mr-2 h-5 w-5" /> Done with {movementCategory.name}
        </Button>
      </CardFooter>
    </Card>
  );
}
