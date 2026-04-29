$ErrorActionPreference = "Stop"

Write-Host "Starting Cryptographic Pipeline (The Ceremony)"

$CIRCUIT_NAME = "age_check"
$CIRCUITS_DIR = ".\circuits"
$KEYS_DIR = ".\keys"

if (!(Test-Path $KEYS_DIR)) {
    New-Item -ItemType Directory -Path $KEYS_DIR | Out-Null
}

# 1. Compile the circuit to r1cs and wasm
Write-Host "Compiling circuit..."
.\circom.exe "$CIRCUITS_DIR\$CIRCUIT_NAME.circom" --r1cs --wasm -o "$KEYS_DIR"
if ($LASTEXITCODE -ne 0) { throw "circom compilation failed" }

# 2. Powers of Tau (Setup)
Write-Host "Generating Powers of Tau..."
npx snarkjs powersoftau new bn128 10 "$KEYS_DIR\pot10_0000.ptau" -v
npx snarkjs powersoftau contribute "$KEYS_DIR\pot10_0000.ptau" "$KEYS_DIR\pot10_0001.ptau" --name="First contribution" -v -e="random entropy"
npx snarkjs powersoftau prepare phase2 "$KEYS_DIR\pot10_0001.ptau" "$KEYS_DIR\pot10_final.ptau" -v

# 3. PLONK Setup
Write-Host "Exporting PLONK setup..."
npx snarkjs plonk setup "$KEYS_DIR\$CIRCUIT_NAME.r1cs" "$KEYS_DIR\pot10_final.ptau" "$KEYS_DIR\circuit_final.zkey"

# 4. Export verification key
Write-Host "Exporting verification key..."
npx snarkjs zkey export verificationkey "$KEYS_DIR\circuit_final.zkey" "$KEYS_DIR\verification_key.json"

Write-Host "Ceremony complete! WASM, verification key, and proving key (zkey) are in the $KEYS_DIR directory."
