# VDR Implementation Test Helper

This document provides guidance on testing your VDR implementation to ensure it follows the NIP-1 permissions model and the VDR abstraction pattern.

## Test Scenarios

### 1. Initial Document Creation

```typescript
// Test that store() works for initial creation
it('should store a new DID document', async () => {
  const didDocument = createTestDIDDocument('did:test:123');
  const result = await testVDR.store(didDocument);
  expect(result).toBe(true);
  
  // Verify document was stored
  const resolved = await testVDR.resolve('did:test:123');
  expect(resolved).toEqual(didDocument);
});

// Test that store() should not be used for updates
it('should not allow store() for updates', async () => {
  // First store the document
  const didDocument = createTestDIDDocument('did:test:123');
  await testVDR.store(didDocument);
  
  // Now try to update with store() - this should be rejected or throw a warning
  const updatedDocument = {
    ...didDocument,
    service: [{ id: 'did:test:123#service1', type: 'TestService', serviceEndpoint: 'https://example.com' }]
  };
  
  // This should either throw an error or give a warning that store() shouldn't be used for updates
  await expect(testVDR.store(updatedDocument)).rejects.toThrow();
});
```

### 2. Permission Model Tests

```typescript
// Test that capabilityDelegation permission is required for key operations
it('should require capabilityDelegation permission for key operations', async () => {
  // Create a document with two keys - one with capabilityDelegation, one without
  const didDocument = createTestDIDDocumentWithMultipleKeys('did:test:123', {
    withCapabilityDelegation: 'did:test:123#key-1',
    withoutCapabilityDelegation: 'did:test:123#key-2'
  });
  await testVDR.store(didDocument);
  
  // Should succeed when using key with capabilityDelegation
  const newKey = createTestVerificationMethod('did:test:123#key-3');
  const successResult = await testVDR.addVerificationMethod(
    'did:test:123',
    newKey,
    ['authentication'],
    { keyId: 'did:test:123#key-1' }
  );
  expect(successResult).toBe(true);
  
  // Should fail when using key without capabilityDelegation
  const anotherKey = createTestVerificationMethod('did:test:123#key-4');
  await expect(testVDR.addVerificationMethod(
    'did:test:123',
    anotherKey,
    ['authentication'],
    { keyId: 'did:test:123#key-2' }
  )).rejects.toThrow(/does not have capabilityDelegation permission/);
});

// Test that capabilityInvocation permission is required for service operations
it('should require capabilityInvocation permission for service operations', async () => {
  // Create a document with two keys - one with capabilityInvocation, one without
  const didDocument = createTestDIDDocumentWithMultipleKeys('did:test:123', {
    withCapabilityInvocation: 'did:test:123#key-1',
    withoutCapabilityInvocation: 'did:test:123#key-2'
  });
  await testVDR.store(didDocument);
  
  // Should succeed when using key with capabilityInvocation
  const service = createTestService('did:test:123#service-1');
  const successResult = await testVDR.addService(
    'did:test:123',
    service,
    { keyId: 'did:test:123#key-1' }
  );
  expect(successResult).toBe(true);
  
  // Should fail when using key without capabilityInvocation
  const anotherService = createTestService('did:test:123#service-2');
  await expect(testVDR.addService(
    'did:test:123',
    anotherService,
    { keyId: 'did:test:123#key-2' }
  )).rejects.toThrow(/does not have capabilityInvocation permission/);
});

// Test that only current controller can change controller
it('should only allow current controller to change controller', async () => {
  // Create a document with a controller
  const didDocument = createTestDIDDocument('did:test:123');
  await testVDR.store(didDocument);
  
  // Key that belongs to the controller
  const controllerKey = 'did:test:123#master';
  
  // Key that doesn't belong to controller
  const foreignKey = 'did:test:456#master';
  
  // Should succeed when using controller's key
  const successResult = await testVDR.updateController(
    'did:test:123',
    'did:test:789',
    { keyId: controllerKey }
  );
  expect(successResult).toBe(true);
  
  // Should fail when using non-controller key
  await expect(testVDR.updateController(
    'did:test:123',
    'did:test:456',
    { keyId: foreignKey }
  )).rejects.toThrow(/not authorized to update/);
});
```

