import type { LucideIcon } from 'lucide-react';
import {
  ArrowUpCircle, ArrowDownCircle, GripVertical, Footprints, Zap, ShieldQuestion,
  Barbell, Repeat, Armchair, Dumbbell, Body,
} from 'lucide-react';

import { ALL_EQUIPMENT } from './equipment';
import { ALL_MOVEMENT_PATTERNS } from './movementPatterns';
import { ALL_MUSCLE_GROUPS } from './muscleGroups';


// Helper functions to get IDs from names for easier assignment (no longer needed for direct assignment)
// const getMuscleGroupId = (name: string) => ALL_MUSCLE_GROUPS.find(mg => mg.name === name)?.id as number;


// Define the Exercise interface to be comprehensive for all types of exercises
export interface Exercise {
  id: number; // A unique numerical identifier for each exercise
  name: string;
  equipment: number[]; // Array of equipment IDs needed
  movementPattern: number; // Movement pattern ID
  muscleGroup: number[]; // Array of muscle group IDs
  healthConnectExerciseType: string; // Maps to Google Health Connect API exercise types (e.g., 'CALISTHENICS', 'STRENGTH_TRAINING')

  isRepBased: boolean; // True if the exercise is counted by repetitions
  description?: string; // Optional description for the exercise

  // Fields for weight-based exercises (e.g., machines, free weights)
  isWeightBased?: boolean; // True if the exercise involves weight progression
  startingWeight?: number; // Initial weight for wave progression (e.g., in kg or lbs)
  weightIncrement?: number; // Increment per wave (e.g., 2.5, 5, 10 kg/lbs)
  repsPerWave?: number; // Repetitions for each wave in a weight progression

  // Fields for time-based exercises (e.g., planks, holds)
  isTimeBased?: boolean; // True if the exercise is counted by duration
  defaultDurationSeconds?: number; // Default duration for time-based exercises

  // Fields for progressions (primarily for calisthenics/level-based exercises)
  level?: number; // Level in a progression (e.g., 1 for Wall Push-Ups, 10 for One-Arm Push-Ups)
  benchmark: number; // Target reps or duration for the exercise itself (e.g., 25 reps, 60 seconds)
  warmupTarget: number; // Target reps or duration for a warm-up set
  // repsToUnlockNext and durationToUnlockNext are removed as per user request
}

