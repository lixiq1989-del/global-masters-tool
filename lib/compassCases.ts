/**
 * Load compass_cases_slim.json and convert to RawCase format
 * Kept separate from cases.json — merged at runtime
 * Slim format: {cid, sn, sc, sa, co, ci, as, am, at, gpa, lang, gmat, ws, yr}
 */
import compassRaw from "@/data/compass_cases_slim.json";
import type { RawCase } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const raw = compassRaw as any[];

// School name mapping: compass English name → our normalized name
const SCHOOL_NAME_MAP: Record<string, string> = {
  "The University of Manchester": "University of Manchester",
  "The University of Edinburgh": "University of Edinburgh",
  "The University of Warwick": "University of Warwick",
  "The University of Sheffield": "University of Sheffield",
  "The London School of Economics and Political Science": "London School of Economics and Political Science",
  "Newcastle University(United Kingdom)": "Newcastle University",
  "University of York(United Kingdom)": "University of York",
  "City, University of London": "Bayes Business School",
  "SOAS, University of London": "SOAS University of London",
  "Goldsmiths, University of London": "Goldsmiths University of London",
  "University of Michigan, Ann Arbor": "University of Michigan",
  "University of California, Berkeley": "UC Berkeley",
  "University of California, San Diego": "UC San Diego",
  "University of California, Los Angeles": "UCLA",
  "University of Illinois at Urbana-Champaign": "UIUC",
  "The Hong Kong University of Science and Technology": "Hong Kong University of Science and Technology",
  "The Chinese University of Hong Kong": "Chinese University of Hong Kong",
  "The University of Hong Kong": "University of Hong Kong",
  "Hong Kong Polytechnic University": "Hong Kong Polytechnic University",
  "City University of Hong Kong": "City University of Hong Kong",
  "Hong Kong Baptist University": "Hong Kong Baptist University",
  "National University of Singapore": "National University of Singapore",
  "Nanyang Technological University": "Nanyang Technological University",
  "Singapore Management University": "Singapore Management University",
  "The University of Sydney": "University of Sydney",
  "The University of Melbourne": "University of Melbourne",
  "The Australian National University": "ANU",
  "University of New South Wales": "UNSW Sydney",
  "The University of Queensland": "University of Queensland",
  "Monash University": "Monash University",
  "The University of Adelaide": "University of Adelaide",
  "The University of Western Australia": "University of Western Australia",
};

function normalizeSchoolName(en: string | null): string {
  if (!en) return "";
  return SCHOOL_NAME_MAP[en] || en;
}

// Convert slim compass case to RawCase
function toRawCase(c: any, idx: number): RawCase {
  return {
    id: 900000 + idx,
    school_name: normalizeSchoolName(c.sn),
    program_name: "",
    applicant_country: "China",
    applicant_background_school: c.as || null,
    applicant_background_tier: c.at || null,
    applicant_major: c.am || null,
    applicant_gpa: c.gpa || null,
    applicant_language_score: c.lang || null,
    applicant_gmat_gre: c.gmat || null,
    applicant_internships: c.ws || null,
    admission_result: "admitted",
    entry_year: c.yr || null,
    source_platform: "compassedu",
    source_url: "",
    case_summary: "",
    confidence_score: 4,
    notes: "",
  } as any;
}

export const compassCases: RawCase[] = raw.map((c, i) => toRawCase(c, i));
