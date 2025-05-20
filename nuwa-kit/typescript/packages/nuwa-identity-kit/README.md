# Nuwa Identity Kit

TypeScript SDK implementing NIP-1 Agent Single DID Multi-Key Model.

## Overview

This SDK implements the [NIP-1 Agent Single DID Multi-Key Model](https://github.com/rooch-network/nuwa/blob/main/nips/NIPs/nip-1.md), a decentralized identity model for Agents (representing users, services, or other autonomous entities) within the Nuwa ecosystem.

The core concept is to enable a single master Decentralized Identifier (DID) to manage multiple operational keys (device-specific keys, application-specific keys, service instance keys, etc.). This allows an entity to maintain consistent identity while securely operating across multiple contexts.

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
  
  // Create an SDK instance with the DID document and master private key
  const sdk = new NuwaIdentityKit(
    masterIdentity.didDocument, 
    masterIdentity.masterPrivateKey
  );
  
  // Store the master key (it's automatically the first key)
  sdk.storeOperationalPrivateKey(masterIdentity.masterKeyId, masterIdentity.masterPrivateKey);
  
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

### Publishing the DID Document

```typescript
async function publishDID(sdk) {
  // This is a placeholder in the SDK - actual implementation depends on the DID method
  await sdk.publishDIDDocument();
}
```

## DID Methods Support

This SDK is designed to be DID method agnostic and can work with various methods:

- `did:key`: Simple method where the DID is derived directly from a public key
- `did:web`: DIDs hosted on web servers
- Custom methods: Can be extended to support methods like `did:rooch` or others

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
