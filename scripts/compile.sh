#!/bin/bash
set -e

echo "Starting Cryptographic Pipeline (The Ceremony)"

# Paths
CIRCUIT_NAME="age_check"
CIRCUITS_DIR="./circuits"
KEYS_DIR="./keys"

# Create keys directory if it doesn't exist
mkdir -p "$KEYS_DIR"

# 1. Compile the circuit to r1cs and wasm
echo "Compiling circuit..."
circom "$CIRCUITS_DIR/$CIRCUIT_NAME.circom" --r1cs --wasm -o "$KEYS_DIR"

# 2. Powers of Tau (Setup)
echo "Generating Powers of Tau..."
# We need around 18 constraints, so power 10 is enough (2^10 = 1024)
# Because ptau requires power >= 10, using 10.
snarkjs powersoftau new bn128 10 "$KEYS_DIR/pot10_0000.ptau" -v
snarkjs powersoftau contribute "$KEYS_DIR/pot10_0000.ptau" "$KEYS_DIR/pot10_final.ptau" --name="First contribution" -v -e="random entropy"

# 3. PLONK Setup (No circuit-specific trusted setup, just universal setup)
echo "Exporting PLONK setup..."
snarkjs plonk setup "$KEYS_DIR/$CIRCUIT_NAME.r1cs" "$KEYS_DIR/pot10_final.ptau" "$KEYS_DIR/circuit_final.zkey"

# 4. Export verification key
echo "Exporting verification key..."
snarkjs zkey export verificationkey "$KEYS_DIR/circuit_final.zkey" "$KEYS_DIR/verification_key.json"

echo "Ceremony complete! WASM, verification key, and proving key (zkey) are in the $KEYS_DIR directory."
