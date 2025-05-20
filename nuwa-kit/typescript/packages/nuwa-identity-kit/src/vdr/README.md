# VDR (Verifiable Data Registry) System

This directory contains implementations of the VDR (Verifiable Data Registry) interface for various DID methods.

## Overview

The VDR system provides a unified way to interact with different DID methods, allowing NuwaIdentityKit to support multiple DID methods through a consistent interface.

## Available VDR Implementations

- `KeyVDR`: Handles `did:key` DIDs, which are self-resolving as they contain public key material in the identifier
- `WebVDR`: Handles `did:web` DIDs, which resolve to documents hosted on web servers

## How to Use

### Basic Usage with NuwaIdentityKit

```typescript
import { NuwaIdentityKit } from '../index';
import { createDefaultVDRs } from './index';

// Create default VDRs for 'key' and 'web' methods
const vdrs = createDefaultVDRs();

// Create a NuwaIdentityKit instance with VDRs
const agent = new NuwaIdentityKit(didDocument, { vdrs });

// Later, resolve a DID using the registered VDRs
const resolvedDoc = await agent.resolveDID('did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK');
```

### Using WebVDR with Custom Options

```typescript
import { WebVDR, WebVDROptions } from './webVDR';

// Configure WebVDR with custom options
const webVDROptions: WebVDROptions = {
  basePath: '/dids',
  headers: {
    Authorization: 'Bearer token123'
  },
  // Optional upload handler for publishing documents
  uploadHandler: async (domain, path, document) => {
    // Custom implementation to upload the document
    const response = await fetch(`https://${domain}/${path}/did.json`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer token123'
      },
      body: JSON.stringify(document)
    });
    return response.ok;
  }
};

const webVDR = new WebVDR(webVDROptions);
```

### Creating Custom VDR Implementations

To create a custom VDR implementation (e.g., for a blockchain-based DID method):

1. Extend the `AbstractVDR` class:

```typescript
import { AbstractVDR } from './abstractVDR';
import { DIDDocument } from '../types';

export class CustomBlockchainVDR extends AbstractVDR {
  constructor() {
    super('custom');  // The method name, e.g., 'rooch'
  }
  
  async store(didDocument: DIDDocument): Promise<boolean> {
    // Implementation for storing a DID document on the blockchain
  }
  
  async resolve(did: string): Promise<DIDDocument | null> {
    // Implementation for resolving a DID document from the blockchain
  }
}
```

2. Register your custom VDR with NuwaIdentityKit:

```typescript
const agent = new NuwaIdentityKit(didDocument);
agent.registerVDR(new CustomBlockchainVDR());
```

## VDR Interface

Each VDR implementation must conform to the `VDRInterface`:

```typescript
interface VDRInterface {
  // Used ONLY for initial creation of DID Documents
  store(didDocument: DIDDocument, options?: any): Promise<boolean>;
  
  // Core operations
  resolve(did: string): Promise<DIDDocument | null>;
  exists(did: string): Promise<boolean>;
  getMethod(): string;
  
  // Fine-grained update operations
  addVerificationMethod(did: string, verificationMethod: VerificationMethod, 
    relationships?: VerificationRelationship[], options?: any): Promise<boolean>;
  removeVerificationMethod(did: string, id: string, options?: any): Promise<boolean>;
  addService(did: string, service: ServiceEndpoint, options?: any): Promise<boolean>;
  removeService(did: string, id: string, options?: any): Promise<boolean>;
  updateRelationships(did: string, id: string, add: VerificationRelationship[], 
    remove: VerificationRelationship[], options?: any): Promise<boolean>;
  updateController(did: string, controller: string | string[], options?: any): Promise<boolean>;
}
```

### Usage Pattern

The `store` method is intended to be used **ONLY** for the initial creation of a DID document. For all subsequent modifications of a DID document, use the specific update methods:

- `addVerificationMethod` - Add a new key (requires `capabilityDelegation` permission)
- `removeVerificationMethod` - Remove an existing key (requires `capabilityDelegation` permission)
- `addService` - Add a service endpoint (requires `capabilityInvocation` permission)
- `removeService` - Remove a service endpoint (requires `capabilityInvocation` permission)
- `updateRelationships` - Add or remove verification relationships (requires `capabilityDelegation` permission)
- `updateController` - Change the controller of the DID document (requires current controller permission)

Example:
```typescript
// Initial creation - only happens once when the DID is first created
const didDocument = {...}; // New DID Document
await vdr.store(didDocument);

// Check if DID exists before deciding whether to create or update
const exists = await vdr.exists(did);
if (!exists) {
  // Initial creation
  await vdr.store(didDocument);
} else {
  // For all subsequent operations, use fine-grained methods:
  await vdr.addVerificationMethod(did, newKey, relationships, { keyId: signingKeyId, signer });
}
```

### Permission Model

VDR implementations must enforce the NIP-1 permission model:

1. **Key Management Operations** (add/remove verification methods, update relationships)
   - Require a key with `capabilityDelegation` permission
   - Cannot remove the last key or the signing key itself

2. **Service Management Operations** (add/remove services)
   - Require a key with `capabilityInvocation` permission

3. **Controller Updates**
   - Special case: Only the current controller can change controller
   - If multiple controllers exist, any of them can update the controller

### Implementation Considerations

When implementing a VDR:

1. Always validate permissions before performing operations
2. Use the helper methods in `AbstractVDR` for permission checking (`validateKeyPermission`)
3. Keep your implementation idempotent when possible
4. Consider caching for performance (like in `KeyVDR`)
5. Implement clear error handling with descriptive messages
