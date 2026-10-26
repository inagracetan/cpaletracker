import { AssessmentRecord, AssessmentTopicItem, SubjectCode } from '../types';
import { DEFAULT_TOPICS } from './defaultTopics';

const FIRST_PB_SEED: AssessmentTopicItem[] = [
  {
    "id": "fpb-far-1",
    "topicCode": "FAR-01",
    "name": "Introduction to Accountancy Profession",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-2",
    "topicCode": "FAR-02",
    "name": "Preface to PFRS",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-3",
    "topicCode": "FAR-03",
    "name": "Conceptual Framework",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-4",
    "topicCode": "FAR-04",
    "name": "Accounting Process",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-5",
    "topicCode": "FAR-05",
    "name": "Accounting Changes and Correction of Error",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-6",
    "topicCode": "FAR-06",
    "name": "Single Entry and Cash to Accrual Basis",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-7",
    "topicCode": "FAR-07",
    "name": "Cash and Cash Equivalents",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-far-8",
    "topicCode": "FAR-11",
    "name": "Inventories",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-9",
    "topicCode": "FAR-12",
    "name": "Audit of Inventories",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-10",
    "topicCode": "FAR-13",
    "name": "Biological Assets",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-11",
    "topicCode": "FAR-14",
    "name": "PPE - Recognition and Initial Measurement",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-12",
    "topicCode": "FAR-15",
    "name": "PPE - Subsequent Measurement",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-13",
    "topicCode": "FAR-16",
    "name": "Government Grant",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-14",
    "topicCode": "FAR-17",
    "name": "Borrowing Costs",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-15",
    "topicCode": "FAR-18",
    "name": "Audit of PPE",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-16",
    "topicCode": "FAR-19",
    "name": "Depletion of Natural Resources",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-17",
    "topicCode": "FAR-22",
    "name": "Audit of Intangible Assets",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-18",
    "topicCode": "FAR-23",
    "name": "Investment in Equity Securities",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-19",
    "topicCode": "FAR-24",
    "name": "Investment in Associate",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-20",
    "topicCode": "FAR-25",
    "name": "Investment in Debt Securities",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-21",
    "topicCode": "FAR-26",
    "name": "Investment Property",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-22",
    "topicCode": "FAR-27",
    "name": "Funds and Other Investments",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-23",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "Audit of Investments",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-24",
    "topicCode": "FAR-22",
    "name": "Audit of Intangible Assets",
    "subject": "FAR",
    "isCompleted": false
  },
  {
    "id": "fpb-far-25",
    "topicCode": "FAR-09",
    "name": "Receivables",
    "subject": "FAR",
    "isCompleted": true
  },
  {
    "id": "fpb-afar-26",
    "topicCode": "AFAR-01",
    "name": "Partnership Accounting",
    "subject": "AFAR",
    "isCompleted": true
  },
  {
    "id": "fpb-afar-27",
    "topicCode": "AFAR-02",
    "name": "Corporate Liquidation",
    "subject": "AFAR",
    "isCompleted": true
  },
  {
    "id": "fpb-afar-28",
    "topicCode": "AFAR-03",
    "name": "Revenue Recognition",
    "subject": "AFAR",
    "isCompleted": true
  },
  {
    "id": "fpb-afar-29",
    "topicCode": "AFAR-04",
    "name": "HOBA",
    "subject": "AFAR",
    "isCompleted": false
  },
  {
    "id": "fpb-afar-30",
    "topicCode": "AFAR-05",
    "name": "Business Combination",
    "subject": "AFAR",
    "isCompleted": false
  },
  {
    "id": "fpb-afar-31",
    "topicCode": "AFAR-06",
    "name": "Separate and Consolidated",
    "subject": "AFAR",
    "isCompleted": false
  },
  {
    "id": "fpb-ms-32",
    "topicCode": "MS-01",
    "name": "Basic Considerations in MAS",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-33",
    "topicCode": "MS-02",
    "name": "Variable and Absorption Costing",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-34",
    "topicCode": "MS-03",
    "name": "CVP and BEP Analysis",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-35",
    "topicCode": "MS-06",
    "name": "Standard Cost and Variances",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-36",
    "topicCode": "MS-05",
    "name": "Budgeting",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-37",
    "topicCode": "MS-07",
    "name": "Performance Evaluation",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-ms-38",
    "topicCode": "MS-08",
    "name": "Pricing Decisions",
    "subject": "MS",
    "isCompleted": false
  },
  {
    "id": "fpb-ms-39",
    "topicCode": "MS-09",
    "name": "Relevant Costing",
    "subject": "MS",
    "isCompleted": false
  },
  {
    "id": "fpb-ms-40",
    "topicCode": "MS-04",
    "name": "Financial Statement Analysis",
    "subject": "MS",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-41",
    "topicCode": "TAX-01",
    "name": "General Principles",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-42",
    "topicCode": "TAX-02",
    "name": "Taxes, Laws, and Administration",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-43",
    "topicCode": "TAX-03",
    "name": "Introduction to Income Taxation",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-44",
    "topicCode": "TAX-04",
    "name": "Final Income Taxation",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-45",
    "topicCode": "TAX-05",
    "name": "Capital Gains Tax",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-46",
    "topicCode": "TAX-06",
    "name": "Regular Income Tax - GI",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-47",
    "topicCode": "TAX-07",
    "name": "Compensation Income",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-48",
    "topicCode": "TAX-08",
    "name": "Fringe Benefits",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-49",
    "topicCode": "TAX-09",
    "name": "Dealings in Properties",
    "subject": "TAX",
    "isCompleted": true
  },
  {
    "id": "fpb-tax-50",
    "topicCode": "TAX-10",
    "name": "Items of Deductions",
    "subject": "TAX",
    "isCompleted": false
  },
  {
    "id": "fpb-tax-51",
    "topicCode": "TAX-11",
    "name": "Optional Standard Deduction",
    "subject": "TAX",
    "isCompleted": false
  },
  {
    "id": "fpb-tax-52",
    "topicCode": "TAX-12",
    "name": "Individual Income Taxation",
    "subject": "TAX",
    "isCompleted": false
  },
  {
    "id": "fpb-tax-53",
    "topicCode": "TAX-13",
    "name": "Corporate Income Tax",
    "subject": "TAX",
    "isCompleted": false
  },
  {
    "id": "fpb-aud-54",
    "topicCode": "AUD-01",
    "name": "Practice and Regulation",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-55",
    "topicCode": "AUD-02",
    "name": "Code of Ethics",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-56",
    "topicCode": "AUD-03",
    "name": "Fundamentals of Assurance Services",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-57",
    "topicCode": "AUD-04",
    "name": "Introduction to Auditing",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-58",
    "topicCode": "AUD-05",
    "name": "Preliminary Engagement Activities",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-59",
    "topicCode": "AUD-06",
    "name": "Audit Planning",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-60",
    "topicCode": "AUD-07",
    "name": "Study and Evaluation of Internal Control",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-61",
    "topicCode": "AUD-08",
    "name": "Auditing in an IT Environment",
    "subject": "AUD",
    "isCompleted": true
  },
  {
    "id": "fpb-aud-62",
    "topicCode": "AUD-09",
    "name": "Transaction Cycles",
    "subject": "AUD",
    "isCompleted": false
  },
  {
    "id": "fpb-aud-63",
    "topicCode": "FAR-10",
    "name": "Audit of Receivables",
    "subject": "AUD",
    "isCompleted": false
  },
  {
    "id": "fpb-aud-64",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "Audit of Investments",
    "subject": "AUD",
    "isCompleted": false
  },
  {
    "id": "fpb-aud-65",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "Audit of Property, Plant, and Equipment",
    "subject": "AUD",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-66",
    "topicCode": "RFBT-01",
    "name": "Obligation",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-67",
    "topicCode": "RFBT-02",
    "name": "Contracts",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-68",
    "topicCode": "RFBT-03",
    "name": "Sales",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-69",
    "topicCode": "RFBT-04",
    "name": "Credit Transactions",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-70",
    "topicCode": "RFBT-14",
    "name": "Banking Laws",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-71",
    "topicCode": "RFBT-19",
    "name": "Labor Law",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-72",
    "topicCode": "RFBT-20",
    "name": "Social Security Law",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-73",
    "topicCode": "RFBT-09",
    "name": "Government Procurement Act",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-74",
    "topicCode": "RFBT-08",
    "name": "Philippine Competition Act",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-75",
    "topicCode": "RFBT-06",
    "name": "Consumer Protection Act & Lemon Law",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-76",
    "topicCode": "RFBT-12",
    "name": "Insurance",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-77",
    "topicCode": "RFBT-05",
    "name": "Anti-Bouncing Checks Law",
    "subject": "RFBT",
    "isCompleted": true
  },
  {
    "id": "fpb-rfbt-78",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "Bank Secrecy",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-79",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "Truth in Lending Act",
    "subject": "RFBT",
    "isCompleted": false
  },
  {
    "id": "fpb-rfbt-80",
    "topicCode": "To add a topic, type it in the next empty row (Topic, TOS area, ≈ Items, Exam weight, Study days). To rename one, type over it. To remove one, clear its row. Codes fill in by themselves. Check \"In your plan?\" (or Setup → Topic order) so every topic gets a study day.",
    "name": "PDIC Law",
    "subject": "RFBT",
    "isCompleted": false
  }
];

