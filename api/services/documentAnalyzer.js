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
        // For unsupported/random images: return empty strings
        // so the frontend knows extraction failed
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
// NAME EXTRACTION
// =========================================
function extractName(text, documentType) {
    const originalLines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // ---- STRATEGY 1: Look for explicit "Name" label ----
    // Handle BOTH same-line ("Name: Alice Tester") and multi-line ("NAME:\n\nAlice Tester")
    for (let i = 0; i < originalLines.length; i++) {
        const line = originalLines[i];
        // Check if this line contains a Name label
        const labelMatch = line.match(/(?:Student\s*|Candidate\s*)?Name\s*[:;\-]?\s*(.*)/i);
        if (labelMatch) {
            let val = labelMatch[1].replace(/[^A-Za-z\s.]/g, "").trim();
            // Remove trailing noise words
            val = val.replace(/\b(male|female|dob|date|birth|year|address|son|daughter|wife|husband|father|mother)\b.*/i, "").trim();
            
            // Same-line match: "Name: Alice Tester"
            if (val.length >= 3 && /[A-Za-z]/.test(val)) {
                console.log("[Analyzer] Name found via same-line label:", val);
                return val;
            }
            
            // Multi-line match: "NAME:" on this line, value on next non-empty line
            for (let j = i + 1; j < Math.min(i + 3, originalLines.length); j++) {
                const nextLine = originalLines[j].replace(/[^A-Za-z\s.]/g, "").trim();
                if (nextLine.length >= 3 && /^[A-Za-z\s.]+$/.test(nextLine)) {
                    const words = nextLine.split(/\s+/).filter(w => w.length >= 2);
                    if (words.length >= 1 && words.length <= 5) {
                        console.log("[Analyzer] Name found via multi-line label:", nextLine);
                        return nextLine;
                    }
                }
            }
        }
    }

    // ---- STRATEGY 2: For Aadhaar cards, look for name-like lines ----
    if (documentType === "aadhaar") {
        const noiseWords = [
            "government", "india", "aadhaar", "authority", "identification",
            "unique", "enrollment", "enrolment", "vid", "address", "male", "female",
            "dob", "birth", "date", "year", "signature", "help", "download",
            "maadhaar", "uidai", "www", "http", "phone", "mobile",
            "student", "card", "valid", "until", "august", "january", "february",
            "march", "april", "may", "june", "july", "september", "october",
            "november", "december"
        ];

        for (const line of originalLines) {
            const cleaned = line.replace(/[^A-Za-z\s]/g, "").trim();
            if (cleaned.length < 3) continue;
            const words = cleaned.split(/\s+/);
            if (words.length < 2 || words.length > 5) continue;

            const lower = cleaned.toLowerCase();
            let isNoise = false;
            for (const nw of noiseWords) {
                if (lower.includes(nw)) { isNoise = true; break; }
            }
            if (isNoise) continue;

            const allNameLike = words.every(w => w.length >= 2 && /^[A-Za-z]+$/.test(w));
            if (allNameLike) {
                console.log("[Analyzer] Name found via Aadhaar heuristic:", cleaned);
                return cleaned;
            }
        }
    }

    // ---- STRATEGY 3: Generic fallback – first clean multi-word line ----
    const noiseWords = [
        "government", "india", "aadhaar", "board", "university", "college",
        "father", "mother", "dob", "year", "date", "enrollment", "signature",
        "male", "female", "address", "phone", "mobile", "email", "www", "http",
        "grade", "semester", "marks", "total", "subject", "result", "pass", "fail",
        "certificate", "examination", "register", "number", "roll", "class",
        "authority", "unique", "identification", "download", "print",
        "student", "card", "valid", "until", "august", "january", "february",
        "march", "april", "may", "june", "july", "september", "october",
        "november", "december", "name", "birth"
    ];

    for (const line of originalLines) {
        const cleaned = line.replace(/[^A-Za-z\s]/g, "").trim();
        if (cleaned.length < 4) continue;
        const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
        if (words.length < 2 || words.length > 5) continue;

        const lower = cleaned.toLowerCase();
        let isNoise = false;
        for (const nw of noiseWords) {
            if (lower.includes(nw)) { isNoise = true; break; }
        }
        if (isNoise) continue;

        const allNameLike = words.every(w => /^[A-Za-z]+$/.test(w));
        if (allNameLike) {
            console.log("[Analyzer] Name found via generic heuristic:", cleaned);
            return cleaned;
        }
    }

    console.log("[Analyzer] No name found in document");
    return "";
}

