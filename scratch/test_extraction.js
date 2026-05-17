/**
 * Test extraction against REAL OCR output from user's actual documents
 */

// Inline the extraction functions (matching documentAnalyzer.js)
function cleanNameLine(line) {
    return line.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ").trim();
}

function looksLikeName(cleaned) {
    if (cleaned.length < 4) return false;
    const words = cleaned.split(/\s+/).filter(w => w.length >= 1);
    if (words.length < 2 || words.length > 5) return false;
    const hasRealWord = words.some(w => w.length >= 3);
    if (!hasRealWord) return false;
    return words.every(w => /^[A-Za-z]+$/.test(w));
}

const NOISE_WORDS = [
    "government", "governmant", "govermant", "goverment", "govenment",
    "india", "lndia", "indla", "indian",
    "aadhaar", "aadhar", "aadheer",
    "authority", "identification", "enrollment", "enrolment",
    "unique", "vid", "address", "male", "female", "gender",
    "dob", "birth", "date", "year", "signature", "help", "download",
    "maadhaar", "uidai", "www", "http", "phone", "mobile", "email",
    "student", "card", "valid", "until",
    "board", "university", "college", "school", "department",
    "father", "mother", "son", "daughter", "wife", "husband",
    "grade", "semester", "marks", "total", "subject", "result",
    "certificate", "examination", "register", "number", "roll", "class",
    "print", "issued", "expiry", "photo",
    "village", "town", "city", "state", "district", "post", "office",
    "road", "street", "nagar", "colony", "sector", "layout", "stage",
    "bharat", "sarkar", "pradesh", "karnataka", "maharashtra", "tamil",
    "bihar", "delhi", "pune", "mumbai", "bangalore", "bengaluru", "chennai",
    "floor", "house", "flat", "block", "near", "opposite", "behind",
    "weight", "blood", "group", "height", "contact",
    "republic", "verify", "verification", "scan",
    "door", "ward", "care", "self", "relation", "spouse",
    "residency", "theatre", "cross", "main",
    "education", "secondary", "pre-university", "composite",
    "english", "hindi", "sanskrit", "science", "physics", "chemistry",
    "mathematics", "computer", "language",
    "hundred", "thousand", "only", "ninety", "eighty", "seventy",
    "sixty", "fifty", "forty", "thirty", "twenty",
    "passed", "candidate", "mentioned", "below", "following", "details",
    "certify", "secretary", "chairman", "director",
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "ref", "code", "south", "north", "east", "west",
];

const SHORT_WORDS = [
    "the", "and", "for", "was", "are", "but", "not", "you", "all",
    "can", "had", "her", "one", "our", "out", "its", "his", "how",
    "old", "new", "now", "way", "who", "did", "get", "has", "too",
    "him", "let", "say", "she", "use", "any", "few", "got", "own",
    "set", "try", "ask", "put", "run", "big", "end", "far", "yet",
    "this", "that", "with", "from", "have", "been", "were", "will",
    "would", "could", "over", "into", "just", "than", "them", "then",
    "each", "make", "like", "long", "look", "many", "some", "what",
    "when", "which", "their", "about", "these", "other", "first",
];

function isNoisyLine(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);
    if (words.length < 2) return true;
    for (const nw of NOISE_WORDS) { if (lower.includes(nw)) return true; }
    for (const w of words) { if (SHORT_WORDS.includes(w)) return true; }
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount > 2) return true;
    if (lower.length < 4) return true;
    return false;
}

