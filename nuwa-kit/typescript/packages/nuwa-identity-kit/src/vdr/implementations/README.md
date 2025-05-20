# VDR Implementations

This directory contains specialized VDR implementations for various DID methods.

## Adding a New VDR Implementation

To create a new VDR implementation:

1. Create a new file named `[method]VDR.ts` (e.g., `roochVDR.ts`)
2. Extend the `AbstractVDR` class and implement the required methods
3. Register your VDR in the factory methods in `../index.ts`

## Template for a New VDR Implementation

```typescript
import { DIDDocument } from '../../types';
import { AbstractVDR } from '../abstractVDR';

export interface YourVDROptions {
  // Custom options for your VDR implementation
}

export class YourVDR extends AbstractVDR {
  private readonly options: YourVDROptions;
  
  constructor(options: YourVDROptions = {}) {
    super('your-method');
    this.options = options;
  }
  
  async store(didDocument: DIDDocument): Promise<boolean> {
    // Implementation for storing a DID document with your method
    return true;
  }
  
  async resolve(did: string): Promise<DIDDocument | null> {
    // Implementation for resolving a DID with your method
    return document;
  }
  
  // Optional: Override the exists method if more efficient than default
  async exists(did: string): Promise<boolean> {
    // Custom implementation to check if a DID exists
    return true;
  }
}
```

## Extending with Protocol-Specific Methods

If your VDR implementation needs to expose additional protocol-specific methods, you can add them to your class:

```typescript
export class YourVDR extends AbstractVDR {
  // ... Implement required VDR interface methods ...
  
  // Custom method specific to your VDR
  async createOnChainTransaction(didDocument: DIDDocument): Promise<string> {
    // Custom implementation
    return 'transaction hash';
  }
}
```
