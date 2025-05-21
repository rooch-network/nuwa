import { KeyVDR } from '../../src/vdr/keyVDR';
import { NuwaIdentityKit } from '../../src/index';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { DIDValidator } from './did-validator';

describe('DID Document Validator', () => {
  let keyVDR: KeyVDR;
  let didDocument: any;

  beforeEach(async () => {
    keyVDR = new KeyVDR();
    keyVDR.reset();
    
    // Create a basic DID identity
    const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
    didDocument = identity.didDocument;
  });

  it('should validate a well-formed DID document structure', async () => {
    const result = DIDValidator.validateBasicStructure(didDocument);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate verification methods in the DID document', async () => {
    const result = DIDValidator.validateVerificationMethods(didDocument);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate verification relationships in the DID document', async () => {
    const result = DIDValidator.validateVerificationRelationships(didDocument);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should validate the DID document against W3C JSON-LD context', async () => {
    const result = await DIDValidator.validateJsonLd(didDocument);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should perform complete validation of a DID document', async () => {
    const result = await DIDValidator.validateDIDDocument(didDocument);
    expect(result.valid).toBe(true);
    expect(result.structureValid).toBe(true);
    expect(result.methodsValid).toBe(true);
    expect(result.relationshipsValid).toBe(true);
    expect(result.jsonLdValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should detect invalid DID document structure', async () => {
    const invalidDoc = { ...didDocument };
    delete invalidDoc.id;
    
    const result = DIDValidator.validateBasicStructure(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('id property');
  });

  it('should detect invalid verification methods', async () => {
    const invalidDoc = { ...didDocument };
    if (invalidDoc.verificationMethod && invalidDoc.verificationMethod.length > 0) {
      const invalidMethod = { ...invalidDoc.verificationMethod[0] };
      delete invalidMethod.type;
      invalidDoc.verificationMethod = [invalidMethod];
    }
    
    const result = DIDValidator.validateVerificationMethods(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('type');
  });

  it('should detect invalid verification relationships', async () => {
    const invalidDoc = { ...didDocument };
    if (invalidDoc.authentication && invalidDoc.authentication.length > 0) {
      invalidDoc.authentication = ['did:key:non-existent-method'];
    }
    
    const result = DIDValidator.validateVerificationRelationships(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('non-existent');
  });
}); 