import { BaseEntry } from '@/types/common';

export const SYMPTOMS = [
  'Abdominal Pain',
  'Bloating',
  'Nausea',
  'Vomiting',
  'Gas',
  'Heartburn',
  'Loss of Appetite',
  'Fatigue',
] as const;

export type SymptomName = typeof SYMPTOMS[number];
export type Severity = 'Mild' | 'Moderate' | 'Severe';

// Base type for symptom data
export interface SymptomData {
  name: SymptomName;
  severity: Severity;
}

// Full entry type with metadata
export interface SymptomEntry extends BaseEntry, SymptomData {}

// State type
export interface SymptomsState {
  entries: SymptomEntry[];
  status: 'idle' | 'loading' | 'error';
  error?: string | null;
} 