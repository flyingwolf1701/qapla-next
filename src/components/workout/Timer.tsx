
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, SkipForward } from 'lucide-react';
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
    setInternalElapsedTime(0);
    setIsRunning(autoStart);
    setTargetReachedNotified(false);
  }, [targetDuration, autoStart, waveNumber]); // waveNumber ensures reset if it changes externally via key

  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setInternalElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        if (newTime >= targetDuration && !targetReachedNotified) {
          if (onTargetReached) {
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

  const handleLogTime = useCallback(() => {
    setIsRunning(false);
    const timeToReport = internalElapsedTime;
    if (onTimerComplete) {
        setTimeout(() => {
            onTimerComplete(timeToReport);
        }, 0);
    }
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
        <Button
          onClick={handleLogTime}
          variant="secondary"
          size="sm"
          className="flex-1 sm:flex-none"
          title={`End timer and log current time for Wave ${waveNumber}`}
          disabled={internalElapsedTime === 0 && !isRunning}
        >
          <SkipForward className="mr-2 h-4 w-4" /> Log Wave {waveNumber}
        </Button>
      </div>
    </div>
  );
}
