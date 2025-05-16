---
nip: 1
title: Nuwa Agent Single DID Multi-Device Key Model
author: @jolestar
discussions-to: <URL to GitHub Issue or Discussion Forum> // TODO: Add discussion link
status: Draft
type: Standards Track
category: Core
created: 2024-05-12
---

## Abstract

This NIP proposes a decentralized identity model for Nuwa Agents, enabling a single master Decentralized Identifier (DID) to manage multiple device-specific keys. It aims to maintain user identity consistency while achieving key isolation, permission control, and secure revocability for multi-device Agents. The model supports various DID methods, with `did:rooch` (where DID documents are stored on the Rooch Network) presented as a specific example.

## Motivation

To maintain user identity consistency (single DID) while achieving key isolation, permission control, and secure revocability for multi-device Agents, the current ecosystem lacks a standardized approach. This specification proposes a decentralized identity model based on a **"single master identity + multiple device sub-keys"** concept. It aims to provide a robust and flexible identity foundation for Agents in the Nuwa ecosystem, addressing the need for users to securely interact across multiple devices without compromising their core digital identity or creating fragmented identities.

## Specification

### Core Design Principles

-   **Single Master Identity**: Each user possesses a master DID (e.g., any DID compliant with W3C DID specifications, such as `did:example:123`; for implementations on the Rooch network, like `did:rooch:alice`), representing their unique digital persona and associated digital assets/memories. Control over this DID is held by one or more Master Key(s).
-   **Multi-Device Keys**: Each Agent instance running on a different device generates a local Device Key.
-   **DID Document Registration**: The public key information of each Device Key is registered as a `verificationMethod` entry in the DID document associated with the master DID.
-   **Fine-grained Verification Relationships**: By adding the `id` of a `verificationMethod` to different verification relationships (e.g., `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation`), the permission scope of each device key can be precisely controlled.
-   **Signatures Indicate Origin**: All signature operations initiated by an Agent must clearly indicate which device key was used (via the `id` of the `verificationMethod`).

### General DID Method Support & `did:rooch` Concept

This Nuwa Agent model aims to support existing industry DID methods that comply with W3C DID specifications. An Agent's master DID can adopt any compatible DID method.

