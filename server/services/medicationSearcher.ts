/**
 * Medication Search Service
 * Provides local medication database search with intelligent matching
 */

import * as fs from 'fs';
import * as path from 'path';

interface MedicationSimilar {
  id: string;
  score: number;
  reason: string;
}

interface Medication {
  id: string;
  name: string;
  strength_mg: number;
  form: string;
  branded: string[];
  brand_names?: string[];
  class: string;
  indications: string[];
  notes: string;
  safety: string[];
  interactions: string[];
}

interface SearchResult {
  id: string;
  name: string;
  strength_mg: number;
  form: string;
  branded: string[];
  class: string;
  notes: string;
  safety: string[];
  interactions: string[];
  match_score: number;
  similar?: MedicationSimilar[];
}

// Load medications from JSON file
let medicationsDB: Record<string, Medication> = {};
let isLoaded = false;

function loadMedications(): Record<string, Medication> {
  if (isLoaded) {
    return medicationsDB;
  }

  const dbPath = path.join(process.cwd(), 'server', 'data', 'medications.json');
  try {
    const fileContent = fs.readFileSync(dbPath, 'utf-8');
    medicationsDB = JSON.parse(fileContent);
    isLoaded = true;
    return medicationsDB;
  } catch (error) {
    console.error('Failed to load medications database:', error);
    // Return an empty object on failure
    medicationsDB = {};
    isLoaded = true;
    return medicationsDB;
  }
}

/**
 * Normalize string for comparison
 */
function normalize(str: string): string {
  return str.toLowerCase().replace(/[^\w\s]/g, '').trim();
}

/**
 * Calculate string similarity (0 to 1)
 */
function stringSimilarity(str1: string, str2: string): number {
  const s1 = normalize(str1);
  const s2 = normalize(str2);

  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Check if one contains the other
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;

  // Levenshtein distance (simplified)
  let matches = 0;
  const minLen = Math.min(s1.length, s2.length);
  for (let i = 0; i < minLen; i++) {
    if (s1[i] === s2[i]) matches++;
  }

  return matches / Math.max(s1.length, s2.length);
}

/**
 * Search medications by query
 */
export function searchMedications(query: string, maxResults: number = 10): SearchResult[] {
  const medications = loadMedications();
  const normalizedQuery = normalize(query);
  const results: SearchResult[] = [];

  for (const [id, med] of Object.entries(medications)) {
    let score = 0;
    let matchType = '';

    // Exact name match (highest priority)
    if (normalize(med.name) === normalizedQuery) {
      score = 1.0;
      matchType = 'exact_name';
    }
    // Name contains query
    else if (normalize(med.name).includes(normalizedQuery)) {
      score = 0.9;
      matchType = 'name_contains';
    }
    // Branded name match
    const brandedNames = med.branded || med.brand_names || [];
    if (brandedNames.some(b => normalize(b) === normalizedQuery)) {
      score = 0.85;
      matchType = 'branded';
    }
    // String similarity
    else {
      const nameSimilarity = stringSimilarity(med.name, query);
      if (nameSimilarity > 0.6) {
        score = nameSimilarity * 0.8;
        matchType = 'similar_name';
      }
    }

    // Boost score for exact strength match if query contains numbers
    const strengthMatch = query.match(/\d+/);
    if (strengthMatch && med.strength_mg === parseInt(strengthMatch[0])) {
      score = Math.min(score + 0.1, 1.0);
    }

    if (score > 0.4) {
      const similar = findSimilarMedications(id, med, medications);
      results.push({
        id: med.id,
        name: med.name,
        strength_mg: med.strength_mg,
        form: med.form,
        branded: med.branded || med.brand_names || [],
        class: med.class,
        notes: med.notes,
        safety: med.safety,
        interactions: med.interactions,
        match_score: parseFloat(score.toFixed(2)),
        similar: similar.length > 0 ? similar : undefined,
      });
    }
  }

  // Sort by match score and return top results
  return results
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, maxResults);
}

/**
 * Find similar medications (same class or same indication)
 */
function findSimilarMedications(
  currentId: string,
  currentMed: Medication,
  allMeds: Record<string, Medication>
): MedicationSimilar[] {
  const similar: MedicationSimilar[] = [];

  for (const [id, med] of Object.entries(allMeds)) {
    if (id === currentId) continue;

    let score = 0;
    let reason = '';

    // Same drug class
    if (med.class === currentMed.class && normalize(med.name) !== normalize(currentMed.name)) {
      score += 0.7;
      reason = `Same class: ${med.class}`;
    }

    // Same indication
    const sharedIndications = med.indications.filter(ind =>
      currentMed.indications.some(curr => normalize(curr) === normalize(ind))
    );

    if (sharedIndications.length > 0) {
      score += 0.6;
      if (reason) reason += ' | ';
      reason += `Treats: ${sharedIndications[0]}`;
    }

    // Same active ingredient (for insulin types or generic names)
    if (normalize(med.name) === normalize(currentMed.name) && med.strength_mg !== currentMed.strength_mg) {
      score += 0.8;
      reason = `Same drug, different strength`;
    }

    if (score > 0) {
      similar.push({
        id: med.id,
        score: parseFloat(score.toFixed(2)),
        reason,
      });
    }
  }

  return similar
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

/**
 * Get medication by ID
 */
export function getMedicationById(id: string): Medication | null {
  const medications = loadMedications();
  return medications[id] || null;
}

/**
 * Get all medications (for seeding/debugging)
 */
export function getAllMedications(): Record<string, Medication> {
  return loadMedications();
}

/**
 * Get medication classes
 */
export function getMedicationClasses(): string[] {
  const medications = loadMedications();
  const classes = new Set<string>();

  for (const med of Object.values(medications)) {
    classes.add(med.class);
  }

  return Array.from(classes).sort();
}

/**
 * Get medications by class
 */
export function getMedicationsByClass(className: string): SearchResult[] {
  const medications = loadMedications();
  const results: SearchResult[] = [];

  for (const [id, med] of Object.entries(medications)) {
    if (med.class === className) {
      const similar = findSimilarMedications(id, med, medications);
      results.push({
        id: med.id,
        name: med.name,
        strength_mg: med.strength_mg,
        form: med.form,
        branded: med.branded || med.brand_names || [],
        class: med.class,
        notes: med.notes,
        safety: med.safety,
        interactions: med.interactions,
        match_score: 1.0,
        similar: similar.length > 0 ? similar : undefined,
      });
    }
  }

  return results;
}
