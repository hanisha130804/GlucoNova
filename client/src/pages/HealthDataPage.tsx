import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { healthDataSchema, type InsertHealthData } from '@shared/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Droplet, TrendingUp, User, Calendar, Activity, Heart } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/lib/auth-context';

export default function HealthDataPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  
  const form = useForm<InsertHealthData>({
    resolver: zodResolver(healthDataSchema),
    defaultValues: {
      glucose: 0,
      insulin: 0,
      carbs: 0,
      activityLevel: 'moderate',
      notes: '',
    },
  });

  const { data: profileData } = useQuery({
    queryKey: ['/api/profile'],
  }) as { data?: any };

  const { data: reportsData } = useQuery({
    queryKey: ['/api/reports'],
  }) as { data?: any };

  const createHealthDataMutation = useMutation({
    mutationFn: async (data: InsertHealthData) => {
      const response = await apiRequest('/api/health-data', { method: 'POST', body: JSON.stringify(data) });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Health data logged successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/health-data/latest'] });
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to log health data',
        variant: 'destructive',
      });
    },
  });

  const { data: healthHistory } = useQuery({
    queryKey: ['/api/health-data'],
  }) as { data?: any };

  const onSubmit = (data: InsertHealthData) => {
    createHealthDataMutation.mutate(data);
  };

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '280px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Droplet className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">My Details</h2>
          </div>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">My Profile & Health Data</h1>
              <p className="text-muted-foreground">View your profile and track your health metrics</p>
            </div>

            {/* Patient Profile Card */}
            <Card className="p-6 mb-6 bg-gradient-to-br from-primary/5 to-emerald-500/5 border-primary/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Patient Profile</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="w-4 h-4" />
                    <span>Name</span>
                  </div>
                  <p className="font-semibold">{user?.name || 'Not set'}</p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Date of Birth</span>
                  </div>
                  <p className="font-semibold">
                    {(profileData as any)?.profile?.dateOfBirth 
                      ? new Date((profileData as any).profile.dateOfBirth).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span>Weight</span>
                  </div>
                  <p className="font-semibold">
                    {(profileData as any)?.profile?.weight 
                      ? `${(profileData as any).profile.weight} kg`
                      : 'Not set'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Activity className="w-4 h-4" />
                    <span>Height</span>
                  </div>
                  <p className="font-semibold">
                    {(profileData as any)?.profile?.height 
                      ? `${(profileData as any).profile.height} cm`
                      : 'Not set'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Heart className="w-4 h-4" />
                    <span>Diabetes Type</span>
                  </div>
                  <p className="font-semibold">
                    {(profileData as any)?.profile?.diabetesType || 'Not set'}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Droplet className="w-4 h-4" />
                    <span>Medical Reports</span>
                  </div>
                  <p className="font-semibold">
                    {(reportsData as any)?.reports?.length || 0} uploaded
                  </p>
                </div>
              </div>
              
              {(profileData as any)?.profile?.emergencyContact && (
                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Emergency Contact</p>
                  <p className="font-semibold">{(profileData as any).profile.emergencyContact}</p>
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Droplet className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">New Entry</h2>
                </div>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="glucose"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Glucose Level (mg/dL)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter glucose level"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-glucose"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="insulin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Insulin Dose (units)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Enter insulin dose"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-insulin"
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
                          <FormLabel>Carbohydrates (grams)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Enter carbs consumed"
                              {...field}
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              data-testid="input-carbs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="activityLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Activity Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-activity">
                                <SelectValue placeholder="Select activity level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="sedentary">Sedentary</SelectItem>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="moderate">Moderate</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="very_active">Very Active</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Add any additional notes..."
                              {...field}
                              data-testid="input-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createHealthDataMutation.isPending}
                      data-testid="button-submit"
                    >
                      {createHealthDataMutation.isPending ? 'Logging...' : 'Log Health Data'}
                    </Button>
                  </form>
                </Form>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold">Recent Entries</h2>
                </div>

                <div className="space-y-3">
                  {(healthHistory as any)?.healthData?.slice(0, 5).map((entry: any) => (
                    <div
                      key={entry._id}
                      className="p-4 rounded-lg bg-secondary/50 space-y-2"
                      data-testid={`entry-${entry._id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Glucose:</span>
                          <span className="ml-1 font-semibold" data-testid={`text-glucose-${entry._id}`}>
                            {entry.glucose} mg/dL
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Insulin:</span>
                          <span className="ml-1 font-semibold" data-testid={`text-insulin-${entry._id}`}>
                            {entry.insulin}U
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Carbs:</span>
                          <span className="ml-1 font-semibold" data-testid={`text-carbs-${entry._id}`}>
                            {entry.carbs}g
                          </span>
                        </div>
                      </div>
                      {entry.notes && (
                        <p className="text-sm text-muted-foreground mt-2">{entry.notes}</p>
                      )}
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No entries yet. Log your first health data!
                    </p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