const all165AsItems = (prefix: string): AssessmentTopicItem[] => DEFAULT_TOPICS.map((t, idx) => ({
  id: `${prefix}-${t.code.toLowerCase()}-${idx}`,
  topicCode: t.code,
  name: t.name,
  subject: t.subject as SubjectCode,
  isCompleted: false,
}));

export const DEFAULT_ASSESSMENTS: AssessmentRecord[] = [
  {
    id: 'assessment-first-preboard',
    title: 'First Preboard',
    type: 'first_preboard',
    date: '2027-02-20',
    notes: 'Covers first half of the CPALE review syllabus across all 6 subjects.',
    topics: FIRST_PB_SEED.map((t, i) => ({
      ...t,
      id: `fpb-${t.subject.toLowerCase()}-${i + 1}`,
    })),
  },
  {
    id: 'assessment-final-preboard',
    title: 'Final Preboard',
    type: 'final_preboard',
    date: '2027-04-23',
    notes: 'Comprehensive simulation covering all 165 TOS syllabus topics.',
    topics: all165AsItems('finpb'),
  },
  {
    id: 'assessment-monthly-1',
    title: 'Monthly Assessment 1',
    type: 'monthly',
    date: '2026-10-31',
    notes: 'Baseline review assessment covering initial foundation concepts.',
    topics: DEFAULT_TOPICS.slice(0, 32).map((t, i) => ({
      id: `ma1-${t.code.toLowerCase()}-${i}`,
      topicCode: t.code,
      name: t.name,
      subject: t.subject as SubjectCode,
      isCompleted: false,
    })),
  },
  {
    id: 'assessment-monthly-2',
    title: 'Monthly Assessment 2',
    type: 'monthly',
    date: '2026-11-28',
    notes: 'November evaluation covering intermediate syllabus sections.',
    topics: DEFAULT_TOPICS.slice(32, 65).map((t, i) => ({
      id: `ma2-${t.code.toLowerCase()}-${i}`,
      topicCode: t.code,
      name: t.name,
      subject: t.subject as SubjectCode,
      isCompleted: false,
    })),
  },
  {
    id: 'assessment-monthly-3',
    title: 'Monthly Assessment 3',
    type: 'monthly',
    date: '2026-12-19',
    notes: 'Pre-holiday progress check and mid-review retention test.',
    topics: DEFAULT_TOPICS.slice(65, 98).map((t, i) => ({
      id: `ma3-${t.code.toLowerCase()}-${i}`,
      topicCode: t.code,
      name: t.name,
      subject: t.subject as SubjectCode,
      isCompleted: false,
    })),
  },
  {
    id: 'assessment-monthly-4',
    title: 'Monthly Assessment 4',
    type: 'monthly',
    date: '2027-01-30',
    notes: 'January assessment before the first major preboard examination.',
    topics: DEFAULT_TOPICS.slice(98, 132).map((t, i) => ({
      id: `ma4-${t.code.toLowerCase()}-${i}`,
      topicCode: t.code,
      name: t.name,
      subject: t.subject as SubjectCode,
      isCompleted: false,
    })),
  },
  {
    id: 'assessment-monthly-5',
    title: 'Monthly Assessment 5',
    type: 'monthly',
    date: '2027-03-27',
    notes: 'Final monthly checkpoint before the Final Preboard and intense practice.',
    topics: DEFAULT_TOPICS.slice(132, 165).map((t, i) => ({
      id: `ma5-${t.code.toLowerCase()}-${i}`,
      topicCode: t.code,
      name: t.name,
      subject: t.subject as SubjectCode,
      isCompleted: false,
    })),
  },
];
