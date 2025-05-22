
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MOVEMENT_CATEGORIES_DATA } from '@/data/movements';
import type { MovementCategoryInfo } from '@/lib/types';
import { useWorkoutState } from '@/providers/WorkoutStateProvider';
import { toast } from '@/hooks/use-toast';
import { ChevronRight, ListChecks, Dumbbell } from 'lucide-react';

export default function WorkoutSetupPage() {
  const router = useRouter();
  const { startWorkoutSession } = useWorkoutState();
  const [step, setStep] = useState(1);
  const [selectedWorkoutType, setSelectedWorkoutType] = useState<string>("calisthenics");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const handleNextStep = () => {
    if (step === 1) {
      if (selectedWorkoutType === "calisthenics") {
        setStep(2);
      } else {
        toast({ title: "Selection Error", description: "Please select a workout type.", variant: "destructive" });
      }
    } else if (step === 2) {
      if (selectedCategories.length === 0) {
        toast({ title: "Selection Error", description: "Please select at least one movement category.", variant: "destructive" });
        return;
      }
      const categoriesToStart = MOVEMENT_CATEGORIES_DATA.filter(cat => selectedCategories.includes(cat.id));
      startWorkoutSession(categoriesToStart);
      router.push('/workout/session');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId) ? prev.filter(id => id !== categoryId) : [...prev, categoryId]
    );
  };

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
              <div className="flex items-center space-x-2 p-4 border rounded-md hover:bg-accent/50 transition-colors">
                <RadioGroupItem value="calisthenics" id="calisthenics" />
                <Label htmlFor="calisthenics" className="text-lg font-medium cursor-pointer flex-1">
                  Calisthenics
                  <p className="text-sm font-normal text-muted-foreground">Bodyweight exercises for strength and endurance.</p>
                </Label>
              </div>
              {/* Future workout types can be added here */}
            </RadioGroup>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <p className="text-muted-foreground">Select one or more categories for your session:</p>
              {MOVEMENT_CATEGORIES_DATA.map((category: MovementCategoryInfo) => (
                <div
                  key={category.id}
                  className="flex items-center space-x-3 p-4 border rounded-md hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => toggleCategory(category.id)}
                >
                  <Checkbox
                    id={category.id}
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <category.icon className="h-6 w-6 text-primary" />
                  <Label htmlFor={category.id} className="text-md font-medium cursor-pointer flex-1">
                    {category.name}
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
