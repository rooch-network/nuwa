import { DIDDocument } from '../types';
import { AbstractVDR } from './abstractVDR';
import { CryptoUtils } from '../cryptoUtils';

/**
 * KeyVDR handles did:key DIDs
 * 
 * did:key DIDs are self-resolving as they contain the public key material
 * embedded in the identifier. This implementation follows the did:key method
 * specification.
 * 
 * Example did:key: did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
 * 
 * Reference: https://w3c-ccg.github.io/did-method-key/
 */
export class KeyVDR extends AbstractVDR {
  // In-memory cache of resolved documents
  private documentCache: Map<string, DIDDocument> = new Map();
  
  constructor() {
    super('key');
  }
  
  /**
   * Parses a did:key identifier to extract the public key
   * 
   * @param did The did:key identifier
   * @returns The extracted multibase-encoded public key
   */
  private extractMultibaseKey(did: string): string {
    this.validateDIDMethod(did);
    
    // Extract the multibase-encoded public key from the DID
    // did:key:<multibase-encoded-key>
    const parts = did.split(':');
    if (parts.length !== 3) {
      throw new Error(`Invalid did:key format: ${did}`);
    }
    
    return parts[2];
  }
  
  /**
   * Generates a DID document for a did:key identifier
   * 
   * @param did The did:key identifier
   * @returns A generated DID document based on the encoded key
   */
  private async generateDIDDocument(did: string): Promise<DIDDocument> {
    const multibaseKey = this.extractMultibaseKey(did);
    
    // Determine key type based on multibase prefix
    // This is a simplified implementation - a full implementation would
    // support more key types and proper multibase decoding
    let keyType = 'Ed25519VerificationKey2020';
    if (multibaseKey.startsWith('zQ3')) {
      keyType = 'EcdsaSecp256k1VerificationKey2019';
    }
    
    // The verification method ID is usually the DID with a fragment
    // that references the key
    const verificationMethodId = `${did}#${multibaseKey}`;
    
    // Create a basic DID Document
    const didDocument: DIDDocument = {
      '@context': [
        'https://www.w3.org/ns/did/v1',
        keyType === 'Ed25519VerificationKey2020' 
          ? 'https://w3id.org/security/suites/ed25519-2020/v1'
          : 'https://w3id.org/security/suites/secp256k1-2019/v1'
      ],
      id: did,
      verificationMethod: [
        {
          id: verificationMethodId,
          type: keyType,
          controller: did,
          publicKeyMultibase: multibaseKey
        }
      ],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId],
      capabilityInvocation: [verificationMethodId],
      capabilityDelegation: [verificationMethodId]
    };
    
    return didDocument;
  }
  
  /**
   * Resolves a did:key identifier to a DID document
   * 
   * @param did The did:key identifier to resolve
   * @returns The resolved or generated DID document
   */
  async resolve(did: string): Promise<DIDDocument | null> {
    try {
      // Check the cache first
      if (this.documentCache.has(did)) {
        return this.documentCache.get(did)!;
      }
      
      // Generate a new document based on the did:key
      const document = await this.generateDIDDocument(did);
      
      // Cache the document
      this.documentCache.set(did, document);
      
      return document;
    } catch (error) {
      console.error(`Error resolving ${did}:`, error);
      return null;
    }
  }
  
  /**
   * For did:key, storing doesn't make sense as the document is derived from the key itself.
   * However, we can validate the document and cache it.
   * 
   * @param didDocument The DID document to "store"
   * @returns Always true if validation passes
   */
  async store(didDocument: DIDDocument): Promise<boolean> {
    try {
      this.validateDocument(didDocument);
      
      // Store in cache
      this.documentCache.set(didDocument.id, didDocument);
      
      return true;
    } catch (error) {
      console.error(`Error validating document for ${didDocument.id}:`, error);
      throw error;
    }
  }
}