// All exercise data in a flat array, allowing for flexible filtering and grouping
export const ALL_EXERCISES: Exercise[] = [
  // --- CALISTHENICS PUSH PROGRESSIONS ---
  {
    id: 1,
    name: 'Wall Push-Ups',
    equipment: [1, 25], // bodyweight, wall
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 1,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 2,
    name: 'Incline Push-Ups',
    equipment: [1, 2], // bodyweight, elevated surface
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 2,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 3,
    name: 'Knee Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 3,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 4,
    name: 'Full Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 4,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 5,
    name: 'Decline Push-Ups',
    equipment: [1, 2], // bodyweight, elevated surface
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 5,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 6,
    name: 'Diamond Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [6, 4], // Triceps, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 6,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 7,
    name: 'Archer Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 7,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 8,
    name: 'Clap Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 8,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 9,
    name: 'One-Arm Assisted Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 9,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 10,
    name: 'One-Arm Push-Ups',
    equipment: [1], // bodyweight
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 10,
    benchmark: 30,
    warmupTarget: 10,
  },

  // --- CALISTHENICS PULL PROGRESSIONS ---
  {
    id: 11,
    name: 'Dead Hang',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 9], // Back, Forearms
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 30,
  },
  {
    id: 12,
    name: 'Scapular Pulls',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 5], // Back, Shoulders
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 2,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 13,
    name: 'Assisted Pull-Ups/Rows',
    equipment: [3, 4], // pull-up bar, bands
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 3,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 14,
    name: 'Negative Pull-Ups',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 4,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 15,
    name: 'Jumping Pull-Ups',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 5,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 16,
    name: 'Half Pull-Ups (Chin Over Bar)',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 6,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 17,
    name: 'Full Pull-Ups',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 7,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 18,
    name: 'Close Grip Pull-Ups',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 8,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 19,
    name: 'Wide Grip Pull-Ups',
    equipment: [3], // pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 9,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 20,
    name: 'Muscle-Up (Transition)',
    equipment: [3, 7], // pull-up bar, rings
    movementPattern: 2, // pull
    muscleGroup: [7, 8, 5, 6], // Back, Biceps, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 10,
    benchmark: 30,
    warmupTarget: 10,
  },

  // --- CALISTHENICS DIPS PROGRESSIONS ---
  {
    id: 21,
    name: 'Bench Dips (Feet on Floor)',
    equipment: [1, 29], // bodyweight, bench
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 1,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 22,
    name: 'Bench Dips (Feet Elevated)',
    equipment: [1, 29, 2], // bodyweight, bench, elevated surface
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 2,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 23,
    name: 'Support Hold (Parallel Bars)',
    equipment: [6], // parallel bars
    movementPattern: 1, // push
    muscleGroup: [5, 6, 14], // Shoulders, Triceps, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 30,
  },
  {
    id: 24,
    name: 'Assisted Dips (Machine or Bands)',
    equipment: [5, 4], // dip machine, bands
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 4,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 25,
    name: 'Negative Dips',
    equipment: [6], // parallel bars
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 5,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 26,
    name: 'Full Dips (Parallel Bars)',
    equipment: [6], // parallel bars
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 6,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 27,
    name: 'Ring Dips',
    equipment: [7], // rings
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4, 14], // Triceps, Shoulders, Chest, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 7,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 28,
    name: 'Korean Dips',
    equipment: [6], // parallel bars
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 8,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 29,
    name: 'Weighted Dips',
    equipment: [6, 9], // parallel bars, weights
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    level: 9,
    benchmark: 5, // Weighted exercise, benchmark remains as is
    warmupTarget: 2, // Weighted exercise, warmupTarget remains as is
  },
  {
    id: 30,
    name: 'Straight Bar Dips',
    equipment: [8], // straight bar
    movementPattern: 1, // push
    muscleGroup: [6, 5, 4], // Triceps, Shoulders, Chest
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 10,
    benchmark: 30,
    warmupTarget: 10,
  },

  // --- CALISTHENICS LEGS PROGRESSIONS (SQUAT/LUNGE PATTERNS) ---
  {
    id: 31,
    name: 'Chair Squats',
    equipment: [1, 10], // bodyweight, chair
    movementPattern: 3, // squat
    muscleGroup: [10, 12], // Quadriceps, Glutes
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 1,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 32,
    name: 'Assisted Bodyweight Squats',
    equipment: [1, 11], // bodyweight, support
    movementPattern: 3, // squat
    muscleGroup: [10, 12], // Quadriceps, Glutes
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 2,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 33,
    name: 'Bodyweight Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12], // Quadriceps, Glutes
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 3,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 34,
    name: 'Wide Stance Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 4,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 35,
    name: 'Narrow Stance Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12], // Quadriceps, Glutes
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 5,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 36,
    name: 'Bulgarian Split Squats',
    equipment: [1, 29], // bodyweight, bench
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 6,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 37,
    name: 'Pistol Squats w/ Support',
    equipment: [1, 11], // bodyweight, support
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 14], // Quadriceps, Glutes, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 7,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 38,
    name: 'Pistol Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 14], // Quadriceps, Glutes, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 8,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 39,
    name: 'Jump Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 13], // Quadriceps, Glutes, Calves
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 9,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 40,
    name: 'Shrimp Squats',
    equipment: [1], // bodyweight
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 11, 14], // Quadriceps, Glutes, Hamstrings, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 10,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },

  // --- CALISTHENICS CORE PROGRESSIONS ---
  {
    id: 41,
    name: 'Plank',
    equipment: [1, 12], // bodyweight, floor
    movementPattern: 8, // core
    muscleGroup: [14, 15, 16], // Core, Abdominals, Obliques
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 60,
    description: "Warm-up/Accessory",
  },
  {
    id: 42,
    name: 'Bridge',
    equipment: [1, 12], // bodyweight, floor
    movementPattern: 8, // core
    muscleGroup: [12, 11, 14], // Glutes, Hamstrings, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 60,
    description: "Warm-up/Accessory",
  },
  {
    id: 43,
    name: 'Bird Dog Hold',
    equipment: [1, 12], // bodyweight, floor
    movementPattern: 8, // core
    muscleGroup: [14, 7], // Core, Back
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 30,
    description: "Warm-up/Accessory (per side)",
  },
  {
    id: 44,
    name: 'Lying Knee Tucks',
    equipment: [1, 12], // bodyweight, floor
    movementPattern: 8, // core
    muscleGroup: [15], // Abdominals
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 1,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 45,
    name: 'Lying Leg Raises (Bent Knees)',
    equipment: [1, 12], // bodyweight, floor
    movementPattern: 8, // core
    muscleGroup: [15], // Abdominals
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 2,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 46,
    name: 'Hanging Knee Raises',
    equipment: [3], // pull-up bar
    movementPattern: 8, // core
    muscleGroup: [15], // Abdominals
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 3,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 47,
    name: 'Hanging Leg Raises (Straight Legs)',
    equipment: [3], // pull-up bar
    movementPattern: 8, // core
    muscleGroup: [15, 17], // Abdominals, Hip Flexors
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 4,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 48,
    name: 'Toes-to-Bar',
    equipment: [3], // pull-up bar
    movementPattern: 8, // core
    muscleGroup: [15, 17, 7], // Abdominals, Hip Flexors, Back
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 5,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 49,
    name: 'L-Sit (Floor or Parallel Bars)',
    equipment: [12, 6], // floor, parallel bars
    movementPattern: 8, // core
    muscleGroup: [14, 15, 17, 6], // Core, Abdominals, Hip Flexors, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 20,
  },
  {
    id: 50,
    name: 'Windshield Wipers (Lying)',
    equipment: [12], // floor
    movementPattern: 8, // core
    muscleGroup: [16, 15], // Obliques, Abdominals
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 7,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per side",
  },
  {
    id: 51,
    name: 'Dragon Flag Negatives',
    equipment: [29], // bench
    movementPattern: 8, // core
    muscleGroup: [15, 14, 7], // Abdominals, Core, Back
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 8,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 52,
    name: 'V-Ups',
    equipment: [12], // floor
    movementPattern: 8, // core
    muscleGroup: [15, 17], // Abdominals, Hip Flexors
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    level: 9,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 53,
    name: 'Front Lever Tucks/Progressions',
    equipment: [3], // pull-up bar
    movementPattern: 8, // core
    muscleGroup: [14, 7, 5], // Core, Back, Shoulders
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: false,
    isTimeBased: true,
    benchmark: 60,
    warmupTarget: 30,
    defaultDurationSeconds: 10,
  },

  // --- WEIGHT MACHINES ---
  {
    id: 54,
    name: 'Leg Press',
    equipment: [13], // leg press machine
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 50,
    weightIncrement: 10,
    repsPerWave: 10,
    benchmark: 10, // Default for weight-based
    warmupTarget: 5, // Default for weight-based
  },
  {
    id: 55,
    name: 'Hamstring Curl Machine',
    equipment: [14], // hamstring curl machine
    movementPattern: 5, // hinge
    muscleGroup: [11], // Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 12,
    benchmark: 12, // Default for weight-based
    warmupTarget: 6, // Default for weight-based
  },
  {
    id: 56,
    name: 'Quad Extension Machine',
    equipment: [15], // quad extension machine
    movementPattern: 3, // squat
    muscleGroup: [10], // Quadriceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 25,
    weightIncrement: 5,
    repsPerWave: 12,
    benchmark: 12, // Default for weight-based
    warmupTarget: 6, // Default for weight-based
  },
  {
    id: 57,
    name: 'Chest Press Machine',
    equipment: [16], // chest press machine
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 40,
    weightIncrement: 5,
    repsPerWave: 12,
    benchmark: 12, // Default for weight-based
    warmupTarget: 6, // Default for weight-based
  },
  {
    id: 58,
    name: 'Pec Deck Machine',
    equipment: [17], // pec deck machine
    movementPattern: 1, // push
    muscleGroup: [4], // Chest
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 15,
    benchmark: 15, // Default for weight-based
    warmupTarget: 7, // Default for weight-based
  },
  {
    id: 59,
    name: 'Lat Pulldown Machine',
    equipment: [18], // lat pulldown machine
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 30,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10, // Default for weight-based
    warmupTarget: 5, // Default for weight-based
  },
  {
    id: 60,
    name: 'Seated Row Machine',
    equipment: [19], // seated row machine
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 30,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10, // Default for weight-based
    warmupTarget: 5, // Default for weight-based
  },
  {
    id: 61,
    name: 'Shoulder Press Machine',
    equipment: [20], // shoulder press machine
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 12,
    benchmark: 12, // Default for weight-based
    warmupTarget: 6, // Default for weight-based
  },
  {
    id: 62,
    name: 'Lateral Raise Machine',
    equipment: [21], // lateral raise machine
    movementPattern: 7, // press
    muscleGroup: [5], // Shoulders
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 2.5,
    repsPerWave: 15,
    benchmark: 15, // Default for weight-based
    warmupTarget: 7, // Default for weight-based
  },
  {
    id: 63,
    name: 'Bicep Curl Machine',
    equipment: [22], // bicep curl machine
    movementPattern: 2, // pull
    muscleGroup: [8], // Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 15,
    weightIncrement: 2.5,
    repsPerWave: 15,
    benchmark: 15, // Default for weight-based
    warmupTarget: 7, // Default for weight-based
  },
  {
    id: 64,
    name: 'Tricep Extension Machine',
    equipment: [23], // tricep extension machine
    movementPattern: 1, // push
    muscleGroup: [6], // Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 15,
    weightIncrement: 2.5,
    repsPerWave: 15,
    benchmark: 15, // Default for weight-based
    warmupTarget: 7, // Default for weight-based
  },

  // --- NEW USER-SUGGESTED EXERCISES ---

  // Squat Pattern
  {
    id: 65,
    name: 'Wall Ball Squat',
    equipment: [24, 25], // medicine ball, wall
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 5], // Quadriceps, Glutes, Shoulders
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 4, // Example weight for medicine ball
    weightIncrement: 2,
    repsPerWave: 15,
    benchmark: 15,
    warmupTarget: 7,
  },
  {
    id: 66,
    name: 'Dumbbell Wall Squat',
    equipment: [27, 25], // dumbbells, wall
    movementPattern: 3, // squat
    muscleGroup: [10, 12], // Quadriceps, Glutes
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 5,
    weightIncrement: 2.5,
    repsPerWave: 12,
    benchmark: 12,
    warmupTarget: 6,
  },
  {
    id: 67,
    name: 'Goblet Squat',
    equipment: [26, 28], // dumbbell, kettlebell
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 14], // Quadriceps, Glutes, Core
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 68,
    name: 'Unilateral Leg Press',
    equipment: [13], // leg press machine
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 25,
    weightIncrement: 5,
    repsPerWave: 10,
    description: "Per leg",
    benchmark: 10,
    warmupTarget: 5,
  },

  // Pull Pattern
  {
    id: 69,
    name: 'Banded Lat Pulldown',
    equipment: [4, 3], // bands, pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 70,
    name: 'Banded Pull Up',
    equipment: [4, 3], // bands, pull-up bar
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 71,
    name: 'Unilateral Lat Pulldown',
    equipment: [18], // lat pulldown machine
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 15,
    weightIncrement: 2.5,
    repsPerWave: 10,
    description: "Per arm",
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 72,
    name: 'Weighted Pull Up',
    equipment: [3, 9], // pull-up bar, weights
    movementPattern: 2, // pull
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 5,
    weightIncrement: 2.5,
    repsPerWave: 5,
    benchmark: 5,
    warmupTarget: 2,
  },

  // Push Pattern
  {
    id: 73,
    name: 'Banded Pushup',
    equipment: [1, 4], // bodyweight, bands
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 74,
    name: 'Ring Push Up',
    equipment: [7], // rings
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6, 14], // Chest, Shoulders, Triceps, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 75,
    name: 'Dumbbell Bench Press',
    equipment: [27, 29], // dumbbells, bench
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 76,
    name: 'Unilateral Machine Chest Press',
    equipment: [16], // chest press machine
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 2.5,
    repsPerWave: 12,
    description: "Per arm",
    benchmark: 12,
    warmupTarget: 6,
  },

  // Hinge Pattern
  {
    id: 77,
    name: 'Dumbbell Straight Deadlift',
    equipment: [27], // dumbbells
    movementPattern: 5, // hinge
    muscleGroup: [11, 12, 7], // Hamstrings, Glutes, Back
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 15,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 78,
    name: 'Banded Straight Deadlift',
    equipment: [4], // bands
    movementPattern: 5, // hinge
    muscleGroup: [11, 12, 7], // Hamstrings, Glutes, Back
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 79,
    name: 'Staggered Dumbbell Straight Deadlift',
    equipment: [27], // dumbbells
    movementPattern: 5, // hinge
    muscleGroup: [11, 12, 7], // Hamstrings, Glutes, Back
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 2.5,
    repsPerWave: 10,
    description: "Per leg",
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 80,
    name: 'Dumbbell Deadlift',
    equipment: [27], // dumbbells
    movementPattern: 5, // hinge
    muscleGroup: [11, 12, 7, 10], // Hamstrings, Glutes, Back, Quadriceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },

  // Row Pattern
  {
    id: 81,
    name: 'Dumbbell Bent Over Row',
    equipment: [27], // dumbbells
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 2.5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 82,
    name: 'Banded Bent Over Row',
    equipment: [4], // bands
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 83,
    name: 'Unilateral Dumbbell Bent Over Row',
    equipment: [26, 29], // dumbbell, bench
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 8,
    weightIncrement: 2.5,
    repsPerWave: 10,
    description: "Per arm",
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 84,
    name: 'Inverted Row (Rings)',
    equipment: [7], // rings
    movementPattern: 6, // row
    muscleGroup: [7, 8, 14], // Back, Biceps, Core
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 85,
    name: 'Cable Row',
    equipment: [30], // cable machine
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 86,
    name: 'Unilateral Cable Row',
    equipment: [30], // cable machine
    movementPattern: 6, // row
    muscleGroup: [7, 8], // Back, Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 2.5,
    repsPerWave: 10,
    description: "Per arm",
    benchmark: 10,
    warmupTarget: 5,
  },

  // Press Pattern
  {
    id: 87,
    name: 'Dumbbell Shoulder Press',
    equipment: [27, 29], // dumbbells, bench
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 8,
    weightIncrement: 2.5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 88,
    name: 'Banded Shoulder Press',
    equipment: [4], // bands
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },
  {
    id: 89,
    name: 'Pike Pushup',
    equipment: [1], // bodyweight
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
  },

  // Lunge Pattern
  {
    id: 90,
    name: 'Bodyweight Lunge',
    equipment: [1], // bodyweight
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 91,
    name: 'Dumbbell Lunge',
    equipment: [27], // dumbbells
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 5,
    weightIncrement: 2.5,
    repsPerWave: 8,
    description: "Per leg",
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 92,
    name: 'Banded Lunge',
    equipment: [4], // bands
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 93,
    name: 'Bodyweight Split Squat',
    equipment: [1], // bodyweight
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'CALISTHENICS',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },
  {
    id: 94,
    name: 'Dumbbell Split Squat',
    equipment: [27], // dumbbells
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 5,
    weightIncrement: 2.5,
    repsPerWave: 10,
    description: "Per leg",
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 95,
    name: 'Banded Split Squat',
    equipment: [4], // bands
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: "Per leg",
  },

  // --- BARBELL EXERCISES ---
  {
    id: 96,
    name: 'Barbell Back Squat',
    equipment: [32, 33, 9], // barbell, squat rack, weights
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 11, 14], // Quadriceps, Glutes, Hamstrings, Core
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 40,
    weightIncrement: 10,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 97,
    name: 'Barbell Front Squat',
    equipment: [32, 33, 9], // barbell, squat rack, weights
    movementPattern: 3, // squat
    muscleGroup: [10, 12, 14], // Quadriceps, Glutes, Core
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 30,
    weightIncrement: 5,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 98,
    name: 'Barbell Conventional Deadlift',
    equipment: [32, 9], // barbell, weights
    movementPattern: 5, // hinge
    muscleGroup: [11, 12, 7, 9], // Hamstrings, Glutes, Back, Forearms
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 60,
    weightIncrement: 10,
    repsPerWave: 5,
    benchmark: 5,
    warmupTarget: 2,
  },
  {
    id: 99,
    name: 'Barbell Sumo Deadlift',
    equipment: [32, 9], // barbell, weights
    movementPattern: 5, // hinge
    muscleGroup: [12, 11, 7, 9], // Glutes, Hamstrings, Back, Forearms
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 60,
    weightIncrement: 10,
    repsPerWave: 5,
    benchmark: 5,
    warmupTarget: 2,
  },
  {
    id: 100,
    name: 'Barbell Bench Press',
    equipment: [32, 29, 33, 9], // barbell, bench, squat rack, weights
    movementPattern: 1, // push
    muscleGroup: [4, 5, 6], // Chest, Shoulders, Triceps
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 30,
    weightIncrement: 5,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 101,
    name: 'Barbell Overhead Press',
    equipment: [32, 33, 9], // barbell, squat rack, weights
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 102,
    name: 'Barbell Bent Over Row',
    equipment: [32, 9], // barbell, weights
    movementPattern: 6, // row
    muscleGroup: [7, 8, 9], // Back, Biceps, Forearms
    healthConnectExerciseType: 'WEIGHTLIFTING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 30,
    weightIncrement: 5,
    repsPerWave: 8,
    benchmark: 8,
    warmupTarget: 4,
  },
  {
    id: 103,
    name: 'Barbell Bicep Curl',
    equipment: [32, 9], // barbell, weights
    movementPattern: 2, // pull
    muscleGroup: [8], // Biceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 15,
    weightIncrement: 2.5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 104,
    name: 'Barbell Tricep Extension (Skullcrushers)',
    equipment: [32, 9, 29], // barbell, weights, bench
    movementPattern: 1, // push
    muscleGroup: [6], // Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 10,
    weightIncrement: 2.5,
    repsPerWave: 10,
    benchmark: 10,
    warmupTarget: 5,
  },
  {
    id: 105,
    name: 'Barbell Lunges',
    equipment: [32, 9], // barbell, weights
    movementPattern: 4, // lunge
    muscleGroup: [10, 12, 11], // Quadriceps, Glutes, Hamstrings
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    isWeightBased: true,
    startingWeight: 20,
    weightIncrement: 5,
    repsPerWave: 8,
    description: "Per leg",
    benchmark: 8,
    warmupTarget: 4,
  },

  // --- RIP STICK EXERCISES ---
  {
    id: 106,
    name: 'Rip Stick Rotational Chop',
    equipment: [31], // rip stick
    movementPattern: 8, // core
    muscleGroup: [16, 14, 5], // Obliques, Core, Shoulders
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: 'Focuses on rotational core strength (per side)',
  },
  {
    id: 107,
    name: 'Rip Stick Anti-Rotation Press',
    equipment: [31], // rip stick
    movementPattern: 8, // core
    muscleGroup: [14, 5], // Core, Shoulders
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: 'Focuses on core stability and anti-rotation (per side)',
  },
  {
    id: 108,
    name: 'Rip Stick Single Arm Row',
    equipment: [31], // rip stick
    movementPattern: 2, // pull
    muscleGroup: [7, 8, 5], // Back, Biceps, Shoulders
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: 'Single arm pulling movement (per arm)',
  },
  {
    id: 109,
    name: 'Rip Stick Overhead Press',
    equipment: [31], // rip stick
    movementPattern: 7, // press
    muscleGroup: [5, 6], // Shoulders, Triceps
    healthConnectExerciseType: 'STRENGTH_TRAINING',
    isRepBased: true,
    benchmark: 30,
    warmupTarget: 10,
    description: 'Overhead pressing movement (per arm)',
  }
}