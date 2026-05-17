/**
 * AegisID — API Integration Tests
 * 
 * Tests the verification API endpoints with mock proofs.
 * Run with: node tests/api.test.js
 * 
 * Prerequisites: API server running on localhost:3000
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (condition) {
        console.log(`  ✅ ${message}`);
        passed++;
    } else {
        console.error(`  ❌ ${message}`);
        failed++;
    }
}

async function testHealthEndpoint() {
    console.log("\n━━━ GET /health ━━━");
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();

    assert(res.status === 200, "Returns 200");
    assert(data.status === "healthy", "Status is healthy");
    assert(data.version === "3.0.0", "Version is 3.0.0");
}

async function testRootEndpoint() {
    console.log("\n━━━ GET / ━━━");
    const res = await fetch(`${API_URL}/`);
    const data = await res.json();

    assert(res.status === 200, "Returns 200");
    assert(data.name === "AegisID Verification API", "Has correct name");
    assert(data.versions.v1, "Lists v1 routes");
    assert(data.versions.v2, "Lists v2 routes");
}

async function testProofTypesEndpoint() {
    console.log("\n━━━ GET /v1/proof-types ━━━");
    const res = await fetch(`${API_URL}/v1/proof-types`);
    const data = await res.json();

    assert(res.status === 200, "Returns 200");
    assert(data.status === "success", "Status is success");
    assert(Array.isArray(data.data.proofTypes), "Returns proof types array");
    assert(data.data.proofTypes.length >= 2, "Has at least 2 proof types");
}

async function testMissingProofBody() {
    console.log("\n━━━ POST /v1/verify (missing body) ━━━");
    const res = await fetch(`${API_URL}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({})
    });
    const data = await res.json();

    assert(res.status === 400, "Returns 400");
    assert(data.status === "error", "Status is error");
    assert(data.error.code === "VALIDATION_ERROR", "Error code is VALIDATION_ERROR");
}

async function testInvalidProofStructure() {
    console.log("\n━━━ POST /v1/verify (invalid proof structure) ━━━");
    const res = await fetch(`${API_URL}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: "bad" },  // Missing required PLONK fields
            publicSignals: ["1", "2", "3"]
        })
    });
    const data = await res.json();

    assert(res.status === 400, "Returns 400");
    assert(data.error.code === "VALIDATION_ERROR", "Catches missing PLONK fields");
}

async function testUnsupportedProofType() {
    console.log("\n━━━ POST /v1/verify (unsupported proof type) ━━━");
    const res = await fetch(`${API_URL}/v1/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            proof: { A: [], B: [], C: [], Z: [], T1: [], T2: [], T3: [], Wxi: [], Wxiw: [] },
            publicSignals: ["1"],
            proofType: "nonexistent_circuit"
        })
    });
    const data = await res.json();

    assert(res.status === 400, "Returns 400");
    assert(data.error.code === "VALIDATION_ERROR", "Rejects unsupported proof type");
}

async function test404() {
    console.log("\n━━━ GET /nonexistent ━━━");
    const res = await fetch(`${API_URL}/nonexistent`);
    const data = await res.json();

    assert(res.status === 404, "Returns 404");
    assert(data.error.code === "NOT_FOUND", "Error code is NOT_FOUND");
}

async function testRateLimitHeaders() {
    console.log("\n━━━ Rate Limit Headers ━━━");
    const res = await fetch(`${API_URL}/health`);

    assert(res.headers.get("x-ratelimit-limit") !== null, "Has X-RateLimit-Limit header");
    assert(res.headers.get("x-ratelimit-remaining") !== null, "Has X-RateLimit-Remaining header");
    assert(res.headers.get("x-request-id") !== null, "Has X-Request-ID header");
}

async function runAllTests() {
    console.log("╔══════════════════════════════════════╗");
    console.log("║    AegisID API Integration Tests     ║");
    console.log("╚══════════════════════════════════════╝");
    console.log(`Target: ${API_URL}`);

    try {
        await testHealthEndpoint();
        await testRootEndpoint();
        await testProofTypesEndpoint();
        await testMissingProofBody();
        await testInvalidProofStructure();
        await testUnsupportedProofType();
        await test404();
        await testRateLimitHeaders();
    } catch (e) {
        console.error("\n💥 Test runner error:", e.message);
        console.error("   Is the API server running?");
    }

    console.log(`\n━━━ Results: ${passed} passed, ${failed} failed ━━━`);
    setTimeout(() => {
        process.exit(failed > 0 ? 1 : 0);
    }, 100);
}

runAllTests();
