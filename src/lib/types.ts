
import type { LucideIcon } from 'lucide-react';
import type { Movement } from '@/data/movements'; // Import Movement type

export type MovementName = string;
export type MovementCategoryName = 'Push' | 'Pull' | 'Dips' | 'Legs' | 'Core';

export interface MovementCategoryInfo {
  id: string; // e.g., 'push', 'pull'. Corresponds to keys in ALL_MOVEMENTS.calisthenics
  name: MovementCategoryName; // e.g., 'Push', 'Pull'
  icon: LucideIcon;
  progressions: Movement[]; // Uses the detailed Movement type from data/movements.ts
}

export interface WaveData {
  wave: number;
  level: number;
  reps?: number;
  durationSeconds?: number;
}

export interface WorkoutEntry {
  id: string;
  date: string;
  categoryName: MovementCategoryName;
  movementName: MovementName;
  levelAchieved: number;
  totalReps?: number;
  durationSeconds?: number;
  waves?: WaveData[];
  caloriesBurned?: number;
}

export interface UserLevels {
  [categoryId: string]: number; // categoryId (e.g., 'push'): level
}

export interface SelectedMovement {
  category: MovementCategoryInfo;
  startingLevel: number; // The level user was at for this category when workout session started
}

export const DEFAULT_TARGET_REPS = 50;
export const LEVEL_UP_THRESHOLD_REPS = 30; // Fallback if not defined on movement

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
  moveToNextMovement: () => boolean;
  getCurrentMovement: () => SelectedMovement | null;
  clearCurrentWorkout: () => void;
  getAiRecommendations: () => Promise<string | null>;
}

export interface TimerProps {
  targetDuration: number;
  onTimeUpdate?: (elapsedTime: number) => void;
  onTargetReached?: () => void;
  autoStart?: boolean;
  className?: string;
  waveNumber?: number;
}
