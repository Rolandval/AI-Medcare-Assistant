/**
 * TypeScript interfaces for all API responses.
 * Mirrors backend Pydantic schemas from app/schemas/feed.py
 */

// ---- Auth ----
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ---- User ----
export interface User {
  id: string;
  name: string;
  email: string | null;
  telegram_id: number | null;
  family_id: string | null;
  is_family_admin: boolean;
  avatar_url: string | null;
  birth_date: string | null;
  gender: string | null;
  occupation: string | null;
  lifestyle: string | null;
  location_city: string | null;
  onboarding_completed: boolean;
  morning_survey_hour: number | null;
  evening_survey_hour: number | null;
}

export interface HealthProfile {
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  chronic_conditions: string[];
  allergies: string[];
  current_medications: string[];
  past_surgeries: string[];
  physical_features: string[];
  professional_risks: string[];
  health_goals: string[];
  additional_notes: string | null;
}

// ---- AI Cards / Feed ----
export interface AICard {
  id: string;
  doctor_id: string;
  doctor_name: string;
  doctor_emoji: string;
  doctor_color: string;
  card_type: "survey" | "meal_suggestion" | "challenge" | "insight" | "chat_prompt";
  round_type: "morning" | "afternoon" | "evening";
  title: string;
  body: string;
  metadata?: Record<string, any>;
  action_type?: string;
  status: "pending" | "acted" | "dismissed" | "expired";
  created_at: string;
}

export interface CardActionResponse {
  ok: boolean;
  status: string;
  new_achievements: Achievement[];
}

// ---- Doctors ----
export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  emoji: string;
  color: string;
  personality: string;
  motto: string;
}

export interface DoctorProfile extends Doctor {
  card_count: number;
  chat_count: number;
  recent_cards: AICard[];
}

// ---- Chat ----
export interface ChatMessage {
  id: string;
  doctor_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface ChatSyncResponse {
  message: ChatMessage;
  doctor_name: string;
  doctor_emoji: string;
}

// ---- Gamification ----
export interface HealthScore {
  total: number;
  breakdown: Record<
    string,
    { score: number; max: number; label: string }
  >;
}

export interface Streak {
  type: string;
  label: string;
  emoji: string;
  current: number;
  best: number;
  last_date: string | null;
  active: boolean;
}

export interface Achievement {
  key: string;
  name: string;
  description: string;
  emoji: string;
  points: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface GamificationSummary {
  score: HealthScore;
  streaks: Streak[];
  achievements: Achievement[];
}

// ---- Meals / Nutrition ----
export interface FoodItem {
  name: string;
  amount?: string;
  calories?: number;
}

export interface Meal {
  id: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack" | null;
  photo_url: string | null;
  description: string | null;
  calories: number | null;
  proteins_g: number | null;
  fats_g: number | null;
  carbs_g: number | null;
  fiber_g: number | null;
  health_score: number | null;
  ai_comment: string | null;
  recognition_status: "pending" | "processing" | "done" | "failed" | "manual";
  food_items: FoodItem[];
  confidence: number | null;
  eaten_at: string | null;
  created_at: string | null;
}

export interface DayTotals {
  calories: number;
  proteins_g: number;
  fats_g: number;
  carbs_g: number;
}

export interface MealsTodayResponse {
  meals: Meal[];
  totals: DayTotals;
}

// ---- Documents ----
export interface DocumentIndicator {
  name: string;
  value: number | null;
  unit: string | null;
  reference_range: string | null;
  status: "normal" | "high" | "low" | "critical" | null;
  status_label: string | null;
}

export interface DocumentFlag {
  indicator: string;
  value: string | null;
  concern: string | null;
}

export interface MedicalDocument {
  id: string;
  doc_type: string;
  title: string | null;
  ocr_status: "pending" | "processing" | "done" | "failed";
  ai_analysis: Record<string, any> | null;
  ai_flags: DocumentFlag[] | null;
  parsed_data: Record<string, any> | null;
  created_at: string;
}

export interface DocumentDetail extends MedicalDocument {
  file_url: string | null;
  file_name: string | null;
  indicators: DocumentIndicator[];
  ai_summary: string | null;
  document_date: string | null;
  lab_name: string | null;
}

// ---- Family ----
export interface FamilyMember {
  id: string;
  name: string;
  birth_date: string | null;
  gender: string | null;
  avatar_url: string | null;
  is_admin: boolean;
}

export interface Family {
  id: string;
  name: string;
  invite_code: string | null;
  members: FamilyMember[];
}

export interface MemberHealth {
  member_id: string;
  member_name: string;
  latest_metrics: Record<string, any>;
  recent_flags: DocumentFlag[];
}

// ---- Health Metrics ----
export interface HealthMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  source: string;
  recorded_at: string;
}

// ---- Notifications ----
export interface MedicationReminder {
  id: string;
  name: string;
  dosage: string | null;
  emoji: string;
  times: string[];
  days_of_week: number[];
  instructions: string | null;
  is_active: boolean;
}
