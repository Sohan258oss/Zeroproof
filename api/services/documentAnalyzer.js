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

// =========================================
// NOISE WORDS — lines containing these are NOT person names
// =========================================
const NOISE_WORDS = [
    "government", "governmant", "govermant", "goverment",
    "india", "lndia", "indla",
    "aadhaar", "aadhar", "aadheer", "aadbaar",
    "authority", "identification",
    "unique", "enrollment", "enrolment", "vid", "address", "male", "female",
    "dob", "birth", "date", "year", "signature", "help", "download",
    "maadhaar", "uidai", "www", "http", "phone", "mobile", "email",
    "student", "card", "valid", "until", "january", "february", "march",
    "april", "may", "june", "july", "august", "september", "october",
    "november", "december", "board", "university", "college",
    "father", "mother", "son", "daughter", "wife", "husband",
    "grade", "semester", "marks", "total", "subject", "result", "pass", "fail",
    "certificate", "examination", "register", "number", "roll", "class",
    "print", "name", "issued", "expiry", "photo",
    "village", "town", "city", "state", "district", "post", "office",
    "pin", "code", "road", "street", "nagar", "colony", "sector",
    "bharat", "sarkar", "pradesh", "karnataka", "maharashtra", "tamil",
    "bihar", "delhi", "pune", "mumbai", "bangalore", "chennai",
    "floor", "house", "flat", "block", "near", "opposite", "behind",
    "gender", "age", "weight", "blood", "group", "height", "contact",
    "republic", "verify", "verification", "scan", "qr",
    "door", "ward", "care", "self", "relation", "spouse",
    "beautiful", "sunset", "ocean", "sky", "painted", "shades",
    "the", "over", "was", "and", "for", "with", "from", "this", "that",
    "has", "have", "been", "are", "were", "will", "would", "could",
    "not", "but", "all", "can", "had", "her", "one", "our", "out",
];

// Common short English words that are NOT person names
const SHORT_COMMON_WORDS = [
    "the", "and", "for", "was", "are", "but", "not", "you", "all",
    "can", "had", "her", "one", "our", "out", "its", "his", "how",
    "old", "new", "now", "way", "may", "who", "did", "get", "has",
    "him", "let", "say", "she", "too", "use", "any", "few", "got",
    "own", "set", "try", "ask", "put", "run", "big", "end", "far",
];

/**
 * Check if a string is "noisy" (contains document metadata, not a person name)
 */
