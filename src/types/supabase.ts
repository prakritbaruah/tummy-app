// TODO: add updated_at and deleted_at columns

export interface BowelEntryRow {
  id: string;
  user_id: string;
  occurred_at: string;
  urgency: 'Low' | 'Medium' | 'High';
  consistency: number;
  mucus_present: boolean;
  blood_present: boolean;
  notes: string | null;
  created_at: string;
}

export interface FoodEntryRow {
  id: string;
  user_id: string;
  occurred_at: string;
  name: string;
  quantity: string | null;
  meal_type: string | null;
  notes: string | null;
  tags: string[] | null;
  created_at: string;
}

export interface SymptomEntryRow {
  id: string;
  user_id: string;
  occurred_at: string;
  symptom: string;
  intensity: string;
  notes: string | null;
  created_at: string;
}
