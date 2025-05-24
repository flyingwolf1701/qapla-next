
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

export function Timer({ targetDuration, onTimerComplete, onTimeUpdate, onTargetReached, autoStart = false, className }: TimerProps) {
  const [internalElapsedTime, setInternalElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [targetReachedNotified, setTargetReachedNotified] = useState(false);

  useEffect(() => {
    setInternalElapsedTime(0);
    setIsRunning(autoStart);
    setTargetReachedNotified(false);
  }, [targetDuration, autoStart]);

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
    setIsRunning(false);
    const timeToReport = internalElapsedTime;
    if (onTimerComplete) {
      // Defer callback to avoid state update during render issues
      setTimeout(() => onTimerComplete(timeToReport), 0);
    }
  }, [onTimerComplete, internalElapsedTime]);

  return (
    <div className={cn("w-full text-center space-y-4 py-4", className)}>
      <div className="text-6xl font-mono" role="timer" aria-live="polite">
        {formatTime(internalElapsedTime)}
      </div>
      {targetReachedNotified && internalElapsedTime >= targetDuration && (
        <p className="text-primary font-semibold">Target Reached! Keep Going!</p>
      )}
      <div className="flex flex-col sm:flex-row justify-center gap-2">
        <Button
          onClick={handleStartPause}
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
          onClick={handleLogTime}
          variant="secondary"
          className="w-full sm:w-auto"
          title="End timer and log current time"
          disabled={internalElapsedTime === 0 && !isRunning}
        >
          <SkipForward className="mr-2 h-5 w-5" /> Log Time
        </Button>
      </div>
    </div>
  );
}
