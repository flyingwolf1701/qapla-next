
import type { LucideIcon } from 'lucide-react';
import { ArrowUpCircle, ArrowDownCircle, GripVertical, Footprints, Zap, ShieldQuestion, Repeat, Armchair, Dumbbell, Weight, PersonStanding } from 'lucide-react';

// Using GripVertical as a placeholder for Dips, since no perfect icon exists in Lucide for it.
// It somewhat represents parallel bars.
// Using Zap for Core as it represents energy/activation.
export interface Movement {
  name: string;
  level: number;
  isRepBased: boolean;
  benchmark: number; // Target reps or duration (seconds) for the exercise itself
  warmupTarget: number; // Target reps or duration (seconds) for a warm-up
  repsToUnlockNext?: number; // Reps needed at this level to unlock the next level (if rep-based)
  durationToUnlockNext?: number; // Duration (seconds) needed at this level to unlock next (if time-based)
  defaultDurationSeconds?: number; // Default duration for time-based exercises

  // Fields for weight-based waves (weight-machines)
  isWeightBased?: boolean;
  startingWeight?: number;
  weightIncrement?: number;
  repsPerWave?: number;

  description?: string;
}

interface MovementTypeData {
  icon: LucideIcon;
  // Use progressions for level-based movements (calisthenics)
  progressions?: Movement[];
  // Use movements for weight-based wave movements
  movements?: Movement[]; // Simplified to always expect Movement[]
}

interface WorkoutTypeData {
  [key: string]: MovementTypeData; // e.g., 'push', 'pull', 'legs'
}

interface AllMovementsData {
  [key: string]: WorkoutTypeData; // e.g., 'calisthenics', 'weight-machines'
}

