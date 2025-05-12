---
nip: 1
title: Nuwa Agent Single DID Multi-Device Key Model
status: Draft
type: Standards Track
category: Core
created: 2024-05-12
version: 0.2
---

# NIP-1: Nuwa Agent Single DID Multi-Device Key Model

## 📌 Preamble & Motivation

To maintain user identity consistency (single DID) while achieving key isolation, permission control, and secure revocability for multi-device Agents, this specification proposes a decentralized identity model supporting multiple DID methods, based on a **"single master identity + multiple device sub-keys"** concept. It aims to provide a robust and flexible identity foundation for Agents in the Nuwa ecosystem. Among these, `did:rooch` serves as a specific DID method implementation where DID documents are stored on the Rooch Network.

## ✅ Core Design

- **Single Master Identity**: Each user possesses a master DID (e.g., any DID compliant with W3C DID specifications, such as `did:example:123`; for implementations on the Rooch network, like `did:rooch:alice`), representing their unique digital persona and associated digital assets/memories. Control over this DID is held by one or more Master Key(s).
- **Multi-Device Keys**: Each Agent instance running on a different device generates a local Device Key.
- **DID Document Registration**: The public key information of each Device Key is registered as a `verificationMethod` entry in the DID document.
- **Fine-grained Verification Relationships**: By adding the `id` of a `verificationMethod` to different verification relationships (e.g., `authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation`), the permission scope of each device key can be precisely controlled.
- **Signatures Indicate Origin**: All signature operations initiated by an Agent must clearly indicate which device key was used (via the `id` of the `verificationMethod`).

## General DID Method Support & `did:rooch` Concept

This Nuwa Agent model aims to support existing industry DID methods that comply with W3C DID specifications. An Agent's master DID can adopt any compatible DID method.

As a possible specific implementation, this draft has mentioned `did:rooch:<unique-identifier>`. If `did:rooch` is pursued as a new DID method in the future, its specification will be necessary, covering the following aspects. However, detailing a new DID method is beyond the core scope of this document; key considerations are listed here for reference:

- **Verifiable Data Registry (VDR) for `did:rooch`**:
    - Clarify the storage location and mechanism for `did:rooch` DID documents.
    - Define the data model, encoding format, and read/write access controls for DID documents within the VDR.

- **DID Operations (CRUD) for `did:rooch`**:
    - Define the specific processes and transaction formats for creating, reading, updating, and deactivating/revoking `did:rooch` DIDs.
    - Clarify the unique identifier generation mechanism, operational authorization, version control, and transaction fee model.

- **Resolver for `did:rooch`**:
    - Specify how to resolve a `did:rooch:...` to its corresponding DID document, including resolver implementation methods (e.g., client library, server endpoint).
    - Clarify resolution steps, caching strategies, and return formats.

- **Security & Consensus for `did:rooch`**:
    - Describe the security model and consensus mechanism of the chosen VDR.
    - Emphasize the importance of `controller` key management, analyze potential attack vectors, and mitigation measures.
    - Consider the governance mechanism for the `did:rooch` method specification itself.

## 🔑 Master Key Management & Recovery

Secure management and reliable recovery of master keys are cornerstones of this DID model's success. While the choice of specific implementation solutions and detailed specifications are beyond the core scope of this NIP and typically depend on the adopted DID method and its supporting tool ecosystem, the following principles and directions are paramount:

- **Master Key(s)**: Users must generate and securely back up their master DID's Master Key(s) offline through secure, standardized processes. This represents the highest level of control over the entire DID. **Their private keys should absolutely not be stored on any routinely used Agent devices to minimize leakage risk.**
- **Controller**: The `controller` field of the DID document must clearly point to the entity representing the user holding the Master Key(s) (can be a DID or a specific public key identifier). Only a legitimate Controller has the authority to make fundamental changes to the DID document (e.g., managing authentication keys in `verificationMethod`, changing the Controller itself).
- **Recovery Mechanisms**: Robust key recovery mechanisms must be designed and integrated to address the risk of Master Key(s) loss or forgotten. Existing industry solution directions include, but are not limited to:
    - **Social Recovery**: Relies on a group of trusted contacts or entities to assist in recovery.
    - **Multi-signature / Guardians**: Requires multiple pre-set key holders to jointly authorize recovery.
    - **Hardware Wallet / Secure Hardware Backup**: Securely stores the master key in a dedicated, tamper-proof hardware device.
    - **Other mechanisms based on specific DID methods or VDRs.**
    **The absence or improper design of this mechanism will lead to the permanent loss of the DID and its associated assets/memories; therefore, its detailed design and user guidance are critical.**

