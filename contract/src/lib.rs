#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    token, vec, Address, Env, Map, String, Symbol, Vec,
};

// ── Storage keys ──────────────────────────────────────────────────────────────

const CAMPAIGN_COUNT: Symbol = symbol_short!("CC");

// ── Data types ────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum CampaignStatus {
    Active,
    Successful,
    Failed,
}

#[contracttype]
#[derive(Clone)]
pub struct Milestone {
    pub description: String,
    pub target_amount: i128, // portion of goal for this milestone
    pub votes_for: u32,
    pub votes_against: u32,
    pub released: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Campaign {
    pub id: u64,
    pub creator: Address,
    pub goal: i128,
    pub token: Address,
    pub total_raised: i128,
    pub milestones: Vec<Milestone>,
    pub current_milestone: u32,
    pub status: CampaignStatus,
    pub deadline: u64, // ledger timestamp
}

#[contracttype]
pub enum DataKey {
    Campaign(u64),
    Contribution(u64, Address),  // (campaign_id, contributor)
    Vote(u64, u32, Address),     // (campaign_id, milestone_index, voter)
}

// ── Events ────────────────────────────────────────────────────────────────────

fn emit(env: &Env, topic: Symbol, data: impl soroban_sdk::IntoVal<Env, soroban_sdk::Val>) {
    env.events().publish((topic,), data);
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct LumiFund;

#[contractimpl]
impl LumiFund {
    /// Create a new campaign. Returns the campaign ID.
    pub fn create_campaign(
        env: Env,
        creator: Address,
        goal: i128,
        token: Address,
        deadline: u64,
        milestones: Vec<Milestone>,
    ) -> u64 {
        creator.require_auth();
        assert!(goal > 0, "goal must be positive");
        assert!(!milestones.is_empty(), "need at least one milestone");
        assert!(deadline > env.ledger().timestamp(), "deadline in past");

        let id: u64 = env.storage().instance().get(&CAMPAIGN_COUNT).unwrap_or(0) + 1;
        env.storage().instance().set(&CAMPAIGN_COUNT, &id);

        let campaign = Campaign {
            id,
            creator: creator.clone(),
            goal,
            token,
            total_raised: 0,
            milestones,
            current_milestone: 0,
            status: CampaignStatus::Active,
            deadline,
        };
        env.storage().persistent().set(&DataKey::Campaign(id), &campaign);

        emit(&env, symbol_short!("created"), (id, creator, goal));
        id
    }

    /// Contribute `amount` of `token` to a campaign. Returns contribution total.
    pub fn contribute(env: Env, campaign_id: u64, contributor: Address, amount: i128) -> i128 {
        contributor.require_auth();
        assert!(amount > 0, "amount must be positive");

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(campaign.status == CampaignStatus::Active, "campaign not active");
        assert!(env.ledger().timestamp() <= campaign.deadline, "campaign expired");

        // Transfer tokens from contributor to contract
        token::Client::new(&env, &campaign.token).transfer(
            &contributor,
            &env.current_contract_address(),
            &amount,
        );

        campaign.total_raised += amount;

        // Track per-contributor amount
        let prev: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Contribution(campaign_id, contributor.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Contribution(campaign_id, contributor.clone()), &(prev + amount));

        // Auto-mark successful if goal reached
        if campaign.total_raised >= campaign.goal {
            campaign.status = CampaignStatus::Successful;
            emit(&env, symbol_short!("funded"), (campaign_id, campaign.total_raised));
        }

        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        emit(&env, symbol_short!("contrib"), (campaign_id, contributor, amount));
        prev + amount
    }

    /// Vote on a milestone. Returns (votes_for, votes_against).
    pub fn vote_milestone(
        env: Env,
        campaign_id: u64,
        milestone_index: u32,
        voter: Address,
        approve: bool,
    ) -> (u32, u32) {
        voter.require_auth();

        let vote_key = DataKey::Vote(campaign_id, milestone_index, voter.clone());
        assert!(
            !env.storage().persistent().has(&vote_key),
            "already voted"
        );
        // Voter must be a contributor
        assert!(
            env.storage()
                .persistent()
                .get::<_, i128>(&DataKey::Contribution(campaign_id, voter.clone()))
                .unwrap_or(0)
                > 0,
            "not a contributor"
        );

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(
            milestone_index < campaign.milestones.len(),
            "invalid milestone"
        );
        assert!(
            campaign.current_milestone == milestone_index,
            "not current milestone"
        );

        env.storage().persistent().set(&vote_key, &true);

        let mut ms = campaign.milestones.get(milestone_index).unwrap();
        if approve {
            ms.votes_for += 1;
        } else {
            ms.votes_against += 1;
        }
        campaign.milestones.set(milestone_index, ms.clone());
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);

        emit(
            &env,
            symbol_short!("voted"),
            (campaign_id, milestone_index, voter, approve),
        );
        (ms.votes_for, ms.votes_against)
    }

    /// Release funds for an approved milestone (majority votes_for).
    pub fn release_funds(env: Env, campaign_id: u64, milestone_index: u32) {
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        assert!(
            campaign.current_milestone == milestone_index,
            "not current milestone"
        );
        let ms = campaign.milestones.get(milestone_index).unwrap();
        assert!(!ms.released, "already released");
        assert!(
            ms.votes_for > ms.votes_against,
            "milestone not approved by majority"
        );

        let payout = ms.target_amount;
        token::Client::new(&env, &campaign.token).transfer(
            &env.current_contract_address(),
            &campaign.creator,
            &payout,
        );

        let mut updated_ms = ms;
        updated_ms.released = true;
        campaign.milestones.set(milestone_index, updated_ms);
        campaign.current_milestone += 1;

        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        emit(&env, symbol_short!("released"), (campaign_id, milestone_index, payout));
    }

    /// Refund a contributor when campaign has failed or deadline passed without reaching goal.
    pub fn refund(env: Env, campaign_id: u64, contributor: Address) {
        contributor.require_auth();

        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");

        // Allow refund if: explicitly failed OR deadline passed and goal not reached
        let expired = env.ledger().timestamp() > campaign.deadline
            && campaign.total_raised < campaign.goal;
        assert!(
            campaign.status == CampaignStatus::Failed || expired,
            "campaign not eligible for refund"
        );

        if expired && campaign.status == CampaignStatus::Active {
            campaign.status = CampaignStatus::Failed;
        }

        let contrib_key = DataKey::Contribution(campaign_id, contributor.clone());
        let amount: i128 = env
            .storage()
            .persistent()
            .get(&contrib_key)
            .expect("no contribution found");
        assert!(amount > 0, "nothing to refund");

        env.storage().persistent().set(&contrib_key, &0i128);
        campaign.total_raised -= amount;
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);

        token::Client::new(&env, &campaign.token).transfer(
            &env.current_contract_address(),
            &contributor,
            &amount,
        );

        emit(&env, symbol_short!("refunded"), (campaign_id, contributor, amount));
    }

    /// Mark a campaign as failed (creator only).
    pub fn fail_campaign(env: Env, campaign_id: u64) {
        let mut campaign: Campaign = env
            .storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found");
        campaign.creator.require_auth();
        campaign.status = CampaignStatus::Failed;
        env.storage().persistent().set(&DataKey::Campaign(campaign_id), &campaign);
        emit(&env, symbol_short!("failed"), campaign_id);
    }

    // ── Read-only helpers ──────────────────────────────────────────────────────

    pub fn get_campaign(env: Env, campaign_id: u64) -> Campaign {
        env.storage()
            .persistent()
            .get(&DataKey::Campaign(campaign_id))
            .expect("campaign not found")
    }

    pub fn get_contribution(env: Env, campaign_id: u64, contributor: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Contribution(campaign_id, contributor))
            .unwrap_or(0)
    }

    pub fn campaign_count(env: Env) -> u64 {
        env.storage().instance().get(&CAMPAIGN_COUNT).unwrap_or(0)
    }
}

mod tests;
