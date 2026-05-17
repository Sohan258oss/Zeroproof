const Tesseract = require("tesseract.js");
const { PDFParse } = require("pdf-parse");

/**
 * Analyze document (PDF or Image)
 * Returns extracted name, dateOfBirth, documentType, status
 */
async function analyzeDocument(buffer, mimeType = "") {
    try {
        let text = "";

        // -------------------------------
        // 1. PDF PARSING
        // -------------------------------
        if (
            mimeType === "application/pdf" ||
            (buffer && buffer[0] === 0x25 && buffer[1] === 0x50)
        ) {
            console.log("[Analyzer] Reading PDF...");
            try {
                const parser = new PDFParse({ data: buffer });
                const data = await parser.getText();
                text = data.text || "";
                await parser.destroy();
            } catch (err) {
                console.warn("[Analyzer] PDF failed, fallback to OCR");
            }
        }

        // -------------------------------
        // 2. FORCE OCR FOR IMAGES
        // -------------------------------
        const isImage =
            mimeType.startsWith("image/") ||
            (buffer &&
                ((buffer[0] === 0xff && buffer[1] === 0xd8) || // JPG
                    (buffer[0] === 0x89 && buffer[1] === 0x50))); // PNG

        if (isImage) {
            console.log("\n[Analyzer] Running OCR...\n");
            try {
                const result = await Tesseract.recognize(buffer, "eng");
                text = result.data.text || "";

                console.log("\n========== RAW OCR TEXT ==========");
                console.log(text);
                console.log("==================================\n");
            } catch (err) {
                console.warn("[Analyzer] OCR failed:", err.message);
            }
        }

        // If no text was extracted at all, this is not a readable document
        if (!text || text.trim().length < 5) {
            console.log("[Analyzer] No readable text found in document");
            return {
                name: "",
                dateOfBirth: "",
                documentType: "unknown",
                status: "UNREADABLE",
                rawText: text,
            };
        }

        // -------------------------------
        // 3. DOCUMENT TYPE DETECTION
        // -------------------------------
        const documentType = extractDocumentType(text);
        console.log("[Analyzer] TYPE:", documentType);

        // -------------------------------
        // 4. EXTRACTION
        // -------------------------------
        const name = extractName(text, documentType);
        const dob = extractDOB(text, documentType);

        console.log("[Analyzer] FINAL NAME:", name);
        console.log("[Analyzer] FINAL DOB:", dob);

        // -------------------------------
        // 5. RETURN
        // -------------------------------
        return {
            name: name || "",
            dateOfBirth: dob || "",
            documentType,
            status: (name || dob) ? "SUCCESS" : "NO_DATA_FOUND",
            rawText: text,
        };
    } catch (err) {
        console.error("[Analyzer] ERROR:", err.message);
        return {
            name: "",
            dateOfBirth: "",
            documentType: "unknown",
            status: "ERROR",
            rawText: "",
        };
    }
}

/**
 * Clean a line to extract only the alphabetic name portion
 */
function cleanNameLine(line) {
    return line
        .replace(/[^A-Za-z\s]/g, "")  // Remove non-alpha
        .replace(/\s+/g, " ")          // Normalize spaces
        .trim();
}

/**
 * Check if a cleaned string looks like a person's name
 * Requirements:
 * - Each word is 2+ letters (allow single letter for middle initials like "P")
 * - Total length >= 4
 * - At least 1 word has 3+ letters
 */
function looksLikeName(cleaned) {
    if (cleaned.length < 4) return false;
    const words = cleaned.split(/\s+/).filter(w => w.length >= 1);
    if (words.length < 2 || words.length > 5) return false;
    // At least one word must be 3+ letters (real name, not just initials)
    const hasRealWord = words.some(w => w.length >= 3);
    if (!hasRealWord) return false;
    return words.every(w => /^[A-Za-z]+$/.test(w));
}

/**
 * Check if a string is "noisy" (contains document metadata/junk, not a person name)
 */
function isNoisyLine(text) {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/);

    // Reject single words (names need at least 2 words)
    if (words.length < 2) return true;

    // Check against noise word list
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

    for (const nw of NOISE_WORDS) {
        if (lower.includes(nw)) return true;
    }

    // Common short English words that are definitely NOT names
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

    for (const w of words) {
        if (SHORT_WORDS.includes(w)) return true;
    }

    // Lines with too many digits are not names
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount > 2) return true;

    // Lines that are too short after cleaning
    if (lower.length < 4) return true;

    return false;
}