## 🧱 DID Document Structure Example

```json
{
  "@context": ["https://www.w3.org/ns/did/v1"], // Add DID context
  "id": "did:rooch:alice",
  "controller": "did:rooch:alice", // Assume master key is also identified by this DID, needs clarification
  "verificationMethod": [
    {
      "id": "did:rooch:alice#device-key-1", // Use a more generic ID
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
      // Example: A temporary, permission-limited Session Key
      "id": "did:rooch:alice#session-temp-xyz",
      "type": "EcdsaSecp256k1VerificationKey2019",
      "controller": "did:rooch:alice",
      "publicKeyHex": "0xghi789...",
      "expires": 1747252800 // Optional: standardized timestamp (Unix epoch)
    }
  ],
  // Core authentication, may only include a few high-privilege devices or Master Key
  "authentication": [
    "did:rooch:alice#device-key-1"
    // May not include all device keys, depending on policy
  ],
  // Used for asserting claims, e.g., issuing Verifiable Credentials
  "assertionMethod": [
    "did:rooch:alice#device-key-1",
    "did:rooch:alice#device-key-2"
  ],
  // Used for invoking capabilities (e.g., performing actions)
  "capabilityInvocation": [
     "did:rooch:alice#device-key-1",
     "did:rooch:alice#device-key-2",
     "did:rooch:alice#session-temp-xyz" // Session Key might only be able to invoke capabilities
  ],
  // Used for delegating capabilities to other DIDs to act on behalf of this DID
  "capabilityDelegation": [
     // Typically only Master Key or high-privilege Key
  ]
  // "service": [ ... ] // Service endpoints can be added, e.g., DIDComm Endpoint
}
```

## 🔐 Signature Structure Specification

Each signature operation initiated by an Agent device should result in a structure containing sufficient information for verifiers:

```json
{
  "signed_data": { // The data payload covered by the signature needs to be clearly defined
    "operation": "...",
    "params": { ... },
    "nonce": "random_nonce_123", // Prevents replay attacks
    "timestamp": 1715600000 // Prevents timeout replays, requires a verification window
  },
  "signature": {
    "signer_did": "did:rooch:alice", // Master DID
    "key_id": "did:rooch:alice#device-key-1", // Specific device key ID used
    "value": "0x...." // Signature value
  }
}
```

Verification Process:
1. Verify if `timestamp` is within an acceptable window.
2. Check if `nonce` has already been used (requires stateful storage).
3. Resolve `signer_did` to obtain the DID document.
4. Find the `verificationMethod` corresponding to `key_id` in the DID document.
5. Use the public key from this `verificationMethod` to verify if `signature.value` is a valid signature for `signed_data`.
6. (Optional) Based on the operation type, check if this `key_id` is present in the appropriate verification relationship (e.g., `authentication`, `capabilityInvocation`).

## 🛠️ Permission Control Model

Embedding detailed permissions directly into the DID document can lead to bloat and manageability issues. One or a combination of the following strategies is recommended:

1.  **Verification Relationship-Based**: Utilize standard DID Core verification relationships (`authentication`, `assertionMethod`, `capabilityInvocation`, `capabilityDelegation`) for coarse-grained permission division. This is the most standards-compliant approach.
2.  **Capability Objects**: Use ZCAP-LD or similar Capability Objects standards. The Agent presents a Capability Object signed by the Master Key or an authorized device key during an operation, containing fine-grained permission declarations (allowed operations, resources, constraints).
3.  **External Policy Service**: The DID document can include a `service` endpoint pointing to a permission policy service. Verifiers query this service to obtain detailed permissions for a specific `key_id`.
4.  **Application-Layer Enforcement**: The Relying Party or the application itself determines whether to authorize an operation based on business logic, combined with DID verification results and internal Access Control Lists (ACLs).

**Recommendation**: Prioritize the **Verification Relationship-Based** approach for basic authorization. For complex scenarios, it can be combined with **Capability Objects**.

