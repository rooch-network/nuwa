---
nip: 5
title: Fiat-Proxy Top-Up Protocol (FPTP)
status: Draft
type: Standards Track — Payments
category: Core
requires: NIP-1, NIP-2, NIP-3, NIP-9
created: 2025-05-16
version: 0.1-draft
license: CC-BY-SA-4.0
---

# 0 Summary
NIP-5 standardises **Fiat-Proxy Top-Up** for Nuwa Agents across different blockchain environments:

* A **Proxy Registry** smart-contract is deployed on each participating blockchain (with an example implementation in Move/Solidity provided for illustration). This registry allows any licensed service (“Fiat Proxy”), identified by a DID (NIP-1), to register on-chain for specific tokens it supports on that chain.
* Web2 users pay the proxy with card/Apple Pay/etc.; the proxy immediately mints or transfers the specified on-chain token (e.g., **RGas** on Rooch, or a similar native/utility token on other chains) to the user’s Agent DID on that specific blockchain.
* Front-ends can query a chain's registry, list fee rates & supported pay-in methods for various proxies and tokens on that chain, and let users choose a preferred proxy.

The protocol introduces no new signature or channel logic; it only standardises
**discovery** (on a per-chain basis) and the **`fiatTopUp`() on-chain transaction** using DIDs for proxy identification.

---

# 1 Motivation

| Need | Current gap | FPTP solution |
|------|-------------|---------------|
| Web2 users cannot hold crypto | Custodian covers DID control, but funding still complex | One click “Pay 5 USD → +5 RGas” via proxy |
| Ecosystem neutrality | No single on-ramp provider | On-chain registry & fee market |
| Proof & audit | Off-chain receipt hard to verify | Proxy tx emits `FiatTopUp` event with hashed receipt |

---

# 2 Terminology

| Term | Meaning |
|------|---------|
| **Fiat Proxy** | Licensed off-chain service, identified by a DID (NIP-1), that accepts fiat and transfers a specified on-chain gas/utility token (e.g., RGas on Rooch) on the blockchain where it is registered. |
| **Proxy Registry** | A smart-contract deployed on a specific blockchain (e.g., Rooch, or another supported chain) storing proxy DIDs, their supported tokens on that chain, metadata & fee schedules. The specific implementation (e.g., Move, Solidity) will vary by chain. |
| **Top-Up Tx** | `fiatTopUp(recipient_did, amount_token, token_symbol, receipt_hash)` on-chain call executed by a registered Fiat Proxy (identified by its DID) on the chain where the token is being transferred. `token_symbol` specifies the token. |

---

# 3 Proxy Registry Contract (Illustrative examples in Move / Solidity-pseudocode)

_The following contract structures and functions are illustrative and specific to a single blockchain instance of the registry. A Fiat Proxy entity can register on multiple such registries across different chains._

_A single Fiat Proxy (identified by its DID) can register multiple entries in a specific chain's registry if it supports multiple distinct tokens on that chain. Each entry is uniquely identified by the combination of the proxy's DID and the `token_symbol`._

## 3.1 Data structure

