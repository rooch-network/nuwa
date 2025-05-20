# Nuwa Identity Kit

TypeScript SDK implementing NIP-1 Agent Single DID Multi-Key Model.

## Overview

This SDK implements the [NIP-1 Agent Single DID Multi-Key Model](https://github.com/rooch-network/nuwa/blob/main/nips/NIPs/nip-1.md), a decentralized identity model for Agents (representing users, services, or other autonomous entities) within the Nuwa ecosystem.

The core concept is to enable a single master Decentralized Identifier (DID) to manage multiple operational keys (device-specific keys, application-specific keys, service instance keys, etc.). This allows an entity to maintain consistent identity while securely operating across multiple contexts.

## Key Design Concepts

### Verifiable Data Registry (VDR) Abstraction

The SDK implements a Verifiable Data Registry (VDR) abstraction that handles the storage and retrieval of DID Documents across different DID methods (did:key, did:web, did:rooch, etc.). The VDR abstraction follows these key principles:

1. **Clear Separation of Creation and Updates**: 
   - The `store` method is ONLY for initial document creation
   - All updates use specific fine-grained methods

2. **Fine-grained Update Operations**:
   - Each operation (add key, remove key, add service, etc.) has a dedicated method
   - This allows for better error handling, permission checking, and optimization

3. **NIP-1 Permission Model**:
   - Key operations require `capabilityDelegation` permission
   - Service operations require `capabilityInvocation` permission
   - Controller changes require current controller permission

### Usage Pattern

```typescript
// First check if the DID exists
const exists = await identityKit.didExists(did);

if (!exists) {
  // Initial creation - only happens once
  await identityKit.publishDIDDocument();
} else {
  // For all subsequent operations, use fine-grained methods:
  await identityKit.addVerificationMethodAndPublish(methodInfo, relationships, signingKeyId);
  await identityKit.removeVerificationMethodAndPublish(keyToRemoveId, signingKeyId);
  await identityKit.addServiceAndPublish(serviceInfo, signingKeyId);
  await identityKit.removeServiceAndPublish(serviceToRemoveId, signingKeyId);
  await identityKit.updateRelationships(keyId, addRelationships, removeRelationships, signingKeyId);
}
```

### Helper Methods

The SDK provides helper methods to simplify common workflows:

```typescript
// Create and publish only if the document doesn't exist
await identityKit.createAndPublishIfNotExists();

// Check if a DID exists before performing operations
const exists = await identityKit.didExists(did);
```

## Features

- Create and manage a master DID identity
- Add and remove operational keys with specific verification relationships
- Add and remove services to the DID document
- Sign data using the NIP-1 signature structure
- Verify NIP-1 signatures
- Discover services by type

## Installation

```bash
# Using npm
npm install nuwa-identity-kit

# Using yarn
yarn add nuwa-identity-kit

# Using pnpm
pnpm add nuwa-identity-kit
```

## Usage

### Creating a Master DID

```typescript
import { NuwaIdentityKit, CryptoUtils } from 'nuwa-identity-kit';

async function createAgentIdentity() {
  // Create a new master identity using did:key method
  const masterIdentity = await NuwaIdentityKit.createMasterIdentity({
    method: 'key',
    initialOperationalKey: {
      type: 'Ed25519VerificationKey2020',
      relationships: ['authentication', 'assertionMethod', 'capabilityInvocation']
    }
  });

  console.log('Created DID:', masterIdentity.did);
  console.log('DID Document:', JSON.stringify(masterIdentity.didDocument, null, 2));
  
  // Create an SDK instance with the DID document and a simple signer for the master key
  // In a real-world application, you would use a proper wallet integration
  const sdk = NuwaIdentityKit.createFromMasterIdentity(masterIdentity);
  
  // The master private key is NOT stored in the SDK - it's only accessible through the signer
  // This follows security best practices for private key management
  
  return sdk;
}
```

### Adding an Operational Key

```typescript
async function addDeviceKey(sdk) {
  // Generate a new key pair
  const { publicKey, privateKey } = await CryptoUtils.generateKeyPair('Ed25519VerificationKey2020');
  
  // Add the key to the DID document with specific relationships
  const keyId = await sdk.addOperationalKey(
    {
      idFragment: 'mobile-device-1',
      type: 'Ed25519VerificationKey2020',
      publicKeyMaterial: publicKey,
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year expiry
    },
    ['authentication', 'capabilityInvocation']
  );
  
  // Store the private key
  sdk.storeOperationalPrivateKey(keyId, privateKey);
  
  return keyId;
}
```

### Adding a Service

```typescript
function addService(sdk) {
  const serviceId = sdk.addService({
    idFragment: 'llm-gateway',
    type: 'LLMGatewayNIP9',
    serviceEndpoint: 'https://example.com/llm',
    additionalProperties: {
      supportedModels: ['model-x', 'model-y']
    }
  });
  
  return serviceId;
}
```

### Creating and Verifying a Signature

```typescript
async function signAndVerify(sdk, keyId) {
  // Data to sign
  const payload = { 
    operation: 'authenticate', 
    params: { serviceId: 'example-service' }
  };
  
  // Create a NIP-1 signature
  const signedObject = await sdk.createNIP1Signature(payload, keyId);
  
  console.log('Signed Object:', JSON.stringify(signedObject, null, 2));
  
  // In a real application, the verifier would resolve the DID document
  // For demo purposes, we'll use the same document
  const isValid = await NuwaIdentityKit.verifyNIP1Signature(
    signedObject, 
    sdk.getDIDDocument()
  );
  
  console.log('Signature Valid:', isValid);
}
```

### Using a Custom External Signer (e.g., for Wallet Integration)

```typescript
import { SignerInterface } from 'nuwa-identity-kit';

// Example of a custom signer that integrates with a wallet
class WalletSigner implements SignerInterface {
  private wallet: any; // Your wallet instance
  private authorizedKeys: string[];
  
  constructor(wallet: any, authorizedKeys: string[]) {
    this.wallet = wallet;
    this.authorizedKeys = authorizedKeys;
  }
  
  async sign(data: Uint8Array, keyId: string): Promise<string> {
    if (!this.authorizedKeys.includes(keyId)) {
      throw new Error(`Key ${keyId} is not authorized for this wallet`);
    }
    
    // Request signature from wallet
    // This could open a popup or redirect to a wallet app
    const signature = await this.wallet.requestSignature({
      didKeyId: keyId,
      data: Array.from(data) // Convert to format the wallet expects
    });
    
    return signature;
  }
  
  async canSign(keyId: string): Promise<boolean> {
    return this.authorizedKeys.includes(keyId);
  }
}

async function createSDKWithWalletSigner(didDocument) {
  // Create wallet signer with the master key
  const masterKeyId = didDocument.verificationMethod[0].id;
  const walletSigner = new WalletSigner(
    yourWalletInstance, 
    [masterKeyId]
  );
  
  // Create SDK with the wallet signer
  const sdk = new NuwaIdentityKit(didDocument, {
    externalSigner: walletSigner
  });
  
  return sdk;
}
```

### Publishing the Initial DID Document

```typescript
async function publishInitialDID(sdk) {
  // This should ONLY be used for the initial creation of the DID document
  // For updates, use the specific methods like addVerificationMethodAndPublish, etc.
  await sdk.publishDIDDocument();
}
```

### Updating the DID Document

For updates, always use the specific granular methods rather than updating the whole document:

```typescript
// Add a new verification method (key)
const keyId = await sdk.addOperationalKeyAndPublish(
  keyInfo,
  ['authentication', 'capabilityInvocation'],
  masterKeyId
);

// Add a new service endpoint
const serviceId = await sdk.addServiceAndPublish(
  serviceInfo,
  masterKeyId
);

// Remove a verification method (key)
await sdk.removeVerificationMethodAndPublish(keyId, masterKeyId);

// Remove a service
await sdk.removeServiceAndPublish(serviceId, masterKeyId);

// Update key relationships
await sdk.updateRelationships(
  keyId,
  ['authentication'], // relationships to add
  ['capabilityDelegation'], // relationships to remove
  masterKeyId
);
```

### Creating a Delegated Instance (NIP-3)

```typescript
async function createDelegatedInstance() {
  // In delegated mode, we have a DID document controlled by another entity
  // but we may have some operational keys for specific operations
  
  // Get the DID document from somewhere (e.g., DID resolver, local storage, etc.)
  const didDocument = await getDIDDocumentFromResolver('did:example:123456');
  
  // Create a map for any operational keys we have access to
  const operationalKeys = new Map();
  
  // We might have some operational keys granted to us by the controller
  const { publicKey, privateKey } = await CryptoUtils.generateKeyPair('Ed25519VerificationKey2020');
  const keyId = 'did:example:123456#delegate-key-1';
  operationalKeys.set(keyId, privateKey);
  
  // Create the delegated instance without an external signer for the master key
  const delegatedSdk = new NuwaIdentityKit(didDocument, { operationalPrivateKeys: operationalKeys });
  
  // Check if we're in delegated mode (no external signer for master key operations)
  console.log('Is delegated mode?', delegatedSdk.isDelegatedMode()); // true
  
  // We can check which keys we can sign with
  const canSignWithMaster = await delegatedSdk.canSignWithKey(didDocument.verificationMethod[0].id); // false
  const canSignWithDelegate = await delegatedSdk.canSignWithKey(keyId); // true
  
  return delegatedSdk;
}
```

## DID Methods Support

This SDK is designed to be DID method agnostic and can work with various methods through its VDR (Verifiable Data Registry) abstraction:

- `did:key`: Simple method where the DID is derived directly from a public key
- `did:web`: DIDs hosted on web servers
- Custom methods: Can be extended to support methods like `did:rooch` or others

### Using VDRs (Verifiable Data Registries)

The SDK uses VDRs (Verifiable Data Registries) to interact with different DID methods:

```typescript
import { NuwaIdentityKit, createDefaultVDRs, WebVDR } from 'nuwa-identity-kit';

// Create default VDRs for common DID methods (key, web)
const vdrs = createDefaultVDRs();

// Or create specific VDRs with custom configuration
const webVDR = new WebVDR({
  uploadHandler: async (domain, path, document) => {
    // Custom implementation to upload the document
    const response = await fetch(`https://${domain}/${path}/did.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(document)
    });
    return response.ok;
  }
});