// =========================================
// NAME EXTRACTION
// =========================================
function extractName(text, documentType) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // ======================================================
    // STRATEGY 1: Explicit name labels (same-line)
    // Handles: "Name: Alice", "Candidate's Name YASHAS P PHATAK",
    //          "Student Name: John", "Name John"
    // ======================================================
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match various name label patterns (including "Candidate's Name")
        const labelMatch = line.match(
            /(?:Candidate'?s?\s*|Student\s*)?(?:Name|naam)\s*[:;\-=]?\s*(.*)/i
        );
        if (!labelMatch) continue;

        let rest = labelMatch[1];

        // Clean: remove everything after known non-name tokens
        rest = rest.replace(/\b(Register|Reg|Roll|Enroll|Number|No|Male|Female|DOB|Date|Birth|Year|Address|Son|Daughter|Father|Mother|S\/O|D\/O|C\/O|W\/O)\b.*/i, "");

        let val = cleanNameLine(rest);

        // CASE A: Name on SAME line as label
        if (val.length >= 3 && looksLikeName(val)) {
            console.log("[Name] Found via same-line label:", val);
            return val;
        }

        // CASE B: "NAME:" alone → value on NEXT line(s)
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            let nextRest = lines[j];
            nextRest = nextRest.replace(/\b(Register|Reg|Roll|Enroll|Number|No|Male|Female|DOB|Date|Birth|Year|Address)\b.*/i, "");
            const nextCleaned = cleanNameLine(nextRest);
            if (nextCleaned.length >= 3 && looksLikeName(nextCleaned) && !isNoisyLine(nextCleaned)) {
                console.log("[Name] Found via multi-line label:", nextCleaned);
                return nextCleaned;
            }
        }
    }

    // ======================================================
    // STRATEGY 2: For Aadhaar — look for the actual name
    // Real Aadhaar OCR produces messy text. The name line
    // typically contains only English alphabetic names.
    // We look for lines that match common Indian name patterns.
    // ======================================================
    if (documentType === "aadhaar") {
        // First try: find line right before "DOB" or "Male/Female" line
        for (let i = 0; i < lines.length; i++) {
            const lower = lines[i].toLowerCase();
            if (lower.includes("dob") || lower.match(/\b(male|female)\b/i)) {
                // Look backwards for a name-like line
                for (let j = i - 1; j >= Math.max(0, i - 4); j--) {
                    const cleaned = cleanNameLine(lines[j]);
                    if (cleaned.length >= 3 && looksLikeName(cleaned) && !isNoisyLine(cleaned)) {
                        console.log("[Name] Found via Aadhaar pre-DOB:", cleaned);
                        return cleaned;
                    }
                }
            }
        }

        // Second try: find any line that looks like a name (2-4 capitalized words)
        // The real OCR output has names like "Yashas P Phatak" mixed with noise
        for (const line of lines) {
            const cleaned = cleanNameLine(line);
            if (cleaned.length < 5) continue;
            if (isNoisyLine(cleaned)) continue;

            const words = cleaned.split(/\s+/);
            if (words.length < 2 || words.length > 4) continue;

            // Name-like: each word starts with uppercase
            const isNamePattern = words.every(w =>
                w.length >= 1 && /^[A-Z]/.test(w) && /^[A-Za-z]+$/.test(w)
            );

            if (isNamePattern) {
                console.log("[Name] Found via Aadhaar name pattern:", cleaned);
                return cleaned;
            }
        }
    }

    // ======================================================
    // STRATEGY 3: For marks/grade cards — look for name-like lines
    // Only for known document types
    // ======================================================
    if (documentType === "marks_card" || documentType === "grade_card") {
        for (const line of lines) {
            const cleaned = cleanNameLine(line);
            if (cleaned.length < 5) continue;
            if (isNoisyLine(cleaned)) continue;
            if (looksLikeName(cleaned)) {
                console.log("[Name] Found via marks/grade fallback:", cleaned);
                return cleaned;
            }
        }
    }

    console.log("[Name] No name found in document");
    return "";
}

