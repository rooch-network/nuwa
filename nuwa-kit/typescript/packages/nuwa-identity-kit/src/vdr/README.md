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
  store(didDocument: DIDDocument): Promise<boolean>;
  resolve(did: string): Promise<DIDDocument | null>;
  exists(did: string): Promise<boolean>;
  getMethod(): string;
}
```
