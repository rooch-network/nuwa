---
nip: 6
title: Agent Multi-Device State Synchronization
status: Draft
type: Standards Track
category: Core
created: 2025-05-13
version: 0.1
---

# NIP-6: Agent Multi-Device State Synchronization

**Status:** Draft

**Abstract**

This NIP defines a peer-to-peer (P2P) protocol for synchronizing an agent's state across multiple devices. This allows an agent to maintain a consistent state and operate seamlessly regardless of which device is currently in use. The protocol aims to support nested JSON schema-like data structures, multi-platform compatibility, offline operation with eventual consistency, and optional end-to-end privacy.

**Motivation**

Users often interact with agents from various devices (desktop, mobile, web). A robust synchronization mechanism is crucial to ensure that the agent's knowledge, capabilities, and context are consistent across all these devices. This NIP builds upon existing NIPs for identity (NIP-1), authentication (NIP-2), and payments (NIP-3) to provide a comprehensive solution.

**Core Concepts**

1.  **Agent Identity**: Each agent is uniquely identified by its DID (as defined in NIP-1). All devices associated with an agent share this common identity. The DID document lists authorized device public keys, which are crucial for verifying the authenticity of discovery messages and synchronization updates.
2.  **Device Identity & Authorization**:
    *   Each device will have its own unique cryptographic key pair. Its public key is registered in the Agent's DID document as a `verificationMethod` entry, as per NIP-1.
    *   **DeviceID**: Throughout this NIP, `DeviceID` refers to the unique fragment identifier of a device's `verificationMethod` entry within the Agent's DID document (e.g., if a `verificationMethod.id` is `did:agent:123#device-key-abc`, then the `DeviceID` is `device-key-abc`). This `DeviceID` is used in discovery and synchronization messages to uniquely identify a device within the context of its AgentDID.
    *   A device must be authorized by the agent's primary key (or a designated master device) to participate in state synchronization. This authorization can leverage mechanisms similar to those in NIP-2 for A2A authentication.
    *   Consideration for secure key sharing: New devices, once authorized via NIP-1, need to securely obtain a shared secret or a specific decryption key (e.g., an encrypted `epriv` using a master password or temporary authorization token via QR code/OTP) to access and decrypt the agent's synchronized state. This process is detailed in the "Device Authorization Flow".
3.  **State Representation**:
    *   The agent's state will be represented using Conflict-free Replicated Data Types (CRDTs). CRDTs are well-suited for P2P environments as they allow for concurrent updates from multiple devices and guarantee eventual consistency without complex conflict resolution logic.
    *   The state should support nested JSON schema-like data structures.
    *   **Recommended CRDT Libraries**: Libraries like **Automerge** (good for JSON-like nested states) or **Yjs** (performant for fine-grained collaborative editing and rich data types) are strong candidates due to their robust CRDT implementations and support for complex data structures.
4.  **Peer Discovery**:
    *   Devices belonging to the same agent need to discover each other's current connection information (e.g., IP address, port, transport protocol). The Agent's DID document (NIP-1) serves as the authoritative source for verifying that a discovered device is legitimate, but not for storing its dynamic connection information.
    *   Possible mechanisms:
        *   **Decentralized Hash Table (DHT)**: See "Detailed Protocol".
        *   **Rendezvous Server**: See "Detailed Protocol".
        *   **Local Network Discovery (mDNS/DNS-SD)**: See "Detailed Protocol".
        *   **Discovery via Synchronization Layer**: See "Detailed Protocol".
5.  **Communication Protocol & Synchronization Layer**:
    *   Secure P2P communication channels will be established between devices.
    *   Underlying P2P transport: WebRTC (for browser-based agents) or libp2p (for more general applications).
    *   All communication must be end-to-end encrypted using keys derived during the device authorization/authentication phase.
    *   **Synchronization Layer Options**:
        *   **GunDB**: Lightweight, easy to deploy, with built-in SEA for identity and encryption. Suitable for simpler state and rapid deployment.
        *   **OrbitDB**: Builds on IPFS and Merkle-CRDTs, offering decentralized and persistent state. Requires IPFS.
        *   **Matrix**: Provides strong E2EE, user identity, and can act as a secure message/state synchronization bus using its event DAG as a form of CRDT.
        *   Custom sync protocol built directly over Yjs or Automerge providers.
6.  **Synchronization Process**:
    *   **Initial Sync**: When a new device is authorized or an existing device comes online, it will attempt to connect to known peers and fetch the current state.
    *   **State Exchange**: Once connected, devices will exchange their CRDT state. CRDTs inherently handle the merging of different versions of the state.
    *   **Delta Updates**: After the initial sync, devices will only transmit changes (deltas) to the state to minimize bandwidth usage. Libraries like Yjs and Automerge support this.
    *   **Gossip Protocol**: Updates can be propagated through the network of connected peers using a gossip-like mechanism to ensure all devices eventually receive all updates.