export const ALL_MOVEMENTS: AllMovementsData = {
  calisthenics: {
    push: {
      icon: ArrowUpCircle,
      progressions: [
        { name: 'Wall Push-Ups', level: 1, isRepBased: true, benchmark: 25, warmupTarget: 10, repsToUnlockNext: 30 },
        { name: 'Incline Push-Ups', level: 2, isRepBased: true, benchmark: 20, warmupTarget: 8, repsToUnlockNext: 30 },
        { name: 'Knee Push-Ups', level: 3, isRepBased: true, benchmark: 20, warmupTarget: 8, repsToUnlockNext: 30 },
        { name: 'Full Push-Ups', level: 4, isRepBased: true, benchmark: 15, warmupTarget: 6, repsToUnlockNext: 30 },
        { name: 'Decline Push-Ups', level: 5, isRepBased: true, benchmark: 15, warmupTarget: 5, repsToUnlockNext: 30 },
        { name: 'Diamond Push-Ups', level: 6, isRepBased: true, benchmark: 12, warmupTarget: 5, repsToUnlockNext: 25 },
        { name: 'Archer Push-Ups', level: 7, isRepBased: true, benchmark: 10, warmupTarget: 4, repsToUnlockNext: 20 },
        { name: 'Clap Push-Ups', level: 8, isRepBased: true, benchmark: 8, warmupTarget: 3, repsToUnlockNext: 15 },
        { name: 'One-Arm Assisted Push-Ups', level: 9, isRepBased: true, benchmark: 5, warmupTarget: 2, repsToUnlockNext: 10 },
        { name: 'One-Arm Push-Ups', level: 10, isRepBased: true, benchmark: 5, warmupTarget: 1 },
      ],
    },
    pull: {
      icon: ArrowDownCircle,
      progressions: [
        { name: 'Dead Hang', level: 1, isRepBased: false, benchmark: 30, warmupTarget: 15, durationToUnlockNext: 60, defaultDurationSeconds: 60 },
        { name: 'Scapular Pulls', level: 2, isRepBased: true, benchmark: 15, warmupTarget: 8, repsToUnlockNext: 30 },
        { name: 'Assisted Pull-Ups/Rows', level: 3, isRepBased: true, benchmark: 12, warmupTarget: 6, repsToUnlockNext: 25 },
        { name: 'Negative Pull-Ups', level: 4, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 20 },
        { name: 'Jumping Pull-Ups', level: 5, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 20 },
        { name: 'Half Pull-Ups (Chin Over Bar)', level: 6, isRepBased: true, benchmark: 8, warmupTarget: 4, repsToUnlockNext: 15 },
        { name: 'Full Pull-Ups', level: 7, isRepBased: true, benchmark: 8, warmupTarget: 3, repsToUnlockNext: 12 },
        { name: 'Close Grip Pull-Ups', level: 8, isRepBased: true, benchmark: 6, warmupTarget: 3, repsToUnlockNext: 10 },
        { name: 'Wide Grip Pull-Ups', level: 9, isRepBased: true, benchmark: 5, warmupTarget: 2, repsToUnlockNext: 8 },
        { name: 'Muscle-Up (Transition)', level: 10, isRepBased: true, benchmark: 3, warmupTarget: 1 },
      ],
    },
    dips: {
      icon: GripVertical,
      progressions: [
        { name: 'Bench Dips (Feet on Floor)', level: 1, isRepBased: true, benchmark: 20, warmupTarget: 10, repsToUnlockNext: 30 },
        { name: 'Bench Dips (Feet Elevated)', level: 2, isRepBased: true, benchmark: 15, warmupTarget: 8, repsToUnlockNext: 25 },
        { name: 'Support Hold (Parallel Bars)', level: 3, isRepBased: false, benchmark: 30, warmupTarget: 15, durationToUnlockNext: 45, defaultDurationSeconds: 45 },
        { name: 'Assisted Dips (Machine or Bands)', level: 4, isRepBased: true, benchmark: 12, warmupTarget: 6, repsToUnlockNext: 20 },
        { name: 'Negative Dips', level: 5, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 15 },
        { name: 'Full Dips (Parallel Bars)', level: 6, isRepBased: true, benchmark: 10, warmupTarget: 4, repsToUnlockNext: 15 },
        { name: 'Ring Dips', level: 7, isRepBased: true, benchmark: 8, warmupTarget: 3, repsToUnlockNext: 12 },
        { name: 'Korean Dips', level: 8, isRepBased: true, benchmark: 6, warmupTarget: 3, repsToUnlockNext: 10 },
        { name: 'Weighted Dips', level: 9, isRepBased: true, benchmark: 5, warmupTarget: 2, repsToUnlockNext: 8 },
        { name: 'Straight Bar Dips', level: 10, isRepBased: true, benchmark: 5, warmupTarget: 1 },
      ],
    },
    legs: {
      icon: Footprints,
      progressions: [
        { name: 'Chair Squats', level: 1, isRepBased: true, benchmark: 25, warmupTarget: 12, repsToUnlockNext: 30 },
        { name: 'Assisted Bodyweight Squats', level: 2, isRepBased: true, benchmark: 20, warmupTarget: 10, repsToUnlockNext: 30 },
        { name: 'Bodyweight Squats', level: 3, isRepBased: true, benchmark: 20, warmupTarget: 10, repsToUnlockNext: 30 },
        { name: 'Wide Stance Squats', level: 4, isRepBased: true, benchmark: 15, warmupTarget: 8, repsToUnlockNext: 25 },
        { name: 'Narrow Stance Squats', level: 5, isRepBased: true, benchmark: 15, warmupTarget: 8, repsToUnlockNext: 25 },
        { name: 'Bulgarian Split Squats', level: 6, isRepBased: true, benchmark: 12, warmupTarget: 6, repsToUnlockNext: 20, description: "Per leg" },
        { name: 'Pistol Squats w/ Support', level: 7, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 15, description: "Per leg" },
        { name: 'Pistol Squats', level: 8, isRepBased: true, benchmark: 8, warmupTarget: 4, repsToUnlockNext: 10, description: "Per leg" },
        { name: 'Jump Squats', level: 9, isRepBased: true, benchmark: 15, warmupTarget: 5, repsToUnlockNext: 20 },
        { name: 'Shrimp Squats', level: 10, isRepBased: true, benchmark: 5, warmupTarget: 2, description: "Per leg" },
      ],
    },
    core: {
      icon: Zap,
      progressions: [
        { name: 'Plank', level: 0, isRepBased: false, benchmark: 60, warmupTarget: 30, defaultDurationSeconds: 60, description: "Warm-up/Accessory" },
        { name: 'Bridge', level: 0, isRepBased: false, benchmark: 60, warmupTarget: 30, defaultDurationSeconds: 60, description: "Warm-up/Accessory" },
        { name: 'Bird Dog Hold', level: 0, isRepBased: false, benchmark: 30, warmupTarget: 15, defaultDurationSeconds: 30, description: "Warm-up/Accessory (per side)" },
        { name: 'Lying Knee Tucks', level: 1, isRepBased: true, benchmark: 25, warmupTarget: 12, repsToUnlockNext: 30 },
        { name: 'Lying Leg Raises (Bent Knees)', level: 2, isRepBased: true, benchmark: 20, warmupTarget: 10, repsToUnlockNext: 30 },
        { name: 'Hanging Knee Raises', level: 3, isRepBased: true, benchmark: 15, warmupTarget: 8, repsToUnlockNext: 25 },
        { name: 'Hanging Leg Raises (Straight Legs)', level: 4, isRepBased: true, benchmark: 12, warmupTarget: 6, repsToUnlockNext: 20 },
        { name: 'Toes-to-Bar', level: 5, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 15 },
        { name: 'L-Sit (Floor or Parallel Bars)', level: 6, isRepBased: false, benchmark: 20, warmupTarget: 10, durationToUnlockNext: 30, defaultDurationSeconds: 20 },
        { name: 'Windshield Wipers (Lying)', level: 7, isRepBased: true, benchmark: 10, warmupTarget: 5, repsToUnlockNext: 15, description: "Per side" },
        { name: 'Dragon Flag Negatives', level: 8, isRepBased: true, benchmark: 8, warmupTarget: 4, repsToUnlockNext: 12 },
        { name: 'V-Ups', level: 9, isRepBased: true, benchmark: 15, warmupTarget: 5, repsToUnlockNext: 20 },
        { name: 'Front Lever Tucks/Progressions', level: 10, isRepBased: false, benchmark: 10, warmupTarget: 5, defaultDurationSeconds: 10 },
      ],
    },
  },
  'weight-machines': {
    legs: {
      icon: Weight, // Replaced Barbell with Weight
      movements: [ // Changed from progressions to movements for consistency
        { name: 'Leg Press', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 50, weightIncrement: 10, repsPerWave: 10, benchmark: 10, warmupTarget: 5 },
        { name: 'Hamstring Curl Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 20, weightIncrement: 5, repsPerWave: 12, benchmark: 12, warmupTarget: 6 },
        { name: 'Quad Extension Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 25, weightIncrement: 5, repsPerWave: 12, benchmark: 12, warmupTarget: 6 },
      ],
    },
    chest: {
        icon: Repeat,
        movements: [
          { name: 'Chest Press Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 40, weightIncrement: 5, repsPerWave: 12, benchmark: 12, warmupTarget: 6},
          { name: 'Pec Deck Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 20, weightIncrement: 5, repsPerWave: 15, benchmark: 15, warmupTarget: 7},
        ]
    },
    back: {
      icon: PersonStanding, // Replaced Body with PersonStanding
      movements: [
        { name: 'Lat Pulldown Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 30, weightIncrement: 5, repsPerWave: 10, benchmark: 10, warmupTarget: 5 },
        { name: 'Seated Row Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 30, weightIncrement: 5, repsPerWave: 10, benchmark: 10, warmupTarget: 5 },
      ]
    },
    shoulders: {
      icon: Dumbbell,
      movements: [
        { name: 'Shoulder Press Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 20, weightIncrement: 5, repsPerWave: 12, benchmark: 12, warmupTarget: 6 },
        { name: 'Lateral Raise Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 10, weightIncrement: 2.5, repsPerWave: 15, benchmark: 15, warmupTarget: 7 },
      ]
    },
    arms: {
      icon: Armchair,
      movements: [
        { name: 'Bicep Curl Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 15, weightIncrement: 2.5, repsPerWave: 15, benchmark: 15, warmupTarget: 7 },
        { name: 'Tricep Extension Machine', level: 1, isRepBased: true, isWeightBased: true, startingWeight: 15, weightIncrement: 2.5, repsPerWave: 15, benchmark: 15, warmupTarget: 7 },
      ]
    }
  },
};

// Helper to get a specific movement by its category ID (e.g., 'push') and level
export function getMovementByLevel(movementCategory: { progressions?: Movement[], movements?: Movement[] }, level: number): Movement | undefined {
  if (!movementCategory) {
    return undefined;
  }
  const movements = movementCategory.progressions || movementCategory.movements;
  return movements?.find(m => m.level === level);
}
