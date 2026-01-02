import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import VoiceAssistantCard from '@/components/VoiceAssistantCard';
import { Mic, Sparkles, MessageSquare, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function VoiceAIPage() {
  const { toast } = useToast();
  const [transcribedText, setTranscribedText] = useState('');
  const [suggestedMeals, setSuggestedMeals] = useState<any[]>([]);
  const [nutritionalAnalysis, setNutritionalAnalysis] = useState<any>(null);

  const { data: profileData } = useQuery({
    queryKey: ['/api/profile'],
  }) as { data: any };

  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/meals', { 
        method: 'POST', 
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' } 
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Meal logged successfully via voice',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      setTranscribedText('');
      setSuggestedMeals([]);
    },
  });

  const parseMealFromVoice = (text: string) => {
    // Enhanced NLP to extract comprehensive meal information
    const lower = text.toLowerCase();
    const ingredients: string[] = [];
    let carbs = 0, protein = 0, fat = 0, calories = 0, sugar = 0;

    const add = (ing: string, c:{carbs?:number, protein?:number, fat?:number, calories?:number, sugar?:number}) => {
      ingredients.push(ing);
      carbs += c.carbs || 0;
      protein += c.protein || 0;
      fat += c.fat || 0;
      calories += c.calories || 0;
      sugar += c.sugar || 0;
    };

    // Comprehensive food database
    if (lower.includes('rice')) add('Rice', { carbs: 45, protein: 4, calories: 200, sugar: 0 });
    if (lower.includes('brown rice')) { carbs += 5; protein += 1; }
    if (lower.includes('bread')) add('Bread', { carbs: 30, protein: 5, calories: 180, sugar: 4 });
    if (lower.includes('whole wheat') || lower.includes('whole grain')) { carbs -= 5; protein += 2; }
    if (lower.includes('oatmeal') || lower.includes('oats')) add('Oatmeal', { carbs: 40, protein: 6, fat: 3, calories: 220, sugar: 1 });
    if (lower.includes('banana')) add('Banana', { carbs: 27, protein: 1, calories: 105, sugar: 14 });
    if (lower.includes('apple')) add('Apple', { carbs: 25, calories: 95, sugar: 19 });
    if (lower.includes('orange')) add('Orange', { carbs: 15, protein: 1, calories: 62, sugar: 12 });
    if (lower.includes('strawberr')) add('Strawberries', { carbs: 12, protein: 1, calories: 50, sugar: 8 });
    if (lower.includes('blueberr')) add('Blueberries', { carbs: 14, protein: 1, calories: 57, sugar: 10 });
    if (lower.includes('chicken')) add('Chicken', { protein: 25, fat: 5, calories: 180 });
    if (lower.includes('fish') || lower.includes('salmon')) add('Fish', { protein: 22, fat: 8, calories: 180 });
    if (lower.includes('beef')) add('Beef', { protein: 26, fat: 15, calories: 250 });
    if (lower.includes('pork')) add('Pork', { protein: 23, fat: 12, calories: 220 });
    if (lower.includes('egg')) add('Egg', { protein: 6, fat: 5, calories: 70 });
    if (lower.includes('salad')) add('Salad', { carbs: 10, protein: 2, calories: 60 });
    if (lower.includes('pasta')) add('Pasta', { carbs: 40, protein: 7, calories: 220, sugar: 2 });
    if (lower.includes('pizza')) add('Pizza', { carbs: 35, protein: 12, fat: 12, calories: 300, sugar: 4 });
    if (lower.includes('burger')) add('Burger', { carbs: 30, protein: 20, fat: 20, calories: 400, sugar: 5 });
    if (lower.includes('sandwich')) add('Sandwich', { carbs: 35, protein: 15, fat: 8, calories: 280 });
    if (lower.includes('milk')) add('Milk', { carbs: 12, protein: 8, fat: 4, calories: 150, sugar: 12 });
    if (lower.includes('yogurt') || lower.includes('yoghurt')) add('Yogurt', { carbs: 15, protein: 10, fat: 2, calories: 120, sugar: 12 });
    if (lower.includes('cheese')) add('Cheese', { protein: 7, fat: 9, calories: 110 });
    if (lower.includes('potato')) add('Potato', { carbs: 37, protein: 4, calories: 161 });
    if (lower.includes('sweet potato')) { carbs += 5; sugar += 8; }
    if (lower.includes('broccoli')) add('Broccoli', { carbs: 7, protein: 3, calories: 35 });
    if (lower.includes('carrot')) add('Carrot', { carbs: 10, calories: 41, sugar: 5 });
    if (lower.includes('tomato')) add('Tomato', { carbs: 4, protein: 1, calories: 18, sugar: 3 });
    if (lower.includes('beans')) add('Beans', { carbs: 20, protein: 7, fat: 1, calories: 115 });
    if (lower.includes('nuts') || lower.includes('almond')) add('Nuts', { carbs: 6, protein: 6, fat: 14, calories: 160 });
    if (lower.includes('peanut butter')) add('Peanut Butter', { carbs: 7, protein: 8, fat: 16, calories: 190 });
    if (lower.includes('avocado')) add('Avocado', { carbs: 9, protein: 2, fat: 15, calories: 160 });
    if (lower.includes('chocolate')) add('Chocolate', { carbs: 25, protein: 2, fat: 12, calories: 235, sugar: 20 });
    if (lower.includes('ice cream')) add('Ice Cream', { carbs: 24, protein: 4, fat: 11, calories: 207, sugar: 21 });
    if (lower.includes('cookie')) add('Cookie', { carbs: 20, protein: 2, fat: 8, calories: 160, sugar: 12 });
    if (lower.includes('cake')) add('Cake', { carbs: 45, protein: 4, fat: 15, calories: 340, sugar: 30 });

    // Portion heuristics
    const gMatch = lower.match(/(\d+)(\s?)(g|grams|gram)/i);
    if (gMatch) {
      const grams = parseInt(gMatch[1], 10);
      const scale = grams / 100;
      carbs = Math.round(carbs * scale);
      protein = Math.round(protein * scale);
      fat = Math.round(fat * scale);
      calories = Math.round(calories * scale);
      sugar = Math.round(sugar * scale);
    }

    // If no ingredients detected, return empty
    if (ingredients.length === 0) {
      toast({
        title: 'Info',
        description: 'I couldn\'t detect meal information. Try saying something like "I ate chicken with rice and vegetables"',
        variant: 'destructive',
      });
      return [];
    }

    // Calculate blood sugar impact
    const glycemicLoad = Math.round(carbs * 0.55);
    let impact = 'moderate';
    if (carbs >= 60) impact = 'high';
    else if (carbs <= 25) impact = 'low';

    const type = (profileData as any)?.profile?.diabetesType || 'unknown';
    let recommendation = 'Consider pre-bolus insulin and post-meal walk.';
    if (type === 'type 1') recommendation = 'Match insulin dose to carbs (ICR). Pre-bolus 10–15 min.';
    if (type === 'type 2') recommendation = 'Prefer lower GI foods; add protein/fiber to reduce spike.';

    const analysis = {
      ingredients,
      macros: { carbs, protein, fat, calories, sugar },
      insights: {
        impact,
        glycemicLoad,
        recommendation,
        advisory: (profileData as any)?.profile?.typicalInsulin > 0 
          ? 'Adjust dose per ICR/ISF if applicable.' 
          : 'Monitor post-meal glucose closely.',
      },
    };

    setNutritionalAnalysis(analysis);

    const meals = [{
      name: text.trim(),
      carbs: carbs || 0,
      protein: protein || 0,
      fat: fat || 0,
      calories: calories || 0,
      voiceRecorded: true,
    }];

    setSuggestedMeals(meals);
    return meals;
  };

  const handleVoiceInput = (text: string) => {
    setTranscribedText(text);
    parseMealFromVoice(text);
  };

  const handleLogMeal = (meal: any) => {
    createMealMutation.mutate(meal);
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Mic className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Voice AI Assistant</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">Voice Assistant</h1>
              <p className="text-muted-foreground">Log meals and get health insights using voice commands</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Voice Input Section */}
              <div className="lg:col-span-2 space-y-6">
                <VoiceAssistantCard
                  title="Food Logging"
                  subtitle="Tap the microphone to log your meal using voice"
                  buttonText="Start Recording"
                  onVoiceInput={handleVoiceInput}
                />

                {/* Transcribed Text */}
                {transcribedText && (
                  <Card className="p-6 glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="h-5 w-5" />
                        Transcribed Text
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground">{transcribedText}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Nutritional Analysis */}
                {nutritionalAnalysis && (
                  <Card className="p-6 glass-card bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Nutritional Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Ingredients */}
                      {nutritionalAnalysis.ingredients.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-2">Detected Ingredients:</p>
                          <div className="flex flex-wrap gap-1">
                            {nutritionalAnalysis.ingredients.map((ing: string, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">{ing}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Macros */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2">Macronutrients:</p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="bg-background/50 rounded p-2">
                            <span className="text-muted-foreground">Carbs:</span>
                            <span className="ml-1 font-bold text-orange-500">{nutritionalAnalysis.macros.carbs}g</span>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <span className="text-muted-foreground">Protein:</span>
                            <span className="ml-1 font-bold text-blue-500">{nutritionalAnalysis.macros.protein}g</span>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <span className="text-muted-foreground">Fat:</span>
                            <span className="ml-1 font-bold text-yellow-500">{nutritionalAnalysis.macros.fat}g</span>
                          </div>
                          <div className="bg-background/50 rounded p-2">
                            <span className="text-muted-foreground">Sugar:</span>
                            <span className="ml-1 font-bold text-red-500">{nutritionalAnalysis.macros.sugar}g</span>
                          </div>
                        </div>
                        <div className="bg-primary/20 rounded p-2 mt-2 text-center">
                          <span className="text-muted-foreground text-sm">Total Calories:</span>
                          <span className="ml-2 font-bold text-lg text-primary">{nutritionalAnalysis.macros.calories}</span>
                        </div>
                      </div>

                      {/* Blood Sugar Impact */}
                      <Alert className={`border-2 ${
                        nutritionalAnalysis.insights.impact === 'high' ? 'border-red-500 bg-red-500/10' :
                        nutritionalAnalysis.insights.impact === 'moderate' ? 'border-yellow-500 bg-yellow-500/10' :
                        'border-green-500 bg-green-500/10'
                      }`}>
                        <TrendingUp className="h-4 w-4" />
                        <AlertDescription className="space-y-2">
                          <div>
                            <p className="font-semibold text-sm">Blood Sugar Impact: <span className="uppercase">{nutritionalAnalysis.insights.impact}</span></p>
                            <p className="text-xs text-muted-foreground">Estimated Glycemic Load: {nutritionalAnalysis.insights.glycemicLoad}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs"><strong>Recommendation:</strong> {nutritionalAnalysis.insights.recommendation}</p>
                            <p className="text-xs"><strong>Advisory:</strong> {nutritionalAnalysis.insights.advisory}</p>
                          </div>
                        </AlertDescription>
                      </Alert>

                      {/* Personalized Insights */}
                      {(profileData as any)?.profile && (
                        <div className="bg-background/50 rounded p-3 space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground">Personalized Insights:</p>
                          <p className="text-xs">
                            • Diabetes Type: <strong>{(profileData as any).profile.diabetesType || 'Not specified'}</strong>
                          </p>
                          {(profileData as any).profile.typicalInsulin > 0 && (
                            <p className="text-xs">
                              • Typical Insulin: <strong>{(profileData as any).profile.typicalInsulin} units</strong>
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground italic">
                            This meal contains {nutritionalAnalysis.macros.carbs}g of carbs. Consider your insulin-to-carb ratio when dosing.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Meals */}
                {suggestedMeals.length > 0 && (
                  <Card className="p-6 glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5" />
                        Ready to Log
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {suggestedMeals.map((meal, index) => (
                        <div key={index} className="p-4 rounded-lg bg-secondary/50">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-2">{meal.name}</h4>
                              <div className="grid grid-cols-2 gap-1 text-xs">
                                <p><span className="text-muted-foreground">Carbs:</span> <strong>{meal.carbs}g</strong></p>
                                <p><span className="text-muted-foreground">Protein:</span> <strong>{meal.protein}g</strong></p>
                                <p><span className="text-muted-foreground">Fat:</span> <strong>{meal.fat}g</strong></p>
                                <p><span className="text-muted-foreground">Calories:</span> <strong>{meal.calories}</strong></p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleLogMeal(meal)}
                              disabled={createMealMutation.isPending}
                              size="sm"
                              className="ml-2"
                            >
                              {createMealMutation.isPending ? 'Logging...' : 'Log Meal'}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Tips Section */}
              <div>
                <Card className="p-6 glass-card sticky top-6">
                  <CardHeader>
                    <CardTitle className="text-lg">Voice Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <div>
                      <p className="font-semibold text-foreground mb-1">Try saying:</p>
                      <ul className="text-muted-foreground space-y-2">
                        <li>"I ate chicken with rice and vegetables"</li>
                        <li>"Had a banana and yogurt for breakfast"</li>
                        <li>"Just had pasta with salmon, about 200 grams"</li>
                        <li>"Consumed pizza and salad for lunch"</li>
                      </ul>
                    </div>
                    <div className="pt-3 border-t border-border">
                      <p className="font-semibold text-foreground mb-2">Features:</p>
                      <ul className="text-muted-foreground space-y-1">
                        <li>✓ Voice-activated logging</li>
                        <li>✓ Complete nutritional analysis</li>
                        <li>✓ Blood sugar impact prediction</li>
                        <li>✓ Personalized diabetes insights</li>
                        <li>✓ Automatic macronutrient detection</li>
                        <li>✓ Hands-free operation</li>
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