7.  **Data Integrity and Security**:
    *   All state updates should be signed by the originating device's key to ensure authenticity and integrity.
    *   End-to-end encryption of state data in transit and potentially at rest on the devices.
    *   **Identity and Key Management**: Leverage NIP-1 for agent DID. For device-level keys and potential shared state encryption keys, mechanisms like GUN SEA's key pairs or a protocol for securely deriving/sharing keys (e.g., from a master password or via trusted device authorization) are needed.
8.  **Offline Support and Resilience**:
    *   Devices should be able to operate offline and accumulate state changes.
    *   When a device reconnects, it will sync its changes with its peers.
    *   The system should be resilient to devices frequently joining and leaving the network.

**Detailed Protocol (To be elaborated)**

*   **Device Authorization Flow**: This flow enables a new device to participate in state synchronization. It leverages the device key registration process defined in NIP-1 and adds steps for securely sharing synchronization-specific secrets.
    *   **1. Device Key Generation & Initial Registration (Leveraging NIP-1)**:
        *   The new device generates a new cryptographic key pair (public and private key).
        *   The new device undergoes the "Device Key Registration / Update Protocol" as outlined in NIP-1. This results in the new device's public key being added as a `verificationMethod` to the agent's DID document, associated with appropriate verification relationships. This step confirms the device as a recognized entity under the agent's DID.
    *   **2. Request for State Synchronization Access**:
        *   Once recognized by the DID document (per NIP-1), the new device requests access to the synchronized state from an existing, already authorized device or through a mechanism controlled by the agent's master key.
    *   **3. User Authorization for State Access**:
        *   The user authorizes this request on an existing trusted device or via the master key. Authorization methods can include QR code scanning, OTP, secure link, or manual approval on an existing device, similar to the methods described in NIP-1 for key registration but specifically for state access.
    *   **4. Secure Transfer of Synchronization Secrets**:
        *   Upon successful authorization for state access, the necessary shared secrets or decryption keys (e.g., an agent-specific `epriv` for CRDT data, potentially encrypted with a temporary key derived from the authorization process or a master password) are securely transferred to the new device. This allows the new device to decrypt and participate in the shared state.
    *   **5. Confirmation and Sync Initiation**:
        *   The new device confirms receipt and successful decryption of the secrets and initiates the state synchronization process with peers.
