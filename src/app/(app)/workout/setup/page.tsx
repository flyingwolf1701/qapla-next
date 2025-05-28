
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ALL_MOVEMENTS, type Movement } from '@/data/movements'; // Updated import
import type { MovementCategoryInfo, MovementCategoryName } from '@/lib/types';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronRight, ListChecks, Dumbbell } from 'lucide-react';

export default function WorkoutSetupPage() {
  const router = useRouter();
  const { startWorkoutSession } = useWorkoutState();
  const [step, setStep] = useState(1);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>("calisthenics"); // Default to calisthenics
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]); // Stores category IDs like 'push', 'pull'

  const handleNextStep = () => {
    if (step === 1) {
      if (selectedWorkoutType && ALL_MOVEMENTS[selectedWorkoutType]) {
        setStep(2);
      } else {
        toast({ title: "Selection Error", description: "Please select a valid workout type.", variant: "destructive" });
      }
    } else if (step === 2) {
      if (selectedCategories.length === 0) {
        toast({ title: "Selection Error", description: "Please select at least one movement category.", variant: "destructive" });
        return;
      }

      const workoutData = ALL_MOVEMENTS[selectedWorkoutType];
      if (!workoutData) {
        toast({ title: "Error", description: "Selected workout type data not found.", variant: "destructive" });
        return;
      }
      
      const categoriesToStart: MovementCategoryInfo[] = selectedCategories.map(categoryId => {
        const categoryData = workoutData[categoryId];
        if (!categoryData) return null; 

        // Progressions are already of type Movement[] from ALL_MOVEMENTS
        const progressions: Movement[] = categoryData.progressions;

        return {
          id: categoryId,
          name: categoryId.charAt(0).toUpperCase() + categoryId.slice(1) as MovementCategoryName,
          icon: categoryData.icon,
          progressions: progressions, 
        };
      }).filter(Boolean) as MovementCategoryInfo[];

      if (categoriesToStart.length === 0) {
        toast({ title: "Error", description: "No valid categories selected or data missing.", variant: "destructive" });
        return;
      }
      
      startWorkoutSession(categoriesToStart);
      router.push('/workout/session');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

  const movementTypes = ALL_MOVEMENTS[selectedWorkoutType] || {};

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            {step === 1 ? <Dumbbell className="text-primary"/> : <ListChecks className="text-primary" />}
            {step === 1 ? 'Choose Workout Type' : 'Select Movements'}
          </CardTitle>
          <CardDescription>
            {step === 1 ? 'Select the type of workout you want to perform.' : 'Choose the muscle groups you want to train today.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 1 && (
            <RadioGroup value={selectedWorkoutType} onValueChange={setSelectedWorkoutType}>
              {Object.keys(ALL_MOVEMENTS).map(workoutKey => (
                 <div key={workoutKey} className="flex items-center space-x-2 p-4 border rounded-md hover:bg-accent/50 transition-colors">
                    <RadioGroupItem value={workoutKey} id={workoutKey} />
                    <Label htmlFor={workoutKey} className="text-lg font-medium cursor-pointer flex-1">
                    {workoutKey.charAt(0).toUpperCase() + workoutKey.slice(1)}
                    <p className="text-sm font-normal text-muted-foreground">
                        {workoutKey === "calisthenics" ? "Bodyweight exercises for strength and endurance." : "Structured machine-based training."}
                    </p>
                    </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Select one or more categories for your session:</p>
              {Object.entries(movementTypes).map(([categoryId, categoryData]) => (
                <div
                  key={categoryId}
                  className="flex items-center space-x-3 p-4 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => toggleCategory(categoryId)}
                >
                  <Checkbox
                    id={categoryId}
                    checked={selectedCategories.includes(categoryId)}
                    onCheckedChange={() => toggleCategory(categoryId)}
                    aria-label={`Select ${categoryId}`}
                  />
                  {categoryData.icon && <categoryData.icon className="h-6 w-6 text-primary" />}
                  <Label htmlFor={categoryId} className="text-md font-medium cursor-pointer flex-1">
                    {categoryId.charAt(0).toUpperCase() + categoryId.slice(1)}
                  </Label>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleNextStep} size="lg">
            {step === 1 ? 'Next' : 'Start Workout'}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
