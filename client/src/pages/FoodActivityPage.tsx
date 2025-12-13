import { useState, useEffect } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Utensils, TrendingUp, Activity as ActivityIcon, Mic, ChevronDown, ChevronUp, Apple, Leaf, Droplet, Zap, Heart, Moon, CheckCircle, BookOpen } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertMealSchema } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function FoodActivityPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('meals');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [insightIndex, setInsightIndex] = useState(0);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(insertMealSchema),
    defaultValues: {
      name: '',
      carbs: 0,
      protein: 0,
      fat: 0,
      calories: 0,
      voiceRecorded: false,
    },
  });

  const { data: mealsData, isLoading: mealsLoading } = useQuery({
    queryKey: ['/api/meals'],
  });

  // AI Food Insights (rotating)
  const foodInsights = [
    "🌾 High-carb meals raise blood glucose for 2–3 hours. Balance with fiber and protein.",
    "🥗 Choose low-GI foods such as whole grains, legumes, and salads for stable glucose.",
    "🚫 Avoid sugary drinks; they cause fast glucose spikes within 15–30 minutes.",
    "🍳 Breakfast with protein helps stabilize morning glucose levels.",
    "🥬 Fiber slows carb absorption, reducing glucose impact by 20–30%.",
    "🍎 Pair carbs with healthy fats or protein to reduce blood sugar spike.",
    "⏰ Eating at consistent times helps regulate blood glucose patterns.",
    "🚶 A 10-minute walk after meals can lower glucose peaks by up to 30%."
  ];

  // Rotate insights every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setInsightIndex((prev) => (prev + 1) % foodInsights.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const calculateAiAnalysis = (carbs: number, protein: number, fat: number, foodItems: string) => {
    const calories = (carbs * 4) + (protein * 4) + (fat * 9);
    let gi = carbs > 60 ? 75 : carbs > 40 ? 60 : 40;
    let gl = (gi * carbs) / 100;
    let impactCategory = carbs > 60 ? '🔴 High' : carbs > 40 ? '🟡 Medium' : '🟢 Low';
    
    let suggestions: string[] = [];
    if (carbs > 60) suggestions.push('Try reducing portion or switching to brown rice/multigrain.');
    if (foodItems.toLowerCase().includes('fried') || foodItems.toLowerCase().includes('fry')) suggestions.push('Consider baking or air-frying to reduce fat impact.');
    if (foodItems.toLowerCase().includes('sugar') || foodItems.toLowerCase().includes('sweet')) suggestions.push('Replace sugar with stevia or monk fruit extract.');
    if (fat > 20) suggestions.push('Reduce fat intake; try lean protein alternatives.');
    if (protein < 15) suggestions.push('Add more protein to stabilize blood sugar.');
    
    return { calories: Math.round(calories), gi: Math.round(gi), gl: Math.round(gl * 10) / 10, impactCategory, suggestions };
  };

  const createMealMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest('/api/meals', { method: 'POST', body: JSON.stringify(data) });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('meals.success'),
        description: t('meals.mealLogged'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/meals'] });
      form.reset();
      setAiAnalysis(null);
    },
    onError: (error: any) => {
      toast({
        title: t('meals.error'),
        description: error.message || t('meals.failedToLog'),
        variant: 'destructive',
      });
    },
  });

  const onAnalyzeClick = () => {
    const formValues = form.getValues();
    const analysis = calculateAiAnalysis(formValues.carbs, formValues.protein || 0, formValues.fat || 0, formValues.name);
    setAiAnalysis(analysis);
    toast({
      title: "AI Analysis Complete",
      description: `Estimated calories: ${analysis.calories}, Impact: ${analysis.impactCategory}`,
    });
  };

  const onMealLog = () => {
    const data = form.getValues();
    const enrichedData = aiAnalysis ? { ...data, ...aiAnalysis } : data;
    createMealMutation.mutate(enrichedData);
  };

  const totalCarbs = (mealsData as any[])?.reduce((sum: number, meal: any) => sum + (meal.carbs || 0), 0) || 0;
  const avgMealCarbs = ((mealsData as any[])?.length || 0) > 0 ? Math.round(totalCarbs / (mealsData as any[]).length) : 0;
  const voiceLogged = (mealsData as any[])?.filter((meal: any) => meal.voiceRecorded).length || 0;

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Utensils className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Food & Activity</h2>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-2">AI-Powered Nutrition & Lifestyle Coach</h1>
              <p className="text-muted-foreground">Smart food insights and activity recommendations for better diabetes management</p>
            </div>

            {/* Tab Buttons */}
            <div className="flex gap-2 mb-8">
              <button
                onClick={() => setActiveTab('meals')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'meals' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'meals' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'meals' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <Utensils className="w-4 h-4 inline mr-2" />
                Meals
              </button>
              <button
                onClick={() => setActiveTab('activity')}
                className="px-4 py-2 rounded-lg font-medium transition-all duration-200"
                style={{
                  backgroundColor: activeTab === 'activity' ? 'rgba(33, 200, 155, 0.2)' : 'transparent',
                  color: activeTab === 'activity' ? '#21C89B' : '#8B92A6',
                  border: activeTab === 'activity' ? '1px solid rgba(33, 200, 155, 0.3)' : '1px solid rgba(139, 146, 166, 0.2)',
                }}
              >
                <ActivityIcon className="w-4 h-4 inline mr-2" />
                Activity & Lifestyle
              </button>
            </div>

            {mealsLoading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading data...</p>
              </div>
            ) : (
              <div className="space-y-8">
                {activeTab === 'meals' && (
                  <>
                    {/* Meal Statistics */}
                    <div className="grid grid-cols-3 gap-4">
                      <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Total Carbs Logged</p>
                            <p className="text-3xl font-bold text-primary">{totalCarbs}g</p>
                          </div>
                          <Utensils className="w-8 h-8 text-primary/40" />
                        </div>
                      </Card>
                      <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Average per Meal</p>
                            <p className="text-3xl font-bold text-blue-400">{avgMealCarbs}g</p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-blue-400/40" />
                        </div>
                      </Card>
                      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground mb-1">Voice Logged</p>
                            <p className="text-3xl font-bold text-purple-400">{voiceLogged}</p>
                          </div>
                          <Mic className="w-8 h-8 text-purple-400/40" />
                        </div>
                      </Card>
                    </div>

                    {/* Food Knowledge Section */}
                    <div className="rounded-lg p-6 border border-emerald-500/30" style={{
                      background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(34,211,238,0.08) 100%)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 0 20px rgba(16,185,129,0.15), 0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-emerald-400" />
                        📘 Food Knowledge for Diabetic Patients
                      </h2>

                      {/* Card 1: Diabetes Food Insights */}
                      <div className="mb-4 p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(16,185,129,0.3)',
                      }}>
                        <button
                          onClick={() => setExpandedCard(expandedCard === 'insights' ? null : 'insights')}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-emerald-400" />
                            💡 Diabetes Food Insights
                          </span>
                          {expandedCard === 'insights' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedCard === 'insights' && (
                          <p className="text-sm text-muted-foreground mt-3 animate-fade-in">
                            {foodInsights[insightIndex]}
                          </p>
                        )}
                      </div>

                      {/* Card 2: Smart Food Suggestions */}
                      <div className="mb-4 p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(34,211,238,0.3)',
                      }}>
                        <button
                          onClick={() => setExpandedCard(expandedCard === 'suggestions' ? null : 'suggestions')}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Apple className="w-4 h-4 text-cyan-400" />
                            🥗 Smart Food Suggestions
                          </span>
                          {expandedCard === 'suggestions' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedCard === 'suggestions' && aiAnalysis && (
                          <div className="text-sm text-muted-foreground space-y-2 mt-3">
                            {aiAnalysis.suggestions.length > 0 ? (
                              aiAnalysis.suggestions.map((sugg: string, idx: number) => (
                                <div key={idx} className="flex gap-2"><span className="text-emerald-400">✓</span> {sugg}</div>
                              ))
                            ) : (
                              <p>No specific suggestions for this meal. Keep up the good choices!</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Card 3: Recommended Foods */}
                      <div className="p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}>
                        <button
                          onClick={() => setExpandedCard(expandedCard === 'foods' ? null : 'foods')}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-emerald-400" />
                            🍎 Recommended Foods for Diabetes
                          </span>
                          {expandedCard === 'foods' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {expandedCard === 'foods' && (
                          <div className="text-sm text-muted-foreground space-y-1 mt-3">
                            <div className="flex gap-2"><Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0" /> <span>Green leafy vegetables — low carbs, high nutrients</span></div>
                            <div className="flex gap-2"><Apple className="w-4 h-4 text-cyan-400 flex-shrink-0" /> <span>Low-GI fruits (apple, berries) — stable glucose</span></div>
                            <div className="flex gap-2"><Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" /> <span>High-fiber foods — slow digestion</span></div>
                            <div className="flex gap-2"><Heart className="w-4 h-4 text-red-400 flex-shrink-0" /> <span>Dal, millet, oats — protein & fiber</span></div>
                            <div className="flex gap-2"><Droplet className="w-4 h-4 text-blue-400 flex-shrink-0" /> <span>Lean proteins — muscle support</span></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Log Meal Form and Recent Meals */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <Card className="p-6 glass-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Utensils className="w-5 h-5 text-emerald-400" />
                            Log Your Meal
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Form {...form}>
                            <form className="space-y-4">
                              <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Meal Description</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., Breakfast - Oatmeal with berries"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="carbs"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Carbs (grams)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="protein"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Protein (grams)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="fat"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Fat (grams)</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        placeholder="0"
                                        {...field}
                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button
                                type="button"
                                onClick={onAnalyzeClick}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 font-semibold"
                              >
                                🧠 Analyze Nutrition
                              </Button>
                              {aiAnalysis && (
                                <div className="mt-4 p-3 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)' }}>
                                  <p className="text-xs font-semibold text-emerald-400 mb-2">AI Analysis:</p>
                                  <div className="space-y-1 text-xs text-muted-foreground">
                                    <div><span className="text-emerald-300">Calories:</span> {aiAnalysis.calories}</div>
                                    <div><span className="text-blue-300">GI:</span> {aiAnalysis.gi}</div>
                                    <div><span className="text-cyan-300">GL:</span> {aiAnalysis.gl}</div>
                                    <div><span className="text-yellow-300">Impact:</span> {aiAnalysis.impactCategory}</div>
                                  </div>
                                </div>
                              )}
                              <Button
                                type="button"
                                onClick={onMealLog}
                                className="w-full bg-primary hover:bg-primary/90"
                                disabled={createMealMutation.isPending}
                              >
                                {createMealMutation.isPending ? 'Logging...' : 'Log Meal'}
                              </Button>
                            </form>
                          </Form>
                        </CardContent>
                      </Card>

                      {/* Recent Meals */}
                      <Card className="p-6 glass-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            Recent Meals
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          {(mealsData as any[])?.length > 0 ? (
                            <div className="space-y-3">
                              {(mealsData as any[]).slice(0, 5).map((meal: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-secondary/50">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">{meal.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(meal.timestamp).toLocaleString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                      })}
                                    </p>
                                  </div>
                                  <div className="flex gap-2 text-xs flex-wrap">
                                    <span className="text-primary">{meal.carbs}g carbs</span>
                                    {meal.protein && <span className="text-emerald-400">{meal.protein}g protein</span>}
                                    {meal.fat && <span className="text-orange-400">{meal.fat}g fat</span>}
                                    {meal.calories && <span className="text-blue-400">{meal.calories} cal</span>}
                                  </div>
                                  {meal.impactCategory && <div className="mt-2 text-xs text-muted-foreground">Impact: {meal.impactCategory}</div>}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground text-center py-6">No meals logged yet</p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}

                {activeTab === 'activity' && (
                  <div className="space-y-6">
                    {/* Activity Recommendations Section */}
                    <div className="rounded-lg p-6 border border-cyan-500/30" style={{
                      background: 'linear-gradient(135deg, rgba(34,211,238,0.08) 0%, rgba(16,185,129,0.08) 100%)',
                      backdropFilter: 'blur(12px)',
                      boxShadow: '0 0 20px rgba(34,211,238,0.15), 0 4px 12px rgba(0,0,0,0.3)',
                    }}>
                      <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                        <ActivityIcon className="w-5 h-5 text-cyan-400" />
                        🏃 Daily Activity & Lifestyle Recommendations
                      </h2>

                      {/* Activity Card 1 */}
                      <div className="mb-4 p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(34,211,238,0.3)',
                      }}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            Activity Based on Your Logs
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          {totalCarbs > 60 ? "You logged high carbs today — take a 15-minute walk to increase glucose uptake." : "Keep up your activity! Aim for 30 minutes of movement today."}
                        </p>
                      </div>

                      {/* Activity Card 2 */}
                      <div className="mb-4 p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(59,130,246,0.3)',
                      }}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Heart className="w-4 h-4 text-red-400" />
                            🎯 Daily Activity Goals
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                          <div className="flex gap-2"><CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" /> 6,000–7,000 steps target</div>
                          <div className="flex gap-2"><CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" /> 20–30 minutes of movement</div>
                          <div className="flex gap-2"><Droplet className="w-4 h-4 text-cyan-400 flex-shrink-0" /> Stay hydrated: 2.5–3L water/day</div>
                          <div className="flex gap-2"><Moon className="w-4 h-4 text-purple-400 flex-shrink-0" /> Sleep 7–8 hours for better control</div>
                        </div>
                      </div>

                      {/* Activity Card 3 */}
                      <div className="p-4 rounded-lg" style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Leaf className="w-4 h-4 text-emerald-400" />
                            🧘 Diabetes-Friendly Lifestyle Tips
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                          <div>✓ Maintain consistent meal timing</div>
                          <div>✓ Never skip breakfast</div>
                          <div>✓ Take a 10-minute walk after meals</div>
                          <div>✓ Manage stress with meditation or yoga</div>
                          <div>✓ Monitor blood glucose regularly</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