// =========================================
// DOB EXTRACTION
// =========================================
function extractDOB(originalText, documentType) {
    const lines = originalText.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0);

    // ---- STRATEGY 1: Explicit DOB label (same-line) ----
    // "DOB: 12/05/1990", "Date of Birth: 12.05.1990", "DOB 12-05-1990"
    const dobLabelRegex = /(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date)\s*[:;\-]?\s*(\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4})/i;
    const dobLabelMatch = originalText.match(dobLabelRegex);
    if (dobLabelMatch) {
        const parsed = parseDate(dobLabelMatch[1]);
        if (parsed) {
            console.log("[Analyzer] DOB found via same-line label:", parsed);
            return parsed;
        }
    }

    // ---- STRATEGY 1b: Multi-line DOB label ----
    // "DATE OF BIRTH:" on one line, date value on the next line
    for (let i = 0; i < lines.length; i++) {
        if (/(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Birth\s*Date)\s*[:;\-]?\s*$/i.test(lines[i])) {
            // Look at next 2 lines for date values
            for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
                const nextLine = lines[j].trim();
                // Try parsing as a date (DD/MM/YYYY, YYYY-MM-DD, etc)
                const dateMatch = nextLine.match(/(\d{1,4}[\s\/.\-]\d{1,2}[\s\/.\-]\d{1,4})/);
                if (dateMatch) {
                    const parsed = parseDate(dateMatch[1]);
                    if (parsed) {
                        console.log("[Analyzer] DOB found via multi-line label:", parsed);
                        return parsed;
                    }
                }
                // Also try YYYY-MM-DD directly (already in ISO format from OCR)
                const isoMatch = nextLine.match(/^(\d{4}-\d{2}-\d{2})$/);
                if (isoMatch) {
                    const year = parseInt(isoMatch[1].split("-")[0]);
                    if (year >= 1920 && year <= 2025) {
                        console.log("[Analyzer] DOB found via multi-line ISO:", isoMatch[1]);
                        return isoMatch[1];
                    }
                }
            }
        }
    }

    // ---- STRATEGY 2: DOB label with year only ----
    const dobYearLabel = originalText.match(/(?:D\.?O\.?B\.?|Date\s*of\s*Birth|Year\s*of\s*Birth|Y\.?O\.?B\.?|Birth)\s*[:;\-]?\s*(\d{4})/i);
    if (dobYearLabel) {
        const year = parseInt(dobYearLabel[1]);
        if (year >= 1920 && year <= 2020) {
            console.log("[Analyzer] DOB year found via label:", year);
            return `${year}-01-01`;
        }
    }

    // ---- STRATEGY 3: For known document types, search for date patterns near DOB context ----
    if (documentType === "aadhaar" || documentType === "marks_card" || documentType === "grade_card") {
        // Search all date-like patterns in the text
        const datePatterns = originalText.match(/\d{1,2}[\s\/.\-]\d{1,2}[\s\/.\-]\d{2,4}/g);
        if (datePatterns) {
            for (const dp of datePatterns) {
                const parsed = parseDate(dp);
                if (parsed) {
                    // Verify it's a realistic birth date (1920-2020)
                    const year = parseInt(parsed.split("-")[0]);
                    if (year >= 1920 && year <= 2020) {
                        console.log("[Analyzer] DOB found via date pattern:", parsed);
                        return parsed;
                    }
                }
            }
        }

        // Year-only fallback for known doc types
        const yearMatch = originalText.match(/\b(19[2-9]\d|200\d|201\d|2020)\b/);
        if (yearMatch) {
            console.log("[Analyzer] DOB year fallback:", yearMatch[1]);
            return `${yearMatch[1]}-01-01`;
        }
    }

    // ---- For unknown/random documents: DO NOT guess ----
    console.log("[Analyzer] No DOB found in document");
    return "";
}

/**
 * Parse a date string like "12/05/1990", "12.05.1990", "12-05-1990"
 * Returns "YYYY-MM-DD" or null if invalid
 */
function parseDate(dateStr) {
    // Normalize separators
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

    // Validate ranges
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
        t.includes("uidai") || t.includes("unique identification"))
        return "aadhaar";

    if (t.includes("university") || t.includes("board") || t.includes("marks") || t.includes("examination"))
        return "marks_card";

    if (t.includes("grade") || t.includes("semester") || t.includes("gpa") || t.includes("cgpa"))
        return "grade_card";

    return "other";
}

module.exports = { analyzeDocument };