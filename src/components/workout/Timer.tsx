
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, TimerIcon, SkipForward } from 'lucide-react';
import type { TimerProps } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function Timer({ targetDuration, onTimerComplete, onTimeUpdate, autoStart = false, className }: TimerProps) {
  const [internalElapsedTime, setInternalElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false); // Tracks if target has been reached naturally

  // Effect to reset timer state when targetDuration or autoStart changes (e.g. new exercise selected)
  useEffect(() => {
    setInternalElapsedTime(0);
    setIsRunning(autoStart);
    setIsCompleted(false);
  }, [targetDuration, autoStart]);

  // Effect for the main timer interval logic
  useEffect(() => {
    if (!isRunning || isCompleted) {
      return;
    }

    if (internalElapsedTime >= targetDuration) {
      setIsCompleted(true);
      setIsRunning(false);
      // Defer calling onTimerComplete to avoid immediate parent state update during child render cycle
      setTimeout(() => onTimerComplete?.(targetDuration), 0);
      return;
    }

    const intervalId = setInterval(() => {
      setInternalElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        if (newTime >= targetDuration) {
          clearInterval(intervalId);
          setIsCompleted(true);
          setIsRunning(false);
          // Defer calling onTimerComplete
          setTimeout(() => onTimerComplete?.(targetDuration), 0);
          return targetDuration;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, internalElapsedTime, targetDuration, onTimerComplete, isCompleted]);

  // Effect to call onTimeUpdate prop when internalElapsedTime changes
  useEffect(() => {
    onTimeUpdate?.(internalElapsedTime);
  }, [internalElapsedTime, onTimeUpdate]);


  const handleStartPause = useCallback(() => {
    // Allow starting/pausing only if not completed, or if completed but time is less than target (e.g., skipped early)
    if (isCompleted && internalElapsedTime >= targetDuration) return; 
    setIsRunning(prev => !prev);
  }, [isCompleted, internalElapsedTime, targetDuration]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setInternalElapsedTime(0);
    setIsCompleted(false);
  }, []);

  const handleSkip = useCallback(() => {
    setIsRunning(false);
    const timeToReport = internalElapsedTime; // Report actual time achieved when skipping
    
    // Defer calling onTimerComplete
    setTimeout(() => onTimerComplete?.(timeToReport), 0);
    
    // Update internal state after ensuring onTimerComplete is queued
    setInternalElapsedTime(timeToReport); 
    if (timeToReport >= targetDuration) {
      setIsCompleted(true);
    } else {
      // If skipped before target, mark as completed in a way that indicates it was manually stopped
      // This is primarily for UI state, actual `timeToReport` is what matters for logging
      setIsCompleted(true); 
    }
  }, [onTimerComplete, internalElapsedTime, targetDuration]);


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
          {formatTime(internalElapsedTime)}
        </div>
        {isCompleted && internalElapsedTime >= targetDuration && <p className="text-green-600 font-semibold">Target Reached!</p>}
        {isCompleted && internalElapsedTime < targetDuration && <p className="text-yellow-600 font-semibold">Logged at {formatTime(internalElapsedTime)}</p>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-2">
        <Button 
          onClick={handleStartPause} 
          disabled={isCompleted && internalElapsedTime >= targetDuration} 
          variant="outline" 
          className="w-full sm:w-auto"
        >
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
        <Button 
          onClick={handleSkip} 
          variant="secondary" 
          className="w-full sm:w-auto" 
          title="End timer and log current time"
          disabled={isCompleted && internalElapsedTime > 0} // Disable if already completed/logged time
        >
          <SkipForward className="mr-2 h-5 w-5" /> Log Time
        </Button>
      </CardFooter>
    </Card>
  );
}
