const fs = require('fs');
const path = require('path');
const { analyzeDocument } = require('../api/services/documentAnalyzer');

async function test() {
    const docPath = path.join(__dirname, '../data/verified/52717611-4356-4bf7-8bc5-db263ed4bd3e_original.png');
    if (!fs.existsSync(docPath)) {
        console.error("Test file not found");
        return;
    }
    const buffer = fs.readFileSync(docPath);
    try {
        const result = await analyzeDocument(buffer);
        console.log("Extracted Data:", JSON.stringify(result, null, 2));
    } catch (err) {
        console.error("Test failed:", err);
    }
}

test();
