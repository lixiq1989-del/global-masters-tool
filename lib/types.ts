// ── Raw JSON types ────────────────────────────────────────────────

export type ProgramCountry = "UK" | "US" | "Hong Kong" | "Singapore" | "Australia" | "France";

export interface RawProgram {
  id: number;
  country: ProgramCountry;
  school_name: string;
  school_tier: string;
  program_name: string;
  program_category: string;
  degree_type: string;
  program_url: string;
  location: string;
  duration: string;
  tuition_fee: number | null;
  tuition_currency: string;
  ielts_requirement: string;
  gmat_required: boolean;
  gre_required: boolean;
  work_experience_required: boolean;
  program_overview: string;
  brand_score: number;
  admission_difficulty_score: number;
  location_score: number;
  overall_program_score: number;
  normalized_school_name: string;
  normalized_program_name: string;
  program_key: string;
  career_targets: string[];
  preferred_job_locations: string[];
}

export interface RawEmployment {
  school_name: string;
  program_name: string;
  program_key: string;
  data_scope: string;
  employment_rate: number | null;
  average_salary: number | null;
  salary_currency: string;
  top_employers: string;
  target_industries: string;
  target_roles: string;
  proof_summary: string;
  confidence_score: number;
  source_url: string;
  source_name: string;
}

export interface RawCase {
  id: number;
  school_name: string;
  program_name: string;
  applicant_country: string | null;
  applicant_background_school: string | null;
  applicant_major: string | null;
  applicant_gpa: string | null;
  applicant_language_score: string | null;
  applicant_gmat_gre: string | null;
  applicant_internships: string | null;
  admission_result: "admitted" | "rejected" | "waitlisted" | "unclear";
  entry_year: number | null;
  source_platform: string;
  source_url: string;
  case_summary: string;
  confidence_score: number;
  notes: string;
}

// ── User input ───────────────────────────────────────────────────

export type JobLocation = "UK" | "Europe" | "China" | "US" | "Hong Kong" | "Not sure";
export type CareerGoal =
  | "Investment Banking"
  | "Corporate Finance"
  | "Consulting"
  | "Data/AI"
  | "Marketing"
  | "Management"
  | "Product"
  | "Entrepreneurship";

export type UndergraduateRegion =
  | "China"
  | "UK"
  | "US"
  | "Hong Kong"
  | "Singapore"
  | "Australia"
  | "Canada"
  | "Europe"
  | "Other"
  | "";

export interface UserProfile {
  undergraduate_region: UndergraduateRegion;
  undergraduate_school: string;
  undergraduate_tier: string;      // auto-detected or manual fallback
  undergrad_prestige_score: number; // 1-10, auto-computed
  major: string;
  gpa: string;
  language_score: string;
  gmat_gre: string;
  internships: string;
  work_experience: string;
  preferred_categories: string[];
  target_countries: ProgramCountry[];
  budget_gbp: number | null;
  target_job_location: JobLocation | "";
  career_goal: CareerGoal | "";
}

// ── Output ───────────────────────────────────────────────────────

export type ReachLevel = "reach" | "match" | "safety";

export interface UserSubScores {
  prestige: number;   // undergrad prestige score (1-10)
  gpa: number;        // gpa score (1-10)
  gmat: number;       // gmat/gre bonus (0-2.5)
  experience: number; // internships + WE bonus (0-3.5)
  language: number;   // language bonus (0-1)
}

export interface RecommendedProgram {
  program: RawProgram;
  employment: RawEmployment | null;
  cases: RawCase[];
  reachLevel: ReachLevel;
  matchScore: number;
  userStrength: number;
  reasons: string[];
  career_match: number;    // 0 | 0.5 | 1
  location_match: number;  // 0 | 0.5 | 1
}
