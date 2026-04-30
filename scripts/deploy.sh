#!/usr/bin/env bash
# deploy.sh — Build and deploy LumiFund to Stellar testnet
set -euo pipefail

NETWORK="testnet"
RPC_URL="https://soroban-testnet.stellar.org"
NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
CONTRACT_DIR="$(cd "$(dirname "$0")/../contract" && pwd)"
WASM_PATH="$CONTRACT_DIR/target/wasm32-unknown-unknown/release/lumifund.wasm"
IDENTITY="${IDENTITY:-lumifund-deployer}"

echo "==> Checking stellar CLI..."
command -v stellar >/dev/null 2>&1 || { echo "Install stellar CLI: https://developers.stellar.org/docs/tools/developer-tools/cli/install"; exit 1; }

echo "==> Building contract (release)..."
cd "$CONTRACT_DIR"
cargo build --target wasm32-unknown-unknown --release

echo "==> Optimising wasm..."
stellar contract optimize --wasm "$WASM_PATH"
OPTIMISED="${WASM_PATH%.wasm}.optimized.wasm"

echo "==> Ensuring identity '$IDENTITY' exists..."
if ! stellar keys show "$IDENTITY" >/dev/null 2>&1; then
  stellar keys generate "$IDENTITY" --network "$NETWORK"
  echo "    Funding via Friendbot..."
  ADDRESS=$(stellar keys address "$IDENTITY")
  curl -s "https://friendbot.stellar.org?addr=$ADDRESS" | jq -r '.hash // "funded"'
fi

echo "==> Deploying contract..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$OPTIMISED" \
  --source "$IDENTITY" \
  --network "$NETWORK" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$NETWORK_PASSPHRASE")

echo ""
echo "✅ Contract deployed!"
echo "   CONTRACT_ID=$CONTRACT_ID"
echo "   Network:    $NETWORK"
echo ""

# Persist to .env files for backend and frontend
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID" >> "$ROOT/frontend/.env.local"
echo "CONTRACT_ID=$CONTRACT_ID"             >> "$ROOT/backend/.env"
echo "   Written CONTRACT_ID to frontend/.env.local and backend/.env"