// Create SDK with VDRs
const sdk = new NuwaIdentityKit(didDocument, {
  vdrs: [webVDR, ...otherVdrs]
});

// Publish DID document using the appropriate VDR
await sdk.publishDIDDocument();

// Resolve another DID using registered VDRs
const resolvedDoc = await sdk.resolveDID('did:web:example.com');

// Verify a signature with automatic DID resolution
const signedObject = { /* NIP1SignedObject */ };
const isValid = await NuwaIdentityKit.verifyNIP1Signature(signedObject, vdrs);
```

### Creating Custom VDR Implementations

To support a custom DID method:

```typescript
import { AbstractVDR, DIDDocument } from 'nuwa-identity-kit';

class CustomVDR extends AbstractVDR {
  constructor() {
    super('custom'); // The DID method name
  }
  
  async store(didDocument: DIDDocument): Promise<boolean> {
    // Implementation for storing a DID document
    return true;
  }
  
  async resolve(did: string): Promise<DIDDocument | null> {
    // Implementation for resolving a DID document
    return document;
  }
}

// Register the custom VDR with the SDK
const customVDR = new CustomVDR();
sdk.registerVDR(customVDR);
```

## Development

### Prerequisites

- Node.js 18+
- pnpm

### Building

```bash
pnpm install
pnpm build
```

### Testing

```bash
pnpm test
```

## License

ISC
