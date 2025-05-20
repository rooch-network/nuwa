import { DIDDocument, ServiceEndpoint, VerificationMethod, VerificationRelationship, SignerInterface } from '../../src/types';
// For Node.js environments
import { Buffer } from 'buffer';

/**
 * Creates a basic test DID document with a master key
 * 
 * @param did The DID to use for the document
 * @returns A DID document with basic structure and a master key
 */
export function createTestDIDDocument(did: string): DIDDocument {
  const keyId = `${did}#master`;
  return {
    '@context': ['https://www.w3.org/ns/did/v1'],
    id: did,
    verificationMethod: [
      {
        id: keyId,
        type: 'Ed25519VerificationKey2020',
        controller: did,
        publicKeyMultibase: 'zH3C2AVvLMv6gmMNam3uVAjZpfkcJCwDwnZn6z3wXmqPV'
      }
    ],
    authentication: [keyId],
    assertionMethod: [keyId],
    capabilityInvocation: [keyId],
    capabilityDelegation: [keyId]
  };
}

/**
 * Creates a test DID document with multiple keys and specific capabilities
 * 
 * @param did The DID to use for the document
 * @param keyConfig Configuration of keys to add with specific permissions
 * @returns A DID document with multiple keys and specified permissions
 */
export function createTestDIDDocumentWithMultipleKeys(did: string, keyConfig: {
  withCapabilityDelegation?: string;
  withoutCapabilityDelegation?: string;
  withCapabilityInvocation?: string;
  withoutCapabilityInvocation?: string;
  withAuthentication?: string;
  withoutAuthentication?: string;
  withAssertionMethod?: string;
  withoutAssertionMethod?: string;
}): DIDDocument {
  const doc = createTestDIDDocument(did);
  
  // Add keys based on configuration
  if (keyConfig.withCapabilityDelegation) {
    const keyId = keyConfig.withCapabilityDelegation;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z2DEF456AbCdEfG'
    });
    doc.capabilityDelegation!.push(keyId);
  }
  
  if (keyConfig.withoutCapabilityDelegation) {
    const keyId = keyConfig.withoutCapabilityDelegation;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z3HIJ789KlMnOp'
    });
    // Don't add to capabilityDelegation
  }
  
  if (keyConfig.withCapabilityInvocation) {
    const keyId = keyConfig.withCapabilityInvocation;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z4QRS012TuVwXy'
    });
    doc.capabilityInvocation!.push(keyId);
  }
  
  if (keyConfig.withoutCapabilityInvocation) {
    const keyId = keyConfig.withoutCapabilityInvocation;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z5ZAB345CdEfGh'
    });
    // Don't add to capabilityInvocation
  }
  
  if (keyConfig.withAuthentication) {
    const keyId = keyConfig.withAuthentication;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z6ZAB345CdEfGh'
    });
    doc.authentication!.push(keyId);
  }
  
  if (keyConfig.withoutAuthentication) {
    const keyId = keyConfig.withoutAuthentication;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z7ZAB345CdEfGh'
    });
    // Don't add to authentication
  }
  
  if (keyConfig.withAssertionMethod) {
    const keyId = keyConfig.withAssertionMethod;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z8ZAB345CdEfGh'
    });
    doc.assertionMethod!.push(keyId);
  }
  
  if (keyConfig.withoutAssertionMethod) {
    const keyId = keyConfig.withoutAssertionMethod;
    doc.verificationMethod!.push({
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: 'z9ZAB345CdEfGh'
    });
    // Don't add to assertionMethod
  }
  
  return doc;
}

/**
 * Creates a test verification method
 * 
 * @param id The ID for the verification method
 * @returns A verification method object
 */
export function createTestVerificationMethod(id: string): VerificationMethod {
  const did = id.split('#')[0];
  return {
    id,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase: 'zRandomMultibaseValue'
  };
}

/**
 * Creates a test service endpoint
 * 
 * @param id The ID for the service
 * @param type Optional service type, defaults to 'TestService'
 * @param endpoint Optional service endpoint URL, defaults to 'https://example.com/service'
 * @returns A service endpoint object
 */
export function createTestService(
  id: string, 
  type: string = 'TestService',
  endpoint: string = 'https://example.com/service'
): ServiceEndpoint {
  return {
    id,
    type,
    serviceEndpoint: endpoint
  };
}

/**
 * Creates a mock private key for testing
 * This should only be used in tests, not in production
 * 
 * @returns A mock private key as Uint8Array
 */
export function createMockPrivateKey(): Uint8Array {
  return new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
  ]);
}

/**
 * Creates a mock CryptoKey for testing
 * This should only be used in tests, not in production
 * 
 * @returns A mock CryptoKey object
 */
export function createMockCryptoKey(): CryptoKey {
  return {
    type: 'private',
    extractable: false,
    algorithm: { name: 'ECDSA', namedCurve: 'P-256' },
    usages: ['sign']
  } as CryptoKey;
}

/**
 * A simple mock implementation of a signer interface for testing
 * This implements the SignerInterface from the source code
 */
export class MockSigner implements SignerInterface {
  private keys: Map<string, Uint8Array> = new Map();
  
  constructor(keyMap?: Map<string, Uint8Array>) {
    if (keyMap) {
      this.keys = keyMap;
    }
  }
  
  addKey(keyId: string, privateKey: Uint8Array | CryptoKey): void {
    // If it's a CryptoKey, convert to Uint8Array for simplicity in tests
    if (privateKey instanceof Uint8Array) {
      this.keys.set(keyId, privateKey);
    } else {
      // For testing, we treat CryptoKey objects as if they are Uint8Arrays by creating a dummy Uint8Array
      this.keys.set(keyId, new Uint8Array([1, 2, 3, 4]));
    }
  }
  
  async sign(data: Uint8Array, keyId: string): Promise<string> {
    const key = this.keys.get(keyId);
    if (!key) {
      throw new Error(`Key ${keyId} not found`);
    }
    
    // For test purposes, just return some deterministic value based on the input
    const signature = new Uint8Array(64);
    for (let i = 0; i < Math.min(data.length, 32); i++) {
      signature[i] = data[i];
      signature[i + 32] = data[i] ^ key[i % key.length];
    }
    
    // For testing, we'll create a simple base64-like string without actually encoding
    // This avoids dependencies on Buffer or btoa which can be problematic in some environments
    return 'TEST_SIGNATURE_' + Array.from(signature)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  
  async canSign(keyId: string): Promise<boolean> {
    return this.keys.has(keyId);
  }
}

/**
 * Creates test options with a mock signer
 * 
 * @param keyId The key ID to use for signing
 * @param privateKey Optional private key to use, creates a new one if not provided
 * @returns Options object with a mock signer
 */
export function createTestOptionsWithSigner(keyId: string, privateKey?: Uint8Array): any {
  const key = privateKey || createMockPrivateKey();
  const mockSigner = new MockSigner();
  mockSigner.addKey(keyId, key);
  
  return {
    keyId,
    signer: mockSigner
  };
}
