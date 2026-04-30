#!/usr/bin/env bash
# invoke.sh — Smoke-test LumiFund contract on testnet
set -euo pipefail

NETWORK="testnet"
IDENTITY="${IDENTITY:-lumifund-deployer}"
CONTRACT_ID="${CONTRACT_ID:?Set CONTRACT_ID env var}"
TOKEN_ID="${TOKEN_ID:?Set TOKEN_ID env var (SAC address)}"
DEADLINE=$(($(date +%s) + 86400))  # 24 h from now

invoke() {
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$IDENTITY" \
    --network "$NETWORK" \
    -- "$@"
}

CREATOR=$(stellar keys address "$IDENTITY")

echo "==> create_campaign"
CAMPAIGN_ID=$(invoke create_campaign \
  --creator "$CREATOR" \
  --goal 1000 \
  --token "$TOKEN_ID" \
  --deadline "$DEADLINE" \
  --milestones '[{"description":"Phase 1","target_amount":500,"votes_for":0,"votes_against":0,"released":false},{"description":"Phase 2","target_amount":500,"votes_for":0,"votes_against":0,"released":false}]')
echo "   campaign_id=$CAMPAIGN_ID"

echo "==> get_campaign"
invoke get_campaign --campaign_id "$CAMPAIGN_ID"

echo ""
echo "✅ Smoke test passed. Campaign ID: $CAMPAIGN_ID"
