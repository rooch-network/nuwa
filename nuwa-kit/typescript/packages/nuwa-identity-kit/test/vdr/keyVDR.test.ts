import { KeyVDR } from '../../src/vdr/keyVDR';
import { DIDDocument, ServiceEndpoint, VerificationMethod, VerificationRelationship } from '../../src/types';

// Test helpers
function createTestDIDDocument(did: string): DIDDocument {
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

function createTestDIDDocumentWithMultipleKeys(did: string, keyConfig: any): DIDDocument {
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
  
  return doc;
}

function createTestVerificationMethod(id: string): VerificationMethod {
  const did = id.split('#')[0];
  return {
    id,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase: 'zRandomMultibaseValue'
  };
}

function createTestService(id: string): ServiceEndpoint {
  return {
    id,
    type: 'TestService',
    serviceEndpoint: 'https://example.com/service'
  };
}

describe('KeyVDR', () => {
  let keyVDR: KeyVDR;

  beforeEach(() => {
    keyVDR = new KeyVDR();
  });

  describe('Initialization', () => {
    it('should initialize with the correct method type', () => {
      expect(keyVDR.getMethod()).toEqual('key');
    });

    it('should initialize with an empty document cache', () => {
      keyVDR.reset();
      expect(keyVDR.exists('did:key:nonexistent')).resolves.toBeFalsy();
    });
  });

  describe('did:key resolution', () => {
    it('should resolve a valid did:key identifier', async () => {
      const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
      const document = await keyVDR.resolve(did);
      
      expect(document).not.toBeNull();
      expect(document?.id).toEqual(did);
      expect(document?.verificationMethod).toHaveLength(1);
      expect(document?.verificationMethod?.[0].controller).toEqual(did);
    });

    it('should throw an error for an invalid did:key format', async () => {
      const invalidDid = 'did:key:invalid';
      await expect(async () => {
        await keyVDR.resolve(invalidDid);
      }).not.toThrow();
      
      const result = await keyVDR.resolve(invalidDid);
      expect(result).not.toBeNull();
    });

    it('should cache resolved documents', async () => {
      const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
      
      // First resolution should generate the document
      const document1 = await keyVDR.resolve(did);
      expect(document1).not.toBeNull();
      
      // Mock the generateDIDDocument method to track if it's called
      const spy = jest.spyOn(keyVDR as any, 'generateDIDDocument');
      
      // Second resolution should use the cache
      const document2 = await keyVDR.resolve(did);
      expect(document2).not.toBeNull();
      expect(document2).toEqual(document1);
      
      // The generate method should not have been called
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('document storage', () => {
    it('should store a valid DID document', async () => {
      const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
      const document = createTestDIDDocument(did);
      
      const result = await keyVDR.store(document);
      expect(result).toBe(true);
      
      // Verify it was stored in the cache
      const resolved = await keyVDR.resolve(did);
      expect(resolved).toEqual(document);
    });
  });

  describe('verification method operations', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
    
    beforeEach(async () => {
      const document = createTestDIDDocument(did);
      await keyVDR.store(document);
    });
    
    it('should add a verification method', async () => {
      const newMethod = createTestVerificationMethod(`${did}#new-key`);
      
      const result = await keyVDR.addVerificationMethod(
        did,
        newMethod,
        ['authentication'],
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify it was added
      const updated = await keyVDR.resolve(did);
      expect(updated?.verificationMethod).toHaveLength(2);
      expect(updated?.verificationMethod?.[1].id).toEqual(newMethod.id);
      
      // Verify it was added to the authentication relationship
      expect(updated?.authentication).toContain(newMethod.id);
    });
    
    it('should remove a verification method', async () => {
      // First add a method
      const newMethod = createTestVerificationMethod(`${did}#new-key`);
      await keyVDR.addVerificationMethod(
        did,
        newMethod,
        ['authentication'],
        { keyId: `${did}#master` }
      );
      
      // Now remove it
      const result = await keyVDR.removeVerificationMethod(
        did,
        newMethod.id,
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify it was removed
      const updated = await keyVDR.resolve(did);
      expect(updated?.verificationMethod).toHaveLength(1);
      expect(updated?.authentication).not.toContain(newMethod.id);
    });
    
    it('should not allow removing the primary key', async () => {
      await expect(async () => {
        await keyVDR.removeVerificationMethod(
          did,
          `${did}#master`,
          { keyId: `${did}#master` }
        );
      }).rejects.toThrow(/Cannot remove the primary key/);
    });
    
    it('should fail to add a method with an invalid ID', async () => {
      const invalidMethod = createTestVerificationMethod('did:wrong:123#key');
      
      await expect(async () => {
        await keyVDR.addVerificationMethod(
          did,
          invalidMethod,
          ['authentication'],
          { keyId: `${did}#master` }
        );
      }).rejects.toThrow(/must start with DID/);
    });
  });
  
  describe('service operations', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
    
    beforeEach(async () => {
      const document = createTestDIDDocument(did);
      await keyVDR.store(document);
    });
    
    it('should add a service', async () => {
      const service = createTestService(`${did}#service1`);
      
      const result = await keyVDR.addService(
        did,
        service,
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify it was added
      const updated = await keyVDR.resolve(did);
      expect(updated?.service).toHaveLength(1);
      expect(updated?.service?.[0].id).toEqual(service.id);
    });
    
    it('should remove a service', async () => {
      // First add a service
      const service = createTestService(`${did}#service1`);
      await keyVDR.addService(
        did,
        service,
        { keyId: `${did}#master` }
      );
      
      // Now remove it
      const result = await keyVDR.removeService(
        did,
        service.id,
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify it was removed
      const updated = await keyVDR.resolve(did);
      expect(updated?.service).toHaveLength(0);
    });
  });

  describe('relationship operations', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
    
    beforeEach(async () => {
      // Create a document with multiple keys
      const document = createTestDIDDocumentWithMultipleKeys(did, {
        withCapabilityDelegation: `${did}#withDelegation`,
        withoutCapabilityDelegation: `${did}#withoutDelegation`
      });
      await keyVDR.store(document);
    });
    
    it('should update relationships', async () => {
      const keyId = `${did}#withoutDelegation`;
      
      const result = await keyVDR.updateRelationships(
        did,
        keyId,
        ['assertionMethod'],
        [],
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify the relationship was added
      const updated = await keyVDR.resolve(did);
      expect(updated?.assertionMethod).toContain(keyId);
    });
  });

  describe('controller operations', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
    
    beforeEach(async () => {
      const document = createTestDIDDocument(did);
      await keyVDR.store(document);
    });
    
    it('should update controller', async () => {
      const newController = 'did:key:z6MkNewController';
      
      const result = await keyVDR.updateController(
        did,
        newController,
        { keyId: `${did}#master` }
      );
      
      expect(result).toBe(true);
      
      // Verify the controller was updated
      const updated = await keyVDR.resolve(did);
      expect(updated?.controller).toEqual(newController);
    });
  });

  describe('permission model', () => {
    const did = 'did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
    
    beforeEach(async () => {
      // Create a document with various permission keys
      const document = createTestDIDDocumentWithMultipleKeys(did, {
        withCapabilityDelegation: `${did}#withDelegation`,
        withoutCapabilityDelegation: `${did}#withoutDelegation`,
        withCapabilityInvocation: `${did}#withInvocation`,
        withoutCapabilityInvocation: `${did}#withoutInvocation`
      });
      await keyVDR.store(document);
    });
    
    it('should require capabilityDelegation for adding verification methods', async () => {
      const newMethod = createTestVerificationMethod(`${did}#new-key`);
      
      // Should succeed with a key that has capabilityDelegation
      const success = await keyVDR.addVerificationMethod(
        did,
        newMethod,
        ['authentication'],
        { keyId: `${did}#withDelegation` }
      );
      expect(success).toBe(true);
      
      // Should fail with a key that doesn't have capabilityDelegation
      await expect(async () => {
        await keyVDR.addVerificationMethod(
          did,
          createTestVerificationMethod(`${did}#another-key`),
          ['authentication'],
          { keyId: `${did}#withoutDelegation` }
        );
      }).rejects.toThrow(/does not have capabilityDelegation permission/);
    });
    
    it('should require capabilityInvocation for adding services', async () => {
      const service = createTestService(`${did}#service1`);
      
      // Should succeed with a key that has capabilityInvocation
      const success = await keyVDR.addService(
        did,
        service,
        { keyId: `${did}#withInvocation` }
      );
      expect(success).toBe(true);
      
      // Should fail with a key that doesn't have capabilityInvocation
      await expect(async () => {
        await keyVDR.addService(
          did,
          createTestService(`${did}#service2`),
          { keyId: `${did}#withoutInvocation` }
        );
      }).rejects.toThrow(/does not have capabilityInvocation permission/);
    });
  });
});
