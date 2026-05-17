#!/bin/bash
set -euo pipefail

echo "=============================================="
echo "  AegisID - Cryptographic Compilation Pipeline"
echo "  (The Trusted Setup Ceremony)"
echo "=============================================="

CIRCUITS=("age_check" "range_check")
CIRCUITS_DIR="./circuits"
KEYS_DIR="./keys"

mkdir -p "$KEYS_DIR"

# ─────────────────────────────────────────
# PHASE 1: Powers of Tau (shared)
# ─────────────────────────────────────────

PTAU_FINAL="$KEYS_DIR/pot14_final.ptau"

if [ ! -f "$PTAU_FINAL" ]; then
    echo ""
    echo "[Phase 1] Generating Powers of Tau (bn128, 2^14)..."
    npx snarkjs powersoftau new bn128 14 "$KEYS_DIR/pot14_0000.ptau" -v
    npx snarkjs powersoftau contribute "$KEYS_DIR/pot14_0000.ptau" "$KEYS_DIR/pot14_0001.ptau" \
        --name="AegisID Phase 1" -v -e="aegisid trusted setup entropy $(date -Iseconds)"
    npx snarkjs powersoftau prepare phase2 "$KEYS_DIR/pot14_0001.ptau" "$PTAU_FINAL" -v
    echo "[Phase 1] Powers of Tau complete."
else
    echo ""
    echo "[Phase 1] Powers of Tau already exist, skipping."
fi

# ─────────────────────────────────────────
# PHASE 2: Compile each circuit
# ─────────────────────────────────────────

for CIRCUIT in "${CIRCUITS[@]}"; do
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Compiling: $CIRCUIT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    echo "[2a] Compiling $CIRCUIT.circom -> R1CS + WASM..."
    circom "$CIRCUITS_DIR/$CIRCUIT.circom" --r1cs --wasm -o "$KEYS_DIR"

    echo "[2b] Circuit info:"
    npx snarkjs r1cs info "$KEYS_DIR/$CIRCUIT.r1cs"

    echo "[2c] Running PLONK setup..."
    npx snarkjs plonk setup "$KEYS_DIR/$CIRCUIT.r1cs" "$PTAU_FINAL" "$KEYS_DIR/${CIRCUIT}_final.zkey"

    echo "[2d] Exporting verification key..."
    npx snarkjs zkey export verificationkey "$KEYS_DIR/${CIRCUIT}_final.zkey" "$KEYS_DIR/${CIRCUIT}_vkey.json"

    echo "[OK] $CIRCUIT complete."
done

echo ""
echo "=============================================="
echo "  Ceremony Complete!"
echo "  Circuits: ${CIRCUITS[*]}"
echo "  Output:   $KEYS_DIR"
echo "=============================================="
