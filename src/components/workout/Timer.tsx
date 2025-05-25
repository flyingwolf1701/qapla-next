
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import type { TimerProps } from '@/lib/types';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function Timer({
  targetDuration,
  onTimeUpdate,
  onTargetReached,
  autoStart = false,
  className,
}: TimerProps) {
  const [internalElapsedTime, setInternalElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [targetReachedNotified, setTargetReachedNotified] = useState(false);

  useEffect(() => {
    // Reset timer when targetDuration changes (effectively when key changes in parent)
    setInternalElapsedTime(0);
    setIsRunning(autoStart);
    setTargetReachedNotified(false);
  }, [targetDuration, autoStart]); // Using targetDuration as part of key-like reset

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setInternalElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        if (newTime >= targetDuration && !targetReachedNotified && targetDuration > 0) {
          if (onTargetReached) {
            // Defer to avoid state update issues
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
    if (onTimeUpdate) {
        onTimeUpdate(internalElapsedTime);
    }
  }, [internalElapsedTime, onTimeUpdate]);

  const handleStartPause = useCallback(() => {
    setIsRunning(prev => !prev);
  }, []);

  return (
    <div className={cn("w-full text-center space-y-3 py-2", className)}>
      <div className="text-4xl font-mono" role="timer" aria-live="polite">
        {formatTime(internalElapsedTime)}
      </div>
      {targetReachedNotified && internalElapsedTime >= targetDuration && targetDuration > 0 && (
        <p className="text-primary font-semibold text-sm">Target Reached! Keep Going!</p>
      )}
      <div className="flex justify-center items-center gap-2">
        <Button
          onClick={handleStartPause}
          variant="outline"
          size="sm"
          className="w-32" // Give a fixed width
        >
          {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
      </div>
    </div>
  );
}
