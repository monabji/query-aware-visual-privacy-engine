import type { SceneSpec } from "./types.js";

/**
 * Synthetic pilot scenes.
 *
 * Every personal value is fabricated: names contain "Fictional", "Sample" or
 * "Placeholder"; phone numbers use the UK Ofcom drama range (07700 900xxx);
 * emails use example.com/example.org (RFC 2606). No real person, product or
 * prescription is depicted. These scenes test feasibility and geometry; they
 * are not a benchmark and are not representative of real photographs.
 */

export const PILOT_SCENES_VERSION = "pilot-scenes@2";

const CARTON = "#f4efe6";
const STICKER = "#ffffff";
const INK = "#1b1b1b";

export const PILOT_SCENES: readonly SceneSpec[] = [
  {
    id: "carton-with-pharmacy-sticker",
    description: "Medicine carton with batch/expiry print and a separate pharmacy sticker bearing patient details.",
    width: 960,
    height: 640,
    background: "#b9c4cc",
    tags: ["separate-regions", "multi-category"],
    panels: [
      {
        x: 60, y: 60, width: 520, height: 360, fill: CARTON,
        elements: [
          { id: "strength", prefix: { text: "PARAMOL", role: "evidence" }, text: "500 mg", x: 90, y: 120, fontSize: 34, fontWeight: "bold", role: "evidence" },
          { id: "count", text: "32 film-coated tablets", x: 90, y: 170, fontSize: 24, role: "benign" },
          { id: "batch", text: "BATCH: K2291", x: 90, y: 300, fontSize: 26, role: "evidence" },
          { id: "mfg", text: "MFG 03/2025", x: 90, y: 340, fontSize: 26, role: "evidence" },
          { id: "expiry", text: "EXP 02/2027", x: 90, y: 380, fontSize: 26, role: "evidence" },
        ],
      },
      {
        x: 520, y: 380, width: 400, height: 220, fill: STICKER,
        elements: [
          { id: "patient", prefix: { text: "Patient:", role: "benign" }, text: "Jo Fictional", x: 545, y: 425, fontSize: 24, role: "sensitive", category: "person_name" },
          { id: "address1", prefix: { text: "Address:", role: "benign" }, text: "12 Sample Street", x: 545, y: 465, fontSize: 24, role: "sensitive", category: "postal_address" },
          { id: "address2", text: "Exampletown EX1 2AB", x: 545, y: 500, fontSize: 24, role: "sensitive", category: "postal_address" },
          { id: "phone", prefix: { text: "Tel:", role: "benign" }, text: "07700 900123", x: 545, y: 540, fontSize: 24, role: "sensitive", category: "phone_number" },
          { id: "rx", prefix: { text: "Rx", role: "benign" }, text: "0012345678", x: 545, y: 580, fontSize: 24, role: "sensitive", category: "identifier_number" },
        ],
      },
    ],
    questions: [
      { id: "q-expiry", question: "What expiry date is printed on this medicine package?", expectedTarget: "expiry_date", expectedAnswer: "02/2027", requiredEvidence: ["expiry"], expectedConflicts: [] },
      { id: "q-batch", question: "What is the batch number?", expectedTarget: "batch_number", expectedAnswer: "K2291", requiredEvidence: ["batch"], expectedConflicts: [] },
      { id: "q-strength", question: "What strength are these tablets?", expectedTarget: "strength", expectedAnswer: "500 mg", requiredEvidence: ["strength"], expectedConflicts: [] },
    ],
  },
  {
    id: "label-expiry-beside-name",
    description: "Dispensing label where the use-by date shares a line with the patient name.",
    width: 900,
    height: 500,
    background: "#c9c2b8",
    tags: ["same-line-conflict", "relevant-and-sensitive-overlap"],
    panels: [
      {
        x: 60, y: 70, width: 780, height: 340, fill: STICKER,
        elements: [
          { id: "pharmacy", text: "Example Pharmacy", x: 90, y: 125, fontSize: 30, fontWeight: "bold", role: "benign" },
          { id: "strength", prefix: { text: "AMOXEXAMPLE", role: "evidence" }, text: "250 mg", x: 90, y: 185, fontSize: 26, role: "evidence" },
          { id: "patient", prefix: { text: "Patient:", role: "benign" }, text: "Sam Placeholder", x: 90, y: 245, fontSize: 26, role: "sensitive", category: "person_name" },
          { id: "useby", text: "Use by 11/2026", x: 500, y: 245, fontSize: 26, role: "evidence" },
          { id: "directions", text: "Take one capsule three times a day", x: 90, y: 305, fontSize: 24, role: "benign" },
          { id: "email", text: "sam.placeholder@example.org", x: 90, y: 365, fontSize: 22, role: "sensitive", category: "email_address" },
        ],
      },
    ],
    questions: [
      { id: "q-useby", question: "What is the expiry date on this label?", expectedTarget: "expiry_date", expectedAnswer: "11/2026", requiredEvidence: ["useby"], expectedConflicts: [] },
      { id: "q-strength", question: "What dose is printed for the capsules?", expectedTarget: "strength", expectedAnswer: "250 mg", requiredEvidence: ["strength"], expectedConflicts: [] },
      { id: "q-who", question: "Who is this prescription for?", expectedTarget: null, expectedAnswer: null, requiredEvidence: ["patient"], expectedConflicts: ["patient"] },
    ],
  },
  {
    id: "package-benign-contact",
    description: "Retail package with a manufacturer helpline and a lot code; no personal data.",
    width: 900,
    height: 560,
    background: "#d7dde2",
    tags: ["no-personal-data", "over-redaction-probe"],
    panels: [
      {
        x: 70, y: 60, width: 760, height: 440, fill: CARTON,
        elements: [
          { id: "strength", prefix: { text: "SAMPLEBRAND Vitamin C", role: "evidence" }, text: "1000 mg", x: 100, y: 130, fontSize: 32, fontWeight: "bold", role: "evidence" },
          { id: "lot", text: "LOT 7Q41B", x: 100, y: 230, fontSize: 26, role: "evidence" },
          { id: "best", text: "Best before 2027-09", x: 100, y: 280, fontSize: 26, role: "evidence" },
          { id: "helpline", text: "Customer care 0800 000 0000", x: 100, y: 380, fontSize: 22, role: "benign" },
          { id: "web", text: "www.example.com", x: 100, y: 420, fontSize: 22, role: "benign" },
        ],
      },
    ],
    questions: [
      { id: "q-best", question: "Until when is this best before?", expectedTarget: "expiry_date", expectedAnswer: "2027-09", requiredEvidence: ["best"], expectedConflicts: [] },
      { id: "q-lot", question: "What is the lot number?", expectedTarget: "batch_number", expectedAnswer: "7Q41B", requiredEvidence: ["lot"], expectedConflicts: [] },
    ],
  },
  {
    id: "letter-no-answer",
    description: "Printed membership letter with identifiers; the expiry question has no visible evidence.",
    width: 820,
    height: 900,
    background: "#e6e6e6",
    tags: ["unanswerable", "document", "small-text"],
    panels: [
      {
        x: 60, y: 50, width: 700, height: 800, fill: STICKER,
        elements: [
          { id: "org", text: "Example Health Plan", x: 100, y: 120, fontSize: 30, fontWeight: "bold", role: "benign" },
          { id: "name", prefix: { text: "Name:", role: "benign" }, text: "Ana Fictional", x: 100, y: 200, fontSize: 22, role: "sensitive", category: "person_name" },
          { id: "dob", prefix: { text: "DOB:", role: "benign" }, text: "01/02/1980", x: 100, y: 240, fontSize: 22, role: "sensitive", category: "date_of_birth" },
          { id: "member", prefix: { text: "Member ID", role: "benign" }, text: "AB12345678", x: 100, y: 280, fontSize: 22, role: "sensitive", category: "identifier_number" },
          { id: "body1", text: "Your annual review is scheduled at the clinic.", x: 100, y: 360, fontSize: 18, role: "benign" },
          { id: "body2", text: "Please bring this letter to your appointment.", x: 100, y: 390, fontSize: 18, role: "benign" },
          { id: "small-ref", prefix: { text: "Ref", role: "benign" }, text: "ZX9988776655", x: 100, y: 780, fontSize: 14, role: "sensitive", category: "identifier_number" },
          { id: "small-phone", prefix: { text: "phone", role: "benign" }, text: "07700 900456", x: 360, y: 780, fontSize: 14, role: "sensitive", category: "phone_number" },
        ],
      },
    ],
    questions: [
      { id: "q-expiry-absent", question: "What expiry date is printed here?", expectedTarget: "expiry_date", expectedAnswer: null, requiredEvidence: [], expectedConflicts: [] },
      { id: "q-unsupported", question: "Summarise this letter for me", expectedTarget: null, expectedAnswer: null, requiredEvidence: [], expectedConflicts: [] },
    ],
  },
  {
    id: "rotated-sticker",
    description: "Pharmacy sticker rotated by 7 degrees on a carton.",
    width: 960,
    height: 640,
    background: "#aeb8bf",
    tags: ["rotation", "separate-regions"],
    panels: [
      {
        x: 60, y: 60, width: 420, height: 260, fill: CARTON,
        elements: [
          { id: "strength", prefix: { text: "IBUEXAMPLE", role: "evidence" }, text: "200 mg", x: 90, y: 120, fontSize: 30, fontWeight: "bold", role: "evidence" },
          { id: "expiry", text: "EXP 06/2028", x: 90, y: 270, fontSize: 26, role: "evidence" },
        ],
      },
      {
        x: 470, y: 330, width: 420, height: 200, fill: STICKER, rotationDeg: -7,
        elements: [
          { id: "patient", prefix: { text: "Patient:", role: "benign" }, text: "Lee Sample", x: 495, y: 385, fontSize: 26, role: "sensitive", category: "person_name" },
          { id: "phone", prefix: { text: "Mobile", role: "benign" }, text: "07700 900789", x: 495, y: 430, fontSize: 26, role: "sensitive", category: "phone_number" },
          { id: "address", prefix: { text: "Address:", role: "benign" }, text: "4 Placeholder Road", x: 495, y: 475, fontSize: 24, role: "sensitive", category: "postal_address" },
        ],
      },
    ],
    questions: [
      { id: "q-expiry", question: "When does this expire?", expectedTarget: "expiry_date", expectedAnswer: "06/2028", requiredEvidence: ["expiry"], expectedConflicts: [] },
      { id: "q-strength", question: "What is the strength?", expectedTarget: "strength", expectedAnswer: "200 mg", requiredEvidence: ["strength"], expectedConflicts: [] },
    ],
  },
];