*   **Peer Discovery Mechanisms (Primary and Fallback)**:
    *   **1. Local Network Discovery (e.g., mDNS/DNS-SD)**
        *   **Function**: For devices on the same local network to discover each other directly.
        *   **Mechanism**: A specific service type (e.g., `_nuwa-agent-sync._tcp`) is advertised. TXT records within the advertisement would contain the Agent DID (for filtering), the specific `DeviceID` (i.e., the fragment of its `verificationMethod.id` from the Agent's DID document), connection port, and supported protocols.
        *   **Verification**: Discovered `DeviceID` and its claims should be verifiable against the Agent's DID document using the public key associated with that `DeviceID`.
        *   **Advantages**: Low latency, direct P2P, no internet traversal.
    *   **2. Decentralized Hash Table (DHT)**
        *   **Function**: Global discovery when local discovery fails or is not applicable.
        *   **DHT Key**: A stable key (`DHT_Agent_Key`) is derived from the Agent's DID (e.g., `hash(AgentDID)`).
        *   **DHT Value**: The value stored at `DHT_Agent_Key` should point to a dynamic "meeting place".
            *   **Recommended Approach: Pointer to Dynamic Resource**: The DHT value contains a pointer (e.g., a specific IPFS PubSub topic ID like `hash("nuwa-sync-" + AgentDID)`, a well-known Matrix room alias, or a URL to a micro-rendezvous service).
                *   *Device Announcement*: When a device comes online, it retrieves this pointer from the DHT. It then joins this resource (e.g., subscribes to the PubSub topic) and broadcasts its connection information: `(DeviceID, ConnectionInfo, Timestamp, Signature)`. The `DeviceID` is the fragment of its `verificationMethod.id`. The `Signature` is created by the device signing its announcement with its private key.
                *   *Peer Discovery*: Devices listen on this resource for announcements from other peers.
        *   **Verification**: All announcements must be signed by the announcing device. Discovering peers verify this signature using the public key for the announced `DeviceID` (obtained by resolving the Agent DID document and finding the corresponding `verificationMethod`). This ensures authenticity and authorization.
        *   **Bootstrapping DHT Entry**: The initial creation of the `DHT_Agent_Key` and its value (e.g., the PubSub topic) might require a rendezvous server if no device has established it yet.
    *   **3. Rendezvous Server(s)**
        *   **Function**: Acts as a fallback, a bootstrapping aid for DHT, or a primary mechanism if DHT is not preferred.
        *   **Mechanism**: Devices register their `(AgentDID, DeviceID, ConnectionInfo, Timestamp, Signature)` with one or more pre-configured or well-known rendezvous servers. The `DeviceID` is the fragment of its `verificationMethod.id`. Devices query the server for peers belonging to the same `AgentDID`.
        *   **Verification**: Signatures on registered information are crucial. The server itself doesn't need to be highly trusted if all exchanged information is self-certified by device signatures, verified against the Agent's DID document.
        *   **API**: Simple registration and lookup (by `AgentDID`, returning a list of signed device records).
    *   **4. Discovery via Synchronization Layer (If Applicable)**
        *   **Function**: Some chosen synchronization layers (e.g., Matrix, libp2p with specific discovery modules, OrbitDB/IPFS) provide their own peer discovery mechanisms.
        *   **Mechanism**: If such a layer is used, its native discovery (e.g., joining a Matrix room derived from AgentDID, using libp2p's DHT/mDNS modules, IPFS PubSub) can be the primary method for finding peers already part of that sync ecosystem.
        *   **Verification**: Still relies on NIP-1 DIDs to verify that discovered peers are legitimate devices of the agent.
    *   **Order of Operations & Bootstrapping Strategy**:
        *   A device typically attempts discovery in the following order:
            1.  **Known Peers**: Try connecting to peers from previous successful sessions (if connection info is cached and still valid).
            2.  **Local Network Discovery (mDNS/DNS-SD)**.
            3.  **Synchronization Layer Native Discovery** (if the chosen sync layer has a robust mechanism).
            4.  **Decentralized Hash Table (DHT)**.
            5.  **Rendezvous Server** (especially if DHT fails or for bootstrapping the DHT entry).
        *   The DID document for the AgentDID is resolved early to obtain the list of authorized `DeviceID`s and their public keys for verifying any discovered peers.
*   **CRDT Data Structures for Common Agent State**:
    *   Define standard schemas for agent profile, conversation history, learned preferences, available tools/skills, etc.
    *   Utilize Automerge or Yjs to model these as nested JSON-like structures, allowing for rich data types and conflict-free merging.
*   **Message Formats for Synchronization**:
    *   Dependent on the chosen CRDT library (e.g., Yjs update messages, Automerge changesets) and synchronization layer (e.g., Matrix events, GunDB messages).
    *   Messages should include sender device ID, signature, and CRDT payload.
*   **Handling of Large State and Efficient Sync**:
    *   Delta updates are crucial.
    *   Lazy loading or partial synchronization for very large states (see Open Questions).

**Recommended Technologies/Approaches (Summary from Research)**

*   **State Model (CRDTs)**: **Automerge** or **Yjs** for their support of nested structures and automatic conflict merging.
*   **Synchronization Layer**:
    *   **GunDB**: For lightweight needs and ease of use.
    *   **OrbitDB**: For decentralized persistence leveraging IPFS.
    *   **Matrix**: For high-security needs and robust E2EE messaging infrastructure.
*   **Identity Mechanism**: NIP-1 DID for agent identity. For device and data encryption, consider **GUN SEA** principles or a custom secure key derivation/sharing protocol.
*   **Key Synchronization**: A self-implemented secure key backup and recovery protocol, or leveraging secure channels provided by a sync layer like Matrix.
*   **Optional Backup Layer**: **Syncthing** could be considered for file-level snapshotting and backup of the agent state, operating independently or as a complement to the CRDT sync.

**Open Questions/Future Considerations**

*   Scalability to a very large number of devices per agent.
*   Selective synchronization (e.g., syncing only a subset of the state to resource-constrained devices or based on user preference).
*   Interoperability between different CRDT implementations if agents need to use diverse state models.
*   Mechanisms for revoking device authorization securely and efficiently propagating this revocation.
*   Defining a robust and secure protocol for initial key sharing and ongoing key synchronization/recovery across devices.
*   Choosing the right balance between decentralization, performance, and ease of implementation for the synchronization layer (GunDB vs. OrbitDB vs. Matrix vs. custom).
*   Integration strategy for an optional backup layer like Syncthing: how it interacts with the live CRDT state.
*   Formal specification of the schemas for common agent state components.