As a possible specific implementation, this NIP mentions `did:rooch:<unique-identifier>`. If `did:rooch` is pursued as a new DID method, its specification will be necessary, covering:
-   **Verifiable Data Registry (VDR) for `did:rooch`**: Storage location, data model, access controls.
-   **DID Operations (CRUD) for `did:rooch`**: Processes for create, read, update, deactivate.
-   **Resolver for `did:rooch`**: How to resolve `did:rooch` to its DID document.
-   **Security & Consensus for `did:rooch`**: Security model of the VDR.
*(Detailing a new DID method is beyond this NIP's scope; these are considerations.)*

### Master Key Management & Recovery

Secure management and reliable recovery of master keys are critical.
-   **Master Key(s)**: Users must generate and securely back up their master DID's Master Key(s) offline. These private keys should not be stored on any routinely used Agent devices.
-   **Controller**: The `controller` field of the DID document must point to the entity holding the Master Key(s).
-   **Recovery Mechanisms**: Robust key recovery mechanisms (e.g., Social Recovery, Multi-signature, Hardware Wallet) are essential and depend on the adopted DID method.

### DID Document Structure Example

```json
// filepath: NIPs/nip-1.md
// ...existing code...
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:rooch:alice",
  "controller": "did:rooch:alice",
  "verificationMethod": [
    {
      "id": "did:rooch:alice#device-key-1",
      "type": "EcdsaSecp256k1VerificationKey2019", // Or Ed25519VerificationKey2020
      "controller": "did:rooch:alice",
      "publicKeyHex": "0xabc123..."
    },
    {
      "id": "did:rooch:alice#device-key-2",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:rooch:alice",
      "publicKeyHex": "0xdef456..."
    },
    {
      "id": "did:rooch:alice#session-temp-xyz",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:rooch:alice",
      "publicKeyHex": "0xghi789...",
      "expires": 1747252800
    }
  ],
  "authentication": [
    "did:rooch:alice#device-key-1"
  ],
  "assertionMethod": [
    "did:rooch:alice#device-key-1",
    "did:rooch:alice#device-key-2"
  ],
  "capabilityInvocation": [
     "did:rooch:alice#device-key-1",
     "did:rooch:alice#device-key-2",
     "did:rooch:alice#session-temp-xyz"
  ],
  "capabilityDelegation": [
     // Typically only Master Key or high-privilege Key
  ]
  // "service": [ ... ]
}
// ...existing code...
```

### Signature Structure Specification

Each signature operation initiated by an Agent device should result in a structure:

```json
// filepath: NIPs/nip-1.md
// ...existing code...
{
  "signed_data": {
    "operation": "...",
    "params": { ... },
    "nonce": "random_nonce_123",
    "timestamp": 1715600000
  },
  "signature": {
    "signer_did": "did:rooch:alice",
    "key_id": "did:rooch:alice#device-key-1",
    "value": "0x...."
  }
}
// ...existing code...
```
Verification Process:
1.  Verify `timestamp`.
2.  Check `nonce`.
3.  Resolve `signer_did`.
4.  Find `verificationMethod` for `key_id`.
5.  Verify `signature.value` with the public key.
6.  (Optional) Check `key_id` against verification relationships.

### Permission Control Model

Recommended strategies:
1.  **Verification Relationship-Based**: Utilize standard DID Core verification relationships.
2.  **Capability Objects**: Use ZCAP-LD or similar for fine-grained permissions.
3.  **External Policy Service**: DID document `service` endpoint points to a policy service.
4.  **Application-Layer Enforcement**: Relying Party enforces based on business logic.

**Recommendation**: Prioritize Verification Relationship-Based, combinable with Capability Objects.

### Device Key Registration / Update Protocol (Draft)

This section outlines a high-level protocol for adding a new device key to the DID document.

**Participants:** User, New Agent, Authorizing Agent/Device, Controller/Management Service, VDR.

**Protocol Flow (Example: Authentication via an Authorized Device):**
1.  **[New Agent] Key Generation**: Generates `newPubKey`, `newPrivKey`.
2.  **[New Agent → Controller] Initiate Registration Request**: Sends `targetDid`, `newPubKey`, desired relationships, `requestNonce`, `requestTimestamp`.
3.  **[Controller] Generate Authorization Challenge**: Creates `authChallenge`.
4.  **[Controller → New Agent] Return Authorization Challenge**.
5.  **[New Agent → User] Request User Authorization**: Presents request (e.g., QR code with `authChallenge`).
6.  **[User @ Authorizing Agent] Scan/Open and Authorize**: User confirms on an already authorized device.
7.  **[Authorizing Agent → Controller] Sign and Send Authorization Proof**: Signs `authChallenge` with its authorized key, sends `authProof`.
8.  **[Controller] Verify Authorization and Update VDR**: Verifies `authProof`, constructs VDR update transaction, submits to VDR.
9.  **[VDR] Process Transaction**.
10. **[Controller → New Agent] Return Result**.

*(Security considerations for this protocol are detailed in the "Security Considerations" section below).*

## Rationale

-   **Single Master DID**: Chosen to provide a unified digital identity for users, preventing fragmentation across services and devices. This aligns with the core principles of self-sovereign identity.
-   **Multi-Device Sub-Keys**: This approach allows for operational flexibility and enhanced security. If a device key is compromised, it can be revoked without affecting the master identity or other device keys. This is preferable to using the master key for all operations, which would increase its exposure.
-   **DID Method Agnosticism**: The core model is designed to be compatible with any W3C compliant DID method, offering flexibility and future-proofing. `did:rooch` is presented as one concrete possibility leveraging the Rooch Network's capabilities for VDR.
-   **Verification Relationships for Permissions**: Using standard DID verification relationships (`authentication`, `assertionMethod`, etc.) for basic permissioning is chosen for its standards compliance and interoperability. More complex authorization can be layered on top (e.g., ZCAP-LD).
-   **Explicit Key ID in Signatures**: Including `key_id` in signatures is crucial for verifiers to identify the specific key used, look it up in the DID document, and apply the correct policies.
-   **Challenge-Response for Device Registration**: This mechanism is chosen to ensure that new device registration is explicitly authorized by the user through an existing trusted channel, preventing unauthorized additions of device keys.

## Backwards Compatibility

This NIP proposes a new identity model.
-   For new Nuwa Agents and services adopting this NIP, it defines the standard for DID and key management.
-   Existing systems not using this model will not be directly affected but will not be able to interoperate at the identity level described herein without adopting this NIP.
-   No direct backwards incompatibilities are introduced for unrelated protocols, but services wishing to leverage this DID model will need to implement support for it.

## Test Cases

Test cases should cover, at a minimum:
1.  Creation of a master DID and registration of an initial device key.
2.  Registration of an additional device key using an existing authorized device.
3.  Signature creation by a device key and successful verification against the DID document.
4.  Verification of a signature where the `key_id` has `authentication` permission.
5.  Verification of a signature where the `key_id` has `capabilityInvocation` but not `authentication` permission.
6.  Revocation of a device key and subsequent failure of signature verification using the revoked key.
7.  Attempted registration of a device key without proper authorization (should fail).
8.  Verification of a signature with an expired session key (if `expires` is used).
9.  Replay attack prevention using `nonce` and `timestamp`.

*(Specific test vectors and a test suite are to be developed alongside a reference implementation.)*

## Reference Implementation

A reference implementation is planned but not yet available. It should demonstrate:
-   Libraries for master DID creation and management (for a chosen DID method like `did:rooch` or a generic one).
-   Agent-side logic for device key generation and registration requests.
-   Controller/Management Service logic for handling device registration and VDR updates.
-   Verifier logic for resolving DIDs and validating signatures according to this NIP.

*(Link to repository will be provided here when available.)*

## Security Considerations

This section incorporates and expands upon the "Security Policies" from the original NIP-1.

*   **Master Key Security**:
    *   **Compromise**: Compromise of the Master Key(s) leads to full identity compromise. Secure offline storage and robust recovery mechanisms are paramount.
    *   **Recovery**: The design of recovery mechanisms (social, multi-sig) must itself be secure against collusion or coercion.
*   **Device Key Security**:
    *   **Compromise**: If a device key is compromised, it should be promptly revoked by the Controller. The scope of damage is limited by the permissions granted to that key.
    *   **Revocation**: The revocation process must be secure, ensuring only a legitimate Controller can perform it. Delays in VDR updates could mean a compromised key remains valid for a short period.
    *   **Rotation**: Regular rotation of device keys is recommended to limit the window of opportunity if a key is silently compromised.
*   **Session Keys**:
    *   **Expiration**: Verifiers *must* check the `expires` attribute. Clock synchronization issues could lead to premature or delayed invalidation if not handled carefully (e.g., allowing a small grace period).
*   **Signature Integrity & Anti-Replay**:
    *   **Nonce**: Verifiers must maintain a list of used nonces per `signer_did` (or `key_id`) to prevent replay. This requires stateful verifiers.
    *   **Timestamp**: Timestamps prevent replay of old signatures. A defined, reasonable verification window is needed, balancing security with tolerance for clock skew.
    *   **Signed Payload**: The `signed_data` structure must be canonicalized before signing to prevent ambiguity.
*   **Device Registration Protocol Security**:
    *   **Communication Security**: All communication (New Agent ↔ Controller, Authorizing Agent ↔ Controller) must be over secure channels (e.g., TLS).
    *   **Challenge-Response**: `authChallenge` must be unique, unpredictable, and tied to the specific request.
    *   **Authorization Proof**: The key used by the Authorizing Agent must have explicit permission to authorize new devices.
    *   **User Consent**: UI/UX must clearly present what is being authorized.
    *   **Controller Trust**: If the Controller is a centralized service, its security and the trust model are critical. It becomes a high-value target.
    *   **Rate Limiting**: The Controller should implement rate limiting on registration attempts.
*   **DID Document Security**:
    *   **VDR Security**: The integrity of the DID document relies on the security of the underlying Verifiable Data Registry (e.g., Rooch Network).
    *   **Unauthorized Updates**: Only the `controller` of the DID should be able to update it.
*   **Privacy Considerations**:
    *   Avoid storing sensitive device-specific information directly in the public DID document. Use generic `key_id` fragments.
    *   Device metadata exchanged during registration should be minimized and potentially encrypted.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
