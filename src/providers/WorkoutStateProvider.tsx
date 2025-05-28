
"use client";

import type { ReactNode } from 'react';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { WorkoutContextType, UserLevels, WorkoutEntry, MovementCategoryInfo, SelectedMovement, MovementCategoryName } from '@/lib/types';
import { getWorkoutRecommendations } from '@/ai/flows/adaptive-workout-recommendations';
import { ALL_MOVEMENTS } from '@/data/movements'; // Changed import

const LOCAL_STORAGE_USER_LEVELS_KEY = 'qapla_userLevels';
const LOCAL_STORAGE_WORKOUT_HISTORY_KEY = 'qapla_workoutHistory';

// Initialize defaultUserLevels based on ALL_MOVEMENTS.calisthenics keys
const defaultUserLevels: UserLevels = Object.keys(ALL_MOVEMENTS.calisthenics).reduce((acc, categoryId) => {
  acc[categoryId] = 1; // categoryId will be 'push', 'pull', etc.
  return acc;
}, {} as UserLevels);

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export const WorkoutStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [userLevels, setUserLevels] = useState<UserLevels>(defaultUserLevels);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutEntry[]>([]);
  const [currentWorkoutSession, setCurrentWorkoutSession] = useState<SelectedMovement[] | null>(null);
  const [currentMovementIndex, setCurrentMovementIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const initializeState = useCallback(() => {
    setIsLoading(true);
    try {
      const storedLevels = localStorage.getItem(LOCAL_STORAGE_USER_LEVELS_KEY);
      if (storedLevels) {
        const parsedLevels = JSON.parse(storedLevels);
        // Ensure all categories from ALL_MOVEMENTS are present in loaded levels
        const synchronizedLevels = { ...defaultUserLevels, ...parsedLevels };
        setUserLevels(synchronizedLevels);
      } else {
        setUserLevels(defaultUserLevels);
        localStorage.setItem(LOCAL_STORAGE_USER_LEVELS_KEY, JSON.stringify(defaultUserLevels));
      }

      const storedHistory = localStorage.getItem(LOCAL_STORAGE_WORKOUT_HISTORY_KEY);
      if (storedHistory) {
        setWorkoutHistory(JSON.parse(storedHistory));
      } else {
        setWorkoutHistory([]);
      }
    } catch (e) {
      console.error("Failed to initialize state from localStorage:", e);
      setError("Failed to load saved data. Using defaults.");
      // Ensure defaults are set on error
      setUserLevels(defaultUserLevels);
      setWorkoutHistory([]);
      localStorage.setItem(LOCAL_STORAGE_USER_LEVELS_KEY, JSON.stringify(defaultUserLevels));
      localStorage.setItem(LOCAL_STORAGE_WORKOUT_HISTORY_KEY, JSON.stringify([]));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeState();
  }, [initializeState]);

  const startWorkoutSession = useCallback((selectedCategories: MovementCategoryInfo[]) => {
    const sessionMovements = selectedCategories.map(category => ({
      category,
      // startingLevel: Math.max(1, (userLevels[category.id] || 1) - 2), // Default to 2 levels below current, min 1. This will be handled by MovementSessionControls
      startingLevel: userLevels[category.id] || 1, // Pass the current unlocked level
    }));
    setCurrentWorkoutSession(sessionMovements);
    setCurrentMovementIndex(0);
    setError(null);
  }, [userLevels]);

  const updateUserLevel = useCallback((categoryId: string, level: number) => {
    setUserLevels(prevLevels => {
      const newLevels = { ...prevLevels, [categoryId]: Math.min(10, Math.max(1, level)) };
      localStorage.setItem(LOCAL_STORAGE_USER_LEVELS_KEY, JSON.stringify(newLevels));
      return newLevels;
    });
  }, []);

  const completeMovement = useCallback((entry: WorkoutEntry) => {
    setWorkoutHistory(prevHistory => {
      const newHistory = [entry, ...prevHistory].slice(0, 50); // Keep last 50 entries
      localStorage.setItem(LOCAL_STORAGE_WORKOUT_HISTORY_KEY, JSON.stringify(newHistory));
      return newHistory;
    });
  }, []);
  
  const moveToNextMovement = useCallback(() => {
    if (currentWorkoutSession && currentMovementIndex < currentWorkoutSession.length - 1) {
      setCurrentMovementIndex(prevIndex => prevIndex + 1);
      return true;
    }
    return false;
  }, [currentWorkoutSession, currentMovementIndex]);

  const getCurrentMovement = useCallback(() => {
    if (currentWorkoutSession && currentWorkoutSession[currentMovementIndex]) {
      return currentWorkoutSession[currentMovementIndex];
    }
    return null;
  }, [currentWorkoutSession, currentMovementIndex]);

  const clearCurrentWorkout = useCallback(() => {
    setCurrentWorkoutSession(null);
    setCurrentMovementIndex(0);
  }, []);

  const getAiRecommendations = useCallback(async () => {
    if (isLoading) return "Loading history...";
    
    const historyForAI = workoutHistory.slice(0, 10).map(entry => ({
        date: new Date(entry.date).toISOString().split('T')[0],
        category: entry.categoryName as MovementCategoryName,
        level: entry.levelAchieved,
        reps: entry.totalReps, // This is fine as schema allows undefined
        // durationSeconds: entry.durationSeconds, // schema doesn't explicitly ask for this, but LLM might infer
    }));

    // Create currentLevelsForAI based on ALL_MOVEMENTS.calisthenics keys
    const currentLevelsForAI = Object.keys(ALL_MOVEMENTS.calisthenics).reduce((acc, categoryId) => {
        const categoryName = categoryId.charAt(0).toUpperCase() + categoryId.slice(1) as MovementCategoryName;
        acc[categoryName] = userLevels[categoryId] || 1;
        return acc;
    }, {} as Record<MovementCategoryName, number>);


    try {
        const result = await getWorkoutRecommendations({
            workoutHistory: historyForAI,
            currentLevel: currentLevelsForAI,
            targetReps: 50, 
        });
        return result.recommendations;
    } catch (aiError) {
        console.error("AI recommendation error:", aiError);
        return "Could not fetch recommendations at this time.";
    }
  }, [workoutHistory, userLevels, isLoading]);


  return (
    <WorkoutContext.Provider value={{
      userLevels,
      workoutHistory,
      currentWorkoutSession,
      currentMovementIndex,
      isLoading,
      error,
      initializeState,
      startWorkoutSession,
      completeMovement,
      updateUserLevel,
      moveToNextMovement,
      getCurrentMovement,
      clearCurrentWorkout,
      getAiRecommendations,
    }}>
      {children}
    </WorkoutContext.Provider>
  );
};

export const useWorkoutState = (): WorkoutContextType => {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkoutState must be used within a WorkoutStateProvider');
  }
  return context;
};