### 3. Edge Case Tests

```typescript
// Test removal of key that's being used for signing
it('should not allow removing the signing key', async () => {
  // Create a document with a key
  const didDocument = createTestDIDDocument('did:test:123');
  await testVDR.store(didDocument);
  
  // Try to remove the key being used for signing
  const keyId = 'did:test:123#master';
  
  await expect(testVDR.removeVerificationMethod(
    'did:test:123',
    keyId,
    { keyId }
  )).rejects.toThrow(/Cannot remove the key being used for signing/);
});

// Test removal of last key
it('should not allow removing the last key', async () => {
  // Create a document with just one key
  const didDocument = createTestDIDDocument('did:test:123');
  await testVDR.store(didDocument);
  
  // Try to remove the only key
  const keyId = 'did:test:123#master';
  
  await expect(testVDR.removeVerificationMethod(
    'did:test:123',
    keyId,
    { keyId: 'did:test:123#master' }
  )).rejects.toThrow(/Cannot remove the last verification method/);
});

// Test input validation
it('should validate verification method format', async () => {
  // Create a document
  const didDocument = createTestDIDDocument('did:test:123');
  await testVDR.store(didDocument);
  
  // Try to add a method with ID that doesn't match the DID
  const invalidKey = createTestVerificationMethod('did:wrong:456#key-1');
  
  await expect(testVDR.addVerificationMethod(
    'did:test:123',
    invalidKey,
    ['authentication'],
    { keyId: 'did:test:123#master' }
  )).rejects.toThrow(/must start with DID/);
});
```

## Test Helpers

```typescript
// Create a basic test DID document
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

// Create a test DID document with multiple keys and specific capabilities
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

// Create a test verification method
function createTestVerificationMethod(id: string): VerificationMethod {
  const did = id.split('#')[0];
  return {
    id,
    type: 'Ed25519VerificationKey2020',
    controller: did,
    publicKeyMultibase: 'zRandomMultibaseValue'
  };
}

// Create a test service
function createTestService(id: string): ServiceEndpoint {
  return {
    id,
    type: 'TestService',
    serviceEndpoint: 'https://example.com/service'
  };
}
```

## Integration Testing with NuwaIdentityKit

```typescript
it('should follow the VDR pattern with NuwaIdentityKit', async () => {
  // Create a test VDR implementation
  const testVDR = new TestVDR();
  
  // Create a DID document
  const masterIdentity = await NuwaIdentityKit.createMasterIdentity({ method: 'test' });
  
  // Create NuwaIdentityKit instance with the VDR
  const identityKit = new NuwaIdentityKit(masterIdentity.didDocument, {
    vdrs: [testVDR],
    // Include master private key or external signer
  });
  
  // Test initial creation - should succeed
  const initialPublish = await identityKit.publishDIDDocument();
  expect(initialPublish).toBe(true);
  
  // Test the helper method
  const exists = await identityKit.didExists(masterIdentity.did);
  expect(exists).toBe(true);
  
  // Test createAndPublishIfNotExists - should not publish
  const republish = await identityKit.createAndPublishIfNotExists();
  expect(republish).toBe(false); // Already exists
  
  // Test fine-grained operations
  // Add a verification method
  const keyInfo = {
    idFragment: 'newKey',
    type: 'Ed25519VerificationKey2020',
    publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
  };
  const relationships = ['authentication', 'assertionMethod'];
  const newKeyId = await identityKit.addOperationalKeyAndPublish(keyInfo, relationships, masterIdentity.masterKeyId);
  
  expect(newKeyId).toContain(masterIdentity.did);
  
  // Add a service
  const serviceInfo = {
    idFragment: 'testService',
    type: 'TestService',
    serviceEndpoint: 'https://example.com/service'
  };
  const serviceId = await identityKit.addServiceAndPublish(serviceInfo, masterIdentity.masterKeyId);
  expect(serviceId).toContain(masterIdentity.did);
});
```
