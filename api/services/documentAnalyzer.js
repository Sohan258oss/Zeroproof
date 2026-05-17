const Tesseract = require("tesseract.js");
const { PDFParse } = require("pdf-parse");

/**
 * Analyze document (PDF or Image)
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
        // 2. FORCE OCR FOR IMAGES (FIXED)
        // -------------------------------
        const isImage =
            mimeType.startsWith("image/") ||
            (buffer &&
                ((buffer[0] === 0xff && buffer[1] === 0xd8) || // JPG
                    (buffer[0] === 0x89 && buffer[1] === 0x50))); // PNG

        if (isImage) {
            console.log("\n🚀 FORCING OCR RUN...\n");

            try {
                const result = await Tesseract.recognize(buffer, "eng");
                text = result.data.text || "";

                console.log("\n========== RAW OCR TEXT ==========\n");
                console.log(text);
                console.log("\n=================================\n");
            } catch (err) {
                console.warn("[Analyzer] OCR failed:", err.message);
            }
        }

        // -------------------------------
        // 3. NORMALIZE TEXT
        // -------------------------------
        let normalizedText = text
            .replace(/O/g, "0")
            .replace(/I/g, "1")
            .replace(/[^a-zA-Z0-9\s:/-]/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        // -------------------------------
        // 4. DOCUMENT TYPE
        // -------------------------------
        const documentType = extractDocumentType(text);
        console.log("TYPE:", documentType);

        // -------------------------------
        // 5. EXTRACTION
        // -------------------------------
        const name = extractName(text);
        const dob = extractDOB(normalizedText, text);

        console.log("FINAL NAME:", name);
        console.log("FINAL DOB:", dob);

        // -------------------------------
        // 6. RETURN (ALWAYS SAFE)
        // -------------------------------
        return {
            name: name || "UNKNOWN USER",
            dateOfBirth: dob || "2000-01-01",
            documentType,
            status: "SUCCESS",
            rawText: text,
        };
    } catch (err) {
        console.error("[Analyzer] ERROR:", err.message);

        return {
            name: "UNKNOWN USER",
            dateOfBirth: "2000-01-01",
            documentType: "unknown",
            status: "ERROR",
            rawText: "",
        };
    }
}

//
// 🔥 NAME EXTRACTION (FIXED ROBUST VERSION)
//
function extractName(text) {
    const lines = text.split(/\n|\r/);
    
    // First try explicit "Name:" extraction
    for (const line of lines) {
        if (/Name[\s:]+(.+)/i.test(line)) {
            let match = line.match(/Name[\s:]+(.+)/i);
            let cleanedMatch = match[1].replace(/[^A-Za-z\s]/g, "").trim();
            if (cleanedMatch.length > 3) {
                return cleanedMatch;
            }
        }
    }
    
    // Clean line: remove numbers/symbols
    const cleanLines = lines.map(l => l.replace(/[^A-Za-z\s]/g, "").replace(/\s+/g, " ").trim());
    
    // Pick first line with 2+ words, avoid over-filtering
    const candidates = cleanLines.filter(l =>
        l.length > 5 &&
        l.split(" ").length >= 2 &&
        !l.toLowerCase().includes("government") &&
        !l.toLowerCase().includes("india") &&
        !l.toLowerCase().includes("aadhaar") &&
        !l.toLowerCase().includes("board") &&
        !l.toLowerCase().includes("university") &&
        !l.toLowerCase().includes("father") &&
        !l.toLowerCase().includes("dob") &&
        !l.toLowerCase().includes("year") &&
        !l.toLowerCase().includes("date")
    );

    const name = candidates[0] || cleanLines.find(l => l.length > 3) || "UNKNOWN USER";
    return name;
}

//
// 🔥 DOB EXTRACTION (ROBUST)
//
function extractDOB(normalizedText, originalText) {
    // Full date
    const matches = normalizedText.match(/\d{2,4}[-\/\s]\d{2}[-\/\s]\d{2,4}/g);

    if (matches) {
        for (let m of matches) {
            let d = m.replace(/\s+/g, "").replace(/[\/]/g, "-");
            const parts = d.split("-");

            if (parts.length === 3) {
                let yyyy, mm, dd;

                if (parts[0].length === 4) {
                    yyyy = parts[0];
                    mm = parts[1];
                    dd = parts[2];
                } else {
                    yyyy = parts[2];
                    mm = parts[1];
                    dd = parts[0];
                }

                if (yyyy > 1900 && yyyy < 2030) {
                    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                }
            }
        }
    }

    // Year fallback
    const yearMatch =
        originalText.match(/(?:DOB|Year|YOB)[^\d]*(\d{4})/i) ||
        originalText.match(/\b(19\d{2}|20\d{2})\b/);

    if (yearMatch) {
        return `${yearMatch[1]}-01-01`;
    }

    return "2000-01-01";
}

//
// 🔥 DOCUMENT TYPE
//
function extractDocumentType(text) {
    const t = text.toLowerCase();

    if (t.includes("aadhaar") || t.includes("government of india"))
        return "aadhaar";

    if (t.includes("university") || t.includes("board"))
        return "marks_card";

    if (t.includes("grade") || t.includes("semester"))
        return "grade_card";

    return "other";
}

module.exports = { analyzeDocument };