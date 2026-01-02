import { useState } from 'react';
import AppSidebar from '@/components/AppSidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Pill, Clock, Plus, X, Search } from 'lucide-react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { searchDiabetesMedicines, type DiabetesMedicine } from '@/data/diabetesMedicines';
import { Badge } from '@/components/ui/badge';

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  category?: string;
}

export default function MedicationsPage() {
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<DiabetesMedicine | null>(null);
  
  // Form fields
  const [medicationName, setMedicationName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [timing, setTiming] = useState('');

  const { data: medications, isLoading } = useQuery<{ medications: Medication[] }>({
    queryKey: ['/api/medications'],
  });

  const addMutation = useMutation({
    mutationFn: async (newMed: Omit<Medication, 'id'>) => {
      const res = await apiRequest('/api/medications', {
        method: 'POST',
        body: JSON.stringify(newMed),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Medication added successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
      resetForm();
      setShowAddForm(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to add medication',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/medications/${id}`, {
        method: 'DELETE',
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Medication removed successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/medications'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to remove medication',
        variant: 'destructive',
      });
    },
  });

  const resetForm = () => {
    setMedicationName('');
    setDosage('');
    setFrequency('');
    setTiming('');
    setSelectedMedicine(null);
    setSearchQuery('');
    setShowSuggestions(false);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setMedicationName(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSelectMedicine = (medicine: DiabetesMedicine) => {
    setSelectedMedicine(medicine);
    setMedicationName(medicine.name);
    setSearchQuery(medicine.name);
    setShowSuggestions(false);
    
    // Auto-fill dosage with first common dosage if available
    if (medicine.commonDosages.length > 0) {
      setDosage(medicine.commonDosages[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!medicationName || !dosage || !frequency) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    addMutation.mutate({
      name: medicationName,
      dosage,
      frequency,
      timing,
      category: selectedMedicine?.category,
    });
  };

  const suggestions = searchDiabetesMedicines(searchQuery);

  return (
    <div className="flex h-screen w-full bg-gradient-to-br from-neutral-900 via-zinc-900 to-neutral-950 relative overflow-hidden">
      <AppSidebar />
      <div className="flex flex-col flex-1 overflow-hidden relative" style={{ zIndex: 10, marginLeft: '320px' }}>
        <header className="flex items-center justify-between border-b border-border" style={{ height: '72px', padding: '0 24px' }}>
          <div className="flex items-center gap-4">
            <Pill className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Medications</h2>
          </div>
          <Button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-add-medication"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Medication
          </Button>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="w-full" style={{ padding: '24px 32px' }}>
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-1">My Medications</h1>
              <p className="text-muted-foreground">Track and manage your diabetes medications</p>
            </div>

            {showAddForm && (
              <Card className="mb-6 border-primary/20" data-testid="card-add-medication">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Add New Medication</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowAddForm(false);
                        resetForm();
                      }}
                      data-testid="button-close-form"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </CardTitle>
                  <CardDescription>
                    Search for diabetes medications and add them to your list
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                      <Label htmlFor="medication-search">Medication Name *</Label>
                      <div className="relative mt-2">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="medication-search"
                          type="text"
                          placeholder="Search for diabetes medications..."
                          value={searchQuery}
                          onChange={(e) => handleSearchChange(e.target.value)}
                          onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
                          className="pl-9"
                          data-testid="input-medication-search"
                        />
                      </div>
                      
                      {showSuggestions && suggestions.length > 0 && (
                        <div 
                          className="absolute z-50 w-full mt-1 rounded-lg border border-border bg-background shadow-lg max-h-72 overflow-y-auto"
                          data-testid="suggestions-list"
                        >
                          {suggestions.map((medicine, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => handleSelectMedicine(medicine)}
                              className="w-full px-4 py-3 text-left hover:bg-secondary/50 transition-colors border-b border-border last:border-0"
                              data-testid={`suggestion-${index}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <p className="font-semibold text-foreground">{medicine.name}</p>
                                  {medicine.genericName && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                      {medicine.genericName}
                                    </p>
                                  )}
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {medicine.description}
                                  </p>
                                </div>
                                <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                  {medicine.category}
                                </Badge>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {selectedMedicine && (
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm font-medium text-foreground mb-1">
                          Selected: {selectedMedicine.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedMedicine.description}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="dosage">Dosage *</Label>
                        <Input
                          id="dosage"
                          type="text"
                          placeholder="e.g., 500mg"
                          value={dosage}
                          onChange={(e) => setDosage(e.target.value)}
                          className="mt-2"
                          data-testid="input-dosage"
                        />
                        {selectedMedicine && selectedMedicine.commonDosages.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {selectedMedicine.commonDosages.map((dose, idx) => (
                              <Badge
                                key={idx}
                                variant="outline"
                                className="cursor-pointer text-xs"
                                onClick={() => setDosage(dose)}
                                data-testid={`badge-dosage-${idx}`}
                              >
                                {dose}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="frequency">Frequency *</Label>
                        <Input
                          id="frequency"
                          type="text"
                          placeholder="e.g., Twice daily"
                          value={frequency}
                          onChange={(e) => setFrequency(e.target.value)}
                          className="mt-2"
                          data-testid="input-frequency"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="timing">Timing (optional)</Label>
                      <Input
                        id="timing"
                        type="text"
                        placeholder="e.g., Morning & Evening with meals"
                        value={timing}
                        onChange={(e) => setTiming(e.target.value)}
                        className="mt-2"
                        data-testid="input-timing"
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={addMutation.isPending}
                      data-testid="button-submit-medication"
                    >
                      {addMutation.isPending ? 'Adding...' : 'Add Medication'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {isLoading ? (
              <p className="text-center text-muted-foreground py-8">Loading medications...</p>
            ) : medications?.medications && medications.medications.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {medications.medications.map((med) => (
                  <Card key={med.id} className="glass-card relative" data-testid={`medication-${med.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="flex items-center gap-2">
                            <Pill className="w-5 h-5 text-primary" />
                            {med.name}
                          </CardTitle>
                          <CardDescription className="mt-1">{med.dosage}</CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(med.id)}
                          disabled={deleteMutation.isPending}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                          data-testid={`button-delete-${med.id}`}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      {med.category && (
                        <Badge variant="secondary" className="mt-2 w-fit text-xs">
                          {med.category}
                        </Badge>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span>{med.frequency}</span>
                      </div>
                      {med.timing && (
                        <div className="text-sm text-muted-foreground pl-6">
                          {med.timing}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="text-center py-12">
                <CardContent>
                  <Pill className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">No medications added yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Click "Add Medication" to start tracking your diabetes medications
                  </p>
                  <Button 
                    onClick={() => setShowAddForm(true)}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Medication
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
