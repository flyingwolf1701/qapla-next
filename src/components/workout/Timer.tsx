
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

export function Timer({ targetDuration, onTimerComplete, onTimeUpdate, onTargetReached, autoStart = false, className }: TimerProps) {
  const [internalElapsedTime, setInternalElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [targetReachedNotified, setTargetReachedNotified] = useState(false);

  // Effect to reset timer state when targetDuration or autoStart changes
  useEffect(() => {
    setInternalElapsedTime(0);
    setIsRunning(autoStart);
    setTargetReachedNotified(false);
  }, [targetDuration, autoStart]);

  // Effect for the main timer interval logic
  useEffect(() => {
    if (!isRunning) {
      return;
    }

    const intervalId = setInterval(() => {
      setInternalElapsedTime(prevTime => {
        const newTime = prevTime + 1;
        if (newTime >= targetDuration && !targetReachedNotified) {
          onTargetReached?.();
          setTargetReachedNotified(true);
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, targetDuration, onTargetReached, targetReachedNotified]);

  // Effect to call onTimeUpdate prop when internalElapsedTime changes
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
    // Defer calling onTimerComplete to avoid state update during render issues
    setTimeout(() => {
        onTimerComplete?.(timeToReport);
    }, 0);
  }, [onTimerComplete, internalElapsedTime]);

  return (
    <Card className={cn("w-full text-center", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-center gap-2 text-lg">
          <TimerIcon className="h-6 w-6 text-primary"/>
          <span>Time Challenge</span>
        </CardTitle>
        <CardDescription>Session Target: {formatTime(targetDuration)}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-6xl font-mono my-4" role="timer" aria-live="polite">
          {formatTime(internalElapsedTime)}
        </div>
        {targetReachedNotified && internalElapsedTime >= targetDuration && (
          <p className="text-primary font-semibold">Target Reached! Keep Going!</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-2">
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
          disabled={internalElapsedTime === 0 && !isRunning} // Disable if timer hasn't started or is reset
        >
          <SkipForward className="mr-2 h-5 w-5" /> Log Time
        </Button>
      </CardFooter>
    </Card>
  );
}
