import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Info, Calendar, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Enhanced schema for real-world glucose logging
const enhancedGlucoseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  time: z.string().min(1, 'Time is required'),
  glucose: z.coerce.number()
    .min(40, 'Glucose must be at least 40 mg/dL')
    .max(400, 'Glucose cannot exceed 400 mg/dL'),
  insulinTaken: z.boolean().default(false),
  insulinType: z.string().optional(),
  insulinDose: z.coerce.number().min(0).optional(),
  foodConsumed: z.boolean().default(false),
  mealType: z.string().optional(),
  carbs: z.coerce.number().min(0).optional(),
  foodNotes: z.string().optional(),
  notes: z.string().optional(),
});

type EnhancedGlucoseFormData = z.infer<typeof enhancedGlucoseSchema>;

interface EnhancedGlucoseFormProps {
  onSubmit: (data: any) => void;
  isPending: boolean;
  resetTrigger?: number; // Optional trigger to reset form externally
}

export default function EnhancedGlucoseForm({ onSubmit, isPending, resetTrigger }: EnhancedGlucoseFormProps) {
  const [insulinTaken, setInsulinTaken] = useState(false);
  const [foodConsumed, setFoodConsumed] = useState(false);

  // Get current date and time for defaults
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);

  const form = useForm<EnhancedGlucoseFormData>({
    resolver: zodResolver(enhancedGlucoseSchema),
    defaultValues: {
      date: currentDate,
      time: currentTime,
      glucose: undefined,
      insulinTaken: false,
      insulinType: '',
      insulinDose: undefined,
      foodConsumed: false,
      mealType: '',
      carbs: undefined,
      foodNotes: '',
      notes: '',
    },
  });

  // Reset form when submission is successful (triggered externally)
  useEffect(() => {
    if (resetTrigger && resetTrigger > 0) {
      form.reset({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        glucose: undefined,
        insulinTaken: false,
        insulinType: '',
        insulinDose: undefined,
        foodConsumed: false,
        mealType: '',
        carbs: undefined,
        foodNotes: '',
        notes: '',
      });
      setInsulinTaken(false);
      setFoodConsumed(false);
    }
  }, [resetTrigger, form]);

  const handleSubmit = (data: EnhancedGlucoseFormData) => {
    // Combine date and time into ISO timestamp
    const timestamp = new Date(`${data.date}T${data.time}`).toISOString();
    
    // Structure data according to requirements
    const payload = {
      glucose: data.glucose,
      insulin: data.insulinTaken ? {
        taken: true,
        type: data.insulinType,
        dose: data.insulinDose,
      } : { taken: false },
      carbs: data.foodConsumed ? {
        consumed: true,
        meal: data.mealType,
        grams: data.carbs,
        notes: data.foodNotes,
      } : { consumed: false },
      timestamp,
      notes: data.notes,
    };

    onSubmit(payload);
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Log Glucose Reading</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
            {/* Date & Time Section */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/30 rounded-lg border border-border/50">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Date
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-sm">If you missed logging a reading earlier, you can select the exact date and time to add past data. This helps keep your glucose trends accurate.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} max={currentDate} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Time
                    </FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Glucose Reading - Always Required */}
            <FormField
              control={form.control}
              name="glucose"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base font-semibold">
                    Glucose Level (mg/dL) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Enter glucose reading (40-400)"
                      {...field}
                      className="text-lg h-12"
                    />
                  </FormControl>
                  <FormDescription>
                    Valid range: 40-400 mg/dL
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Insulin Section - Conditional */}
            <div className="space-y-4 p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-base font-semibold">I took insulin</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Enter insulin only if it was actually taken and prescribed by your doctor.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={insulinTaken}
                  onCheckedChange={(checked) => {
                    setInsulinTaken(checked);
                    form.setValue('insulinTaken', checked);
                  }}
                />
              </div>

              {insulinTaken && (
                <div className="space-y-4 pl-4 border-l-2 border-blue-500/30">
                  <FormField
                    control={form.control}
                    name="insulinType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insulin Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select insulin type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="rapid-acting">Rapid-acting (Lispro/Aspart)</SelectItem>
                            <SelectItem value="short-acting">Short-acting</SelectItem>
                            <SelectItem value="long-acting">Long-acting (Basal)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="insulinDose"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insulin Dose (units)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.5"
                            placeholder="Enter dose"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* Carbohydrate Section - Conditional */}
            <div className="space-y-4 p-4 bg-green-500/5 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label className="text-base font-semibold">I ate food</label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p className="text-sm">Carbohydrate logging helps explain post-meal glucose changes.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Switch
                  checked={foodConsumed}
                  onCheckedChange={(checked) => {
                    setFoodConsumed(checked);
                    form.setValue('foodConsumed', checked);
                  }}
                />
              </div>

              {foodConsumed && (
                <div className="space-y-4 pl-4 border-l-2 border-green-500/30">
                  <FormField
                    control={form.control}
                    name="mealType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meal Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select meal type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="breakfast">Breakfast</SelectItem>
                            <SelectItem value="lunch">Lunch</SelectItem>
                            <SelectItem value="dinner">Dinner</SelectItem>
                            <SelectItem value="snack">Snack</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="carbs"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Carbohydrates (grams)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Enter carbs"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="foodNotes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Food Notes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="What did you eat?"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            {/* General Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional context (exercise, stress, etc.)"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-12 text-base font-semibold"
              disabled={isPending || !form.formState.isValid}
            >
              {isPending ? 'Saving Reading...' : 'Save Glucose Reading'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
