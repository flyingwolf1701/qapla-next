// normalizr-schemas.ts (or similar file)
import { schema, normalize } from 'normalizr';

// 1. Define schemas for your lookup tables (entities)
// These are already in a good format (array of { id, name })
const muscleGroupSchema = new schema.Entity('muscleGroups');
const movementPatternSchema = new schema.Entity('movementPatterns');
const equipmentSchema = new schema.Entity('equipment');

// 2. Define the exercise schema, linking to the other schemas
//    - muscleGroup: An exercise can have multiple muscle groups, so it's an array.
//    - movementPattern: An exercise has one primary movement pattern, so it's a single entity.
//    - equipment: An exercise can require multiple pieces of equipment, so it's an array.
export const exerciseSchema = new schema.Entity('exercises', {
  muscleGroup: [ muscleGroupSchema ],     // Correct: An array of muscleGroup entities
  movementPattern: movementPatternSchema, // Correct: A single movementPattern entity
  equipment: [ equipmentSchema ],         // Correct: An array of equipment entities
});

// If you were normalizing an array of exercises (e.g., from an API response),
// you would use this:
export const exercisesListSchema = new schema.Array(exerciseSchema);