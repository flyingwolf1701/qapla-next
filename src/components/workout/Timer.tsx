
"use client";

import type { ReactNode} from 'react';
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, TimerIcon } from 'lucide-react';
import type { TimerProps } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function Timer({ initialDuration, onTimerComplete, onTimeUpdate, autoStart = false, className }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(initialDuration);
  const [isRunning, setIsRunning] = useState(autoStart);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setTimeLeft(initialDuration);
    setIsRunning(autoStart);
    setIsCompleted(false);
  }, [initialDuration, autoStart]);

  useEffect(() => {
    if (!isRunning || timeLeft <= 0) {
      if (timeLeft <= 0 && !isCompleted) {
        setIsCompleted(true);
        onTimerComplete?.();
      }
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft(prevTime => {
        const newTime = prevTime - 1;
        onTimeUpdate?.(newTime);
        return newTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isRunning, timeLeft, onTimerComplete, onTimeUpdate, isCompleted]);

  const handleStartPause = useCallback(() => {
    if (isCompleted) return;
    setIsRunning(prev => !prev);
  }, [isCompleted]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(initialDuration);
    setIsCompleted(false);
    onTimeUpdate?.(initialDuration);
  }, [initialDuration, onTimeUpdate]);

  const handleSkip = useCallback(() => {
    setTimeLeft(0);
    setIsRunning(false);
    if (!isCompleted) {
      setIsCompleted(true);
      onTimerComplete?.();
    }
  }, [onTimerComplete, isCompleted]);


  return (
    <Card className={cn("w-full text-center", className)}>
        <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-lg">
                <TimerIcon className="h-6 w-6 text-primary"/>
                <span>Time Challenge</span>
            </CardTitle>
        </CardHeader>
      <CardContent>
        <div className="text-6xl font-mono my-4" role="timer" aria-live="assertive">
          {formatTime(timeLeft)}
        </div>
        {isCompleted && <p className="text-green-600 font-semibold">Time Complete!</p>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-center gap-2">
        <Button onClick={handleStartPause} disabled={isCompleted} variant="outline" className="w-full sm:w-auto">
          {isRunning ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto">
          <RotateCcw className="mr-2 h-5 w-5" /> Reset
        </Button>
         <Button onClick={handleSkip} variant="secondary" className="w-full sm:w-auto" title="Skip to end">
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}