function extractName(text, documentType) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // STRATEGY 1: Label
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const labelMatch = line.match(/(?:Candidate'?s?\s*|Student\s*)?(?:Name|naam)\s*[:;\-=]?\s*(.*)/i);
        if (!labelMatch) continue;
        let rest = labelMatch[1];
        rest = rest.replace(/\b(Register|Reg|Roll|Enroll|Number|No|Male|Female|DOB|Date|Birth|Year|Address|Son|Daughter|Father|Mother|S\/O|D\/O|C\/O|W\/O)\b.*/i, "");
        let val = cleanNameLine(rest);
        if (val.length >= 3 && looksLikeName(val)) return val;
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            let nextRest = lines[j];
            nextRest = nextRest.replace(/\b(Register|Reg|Roll|Enroll|Number|No|Male|Female|DOB|Date|Birth|Year|Address)\b.*/i, "");
            const nextCleaned = cleanNameLine(nextRest);
            if (nextCleaned.length >= 3 && looksLikeName(nextCleaned) && !isNoisyLine(nextCleaned)) return nextCleaned;
        }
    }

    // STRATEGY 2: Aadhaar
    if (documentType === "aadhaar") {
        for (let i = 0; i < lines.length; i++) {
            const lower = lines[i].toLowerCase();
            if (lower.includes("dob") || lower.match(/\b(male|female)\b/i)) {
                for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
                    const cleaned = cleanNameLine(lines[j]);
                    if (cleaned.length >= 3 && looksLikeName(cleaned) && !isNoisyLine(cleaned)) return cleaned;
                }
            }
        }
        for (const line of lines) {
            const cleaned = cleanNameLine(line);
            if (cleaned.length < 5) continue;
            if (isNoisyLine(cleaned)) continue;
            const words = cleaned.split(/\s+/);
            if (words.length < 2 || words.length > 4) continue;
            const isNamePattern = words.every(w => w.length >= 1 && /^[A-Z]/.test(w) && /^[A-Za-z]+$/.test(w));
            if (isNamePattern) return cleaned;
        }
    }

    if (documentType === "marks_card" || documentType === "grade_card") {
        for (const line of lines) {
            const cleaned = cleanNameLine(line);
            if (cleaned.length < 5) continue;
            if (isNoisyLine(cleaned)) continue;
            if (looksLikeName(cleaned)) return cleaned;
        }
    }
    return "";
}

function extractDocType(text) {
    const t = text.toLowerCase();
    if (t.includes("aadhaar") || t.includes("aadhar") ||
        t.includes("uidai") || /gov\w*ment\w*\s*of\s*\w*ndia/i.test(t) ||
        /govenment\s*of/i.test(t)) return "aadhaar";
    if (t.includes("university") || t.includes("board") ||
        t.includes("marks") || t.includes("examination") ||
        t.includes("pre-university") || t.includes("kseeb")) return "marks_card";
    if (t.includes("grade") || t.includes("semester")) return "grade_card";
    return "other";
}

function parseDate(dateStr) {
    let d = dateStr.trim().replace(/\s+/g, "").replace(/[\/.\-]/g, "-");
    const parts = d.split("-");
    if (parts.length !== 3) return null;
    let yyyy, mm, dd;
    if (parts[0].length === 4) { yyyy = parseInt(parts[0]); mm = parseInt(parts[1]); dd = parseInt(parts[2]); }
    else if (parts[2].length === 4) { dd = parseInt(parts[0]); mm = parseInt(parts[1]); yyyy = parseInt(parts[2]); }
    else if (parts[2].length === 2) { dd = parseInt(parts[0]); mm = parseInt(parts[1]); let yy = parseInt(parts[2]); yyyy = yy > 50 ? 1900 + yy : 2000 + yy; }
    else return null;
    if (isNaN(yyyy) || isNaN(mm) || isNaN(dd)) return null;
    if (yyyy < 1920 || yyyy > 2025) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function extractDOB(originalText, documentType) {
    const lines = originalText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);
    const ocrFixed = originalText
        .replace(/(\d)O/g, "$10").replace(/O(\d)/g, "0$1")
        .replace(/(\d)l/g, "$11").replace(/l(\d)/g, "1$1")
        .replace(/(\d)I/g, "$11").replace(/I(\d)/g, "1$1");
    for (const src of [originalText, ocrFixed]) {
        const m = src.match(/(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date)\s*[:;\-=]?\s*(\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4})/i);
        if (m) { const p = parseDate(m[1]); if (p) return p; }
    }
    for (let i = 0; i < lines.length; i++) {
        if (/(?:D\.?O\.?B\.?|Date\s*of\s*Birth)\s*[:;\-=]?\s*$/i.test(lines[i])) {
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const nl = lines[j].trim().replace(/O/g, "0").replace(/l/g, "1").replace(/I/g, "1");
                const im = nl.match(/(\d{4})\s*-\s*(\d{2})\s*-\s*(\d{2})/);
                if (im) { const p = parseDate(`${im[1]}-${im[2]}-${im[3]}`); if (p) return p; }
                const dm = nl.match(/(\d{1,4})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,4})/);
                if (dm) { const p = parseDate(`${dm[1]}-${dm[2]}-${dm[3]}`); if (p) return p; }
            }
        }
    }
    for (const src of [originalText, ocrFixed]) {
        const yl = src.match(/(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Year\s*of\s*Birth|Y\.?O\.?B\.?|Birth)\s*[:;\-=]?\s*(\d{4})/i);
        if (yl) { const y = parseInt(yl[1]); if (y >= 1920 && y <= 2020) return `${y}-01-01`; }
    }
    if (documentType !== "other") {
        const dp = ocrFixed.match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/g);
        if (dp) { for (const d of dp) { const p = parseDate(d); if (p) { const y = parseInt(p.split("-")[0]); if (y >= 1920 && y <= 2020) return p; } } }
        const ym = ocrFixed.match(/\b(19[3-9]\d|200\d|201\d|2020)\b/);
        if (ym) return `${ym[1]}-01-01`;
    }
    return "";
}