function isNoisyLine(text) {
    const lower = text.toLowerCase();
    for (const nw of NOISE_WORDS) {
        if (lower.includes(nw)) return true;
    }
    // Check individual words for common English words (not names)
    const words = lower.split(/\s+/);
    for (const w of words) {
        if (SHORT_COMMON_WORDS.includes(w)) return true;
    }
    // Lines with too many digits are not names
    const digitCount = (text.match(/\d/g) || []).length;
    if (digitCount > 2) return true;
    return false;
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
 * - At least 2 words (first + last)
 * - Each word is 2+ letters
 * - Not too long (max 5 words)
 */
function looksLikeName(cleaned) {
    if (cleaned.length < 4) return false;
    const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
    if (words.length < 1 || words.length > 5) return false;
    return words.every(w => /^[A-Za-z]+$/.test(w));
}

// =========================================
// NAME EXTRACTION
// =========================================
function extractName(text, documentType) {
    const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // ======================================================
    // STRATEGY 1: Explicit "Name" label (same-line or multi-line)
    // Handles: "Name: Alice Tester", "NAME:\nAlice Tester"
    // ======================================================
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Match any line that starts with a "Name" label
        // e.g. "Name: John", "Student Name : John", "NAME:", "Candidate Name"
        const labelMatch = line.match(
            /(?:Student\s*|Candidate\s*)?(?:Name|naam)\s*[:;\-=]?\s*(.*)/i
        );
        if (!labelMatch) continue;

        let val = cleanNameLine(labelMatch[1]);

        // Remove trailing noise like "Male", "DOB" etc that OCR sometimes appends
        val = val.replace(/\b(Male|Female|DOB|Date|Birth|Year|Address|Son|Daughter|Wife|Husband|Father|Mother)\b.*/i, "").trim();

        // CASE A: Name is on the SAME line as the label
        if (val.length >= 3 && looksLikeName(val) && !isNoisyLine(val)) {
            console.log("[Name] Found via same-line label:", val);
            return val;
        }

        // CASE B: "NAME:" alone on this line → value is on the NEXT line(s)
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextCleaned = cleanNameLine(lines[j]);
            if (nextCleaned.length >= 3 && looksLikeName(nextCleaned) && !isNoisyLine(nextCleaned)) {
                console.log("[Name] Found via multi-line label:", nextCleaned);
                return nextCleaned;
            }
        }
    }

    // ======================================================
    // STRATEGY 2: For Aadhaar — find name by POSITION
    // On Aadhaar cards the layout is typically:
    //   Government of India / भारत सरकार
    //   [Person Name in English]
    //   [Person Name in Hindi]
    //   DOB: ... / Gender: ...
    //   [Aadhaar Number]
    // So the name is between the header and DOB/gender lines
    // ======================================================
    if (documentType === "aadhaar") {
        let headerPassed = false;
        for (const line of lines) {
            const lower = line.toLowerCase();

            // Skip header lines (including OCR misspellings)
            if (lower.includes("government") || lower.includes("governmant") || lower.includes("govermant") ||
                lower.includes("india") || lower.includes("lndia") || lower.includes("indla") ||
                lower.includes("aadhaar") || lower.includes("aadhar") ||
                lower.includes("uidai") || lower.includes("unique") ||
                lower.includes("bharat") || lower.includes("sarkar")) {
                headerPassed = true;
                continue;
            }

            // Stop at DOB/gender/address/number lines
            if (lower.includes("dob") || lower.includes("birth") ||
                lower.includes("male") || lower.includes("female") ||
                lower.includes("gender") || lower.includes("address") ||
                /\d{4}\s*\d{4}\s*\d{4}/.test(line)) {
                break;
            }

            // Only consider lines after we've seen the header
            if (!headerPassed) continue;

            const cleaned = cleanNameLine(line);
            if (cleaned.length >= 3 && looksLikeName(cleaned) && !isNoisyLine(cleaned)) {
                console.log("[Name] Found via Aadhaar positional:", cleaned);
                return cleaned;
            }
        }
    }

    // ======================================================
    // STRATEGY 3: Generic — first clean name-like line
    // ONLY for known document types, NOT for random images
    // ======================================================
    if (documentType !== "other") {
        for (const line of lines) {
            const cleaned = cleanNameLine(line);
            if (cleaned.length < 4) continue;
            if (isNoisyLine(cleaned)) continue;
            if (looksLikeName(cleaned)) {
                console.log("[Name] Found via generic fallback:", cleaned);
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

    // Create an OCR-corrected version of the text for date searching
    // Common OCR mistakes: O→0, l→1, I→1 (but only in digit contexts)
    const ocrFixed = originalText
        .replace(/(\d)O/g, "$10").replace(/O(\d)/g, "0$1")   // O next to digit → 0
        .replace(/(\d)l/g, "$11").replace(/l(\d)/g, "1$1")   // l next to digit → 1
        .replace(/(\d)I/g, "$11").replace(/I(\d)/g, "1$1");  // I next to digit → 1

    // ======================================================
    // STRATEGY 1: Explicit DOB label (same line)
    // "DOB: 12/05/1990", "Date of Birth: 12.05.1990"
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

                // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
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
    // Only for aadhaar/marks_card/grade_card — NOT random images
    // ======================================================
    if (documentType !== "other") {
        // Search in OCR-fixed text for date patterns
        const datePatterns = ocrFixed.match(/\d{1,2}\s*[\/.\-]\s*\d{1,2}\s*[\/.\-]\s*\d{2,4}/g);
        if (datePatterns) {
            for (const dp of datePatterns) {
                const parsed = parseDate(dp);
                if (parsed) {
                    const year = parseInt(parsed.split("-")[0]);
                    if (year >= 1920 && year <= 2020) {
                        console.log("[DOB] Found via date pattern in known doc:", parsed);
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
    // Normalize: remove spaces, unify separators to "-"
    let d = dateStr.trim().replace(/\s+/g, "").replace(/[\/.\-]/g, "-");
    const parts = d.split("-");
    if (parts.length !== 3) return null;

    let yyyy, mm, dd;

    if (parts[0].length === 4) {
        // YYYY-MM-DD
        yyyy = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        dd = parseInt(parts[2]);
    } else if (parts[2].length === 4) {
        // DD-MM-YYYY (most common in Indian docs)
        dd = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        yyyy = parseInt(parts[2]);
    } else if (parts[2].length === 2) {
        // DD-MM-YY
        dd = parseInt(parts[0]);
        mm = parseInt(parts[1]);
        let yy = parseInt(parts[2]);
        yyyy = yy > 50 ? 1900 + yy : 2000 + yy;
    } else {
        return null;
    }

    // Validate
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
        (t.includes("government") && t.includes("india")) ||
        (t.includes("governmant") && t.includes("lndia")) ||
        (t.includes("govermant") && t.includes("india")) ||
        (t.includes("government") && t.includes("lndia")) ||
        t.includes("uidai") || t.includes("unique identification"))
        return "aadhaar";

    if (t.includes("university") || t.includes("board") || t.includes("marks") || t.includes("examination"))
        return "marks_card";

    if (t.includes("grade") || t.includes("semester") || t.includes("gpa") || t.includes("cgpa"))
        return "grade_card";

    return "other";
}

module.exports = { analyzeDocument };