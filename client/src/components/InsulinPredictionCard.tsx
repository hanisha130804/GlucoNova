/**
 * Insulin Prediction Card Component
 * Displays insulin dose calculation with breakdown and explanation
 * Allows user to save/apply calculated doses with confirmation
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
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
import { apiRequest } from '@/lib/api'; // Import API utility

interface InsulinPredictionInputs {
  current_glucose_mgdl: string;
  carbs_g: string;
  icr: string;
  isf: string;
  correction_target: string;
  insulin_type: string;
  diabetes_type: string;
}

interface PredictionResult {
  raw_total_units: number;
  carb_units: number;
  correction_units: number;
  rounded_units: number;
  round_step: number;
  max_units: number;
  alert: boolean;
  alert_message?: string;
  confidence: number;
  explanation: string;
  provenance: Record<string, string>;
  safety_flags?: string[];
  med_adjustments?: Array<{ med_id: string; adjustment_pct: number; reason: string }>;
}

export function InsulinPredictionCard({
  defaultGlucose = '100',
  defaultCarbs = '0',
  defaultICR = '10',
  defaultISF = '50',
  onSave,
  userProfile,
}: {
  defaultGlucose?: string;
  defaultCarbs?: string;
  defaultICR?: string;
  defaultISF?: string;
  onSave?: (dose: any) => Promise<void>;
  userProfile?: any;
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Pre-fill from user profile
  const [inputs, setInputs] = useState<InsulinPredictionInputs>({
    current_glucose_mgdl: defaultGlucose,
    carbs_g: defaultCarbs,
    icr: userProfile?.icr?.toString() || defaultICR,
    isf: userProfile?.isf?.toString() || defaultISF,
    correction_target: '100',
    insulin_type: 'rapid',
    diabetes_type: userProfile?.diabetesType || 'Unknown',
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  /**
   * Validate input values
   */
  function validateInputs(): boolean {
    const errors: Record<string, string> = {};

    const glucose = parseFloat(inputs.current_glucose_mgdl);
    if (isNaN(glucose) || glucose < 20 || glucose > 1000) {
      errors.current_glucose_mgdl = 'Glucose must be between 20-1000 mg/dL';
    }

    const carbs = parseFloat(inputs.carbs_g);
    if (isNaN(carbs) || carbs < 0 || carbs > 2000) {
      errors.carbs_g = 'Carbs must be between 0-2000g';
    }

    const icr = parseFloat(inputs.icr);
    if (isNaN(icr) || icr < 1 || icr > 100) {
      errors.icr = 'ICR must be between 1-100';
    }

    const isf = parseFloat(inputs.isf);
    if (isNaN(isf) || isf < 1 || isf > 1000) {
      errors.isf = 'ISF must be between 1-1000';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /**
   * Calculate insulin dose
   */
  async function handleCalculate() {
    if (!validateInputs()) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await apiRequest('/predictions/insulin', 'POST', {
        current_glucose_mgdl: parseFloat(inputs.current_glucose_mgdl),
        carbs_g: parseFloat(inputs.carbs_g),
        icr: parseFloat(inputs.icr),
        isf: parseFloat(inputs.isf),
        correction_target: parseFloat(inputs.correction_target),
        insulin_type: inputs.insulin_type,
        diabetes_type: inputs.diabetes_type,
      });
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred while calculating insulin dose');
      toast({
        title: 'Calculation Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  /**
   * Save calculated dose
   */
  async function handleSaveDose() {
    if (!result) return;

    setLoading(true);
    try {
      if (onSave) {
        await onSave({
          rounded_units: result.rounded_units,
          carb_units: result.carb_units,
          correction_units: result.correction_units,
          current_glucose_mgdl: parseFloat(inputs.current_glucose_mgdl),
          carbs_g: parseFloat(inputs.carbs_g),
          insulin_type: inputs.insulin_type,
        });
      } else {
        await apiRequest('/predictions/record', 'POST', {
          rounded_units: result.rounded_units,
          carb_units: result.carb_units,
          correction_units: result.correction_units,
          current_glucose_mgdl: parseFloat(inputs.current_glucose_mgdl),
          carbs_g: parseFloat(inputs.carbs_g),
          insulin_type: inputs.insulin_type,
        });
      }

      toast({
        title: 'Success',
        description: `Planned dose of ${result.rounded_units} units recorded`,
      });

      setShowConfirmModal(false);
      setResult(null);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function getDoseColor(units: number) {
    if (units <= 6) return 'text-green-600 dark:text-green-400';
    if (units <= 12) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💉 Insulin Prediction Calculator
          </CardTitle>
          <CardDescription>
            Safe, explainable insulin dosing based on your glucose, carbs, and insulin parameters
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Input Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Current Glucose */}
            <div>
              <Label className="text-sm font-medium">Current Glucose (mg/dL)</Label>
              <Input
                type="number"
                min="20"
                max="1000"
                value={inputs.current_glucose_mgdl}
                onChange={(e) => setInputs({ ...inputs, current_glucose_mgdl: e.target.value })}
                placeholder="e.g., 160"
                className={validationErrors.current_glucose_mgdl ? 'border-red-500' : ''}
              />
              {validationErrors.current_glucose_mgdl && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.current_glucose_mgdl}</p>
              )}
            </div>

            {/* Carbs */}
            <div>
              <Label className="text-sm font-medium">Carbs (grams)</Label>
              <Input
                type="number"
                min="0"
                max="2000"
                value={inputs.carbs_g}
                onChange={(e) => setInputs({ ...inputs, carbs_g: e.target.value })}
                placeholder="e.g., 45"
                className={validationErrors.carbs_g ? 'border-red-500' : ''}
              />
              {validationErrors.carbs_g && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.carbs_g}</p>
              )}
            </div>

            {/* ICR */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                ICR (Units per gram carbs)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Insulin to Carb Ratio (ICR) tells you how much insulin to take per gram of carbs.
                      For example, 1:10 means 1 unit of insulin per 10g of carbs.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={inputs.icr}
                onChange={(e) => setInputs({ ...inputs, icr: e.target.value })}
                placeholder="e.g., 15"
                className={validationErrors.icr ? 'border-red-500' : ''}
              />
              {validationErrors.icr && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.icr}</p>
              )}
            </div>

            {/* ISF */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-1">
                ISF (mg/dL per unit)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Insulin Sensitivity Factor (ISF) tells you how much 1 unit of insulin will
                      lower your blood glucose. For example, an ISF of 40 means 1 unit lowers glucose by 40 mg/dL.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="number"
                min="1"
                max="1000"
                step="0.5"
                value={inputs.isf}
                onChange={(e) => setInputs({ ...inputs, isf: e.target.value })}
                placeholder="e.g., 50"
                className={validationErrors.isf ? 'border-red-500' : ''}
              />
              {validationErrors.isf && (
                <p className="text-xs text-red-500 mt-1">{validationErrors.isf}</p>
              )}
            </div>

            {/* Correction Target */}
            <div>
              <Label className="text-sm font-medium">Correction Target (mg/dL)</Label>
              <Input
                type="number"
                value={inputs.correction_target}
                onChange={(e) => setInputs({ ...inputs, correction_target: e.target.value })}
                placeholder="e.g., 100"
              />
            </div>

            {/* Insulin Type */}
            <div>
              <Label className="text-sm font-medium">Insulin Type</Label>
              <select
                value={inputs.insulin_type}
                onChange={(e) => setInputs({ ...inputs, insulin_type: e.target.value })}
                className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground text-sm"
              >
                <option value="rapid">Rapid-Acting</option>
                <option value="short">Short-Acting</option>
                <option value="intermediate">Intermediate-Acting</option>
                <option value="long">Long-Acting</option>
              </select>
            </div>
          </div>

          {/* Calculate Button */}
          <Button onClick={handleCalculate} disabled={loading} className="w-full md:w-auto">
            {loading ? 'Calculating...' : 'Calculate Insulin Dose'}
          </Button>

          {/* Error */}
          {error && (
            <div className="flex gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">Error</p>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-4">
              {/* Big Dose Number */}
              <div className="text-center p-6 rounded-lg bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-200 dark:border-slate-700">
                <p className="text-sm text-muted-foreground mb-2">Recommended Dose</p>
                <p className={`text-5xl font-bold ${getDoseColor(result.rounded_units)}`}>
                  {result.rounded_units}
                </p>
                <p className="text-sm text-muted-foreground mt-2">units ({inputs.insulin_type})</p>
              </div>

              {/* Breakdown */}
              <div className="space-y-2">
                <p className="text-sm font-semibold">Dose Breakdown</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <p className="text-xs text-muted-foreground">Carb Coverage</p>
                    <p className="text-lg font-semibold">
                      {result.carb_units.toFixed(1)} U
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <p className="text-xs text-muted-foreground">Correction</p>
                    <p className="text-lg font-semibold">
                      {(result.correction_units > 0 ? '+' : '') + result.correction_units.toFixed(1)} U
                    </p>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${result.confidence * 100}%` }}
                  />
                </div>
                <p className="text-sm font-medium">
                  {(result.confidence * 100).toFixed(0)}% Confidence
                </p>
              </div>

              {/* Explanation */}
              <details className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <summary className="cursor-pointer text-sm font-semibold text-blue-900 dark:text-blue-300">
                  How was this calculated?
                </summary>
                <p className="text-sm text-blue-800 dark:text-blue-400 mt-2">{result.explanation}</p>
              </details>

              {/* Alert */}
              {result.alert && result.alert_message && (
                <div className="flex gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 dark:text-amber-300">⚠️ Safety Alert</p>
                    <p className="text-sm text-amber-800 dark:text-amber-400">{result.alert_message}</p>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <Button
                onClick={() => setShowConfirmModal(true)}
                disabled={result.alert}
                className="w-full"
              >
                Save as Planned Dose
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Insulin Dose</DialogTitle>
            <DialogDescription>
              Please review the details before applying this insulin dose
            </DialogDescription>
          </DialogHeader>

          {result && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4">
                <p className="text-sm text-muted-foreground mb-1">Recommended Dose</p>
                <p className={`text-3xl font-bold ${getDoseColor(result.rounded_units)}`}>
                  {result.rounded_units} units
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Current Glucose</p>
                  <p className="font-medium">{inputs.current_glucose_mgdl} mg/dL</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carbs</p>
                  <p className="font-medium">{inputs.carbs_g}g</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Carb Units</p>
                  <p className="font-medium">{result.carb_units.toFixed(1)} U</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Correction</p>
                  <p className="font-medium">{result.correction_units.toFixed(1)} U</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800">
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                  ℹ️ Safety Reminder
                </p>
                <p className="text-xs text-blue-800 dark:text-blue-400">
                  Always check your glucose before administering insulin. If you have any doubts, consult your healthcare provider.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDose} disabled={loading}>
              {loading ? 'Recording...' : 'Apply Dose'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default InsulinPredictionCard;
