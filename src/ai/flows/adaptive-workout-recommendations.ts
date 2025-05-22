'use server';
/**
 * @fileOverview Provides personalized workout recommendations based on workout history.
 *
 * - getWorkoutRecommendations - A function that generates workout recommendations.
 * - WorkoutRecommendationInput - The input type for the getWorkoutRecommendations function.
 * - WorkoutRecommendationOutput - The return type for the getWorkoutRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WorkoutHistorySchema = z.array(
  z.object({
    date: z.string().describe('Date of the workout (YYYY-MM-DD).'),
    category: z.enum(['Push', 'Pull', 'Dips', 'Legs', 'Core']).describe('Movement category.'),
    level: z.number().int().min(1).max(10).describe('Level achieved in the workout.'),
    reps: z.number().int().describe('Total reps completed in the workout.'),
  })
);

const WorkoutRecommendationInputSchema = z.object({
  workoutHistory: WorkoutHistorySchema.describe('User workout history.'),
  currentLevel: z.record(z.enum(['Push', 'Pull', 'Dips', 'Legs', 'Core']), z.number()).describe('The current level for each category'),
  targetReps: z.number().int().describe('Target reps for a workout session (e.g., 50).'),
});

export type WorkoutRecommendationInput = z.infer<typeof WorkoutRecommendationInputSchema>;

const WorkoutRecommendationOutputSchema = z.object({
  recommendations: z.string().describe('Personalized workout recommendations based on workout history, focusing on achievable goals and preventing plateaus.'),
});

export type WorkoutRecommendationOutput = z.infer<typeof WorkoutRecommendationOutputSchema>;

export async function getWorkoutRecommendations(input: WorkoutRecommendationInput): Promise<WorkoutRecommendationOutput> {
  return adaptiveWorkoutRecommendationsFlow(input);
}

const adaptiveWorkoutRecommendationsPrompt = ai.definePrompt({
  name: 'adaptiveWorkoutRecommendationsPrompt',
  input: {schema: WorkoutRecommendationInputSchema},
  output: {schema: WorkoutRecommendationOutputSchema},
  prompt: `You are a personal fitness trainer. Analyze the user's workout history and current levels to provide personalized recommendations for adjusting their workout, focusing on achievable goals and preventing plateaus.

Workout History:
{{#each workoutHistory}}
- Date: {{date}}, Category: {{category}}, Level: {{level}}, Reps: {{reps}}
{{/each}}

Current Levels:
- Push: {{currentLevel.Push}}, Pull: {{currentLevel.Pull}}, Dips: {{currentLevel.Dips}}, Legs: {{currentLevel.Legs}}, Core: {{currentLevel.Core}}

Target Reps: {{targetReps}}

Provide recommendations to optimize their progress and stay motivated.
Ensure the recommendations are achievable.
Consider suggesting level adjustments or changes in rep targets for specific categories.

Recommendations:
`,
});

const adaptiveWorkoutRecommendationsFlow = ai.defineFlow(
  {
    name: 'adaptiveWorkoutRecommendationsFlow',
    inputSchema: WorkoutRecommendationInputSchema,
    outputSchema: WorkoutRecommendationOutputSchema,
  },
  async input => {
    const {output} = await adaptiveWorkoutRecommendationsPrompt(input);
    return output!;
  }
);