// =========================================
// DOB EXTRACTION
// =========================================
function extractDOB(originalText, documentType) {
    const lines = originalText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // Create an OCR-corrected version for date searching
    const ocrFixed = originalText
        .replace(/(\d)O/g, "$10").replace(/O(\d)/g, "0$1")
        .replace(/(\d)l/g, "$11").replace(/l(\d)/g, "1$1")
        .replace(/(\d)I/g, "$11").replace(/I(\d)/g, "1$1");

    // ======================================================
    // STRATEGY 1: Explicit DOB label (same line)
    // "DOB: 12/05/1990", "DOB 09/07/2006", "Date of Birth: 12.05.1990"
    // ======================================================
    for (const src of [originalText, ocrFixed]) {
        const dobMatch = src.match(
            /(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date)\s*[:;\-=]?\s*(\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4})/i
        );
        if (dobMatch) {
            const parsed = parseDate(dobMatch[1]);
            if (parsed) {
                console.log("[DOB] Found via same-line label:", parsed);
                return parsed;
            }
        }
    }

    // ======================================================
    // STRATEGY 2: Multi-line DOB label
    // "DATE OF BIRTH:" on one line, date on next line
    // ======================================================
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date)\s*[:;\-=]?\s*$/i.test(line)) {
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const nextLine = lines[j].trim()
                    .replace(/O/g, "0").replace(/l/g, "1").replace(/I/g, "1");

                // ISO format: "1990-01-01"
                const isoMatch = nextLine.match(/(\d{4})\s*-\s*(\d{2})\s*-\s*(\d{2})/);
                if (isoMatch) {
                    const parsed = parseDate(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`);
                    if (parsed) {
                        console.log("[DOB] Found via multi-line ISO:", parsed);
                        return parsed;
                    }
                }

                // DD/MM/YYYY etc
                const dateMatch = nextLine.match(/(\d{1,4})\s*[\/.\-]\s*(\d{1,2})\s*[\/.\-]\s*(\d{1,4})/);
                if (dateMatch) {
                    const parsed = parseDate(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`);
                    if (parsed) {
                        console.log("[DOB] Found via multi-line date:", parsed);
                        return parsed;
                    }
                }
            }
        }
    }

    // ======================================================
    // STRATEGY 3: DOB label followed by year only
    // "Year of Birth: 1990", "DOB: 1990", "YOB: 1995"
    // ======================================================
    for (const src of [originalText, ocrFixed]) {
        const yearLabel = src.match(
            /(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Year\s*of\s*Birth|Y\.?O\.?B\.?|Birth)\s*[:;\-=]?\s*(\d{4})/i
        );
        if (yearLabel) {
            const year = parseInt(yearLabel[1]);
            if (year >= 1920 && year <= 2020) {
                console.log("[DOB] Year found via label:", year);
                return `${year}-01-01`;
            }
        }
    }

    // ======================================================
    // STRATEGY 4: For known document types, find ANY date pattern
    // ======================================================
    if (documentType !== "other") {
        const datePatterns = ocrFixed.match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/g);
        if (datePatterns) {
            for (const dp of datePatterns) {
                const parsed = parseDate(dp);
                if (parsed) {
                    const year = parseInt(parsed.split("-")[0]);
                    if (year >= 1920 && year <= 2020) {
                        console.log("[DOB] Found via date pattern:", parsed);
                        return parsed;
                    }
                }
            }
        }

        // Year-only fallback
        const yearMatch = ocrFixed.match(/\b(19[3-9]\d|200\d|201\d|2020)\b/);
        if (yearMatch) {
            console.log("[DOB] Year fallback:", yearMatch[1]);
            return `${yearMatch[1]}-01-01`;
        }
    }

    console.log("[DOB] No DOB found in document");
    return "";
}

/**
 * Parse a date string like "12/05/1990", "12.05.1990", "1990-01-01"
 * Returns "YYYY-MM-DD" or null if invalid
 */
function parseDate(dateStr) {
    let d = dateStr.trim().replace(/\s+/g, "").replace(/[\/.\-]/g, "-");
    const parts = d.split("-");
    if (parts.length !== 3) return null;

    let yyyy, mm, dd;

    if (parts[0].length === 4) {
        yyyy = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        dd = parseInt(parts[2]);
    } else if (parts[2].length === 4) {
        dd = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        yyyy = parseInt(parts[2]);
    } else if (parts[2].length === 2) {
        dd = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        let yy = parseInt(parts[2]);
        yyyy = yy > 50 ? 1900 + yy : 2000 + yy;
    } else {
        return null;
    }

    if (isNaN(yyyy) || isNaN(mm) || isNaN(dd)) return null;
    if (yyyy < 1920 || yyyy > 2025) return null;
    if (mm < 1 || mm > 12) return null;
    if (dd < 1 || dd > 31) return null;

    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// =========================================
// DOCUMENT TYPE DETECTION
// =========================================
function extractDocumentType(text) {
    const t = text.toLowerCase();

    if (t.includes("aadhaar") || t.includes("aadhar") ||
        t.includes("uidai") || t.includes("unique identification") ||
        /gov\w*ment\w*\s*of\s*\w*ndia/i.test(t) ||  // fuzzy "Government of India"
        /govenment\s*of/i.test(t))
        return "aadhaar";

    if (t.includes("university") || t.includes("board") ||
        t.includes("marks") || t.includes("examination") ||
        t.includes("pre-university") || t.includes("kseeb"))
        return "marks_card";

    if (t.includes("grade") || t.includes("semester") ||
        t.includes("gpa") || t.includes("cgpa"))
        return "grade_card";

    return "other";
}

module.exports = { analyzeDocument };