// ============ TESTS WITH REAL OCR TEXT ============

const tests = [
    {
        name: "REAL Aadhaar card (user's actual OCR)",
        text: `2 2
SZANN.
ae wre BTHTY
: 7003 Jef T
alla o daonti inn A hari Q ndi
Reeomded gab oa; / Enrollment No.: 2086/13211/09140
lee S Foust
Yashas P Phatak
o C/O Prakash Phatak
S No 103 Shiva Sai Residency
5 1st Cross
S Behind Kamakya Theatre Kamakya Layout Bangalore South
~ Banashankari Ill Stage Bangalore South Bengaluru
Karnataka 560085
9880710856
Ref: 1656 / 29R / 130183 / 130254 / P
JOT OO I EE
SB957952405FH IER
oD RO
ESA
CE
AD, eseeof Bod; / Your Aadhaar No. :
6269 2842 6059
SS, BET', SY, HDD
LECT TTETTRES EE
Berle Lr Re
2  Govenmentofindia
& ab3RF & Foust
& 1 Yashas P Phatak
] za, Beos / DOB 09/07/2006
ba / Male (OF As a rE Fst 10)
ASE
Pgh ed
CCE
Ee
6269 2842 6059
SS, esweT®, SI, rho=d`,
        expectName: "Yashas P Phatak",
        expectDOB: "2006-07-09"
    },
    {
        name: "REAL 12th marks card (user's actual OCR)",
        text: `GOVERNMENT OF KARNATAKA
DEPARTMENT OF PRE-UNIVERSITY EDUCATION
Candidate's Name YASHAS P PHATAK Register Number 23AS0165510519
Mother's Name } NIRUPAMA PHATAK
Father's Name } PRAKASH PHATAK
02-English 23AS0165510519 Feb-Mar/2023 100 93 NINETY THREE
09-Sanskrit 23AS0165510519 Feb-Mar/2023 100 93 NINETY THREE`,
        expectName: "YASHAS P PHATAK",
        expectDOB: ""
    },
    {
        name: "Random passport photo (should return empty)",
        text: `pe h |
~~ os
- a |
-
—
Ane yy -
A at | Lo i`,
        expectName: "",
        expectDOB: ""
    },
    {
        name: "Aadhaar with normal OCR",
        text: "Government of India\n\nRahul Kumar\n\nDOB: 15/08/1995\nMale\n\n1234 5678 9012",
        expectName: "Rahul Kumar",
        expectDOB: "1995-08-15"
    },
    {
        name: "Multi-line NAME and DOB labels",
        text: "UNIVERSITY\nSTUDENT ID\n\nNAME:\nAlice Tester\n\nDATE OF BIRTH:\n1990-01-01",
        expectName: "Alice Tester",
        expectDOB: "1990-01-01"
    },
];

console.log("\n========== REAL OCR EXTRACTION TESTS ==========\n");

let passed = 0, failed = 0;
for (const t of tests) {
    const docType = extractDocType(t.text);
    const name = extractName(t.text, docType);
    const dob = extractDOB(t.text, docType);
    const nameOk = name === t.expectName;
    const dobOk = dob === t.expectDOB;

    if (nameOk && dobOk) {
        console.log(`✅ ${t.name}`);
        console.log(`   Name: "${name}"  DOB: "${dob}"  Type: ${docType}`);
        passed++;
    } else {
        console.log(`❌ ${t.name}`);
        if (!nameOk) console.log(`   Name: got "${name}", expected "${t.expectName}"`);
        if (!dobOk) console.log(`   DOB: got "${dob}", expected "${t.expectDOB}"`);
        console.log(`   Type: ${docType}`);
        failed++;
    }
}

console.log(`\n========== RESULTS: ${passed} passed, ${failed} failed ==========\n`);
