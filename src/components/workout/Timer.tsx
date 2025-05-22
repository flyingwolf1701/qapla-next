
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, TimerIcon, SkipForward } from 'lucide-react'; // Added SkipForward
import type { TimerProps } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function Timer({ targetDuration, onTimerComplete, onTimeUpdate, autoStart = false, className }: TimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false); // Tracks if target has been reached

  useEffect(() => {
    setElapsedTime(0);
    setIsRunning(autoStart);
    setIsCompleted(false);
  }, [targetDuration, autoStart]);

  useEffect(() => {
    if (!isRunning || isCompleted) { // Stop if not running or already completed goal
      return;
    }

    if (elapsedTime >= targetDuration) {
      setIsCompleted(true);
      setIsRunning(false); // Stop the timer
      onTimerComplete?.(targetDuration); // Report target duration as achieved
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        onTimeUpdate?.(newTime);
        if (newTime >= targetDuration) {
          clearInterval(intervalId); // Clear interval when target is met
          setIsCompleted(true);
          setIsRunning(false);
          onTimerComplete?.(targetDuration);
          return targetDuration; // Ensure elapsedTime doesn't exceed target
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, elapsedTime, targetDuration, onTimerComplete, onTimeUpdate, isCompleted]);

  const handleStartPause = useCallback(() => {
    if (isCompleted) return; // Don't allow start/pause if already completed
    setIsRunning(prev => !prev);
  }, [isCompleted]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setElapsedTime(0);
    setIsCompleted(false);
    onTimeUpdate?.(0);
  }, [onTimeUpdate]);

  const handleSkip = useCallback(() => {
    setIsRunning(false);
    // Report the time elapsed so far, or targetDuration if user skips *after* reaching it.
    // If skipping before target, it logs the partial time.
    const timeToReport = isCompleted ? targetDuration : elapsedTime;
    onTimerComplete?.(timeToReport); 
    // Visually, we can set it to target to show "skipped to end" or keep current elapsed
    setElapsedTime(timeToReport); // Update elapsed time to what's reported
    if (timeToReport >= targetDuration) setIsCompleted(true);

  }, [onTimerComplete, elapsedTime, targetDuration, isCompleted]);


  return (
    <Card className={cn("w-full text-center", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <TimerIcon className="h-6 w-6 text-primary"/>
          <span>Time Challenge</span>
        </CardTitle>
        <CardDescription>Hold for: {formatTime(targetDuration)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-6xl font-mono my-4" role="timer" aria-live="assertive">
          {formatTime(elapsedTime)}
        </div>
        {isCompleted && elapsedTime >= targetDuration && <p className="text-green-600 font-semibold">Target Reached!</p>}
        {isCompleted && elapsedTime < targetDuration && <p className="text-yellow-600 font-semibold">Skipped at {formatTime(elapsedTime)}</p>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-2">
        <Button onClick={handleStartPause} disabled={isCompleted && elapsedTime >= targetDuration} variant="outline" className="w-full sm:w-auto">
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
        <Button onClick={handleSkip} variant="secondary" className="w-full sm:w-auto" title="End timer and log current time">
          <SkipForward className="mr-2 h-5 w-5" /> Log Time
        </Button>
      </CardFooter>
    </Card>
  );
}

