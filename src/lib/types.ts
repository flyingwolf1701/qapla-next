
import type { LucideIcon } from 'lucide-react';

export type MovementName = string;

export interface Movement {
  name: MovementName;
  level: number;
  description?: string;
  isRepBased: boolean; // True for rep-based, false for time-based
  defaultDurationSeconds?: number; // For time-based exercises, this is the target duration.
}

export type MovementCategoryName = 'Push' | 'Pull' | 'Dips' | 'Legs' | 'Core';

export interface MovementCategoryInfo {
  id: string; // e.g., 'push'
  name: MovementCategoryName;
  icon: LucideIcon;
  progressions: Movement[];
}

export interface WaveData {
  wave: number;
  level: number;
  reps: number;
}

export interface WorkoutEntry {
  id: string; // unique id for the log entry, e.g., timestamp
  date: string; // ISO string
  categoryName: MovementCategoryName;
  movementName: MovementName; // Specific movement performed
  levelAchieved: number; // Level of the movement performed
  totalReps?: number; // Total reps completed (for rep-based)
  durationSeconds?: number; // Total duration in seconds (for time-based)
  waves?: WaveData[]; // For rep-based
  caloriesBurned?: number; // Optional, for future
}

export interface UserLevels {
  [key: string]: number; // categoryId: level
}

// Used for passing selected movements to the session
export interface SelectedMovement {
  category: MovementCategoryInfo;
  startingLevel: number;
}

export interface WorkoutContextType {
  userLevels: UserLevels;
  workoutHistory: WorkoutEntry[];
  currentWorkoutSession: SelectedMovement[] | null;
  currentMovementIndex: number;
  isLoading: boolean;
  error: string | null;
  initializeState: () => void;
  startWorkoutSession: (selectedCategories: MovementCategoryInfo[]) => void;
  completeMovement: (entry: WorkoutEntry) => void;
  updateUserLevel: (categoryId: string, level: number) => void;
  moveToNextMovement: () => boolean; // Returns true if there is a next movement, false otherwise
  getCurrentMovement: () => SelectedMovement | null;
  clearCurrentWorkout: () => void;
  getAiRecommendations: () => Promise<string | null>;
}

export const DEFAULT_TARGET_REPS = 50;
export const LEVEL_UP_THRESHOLD_REPS = 30; // For rep-based exercises

// For Timer Component
export interface TimerProps {
  targetDuration: number; // in seconds. Timer counts UP to this.
  onTimerComplete?: (timeAchieved: number) => void; // Callback when timer target is reached or skipped. Passes actual time.
  onTimeUpdate?: (elapsedTime: number) => void; // Callback on every second tick with current elapsed time.
  autoStart?: boolean;
  className?: string;
}

