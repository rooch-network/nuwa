---
nip: 1
title: Agent Single DID Multi-Key Model
author: jolestar(@jolestar)
discussions-to: <URL to GitHub Issue or Discussion Forum> // TODO: Add discussion link
status: Draft
type: Standards Track
category: Core
created: 2024-05-12
---

## Abstract

This NIP proposes a foundational decentralized identity model for Agents (representing users, services, or other autonomous entities) within the ecosystem. It enables a single master Decentralized Identifier (DID) to manage multiple operational keys (e.g., device-specific keys or service instance keys). The model aims to ensure consistent and verifiable identities, key isolation, permission control, and secure revocability. The model supports various DID methods (which could be anchored to different Verifiable Data Registries, including blockchains) presented as potential examples for anchoring DID documents.

## Motivation

To establish a consistent and secure identity framework for all participating entities (Agents, including users and service providers) within the ecosystem, a standardized approach to DID management is needed. This NIP defines a decentralized identity model based on a **"single master identity + multiple operational sub-keys"** concept. This allows an Agent, whether an end-user managing multiple devices or a service provider managing different operational instances or keys, to operate under a unified DID. It aims to provide a robust and flexible identity foundation for Agents in the ecosystem, enabling secure interactions and verifiable claims without compromising core digital identities or creating identity fragmentation.

## Specification

### Core Design Principles

-   **Single Master Identity**: Each Agent possesses a master DID (e.g., any DID compliant with W3C DID specifications, such as `did:example:123`; for implementations on a specific network, like `did:<method>:<entity1>`), representing their unique digital persona or service identity and associated digital assets/memories/configurations. Control over this DID is held by one or more Master Key(s).
-   **Multi-Device/Operational Keys**: Each Agent instance or distinct operational context (e.g., a specific device, a service replica, a temporary session) generates or is assigned a local Key (referred to broadly as a "Device Key" in examples for simplicity, but can represent any operational sub-key).
-   **DID Document Registration**: The public key information of each such Key is registered as a `verificationMethod` entry in the DID document associated with the master DID.
-   **Fine-grained Verification Relationships**: By adding the `id` of a `verificationMethod` to different verification relationships (e.g., `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation`), the permission scope of each key can be precisely controlled.
-   **Signatures Indicate Origin**: All signature operations initiated by an Agent using one of its keys must clearly indicate which key was used (via the `id` of the `verificationMethod`).

### General DID Method Support and Considerations for Advanced Functionality

This Agent model is designed to be compatible with any W3C compliant DID method. An Agent's master DID can, in principle, adopt any such method (e.g., `did:key`, `did:web`, `did:ethr`, `did:ion`). The choice of DID method determines how and where the DID document is stored and managed (i.e., the Verifiable Data Registry or VDR).

However, for advanced functionalities within the ecosystem, such as on-chain interactions including payments (e.g., as might be detailed in NIP-4 for state channels) or other forms of direct blockchain engagement by an Agent, the underlying VDR (often a blockchain) associated with the chosen DID method (or at least the VDR used for operational keys involved in such transactions) may need to meet specific requirements:

-   **Transaction Authorization by Operational Keys**: The VDR and its associated transaction system must allow operational keys (sub-keys registered in the Agent's DID document as `verificationMethod` entries) to authorize and initiate transactions on behalf of the Agent's primary on-chain identity or account. This is crucial for enabling an Agent to act through its various operational contexts (devices, services) without directly using its master key(s) for every transaction.
-   **Account Abstraction or Similar Capabilities**: To facilitate the above, the underlying blockchain might need to support concepts like account abstraction. This allows an Agent's on-chain account to be controlled by logic that can recognize and authorize actions initiated by its registered operational keys, rather than solely by a single private key tied directly to the account. This enables an Agent to delegate specific on-chain permissions to different operational keys, enhancing security and flexibility.
-   **Smart Contract Interaction**: The VDR should support the execution of smart contracts if on-chain logic is required for managing DID-related operations, permissions, or interactions with other ecosystem protocols that rely on smart contracts (e.g., state channels, registries).

Therefore, while NIP-1 provides a flexible identity superstructure, the practical choice of DID methods and their underlying VDRs for Agents participating in advanced on-chain operations will be influenced by the technical capabilities of those VDRs to support the required transactional semantics and key management models. Implementers should evaluate VDR capabilities when designing solutions that leverage this NIP for on-chain activities.

### Master Key Management & Recovery

Secure management and reliable recovery of master keys are critical.
-   **Master Key(s)**: Agents must generate and securely back up their master DID's Master Key(s). For user Agents, this often means offline backup. For service Agents, this could involve secure key management systems. These private keys should not be stored on any routinely used operational devices or instances without extreme care.
-   **Controller**: The `controller` field of the DID document must point to the entity holding the Master Key(s), which is typically the DID subject itself.
-   **Recovery Mechanisms**: Robust key recovery mechanisms (e.g., Social Recovery, Multi-signature, Hardware Wallet, M-of-N schemes) are essential and depend on the adopted DID method and the Agent's nature.

### DID Document Structure Example

Below is an example of a DID document conforming to this NIP. This example uses `did:example` as a placeholder for a concrete DID method.

**Key points illustrated in the example:**
*   The `id` field (e.g., `did:example:alice`) represents the Agent's unique DID. This Agent could be an end-user, a service, or another autonomous entity. The specific nature of the Agent can be further clarified by other properties within the DID document, such as the `service` property.
*   Each entry in `verificationMethod` represents an operational key.
    *   The `id` within a `verificationMethod` entry (e.g., `did:example:alice#key-1`) is a generic identifier for that specific key.
    *   The `type` (e.g., `EcdsaSecp256k1VerificationKey2019`) specifies the cryptographic suite of the key. Other types like `Ed25519VerificationKey2020` are also permissible.
    *   The `expires` property can be used for keys with a defined lifetime, such as session keys.
*   Verification relationships like `authentication`, `assertionMethod`, `capabilityInvocation`, and `capabilityDelegation` link to specific key `id`s from the `verificationMethod` array to define their permissions.
    *   `capabilityDelegation` is typically reserved for Master Keys or other high-privilege keys authorized to delegate capabilities.
*   The `service` array is used to define service endpoints. This is particularly important for service Agents (e.g., custodians, gateways) to declare how they can be interacted with. The `type` property within a service entry should be used to specify the kind of service, as defined by relevant NIPs (e.g., "CustodianServiceNIP3", "LLMGatewayNIP9").

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"],
  "id": "did:example:alice",
  "controller": "did:example:alice",
  "verificationMethod": [
    {
      "id": "did:example:alice#key-1",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:example:alice",
      "publicKeyHex": "0xabc123..."
    },
    {
      "id": "did:example:alice#key-2",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:example:alice",
      "publicKeyHex": "0xdef456..."
    },
    {
      "id": "did:example:alice#session-temp-xyz",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:example:alice",
      "publicKeyHex": "0xghi789...",
      "expires": 1747252800
    }
  ],
  "authentication": [
    "did:example:alice#key-1"
  ],
  "assertionMethod": [
    "did:example:alice#key-1",
    "did:example:alice#key-2"
  ],
  "capabilityInvocation": [
     "did:example:alice#key-1",
     "did:example:alice#key-2",
     "did:example:alice#session-temp-xyz"
  ],
  "capabilityDelegation": [
  ],
  "service": [
    {
      "id": "did:example:alice#my-llm-gateway",
      "type": "LLMGatewayNIP9",
      "serviceEndpoint": "https://llm-gateway.example.com/alice"
    }
  ]
}
```

### Signature Structure Specification

Each signature operation initiated by an Agent device or service instance should result in a structure (example uses `did:example` as a placeholder):

```json
{
  "signed_data": {
    "operation": "...",
    "params": { ... },
    "nonce": "random_nonce_123",
    "timestamp": 1715600000
  },
  "signature": {
    "signer_did": "did:example:alice",
    "key_id": "did:example:alice#key-1", 
    "value": "0x...."
  }
}
```
Verification Process:
1.  Verify `timestamp`.
2.  Check `nonce`.
3.  Resolve `signer_did`.
4.  Find `verificationMethod` for `key_id`.
5.  Verify `signature.value` with the public key.
6.  (Optional) Check `key_id` against verification relationships for the specific operation.

### Permission Control Model

Recommended strategies:
1.  **Verification Relationship-Based**: Utilize standard DID Core verification relationships.
2.  **Capability Objects**: Use ZCAP-LD or similar for fine-grained permissions.
3.  **External Policy Service**: DID document `service` endpoint points to a policy service.
4.  **Application-Layer Enforcement**: Relying Party enforces based on business logic.

**Recommendation**: Prioritize Verification Relationship-Based, combinable with Capability Objects.

### Device/Operational Key Registration / Update Protocol (Draft)

This section outlines a high-level protocol for adding a new operational key to the DID document.

**Participants:** Agent (User or Service Admin), New Instance/Device, Authorizing Instance/Device/Mechanism, Controller/Management Service, VDR.

**Protocol Flow (Example: Authentication via an Authorized Key/Device):**
1.  **[New Instance/Device] Key Generation**: Generates `newPubKey`, `newPrivKey`.
2.  **[New Instance/Device → Controller] Initiate Registration Request**: Sends `targetDid`, `newPubKey`, desired relationships, `requestNonce`, `requestTimestamp`.
3.  **[Controller] Generate Authorization Challenge**: Creates `authChallenge`.
4.  **[Controller → New Instance/Device] Return Authorization Challenge**.
5.  **[New Instance/Device → Agent] Request Agent Authorization**: Presents request (e.g., QR code, admin approval flow).
6.  **[Agent @ Authorizing Instance/Mechanism] Authorize**: Agent confirms (e.g., on an authorized device, via an admin interface).
7.  **[Authorizing Instance/Mechanism → Controller] Sign and Send Authorization Proof**: Signs `authChallenge` with its authorized key, sends `authProof`.
8.  **[Controller] Verify Authorization and Update VDR**: Verifies `authProof`, constructs VDR update transaction, submits to VDR.
9.  **[VDR] Process Transaction**.
10. **[Controller → New Instance/Device] Return Result**.

*(Security considerations for this protocol are detailed in the "Security Considerations" section below).*

## Rationale

-   **Single Master DID**: Chosen to provide a unified digital identity for Agents, preventing fragmentation across services and operational contexts. This aligns with the core principles of self-sovereign identity.
-   **Multi-Operational Sub-Keys**: This approach allows for operational flexibility and enhanced security. If an operational key is compromised, it can be revoked without affecting the master identity or other keys. This is preferable to using the master key for all operations, which would increase its exposure.
-   **DID Method Agnosticism**: The core model is designed to be compatible with any W3C compliant DID method, offering flexibility and future-proofing. A specific method like a potential `did:rooch` (for the Rooch Network) or established methods like `did:ethr` are examples of concrete possibilities for anchoring DIDs.
-   **Verification Relationships for Permissions**: Using standard DID verification relationships (`authentication`, `assertionMethod`, etc.) for basic permissioning is chosen for its standards compliance and interoperability. More complex authorization can be layered on top (e.g., ZCAP-LD).
-   **Explicit Key ID in Signatures**: Including `key_id` in signatures is crucial for verifiers to identify the specific key used, look it up in the DID document, and apply the correct policies.
-   **Challenge-Response for Key Registration**: This mechanism is chosen to ensure that new key registration is explicitly authorized by the Agent through a trusted channel or mechanism, preventing unauthorized additions of keys.

## Backwards Compatibility

This NIP proposes a new identity model.
-   For new Agents and services adopting this NIP, it defines the standard for DID and key management.
-   Existing systems not using this model will not be directly affected but will not be able to interoperate at the identity level described herein without adopting this NIP.
-   No direct backwards incompatibilities are introduced for unrelated protocols, but services wishing to leverage this DID model will need to implement support for it.

## Test Cases

Test cases should cover, at a minimum:
1.  Creation of a master DID and registration of an initial operational key.
2.  Registration of an additional operational key using an existing authorized key/mechanism.
3.  Signature creation by an operational key and successful verification against the DID document.
4.  Verification of a signature where the `key_id` has `authentication` permission.
5.  Verification of a signature where the `key_id` has `capabilityInvocation` but not `authentication` permission.
6.  Revocation of an operational key and subsequent failure of signature verification using the revoked key.
7.  Attempted registration of an operational key without proper authorization (should fail).
8.  Verification of a signature with an expired session key (if `expires` is used).
9.  Replay attack prevention using `nonce` and `timestamp`.

*(Specific test vectors and a test suite are to be developed alongside a reference implementation.)*

### Considerations for Multi-Chain DID Support

While this NIP promotes DID method agnosticism to allow for identity representation across various Verifiable Data Registries (VDRs), including different blockchains, a multi-chain DID strategy introduces several challenges that implementations and the broader ecosystem need to consider:

-   **Resolver Complexity**: Supporting multiple DID methods requires robust DID resolver implementations capable of understanding the syntax and resolution protocols for each method. This can increase the complexity of client-side applications and infrastructure that need to verify DIDs.
-   **VDR Diversity and Characteristics**: Different blockchains or other VDRs have varying characteristics regarding transaction costs, speed, finality, security assumptions, and governance models. The choice of VDR for a DID can impact its usability, security, and cost-effectiveness for different use cases.
-   **Key Management Complexity**: Agents (both users and services) may need to manage multiple types of cryptographic keys if their DIDs or associated `verificationMethod` entries are anchored to different blockchains with distinct cryptographic requirements. This can increase the burden of key generation, storage, backup, and recovery.
-   **Cross-Chain Interoperability and Data Portability**: While a DID provides a universal identifier, achieving true interoperability of associated data or credentials across different blockchain environments remains a significant challenge. Standards for data formats and protocols are crucial but may not be universally adopted or supported.
-   **User Experience (UX)**: Abstracting the complexities of multiple chains and DID methods to provide a seamless and intuitive user experience is critical for adoption. Users should ideally not need to understand the underlying blockchain specifics to manage their digital identity.
-   **Standardization and Consistent Interpretation**: Ensuring that DID documents and the capabilities implied by `verificationMethod` entries are interpreted consistently across different chains and platforms is essential. Lack of such consistency can lead to security vulnerabilities or interoperability failures.
-   **Governance and Trust**: Each DID method and its underlying VDR typically has its own governance model and trust assumptions. Integrating DIDs from various methods requires careful consideration of these differing trust frameworks.

Addressing these challenges will be crucial for realizing the full potential of a flexible, multi-chain identity ecosystem based on this NIP.

## Reference Implementation

A reference implementation is planned but not yet available. It should demonstrate:
-   Libraries for master DID creation and management (for a chosen DID method, e.g., `did:key` for simplicity, or a more specific one like a potential `did:rooch`).
-   Agent-side logic for operational key generation and registration requests.
-   Controller/Management Service logic for handling key registration and VDR updates.
-   Verifier logic for resolving DIDs and validating signatures according to this NIP.

*(Link to repository will be provided here when available.)*

## Security Considerations

This section incorporates and expands upon the "Security Policies" from the original NIP-1.

*   **Master Key Security**:
    *   **Compromise**: Compromise of the Master Key(s) leads to full identity compromise. Secure storage (e.g., offline for users, HSMs for services) and robust recovery mechanisms are paramount.
    *   **Recovery**: The design of recovery mechanisms (social, multi-sig, M-of-N) must itself be secure against collusion or coercion.
*   **Operational Key Security**:
    *   **Compromise**: If an operational key is compromised, it should be promptly revoked by the Controller. The scope of damage is limited by the permissions granted to that key.
    *   **Revocation**: The revocation process must be secure, ensuring only a legitimate Controller can perform it. Delays in VDR updates could mean a compromised key remains valid for a short period.
    *   **Rotation**: Regular rotation of operational keys is recommended to limit the window of opportunity if a key is silently compromised.
*   **Session Keys**:
    *   **Expiration**: Verifiers *must* check the `expires` attribute. Clock synchronization issues could lead to premature or delayed invalidation if not handled carefully (e.g., allowing a small grace period).
*   **Signature Integrity & Anti-Replay**:
    *   **Nonce**: Verifiers must maintain a list of used nonces per `signer_did` (or `key_id`) to prevent replay. This requires stateful verifiers.
    *   **Timestamp**: Timestamps prevent replay of old signatures. A defined, reasonable verification window is needed, balancing security with tolerance for clock skew.
    *   **Signed Payload**: The `signed_data` structure must be canonicalized before signing to prevent ambiguity.
*   **Key Registration Protocol Security**:
    *   **Communication Security**: All communication (New Instance/Device ↔ Controller, Authorizing Instance/Mechanism ↔ Controller) must be over secure channels (e.g., TLS).
    *   **Challenge-Response**: `authChallenge` must be unique, unpredictable, and tied to the specific request.
    *   **Authorization Proof**: The key used by the Authorizing Instance/Mechanism must have explicit permission to authorize new keys.
    *   **Agent Consent/Control**: UI/UX (for users) or admin controls (for services) must clearly present what is being authorized.
    *   **Controller Trust**: If the Controller is a centralized service, its security and the trust model are critical. It becomes a high-value target. For decentralized control, the security of the control mechanism is key.
    *   **Rate Limiting**: The Controller should implement rate limiting on registration attempts.
*   **DID Document Security**:
    *   **VDR Security**: The integrity of the DID document relies on the security of the underlying Verifiable Data Registry.
    *   **Unauthorized Updates**: Only the `controller` of the DID should be able to update it.
*   **Privacy Considerations**:
    *   Avoid storing sensitive instance/device-specific information directly in the public DID document. Use generic `key_id` fragments.
    *   Metadata exchanged during registration should be minimized and potentially encrypted if sensitive.

## Copyright

Copyright and related rights waived via [CC0](https://creativecommons.org/publicdomain/zero/1.0/).
