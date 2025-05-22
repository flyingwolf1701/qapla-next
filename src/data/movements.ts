
import type { MovementCategoryInfo, MovementCategoryName } from '@/lib/types';
import { ArrowUpCircle, ArrowDownCircle, GripVertical, Footprints, Zap } from 'lucide-react';

// Using GripVertical as a placeholder for Dips, since no perfect icon exists in Lucide for it.
// It somewhat represents parallel bars.
// Using Zap for Core as it represents energy/activation.

export const MOVEMENT_CATEGORIES_DATA: MovementCategoryInfo[] = [
  {
    id: 'push',
    name: 'Push',
    icon: ArrowUpCircle,
    progressions: [
      { name: 'Wall Push-Ups', level: 1, isRepBased: true },
      { name: 'Incline Push-Ups', level: 2, isRepBased: true },
      { name: 'Knee Push-Ups', level: 3, isRepBased: true },
      { name: 'Full Push-Ups', level: 4, isRepBased: true },
      { name: 'Decline Push-Ups', level: 5, isRepBased: true },
      { name: 'Diamond Push-Ups', level: 6, isRepBased: true },
      { name: 'Archer Push-Ups', level: 7, isRepBased: true },
      { name: 'Clap Push-Ups', level: 8, isRepBased: true },
      { name: 'One-Arm Assisted Push-Ups', level: 9, isRepBased: true },
      { name: 'One-Arm Push-Ups', level: 10, isRepBased: true },
    ],
  },
  {
    id: 'pull',
    name: 'Pull',
    icon: ArrowDownCircle,
    progressions: [
      { name: 'Dead Hang', level: 1, isRepBased: false, defaultDurationSeconds: 30, description: "Hold for time." },
      { name: 'Scapular Pulls', level: 2, isRepBased: true },
      { name: 'Assisted Pull-Ups/Rows', level: 3, isRepBased: true },
      { name: 'Negative Pull-Ups', level: 4, isRepBased: true },
      { name: 'Jumping Pull-Ups', level: 5, isRepBased: true },
      { name: 'Half Pull-Ups (Chin Over Bar)', level: 6, isRepBased: true },
      { name: 'Full Pull-Ups', level: 7, isRepBased: true },
      { name: 'Close Grip Pull-Ups', level: 8, isRepBased: true },
      { name: 'Wide Grip Pull-Ups', level: 9, isRepBased: true },
      { name: 'Muscle-Up (Transition)', level: 10, isRepBased: true },
    ],
  },
  {
    id: 'dips',
    name: 'Dips',
    icon: GripVertical,
    progressions: [
      { name: 'Bench Dips (Feet on Floor)', level: 1, isRepBased: true },
      { name: 'Bench Dips (Feet Elevated)', level: 2, isRepBased: true },
      { name: 'Support Hold (Parallel Bars)', level: 3, isRepBased: false, defaultDurationSeconds: 30, description: "Hold for time." },
      { name: 'Assisted Dips (Machine or Bands)', level: 4, isRepBased: true },
      { name: 'Negative Dips', level: 5, isRepBased: true },
      { name: 'Full Dips (Parallel Bars)', level: 6, isRepBased: true },
      { name: 'Ring Dips', level: 7, isRepBased: true },
      { name: 'Korean Dips', level: 8, isRepBased: true },
      { name: 'Weighted Dips', level: 9, isRepBased: true },
      { name: 'Straight Bar Dips', level: 10, isRepBased: true },
    ],
  },
  {
    id: 'legs',
    name: 'Legs',
    icon: Footprints,
    progressions: [
      { name: 'Chair Squats', level: 1, isRepBased: true },
      { name: 'Assisted Bodyweight Squats', level: 2, isRepBased: true },
      { name: 'Bodyweight Squats', level: 3, isRepBased: true },
      { name: 'Wide Stance Squats', level: 4, isRepBased: true },
      { name: 'Narrow Stance Squats', level: 5, isRepBased: true },
      { name: 'Bulgarian Split Squats', level: 6, isRepBased: true },
      { name: 'Pistol Squats w/ Support', level: 7, isRepBased: true },
      { name: 'Pistol Squats', level: 8, isRepBased: true },
      { name: 'Jump Squats', level: 9, isRepBased: true },
      { name: 'Shrimp Squats', level: 10, isRepBased: true },
    ],
  },
  {
    id: 'core',
    name: 'Core',
    icon: Zap,
    progressions: [
      { name: 'Lying Knee Tucks', level: 1, isRepBased: true },
      { name: 'Lying Leg Raises (Bent Knees)', level: 2, isRepBased: true },
      { name: 'Hanging Knee Raises', level: 3, isRepBased: true },
      { name: 'Hanging Leg Raises (Straight Legs)', level: 4, isRepBased: true },
      { name: 'Toes-to-Bar', level: 5, isRepBased: true },
      { name: 'L-Sit (Floor or Parallel Bars)', level: 6, isRepBased: false, defaultDurationSeconds: 20, description: "Hold for time." },
      { name: 'Windshield Wipers (Lying)', level: 7, isRepBased: true },
      { name: 'Dragon Flag Negatives', level: 8, isRepBased: true },
      { name: 'V-Ups', level: 9, isRepBased: true },
      { name: 'Front Lever Tucks/Progressions', level: 10, isRepBased: true },
      // Warm-up specific exercises, can be moved to a dedicated "Warm-up" category later
      { name: 'Plank', level: 0, isRepBased: false, defaultDurationSeconds: 60, description: "Hold for time. (Warm-up)"}, // level 0 to distinguish
      { name: 'Bridge', level: 0, isRepBased: false, defaultDurationSeconds: 60, description: "Hold for time. (Warm-up)"},
      // 'Blocking' is too vague, assuming 'Bird Dog' / 'Quadruped Limb Raises' or similar core stability
      { name: 'Bird Dog Hold', level: 0, isRepBased: false, defaultDurationSeconds: 30, description: "Alternating sides, hold each. (Warm-up)"},
    ],
  },
];

export function getMovementCategoryById(id: string): MovementCategoryInfo | undefined {
  return MOVEMENT_CATEGORIES_DATA.find(cat => cat.id === id);
}

export function getMovementByName(category: MovementCategoryInfo, movementName: string) {
  return category.progressions.find(p => p.name === movementName);
}

export function getMovementByLevel(category: MovementCategoryInfo, level: number) {
  return category.progressions.find(p => p.level === level);
}
