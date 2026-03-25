/**
 * Medication Panel Component
 * Left sidebar panel for searching, browsing, and adding medications
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, AlertCircle, CheckCircle2, Pill, Info, ChevronDown } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { getAuthToken } from '@/lib/api'; // Import auth utility

interface MedicationSearchResult {
  id: string;
  name: string;
  strength_mg: number;
  form: string;
  brand_names?: string[];
  branded?: string[]; // Legacy support
  class: string;
  notes: string;
  safety_flags?: string[];
  safety?: string[]; // Legacy support
  interactions: string[];
  match_score: number;
  similar?: Array<{ id: string; score: number; reason: string }>;
}

interface PatientMedication {
  medication_id: string;
  name: string;
  strength_mg: number;
  acknowledged: boolean;
  date_added: string;
}

export function MedicationPanel({
  onAddMedication,
  currentMedications = [],
  isDoctorMode = false,
}: {
  onAddMedication?: (med: MedicationSearchResult) => Promise<void>;
  currentMedications?: PatientMedication[];
  isDoctorMode?: boolean;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MedicationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDetails, setShowDetails] = useState<MedicationSearchResult | null>(null);
  const [selectedStrength, setSelectedStrength] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true); // Always show in sidebar by default
  const [expandedSafety, setExpandedSafety] = useState<string | null>(null);

  /**
   * Search medications
   */
  async function handleSearch() {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const token = getAuthToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `/api/medications/search?q=${encodeURIComponent(searchQuery)}&max=10`,
        { headers }
      );
      if (!response.ok) throw new Error('Search failed');

      const results = await response.json();
      setSearchResults(results);
    } catch (err: any) {
      toast({
        title: t('medications.messages.searchError'),
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Handle search on Enter key
   */
  function handleSearchKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      handleSearch();
    }
  }

  /**
   * Add medication
   */
  async function handleAddMedication(med: MedicationSearchResult) {
    if (!onAddMedication) {
      toast({
        title: t('medications.messages.info'),
        description: t('medications.messages.notConfigured'),
      });
      return;
    }

    try {
      await onAddMedication(med);
      toast({
        title: t('medications.messages.success'),
        description: `${med.name} ${t('medications.messages.addedToMedications')}`,
      });
      setShowDetails(null);
      setSearchResults([]);
      setSearchQuery('');
    } catch (err: any) {
      toast({
        title: t('medications.messages.error'),
        description: err.message,
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      {/* Panel Trigger Button (for sidebar) */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-2 text-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Pill className="w-4 h-4" />
        <span>{t('medications.title')}</span>
      </Button>

      {/* Search Panel */}
      {isOpen && (
        <Card className="mt-2 w-full max-w-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('medications.search.title')}</CardTitle>
            <CardDescription>{t('medications.search.description')}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Search Input */}
            <div className="space-y-2">
              <Label className="text-sm">{t('medications.search.searchMedication')}</Label>
              <div className="flex gap-2">
                <Input
                  placeholder={t('medications.search.searchByName')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSearch}
                  disabled={loading}
                  className="px-3"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Current Medications */}
            {currentMedications.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{t('medications.current.title')}</Label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {currentMedications.map((med) => (
                    <div
                      key={med.medication_id}
                      className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{med.name}</p>
                          <p className="text-xs text-muted-foreground">{med.strength_mg}mg</p>
                        </div>
                        {med.acknowledged && (
                          <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">{t('medications.search.results')}</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => setShowDetails(result)}
                      className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{result.name}</p>
                          <div className="flex gap-1 items-center text-xs text-muted-foreground mt-0.5">
                            <span>{result.strength_mg}mg</span>
                            <Badge variant="outline" className="text-xs py-0 px-1.5">
                              {result.class}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-xs font-medium">
                          {(result.match_score * 100).toFixed(0)}%
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {searchQuery && searchResults.length === 0 && !loading && (
              <div className="text-center py-6 text-sm text-muted-foreground">
                {t('medications.search.noResults')}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medication Details Dialog */}
      {showDetails && (
        <Dialog open={!!showDetails} onOpenChange={(open) => !open && setShowDetails(null)}>
          <DialogContent className="max-w-lg max-h-96 overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{showDetails.name}</DialogTitle>
              <DialogDescription>
                {showDetails.strength_mg}mg • {showDetails.form}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Class and Branded Names */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">{t('medications.details.class')}</p>
                <p className="text-sm">{showDetails.class}</p>
                {((showDetails.brand_names && showDetails.brand_names.length > 0) || (showDetails.branded && showDetails.branded.length > 0)) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('medications.details.brands')} {(showDetails.brand_names || showDetails.branded || []).join(', ')}
                  </p>
                )}
              </div>

              {/* Notes */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  {t('medications.details.howToUse')}
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-400">{showDetails.notes}</p>
              </div>

              {/* Safety Info */}
              {(showDetails.safety_flags || showDetails.safety || []).length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      setExpandedSafety(expandedSafety === 'safety' ? null : 'safety')
                    }
                    className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-300 w-full p-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {t('medications.details.safetyInformation')}
                    <ChevronDown
                      className={`w-4 h-4 ml-auto transition-transform ${
                        expandedSafety === 'safety' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSafety === 'safety' && (
                    <ul className="ml-6 space-y-1 text-xs text-amber-800 dark:text-amber-400">
                      {(showDetails.safety_flags || showDetails.safety || []).map((item, i) => (
                        <li key={i} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Interactions */}
              {showDetails.interactions.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      setExpandedSafety(expandedSafety === 'interactions' ? null : 'interactions')
                    }
                    className="flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-300 w-full p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <AlertCircle className="w-4 h-4" />
                    {t('medications.details.drugInteractions')}
                    <ChevronDown
                      className={`w-4 h-4 ml-auto transition-transform ${
                        expandedSafety === 'interactions' ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expandedSafety === 'interactions' && (
                    <ul className="ml-6 space-y-1 text-xs text-red-800 dark:text-red-400">
                      {showDetails.interactions.map((item, i) => (
                        <li key={i} className="list-disc">{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Similar Medications */}
              {showDetails.similar && showDetails.similar.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">{t('medications.details.similarAlternatives')}</p>
                  <ul className="space-y-1 text-xs">
                    {showDetails.similar.map((sim) => (
                      <li key={sim.id} className="text-muted-foreground">
                        • {sim.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetails(null)}>
                {t('medications.details.close')}
              </Button>
              <Button onClick={() => handleAddMedication(showDetails)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('medications.details.addToMedications')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default MedicationPanel;
