const fs = require("fs");
const path = require("path");

async function testOCR() {
    console.log("Testing OCR with generated image...");
    const imagePath = "C:\\Users\\phata\\.gemini\\antigravity\\brain\\540d56bd-8b74-46d1-96e3-d41b3eccf7f0\\test_student_id_1778949385025.png";
    const buffer = fs.readFileSync(imagePath);
    
    const formData = new FormData();
    const blob = new Blob([buffer], { type: "image/png" });
    formData.append("document", blob, "test-id.png");

    const res = await fetch("http://localhost:3000/v3/documents/upload", {
        method: "POST",
        body: formData
    });
    const data = await res.json();
    
    if (res.ok) {
        console.log("✅ OCR Upload Successful!");
        console.log("Extracted Data:", JSON.stringify(data.data.document.attributes, null, 2));
    } else {
        console.error("❌ OCR Upload Failed:", data);
    }
}

testOCR();