## 🧯 Security Policies

*   **Device Key Revocation**:
    *   **Mechanism**: The Controller (holding the Master Key) initiates a transaction to remove the target `key_id` from the `verificationMethod` list and all relevant verification relationships in the DID document.
    *   **Authorization**: The request initiating the revocation must be strictly verified to originate from a legitimate Controller.
*   **Key Rotation**:
    *   **Device Keys**: Regular or on-demand rotation of device keys is recommended. Process: Generate new key -> Controller adds new key -> Controller removes old key.
    *   **Master Keys**: Master key rotation is a high-risk operation requiring extreme caution and depends on the previously defined `did:rooch` method specification and recovery mechanisms.
*   **Short-lived/Session Keys**:
    *   **Registration**: `verificationMethod` entries with an `expires` attribute can be registered as temporary session keys.
    *   **Permissions**: Typically granted limited `capabilityInvocation` permissions.
    *   **Verification**: Verifiers must check the `expires` attribute to ensure the key has not expired.
*   **Anti-Replay**:
    *   **Nonce**: Verifiers need to maintain a list of used nonces (per DID or `key_id`) to prevent the reuse of identical signatures.
    *   **Timestamp**: Combined with a timestamp verification window, prevents outdated signatures from being reused. The window size needs to balance security and clock synchronization tolerance.

## 🤝 Device Key Registration / Update Protocol (Draft)

This process is a critical interaction for ensuring DID security and requires a clear and secure protocol. Below is a high-level draft protocol; specific implementation needs to be combined with the capabilities of the `did:rooch` method and VDR.

**Participants:**
*   **User**: The ultimate owner of the DID.
*   **New Agent**: An Agent instance running on a new device, wishing to register its device key.
*   **Authorizing Agent/Device**: A currently trusted and registered Agent instance or device of the user, possessing sufficient permissions (e.g., `authentication` or specific authorization capabilities).
*   **Controller/Management Service**: An entity responsible for receiving registration requests, verifying user authorization, and interacting with the VDR to update the DID document. This could be:
    *   A local application/wallet directly controlled by the user's master key.
    *   A cloud service trusted by the user (requires an additional security and trust model).
    *   For the `did:rooch` method, potentially a specific smart contract or module on the Rooch Network.
*   **VDR (Verifiable Data Registry)**: The system storing DID documents. For the `did:rooch` method, this specifically refers to the Rooch Network.

**Protocol Flow (Example: Authentication via an Authorized Device):**

1.  **[New Agent] Key Generation**: The New Agent, upon first launch or when registration is needed, generates a new device key pair (public key `newPubKey`, private key `newPrivKey`).

2.  **[New Agent → Controller] Initiate Registration Request**: The New Agent constructs a registration request, including:
    *   Target DID (`targetDid`: e.g., `did:rooch:alice`)
    *   New device public key (`newPubKey`)
    *   Desired `verificationMethod` ID fragment (optional, e.g., `device-key-3` or generated by Controller)
    *   Desired verification relationships (e.g., `[authentication, assertionMethod, capabilityInvocation]`)
    *   Device metadata (optional, recommended to be encrypted or minimized, e.g., `deviceName`, `deviceType`)
    *   One-time use Nonce (`requestNonce`)
    *   Timestamp (`requestTimestamp`)
    *   **Note**: This initial request usually **cannot be signed**, as the New Agent is not yet recognized by the DID document.

3.  **[Controller] Generate Authorization Challenge**: Upon receiving the request, the Controller performs initial validation (e.g., format, timestamp). Then, it generates a unique, temporary authorization challenge (`authChallenge`). This challenge may contain a digest of key request information or a Nonce.

4.  **[Controller → New Agent] Return Authorization Challenge**: The Controller returns the `authChallenge` to the New Agent.

5.  **[New Agent → User] Request User Authorization**: The New Agent presents the authorization request to the user.
    *   **Method 1 (Recommended): QR Code/Link**: The New Agent displays a QR code or a special link containing the `authChallenge` and a summary of the request.
    *   **Method 2: Push Notification**: If the Controller is a service, it can push an authorization request to the user's other authorized devices.

