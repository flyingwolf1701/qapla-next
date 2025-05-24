
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, TimerIcon, SkipForward } from 'lucide-react';
import type { TimerProps } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function Timer({ 
  targetDuration, 
  onTimerComplete, 
  onTimeUpdate, 
  onTargetReached, 
  autoStart = false, 
  className,
  waveNumber = 1 
}: TimerProps) {
  const [internalElapsedTime, setInternalElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [targetReachedNotified, setTargetReachedNotified] = useState(false);

  useEffect(() => {
    // This effect now primarily handles autoStart and resets when key props change (like waveNumber indirectly via parent's key on Timer)
    // If the key of the Timer component changes (e.g. in MovementSessionControls), it will re-mount/re-initialize.
    // So, direct reset here based on waveNumber prop change is less critical if parent uses a key.
    // However, it's good practice for autoStart to work if the component is re-used without key change.
    setInternalElapsedTime(0); 
    setIsRunning(autoStart);
    setTargetReachedNotified(false);
  }, [targetDuration, autoStart]); // Removed waveNumber from here as key prop is better for reset

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setInternalElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        if (newTime >= targetDuration && !targetReachedNotified) {
          if (onTargetReached) {
            // Defer callback to avoid state update during render issues
            setTimeout(() => onTargetReached(), 0);
          }
          setTargetReachedNotified(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, targetDuration, onTargetReached, targetReachedNotified]);

  useEffect(() => {
    onTimeUpdate?.(internalElapsedTime);
  }, [internalElapsedTime, onTimeUpdate]);

  const handleStartPause = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setInternalElapsedTime(0);
    setTargetReachedNotified(false);
  }, []);

  const handleLogTime = useCallback(() => {
    setIsRunning(false); // Stop the timer
    const timeToReport = internalElapsedTime;
    // Defer callback to avoid state update during render issues & allow parent to handle state before timer resets
    setTimeout(() => {
        onTimerComplete?.(timeToReport);
        // Parent (MovementSessionControls) will update timerKey to reset the timer for the next wave
    }, 0);
  }, [onTimerComplete, internalElapsedTime]);

  return (
    <div className={cn("w-full text-center space-y-4 py-2", className)}>
      <div className="text-5xl font-mono" role="timer" aria-live="polite">
        {formatTime(internalElapsedTime)}
      </div>
      {targetReachedNotified && internalElapsedTime >= targetDuration && (
        <p className="text-primary font-semibold text-sm">Target Reached! Keep Going!</p>
      )}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
        <Button
          onClick={handleStartPause}
          variant="outline"
          size="sm"
          className="flex-1 sm:flex-none"
        >
          {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={handleReset} variant="outline" size="sm" className="flex-1 sm:flex-none">
          <RotateCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
        <Button
          onClick={handleLogTime}
          variant="secondary"
          size="sm"
          className="flex-1 sm:flex-none"
          title={`End timer and log current time for Wave ${waveNumber}`}
          disabled={internalElapsedTime === 0 && !isRunning} // Can't log if timer hasn't run or isn't running
        >
          <SkipForward className="mr-2 h-4 w-4" /> Log Wave {waveNumber}
        </Button>
      </div>
    </div>
  );
}
