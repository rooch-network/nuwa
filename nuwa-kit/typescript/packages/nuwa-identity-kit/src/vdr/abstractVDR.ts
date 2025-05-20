import { DIDDocument, VDRInterface } from '../types';

/**
 * Abstract base class for implementing Verifiable Data Registry functionality
 * Provides common utility methods and enforces the VDRInterface contract
 */
export abstract class AbstractVDR implements VDRInterface {
  // The DID method this VDR handles (e.g., 'key', 'web')
  protected readonly method: string;
  
  /**
   * Creates a new AbstractVDR instance
   * 
   * @param method The DID method this VDR handles
   */
  constructor(method: string) {
    this.method = method;
  }
  
  /**
   * Gets the DID method this VDR handles
   * 
   * @returns The DID method string
   */
  getMethod(): string {
    return this.method;
  }
  
  /**
   * Validates that a given DID matches the method this VDR handles
   * 
   * @param did The DID to validate
   * @throws Error if the DID doesn't match this VDR's method
   */
  protected validateDIDMethod(did: string): void {
    const parts = did.split(':');
    if (parts.length < 3 || parts[0] !== 'did' || parts[1] !== this.method) {
      throw new Error(`DID ${did} is not a valid did:${this.method} identifier`);
    }
  }
  
  /**
   * Validates a DID document's basic structure
   * 
   * @param document The DID document to validate
   * @returns true if valid, throws an error otherwise
   */
  protected validateDocument(document: DIDDocument): boolean {
    if (!document.id) {
      throw new Error('DID document must have an id');
    }
    
    this.validateDIDMethod(document.id);
    
    if (!document['@context']) {
      throw new Error('DID document must have a @context property');
    }
    
    if (!document.verificationMethod || document.verificationMethod.length === 0) {
      throw new Error('DID document must have at least one verification method');
    }
    
    return true;
  }
  
  /**
   * Stores a DID document in the registry
   * Implementations must provide this functionality
   */
  abstract store(didDocument: DIDDocument): Promise<boolean>;
  
  /**
   * Resolves a DID to its corresponding DID document
   * Implementations must provide this functionality
   */
  abstract resolve(did: string): Promise<DIDDocument | null>;
  
  /**
   * Checks if a DID exists in the registry
   * Default implementation tries to resolve and checks if result is not null
   */
  async exists(did: string): Promise<boolean> {
    try {
      const doc = await this.resolve(did);
      return doc !== null;
    } catch (error) {
      return false;
    }
  }
}