6.  **[User @ Authorizing Agent] Scan/Open and Authorize**: The user uses an **authorized** device/Agent (Authorizing Agent) to scan the QR code or open the link/notification.
    *   The Authorizing Agent parses the challenge and request information, confirming with the user: "Allow device [Device Name/Identifier] to be added to your DID [DID] and grant [Permission List] permissions?"
    *   User confirms authorization.

7.  **[Authorizing Agent → Controller] Sign and Send Authorization Proof**: The Authorizing Agent uses its device key, **which is recognized by the DID document and has appropriate permissions** (e.g., `authentication` or specific device management permissions), to sign the `authChallenge` (or other data including the challenge and approval intent), generating an `authProof` (including the signature and the `key_id` used). It then sends the `authProof` and partial original request information (for correlation) to the Controller.

8.  **[Controller] Verify Authorization and Update VDR**: Upon receiving the `authProof`, the Controller:
    *   Verifies that the signature in `authProof` is valid and that the `key_id` used for signing belongs to `targetDid` and has permission to authorize the addition of new keys.
    *   Verifies that `authProof` corresponds to the previously issued `authChallenge` (prevents replay).
    *   If all verifications pass, the Controller constructs a VDR update transaction (signed with its own Controller permission, or on behalf of the user using the Master Key), adds the new `verificationMethod` containing `newPubKey` and related information to the `targetDid`'s DID document, and updates the corresponding verification relationships.
    *   Submits the transaction to the VDR.

9.  **[VDR] Process Transaction**: The VDR verifies the Controller's permissions and updates the DID document.

10. **[Controller → New Agent] Return Result**: The Controller (after VDR confirmation) returns a success or failure result to the New Agent. If successful, the New Agent can now use its `newPrivKey` to sign on behalf of `targetDid` (according to the granted verification relationships).

**Other Authorization Methods to Consider:**
*   **Master Key/Recovery Flow**: If no authorized device is available, the user might need to go through a more stringent process, using their master key (via a dedicated wallet/interface) or account recovery mechanism to directly authorize the Controller to update the DID document.
*   **Cross-Device Pairing Code**: Similar to device binding in some applications, display a short-term pairing code.

**Security Considerations:**
*   **Communication Security**: All communication between the Controller and Agents should use TLS or an equivalent level of encryption.
*   **Challenge-Response**: The `authChallenge` must be unique, unpredictable, and bound to a specific request to prevent replay attacks.
*   **Authorizing Key Permissions**: The key used by the Authorizing Agent must explicitly have permission to authorize the addition of new devices (this might be achieved via `authentication` or specific `capabilityDelegation`, to be defined in the permission model).
*   **Explicit User Consent**: The user interface must clearly inform the user about the operation being authorized and its implications.
*   **Controller Trustworthiness**: If the Controller is a centralized service, its security and user trust are paramount.
*   **Rate Limiting**: The Controller should implement rate limiting to prevent abuse of the registration process.
*   **VDR Security**: The ultimate security of the DID document depends on the security guarantees of the VDR.

## ✅ Summary

| Item                   | Content                                                                      | Status/Considerations                                     |
| ---------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| Master Identity        | Single master DID (can be any DID method, e.g., `did:rooch`), controlled by Master Key(s) | For `did:rooch`, its method spec needs definition; other DID methods follow their respective specs |
| Master Key Management  | Emphasizes secure storage and recovery mechanisms                            | **Critically important, requires detailed design**        |
| Device Keys            | One per Agent instance, registered as a `verificationMethod`                 | Different key types optional                              |
| Verification Relations | Uses standard DID Core relations (`authN`, `assertM`, etc.) for basic permission division | More flexible and standard than original proposal         |
| Signature & Validation | Includes `key_id`, `nonce`, `timestamp`; clear verification process          | Signed payload content needs to be clearly defined        |
| Permission Model       | Recommend verification relations + optional Capability Objects or external policies | Avoids DID document bloat                                 |
| Security Policies      | Includes revocation, rotation, Session Keys, anti-replay                     | Mechanisms require VDR support                            |
| Device Reg/Update      | Requires detailed, secure interaction protocol                               | **Key interaction point, needs separate specification**   |
| Privacy                | Avoid exposing excessive device details in public DID document               | Use generic IDs or off-chain metadata                     |
| Compatibility          | Designed to be compatible with A2A, DIDComm, Rooch Message, etc.             | Maintain openness                                         |

---
