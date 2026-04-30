#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{Client as TokenClient, StellarAssetClient},
    vec, Address, Env, String,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

fn setup() -> (Env, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register_contract(None, LumiFund);
    let token_admin = Address::generate(&env);
    let token_id = env.register_stellar_asset_contract_v2(token_admin.clone()).address();
    (env, contract_id, token_id)
}

fn mint(env: &Env, token: &Address, to: &Address, amount: i128) {
    StellarAssetClient::new(env, token).mint(to, &amount);
}

fn default_milestones(env: &Env) -> Vec<Milestone> {
    vec![
        env,
        Milestone {
            description: String::from_str(env, "Phase 1"),
            target_amount: 500,
            votes_for: 0,
            votes_against: 0,
            released: false,
        },
        Milestone {
            description: String::from_str(env, "Phase 2"),
            target_amount: 500,
            votes_for: 0,
            votes_against: 0,
            released: false,
        },
    ]
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[test]
fn test_create_campaign() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(
        &creator,
        &1000,
        &token_id,
        &9999,
        &default_milestones(&env),
    );
    assert_eq!(id, 1);
    assert_eq!(client.campaign_count(), 1);

    let c = client.get_campaign(&id);
    assert_eq!(c.goal, 1000);
    assert_eq!(c.total_raised, 0);
    assert_eq!(c.milestones.len(), 2);
}

#[test]
fn test_contribute_and_auto_success() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));

    mint(&env, &token_id, &backer, 2000);
    let total = client.contribute(&id, &backer, &1000);
    assert_eq!(total, 1000);

    let c = client.get_campaign(&id);
    assert_eq!(c.total_raised, 1000);
    assert_eq!(c.status, CampaignStatus::Successful);
}

#[test]
fn test_vote_and_release() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer1 = Address::generate(&env);
    let backer2 = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));

    mint(&env, &token_id, &backer1, 600);
    mint(&env, &token_id, &backer2, 600);
    client.contribute(&id, &backer1, &500);
    client.contribute(&id, &backer2, &500);

    // Both vote approve on milestone 0
    let (vf, va) = client.vote_milestone(&id, &0, &backer1, &true);
    assert_eq!(vf, 1);
    assert_eq!(va, 0);
    client.vote_milestone(&id, &0, &backer2, &true);

    // Check creator balance before release
    let token = TokenClient::new(&env, &token_id);
    let before = token.balance(&creator);

    client.release_funds(&id, &0);

    assert_eq!(token.balance(&creator), before + 500);
    let c = client.get_campaign(&id);
    assert_eq!(c.current_milestone, 1);
    assert!(c.milestones.get(0).unwrap().released);
}

#[test]
fn test_refund_after_deadline() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &2000, &default_milestones(&env));

    mint(&env, &token_id, &backer, 300);
    client.contribute(&id, &backer, &300);

    // Advance past deadline without reaching goal
    env.ledger().set_timestamp(3000);

    let token = TokenClient::new(&env, &token_id);
    let before = token.balance(&backer);
    client.refund(&id, &backer);
    assert_eq!(token.balance(&backer), before + 300);
    assert_eq!(client.get_contribution(&id, &backer), 0);
}

#[test]
fn test_refund_failed_campaign() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));

    mint(&env, &token_id, &backer, 400);
    client.contribute(&id, &backer, &400);
    client.fail_campaign(&id);

    let token = TokenClient::new(&env, &token_id);
    let before = token.balance(&backer);
    client.refund(&id, &backer);
    assert_eq!(token.balance(&backer), before + 400);
}

#[test]
#[should_panic(expected = "already voted")]
fn test_double_vote_rejected() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));
    mint(&env, &token_id, &backer, 600);
    client.contribute(&id, &backer, &500);
    client.vote_milestone(&id, &0, &backer, &true);
    client.vote_milestone(&id, &0, &backer, &true); // should panic
}

#[test]
#[should_panic(expected = "not a contributor")]
fn test_non_contributor_vote_rejected() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let outsider = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));
    client.vote_milestone(&id, &0, &outsider, &true); // should panic
}

#[test]
#[should_panic(expected = "milestone not approved by majority")]
fn test_release_without_majority_rejected() {
    let (env, contract_id, token_id) = setup();
    let client = LumiFundClient::new(&env, &contract_id);
    let creator = Address::generate(&env);
    let backer1 = Address::generate(&env);
    let backer2 = Address::generate(&env);

    env.ledger().set_timestamp(1000);
    let id = client.create_campaign(&creator, &1000, &token_id, &9999, &default_milestones(&env));
    mint(&env, &token_id, &backer1, 600);
    mint(&env, &token_id, &backer2, 600);
    client.contribute(&id, &backer1, &500);
    client.contribute(&id, &backer2, &500);
    client.vote_milestone(&id, &0, &backer1, &true);
    client.vote_milestone(&id, &0, &backer2, &false); // tie → no majority
    client.release_funds(&id, &0); // should panic
}