```rust 
// Example in Move-like pseudocode
// This structure represents a proxy's registration for a *specific token* on this chain.
struct ProxyServiceOffering has key { // Key would be (did, token_symbol)
    did:          String,              // DID of the Fiat Proxy (NIP-1 compliant)
    token_symbol: String,              // Symbol of the token being provided on this chain (e.g., "RGas", "USDC")
    name:         String,              // Display name of the Fiat Proxy service
    url:          String,              // HTTPS base url for payment processing for this token
    fee_bps:      u16,                 // basis-points on exchanged amount for this token
    payin_codes:  vector<u16>,         // see § 3.4, payment methods supported for this service
    stake:        u64,                 // locked amount of the native gas/utility token of *this chain* (e.g., RGas if on Rooch)
    active:       bool                 // Whether this specific service offering is active
}

// Note on `token_symbol` interpretation:
// The `token_symbol` string (e.g., "USDC", "RGas") is always interpreted within the context of the specific
// blockchain where this `ProxyServiceOffering` is registered and where the corresponding `fiatTopUp`
// transaction will occur. Since Proxy Registries are deployed on a per-chain basis, any `token_symbol`
// is unique in combination with the chain it resides on. For instance, "USDC" registered on an
// Ethereum Proxy Registry is distinct from "USDC" registered on a Polygon Proxy Registry.
// Front-ends and Agents consuming this data MUST associate the `token_symbol` with the chain of
// the queried Proxy Registry to avoid ambiguity. Chain-specific implementations of the Proxy Registry
// are responsible for how they map these symbols to actual on-chain token contracts or native assets.

### 3.2 Core entry-points

The caller's DID (e.g., transaction signer) is used to identify the Fiat Proxy. Operations are specific to a `token_symbol`.

| Function                                                             | Description                                                                                                                               |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `register(token_symbol, name, url, fee_bps, codes)`                  | Registers the caller's DID to offer `token_symbol` on this chain. Stake ≥ `MIN_STAKE`; emits `ProxyServiceRegistered`.                      |
| `updateMeta(token_symbol, new_name, new_url, new_fee, new_codes)`    | Modifies metadata for the caller's (Proxy's) DID for the specified `token_symbol`. Only callable by the proxy. Emits `ProxyServiceUpdated`. |
| `deactivate(token_symbol)`                                           | Deactivates the caller's (Proxy's) DID for the specified `token_symbol`. Voluntary exit (timelock). Emits `ProxyServiceStatusChanged`.    |
| `activate(token_symbol)`                                             | Activates an inactive service offering for the `token_symbol`. Emits `ProxyServiceStatusChanged`.                                         |
| `getOffering(proxy_did: String, token_symbol: String)`               | View function to get metadata for a specific `proxy_did` and `token_symbol` on this chain. Returns `Option<ProxyServiceOffering>`.         |
| `getOfferingsByDID(proxy_did: String, offset: u64, limit: u64)`      | View function to list all service offerings (tokens) by a specific `proxy_did` on this chain. Returns `vector<ProxyServiceOffering>`.    |
| `listActiveOfferings(token_symbol_filter: Option<String>, offset: u64, limit: u64)` | View function to list all active service offerings on this chain, optionally filtered by `token_symbol`. Returns `vector<ProxyServiceOffering>`. |

### 3.3 Events

| Event                      | Payload                                         |
| -------------------------- | ----------------------------------------------- |
| `ProxyServiceRegistered`   | `(did, token_symbol, name, fee_bps, codes)`     |
| `ProxyServiceStatusChanged`| `(did, token_symbol, active)`                   |
| `ProxyServiceUpdated`      | `(did, token_symbol, name, url, fee_bps, codes)`|

### 3.4 `payin_codes` enumeration

| Code  | Pay-in method                |
| ----- | ---------------------------- |
| `1`   | Credit / Debit Card (Stripe) |
| `2`   | Apple Pay                    |
| `3`   | Google Pay                   |
| `4`   | Alipay                       |
| `5`   | WeChat Pay                   |
| `6`   | SEPA Transfer                |
| `7`   | PayPal                       |
| `10+` | *reserved* (DAO vote)        |

---

# 4 Top-Up Transaction

_The following function signature is illustrative and would be adapted for the specific smart contract language of the target blockchain. This transaction occurs on the chain where the token is being transferred._

```move 
// Example in Move-like pseudocode
public entry fun fiatTopUp(
    // The signer of this transaction is the Fiat Proxy.
    // Their DID is implicitly known to the contract.
    recipient_did: String,     // The Agent DID to receive the token
    amount_token: u64,          // Amount of the specific on-chain token to transfer
    token_symbol: String,       // Symbol of the token being transferred (e.g., "RGas", "USDC"), to ensure clarity
    receipt_hash: vector<u8>    // sha256 of off-chain payment proof
) // `acquires` clause would depend on specific chain/language implementation
```

* **Access control** — Only a Fiat Proxy (identified by its DID via the transaction signer) that has an active registration for the specified `token_symbol` on this chain may call this function.
* Contract must verify the caller is a registered and active Fiat Proxy for the specified `token_symbol`.
* Contract must transfer `amount_token` of the specified `token_symbol` from the proxy's funded pool (or mint, if applicable based on chain capabilities and proxy permissions for that token) to `recipient_did`.
* Emit `FiatTopUp(recipient_did, amount_token, token_symbol, proxy_did_of_caller, receipt_hash)`.

> **Funding the pool** — Each Fiat Proxy pre-loads the specific on-chain tokens it supports (e.g., RGas, USDC) into its own managed pool or account on this blockchain, according to the rules of this chain and token standard.

---

# 5 Client & Runtime Behaviour

1. **Discovery**
   Front-end calls `registry.listActiveOfferings()` or `registry.getOfferingsByDID()` on the target chain's Proxy Registry to get proxy service details (including their DID, `token_symbol`, fee rates, supported `payin_codes`). Filters by `payin_codes`, `token_symbol`, and sorts by `fee_bps`.
2. **Pay-in**
   User completes fiat payment on proxy’s hosted page; proxy computes `receipt_hash`.
3. **On-chain transfer**
   Proxy (identified by its DID and signing with its associated key) calls `fiatTopUp()` on the target chain for the agreed `token_symbol` and `amount_token`.
4. **Agent Runtime** watches `FiatTopUp` events on its chain. Upon detecting a successful top-up of a specific `token_symbol` to its `recipient_did`:
    * The Agent's balance for that `token_symbol` is updated.
    * The Agent (or its controlling UI/logic) can then decide to use these funds. For example, it might initiate opening a new NIP-3 state channel (which itself might be specified to use a particular token) or depositing into an existing one, based on its operational requirements or user instructions. This channel management is a subsequent action taken by the Agent, separate from the Fiat-Proxy's top-up process.
5. The updated token balance (e.g., RGas or other tokens) is reflected in the Agent's UI or internal state.

---

# 6 Security & Compliance

| Topic                    | Measure                                                             |
| ------------------------ | ------------------------------------------------------------------- |
| Fiat fraud / charge-back | Proxy stake ≥ outstanding top-ups; DAO may slash stake on disputes. |
| AML / KYC                | Proxy obliged to hold licences; registry can mark `kyc_level`.      |
| Price slippage           | Proxy quote fixed for 15 min; on-chain amount must match quote.     |
| Receipt integrity        | `receipt_hash` in event ties on-chain tx to off-chain payment.      |

---

# 7 Backward Compatibility

* **NIP-1**: Fiat Proxy DIDs must conform to NIP-1 for identity and key management.
* **NIP-3** payment flows unchanged – top-up just funds channel balance.
* Custodian model (NIP-9) unaffected; proxy may coexist with custodian or be the same entity.


# 8 References

1. **NIP-3 — Agent Service Payment Protocol**
2. **Relevant Token Standards** (e.g., Rooch Token Standard for RGas, ERC-20 for Ethereum tokens, etc., specific to the chain where the Proxy Registry and tokens reside)
3. **PCI-DSS** guidelines (for card handling)