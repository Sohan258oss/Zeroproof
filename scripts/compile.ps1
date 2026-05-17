$ErrorActionPreference = "Stop"

Write-Host "=============================================="
Write-Host "  AegisID - Cryptographic Compilation Pipeline"
Write-Host "  (The Trusted Setup Ceremony)"
Write-Host "=============================================="

$CIRCUITS = @("age_check", "range_check")
$CIRCUITS_DIR = ".\circuits"
$KEYS_DIR = ".\keys"

if (!(Test-Path $KEYS_DIR)) {
    New-Item -ItemType Directory -Path $KEYS_DIR | Out-Null
}

# ─────────────────────────────────────────
# PHASE 1: Powers of Tau (shared across all circuits)
# ─────────────────────────────────────────

$PTAU_FINAL = "$KEYS_DIR\pot14_final.ptau"

if (!(Test-Path $PTAU_FINAL)) {
    Write-Host "`n[Phase 1] Generating Powers of Tau (bn128, 2^14 = 16384 constraints)..."
    npx snarkjs powersoftau new bn128 14 "$KEYS_DIR\pot14_0000.ptau" -v
    npx snarkjs powersoftau contribute "$KEYS_DIR\pot14_0000.ptau" "$KEYS_DIR\pot14_0001.ptau" --name="AegisID Phase 1" -v -e="aegisid trusted setup entropy $(Get-Date -Format o)"
    npx snarkjs powersoftau prepare phase2 "$KEYS_DIR\pot14_0001.ptau" $PTAU_FINAL -v
    Write-Host "[Phase 1] Powers of Tau complete."
} else {
    Write-Host "`n[Phase 1] Powers of Tau already exist, skipping."
}

# ─────────────────────────────────────────
# PHASE 2: Compile each circuit
# ─────────────────────────────────────────

foreach ($CIRCUIT in $CIRCUITS) {
    Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    Write-Host "  Compiling: $CIRCUIT"
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    # 2a. Compile circuit to R1CS + WASM
    Write-Host "[2a] Compiling $CIRCUIT.circom -> R1CS + WASM..."
    .\circom.exe "$CIRCUITS_DIR\$CIRCUIT.circom" --r1cs --wasm -o "$KEYS_DIR"
    if ($LASTEXITCODE -ne 0) { throw "circom compilation failed for $CIRCUIT" }

    # 2b. Print circuit info
    Write-Host "[2b] Circuit info:"
    npx snarkjs r1cs info "$KEYS_DIR\$CIRCUIT.r1cs"

    # 2c. PLONK Setup (no phase 2 ceremony needed — universal setup)
    Write-Host "[2c] Running PLONK setup for $CIRCUIT..."
    npx snarkjs plonk setup "$KEYS_DIR\$CIRCUIT.r1cs" $PTAU_FINAL "$KEYS_DIR\${CIRCUIT}_final.zkey"

    # 2d. Export verification key
    Write-Host "[2d] Exporting verification key..."
    npx snarkjs zkey export verificationkey "$KEYS_DIR\${CIRCUIT}_final.zkey" "$KEYS_DIR\${CIRCUIT}_vkey.json"

    Write-Host "[OK] $CIRCUIT compiled and setup complete."
}

Write-Host "`n=============================================="
Write-Host "  Ceremony Complete!"
Write-Host "  Circuits: $($CIRCUITS -join ', ')"
Write-Host "  Output:   $KEYS_DIR"
Write-Host "=============================================="
