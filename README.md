# LumiFund

Milestone-based crowdfunding protocol on Stellar/Soroban. Funds are held in escrow and released only after contributors vote to approve each milestone.

## Architecture

```
lumifund/
├── contract/          # Soroban smart contract (Rust)
├── backend/           # NestJS API + Horizon indexer
├── frontend/          # Next.js 14 app
└── scripts/           # Testnet deploy & smoke-test
```

## Smart Contract

Five entry points, all with on-chain events:

| Function | Description |
|---|---|
| `create_campaign(creator, goal, token, deadline, milestones[])` | Creates a campaign, returns `campaign_id` |
| `contribute(campaign_id, contributor, amount)` | Transfers tokens to escrow, returns running total |
| `vote_milestone(campaign_id, milestone_index, voter, approve)` | Records a contributor vote, returns `(votes_for, votes_against)` |
| `release_funds(campaign_id, milestone_index)` | Pays creator if majority approved; advances milestone pointer |
| `refund(campaign_id, contributor)` | Returns tokens when campaign failed or deadline passed without reaching goal |

Events emitted: `created`, `contrib`, `funded`, `voted`, `released`, `refunded`, `failed`.

## Prerequisites

- [Rust + wasm32 target](https://www.rust-lang.org/tools/install): `rustup target add wasm32-unknown-unknown`
- [Stellar CLI](https://developers.stellar.org/docs/tools/developer-tools/cli/install)
- Node.js ≥ 20
- PostgreSQL
- [Freighter wallet](https://www.freighter.app/) browser extension

## 1 — Contract

### Run tests

```bash
cd contract
cargo test
```

### Deploy to testnet

```bash
# From repo root
bash scripts/deploy.sh
```

The script will:
1. Build and optimise the wasm
2. Generate a `lumifund-deployer` identity (funded via Friendbot)
3. Deploy the contract
4. Write `CONTRACT_ID` to `frontend/.env.local` and `backend/.env`

### Smoke test

```bash
export CONTRACT_ID=<from deploy output>
export TOKEN_ID=<SAC address of your test token>
bash scripts/invoke.sh
```

## 2 — Backend

```bash
cd backend
cp .env.example .env          # fill in DATABASE_URL and CONTRACT_ID
npm install
npx prisma migrate dev        # creates tables
npm run start:dev             # http://localhost:3001
```

Swagger UI: `http://localhost:3001/api`

### API endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/campaigns` | Register campaign (off-chain record) |
| `GET` | `/campaigns` | List campaigns (optional `?status=active`) |
| `GET` | `/campaigns/:id` | Campaign detail with milestones & contributions |

The indexer polls Horizon every 10 s and syncs `contrib`, `funded`, `released`, and `failed` events into PostgreSQL.

### Run backend tests

```bash
cd backend
npm test
```

## 3 — Frontend

```bash
cd frontend
cp .env.local.example .env.local   # fill in CONTRACT_ID
npm install
npm run dev                         # http://localhost:3000
```

### Pages

| Route | Description |
|---|---|
| `/` | Landing page with active campaigns |
| `/campaigns` | Filterable campaign list |
| `/campaigns/new` | 3-step creation wizard |
| `/campaigns/[id]` | Campaign detail, contribution form, milestone tracker |
| `/backer` | Contributor portal with refund option |

## Environment variables

### `backend/.env`

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lumifund
CONTRACT_ID=<deployed contract id>
HORIZON_URL=https://horizon-testnet.stellar.org
PORT=3001
```

### `frontend/.env.local`

```
NEXT_PUBLIC_CONTRACT_ID=<deployed contract id>
NEXT_PUBLIC_RPC_URL=https://soroban-testnet.stellar.org
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Tech stack

| Layer | Technology |
|---|---|
| Smart contract | Rust, Soroban SDK 21 |
| Blockchain | Stellar Testnet / Mainnet |
| Backend | NestJS 10, Prisma 5, PostgreSQL |
| Frontend | Next.js 14 (App Router), TailwindCSS, Freighter SDK |
| Deploy | Stellar CLI, Friendbot |
