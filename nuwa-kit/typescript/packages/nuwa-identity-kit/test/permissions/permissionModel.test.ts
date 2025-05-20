import { NuwaIdentityKit } from '../../src';
import { KeyVDR } from '../../src/vdr/keyVDR';
import { DIDDocument, VerificationRelationship } from '../../src/types';
import { 
  createMockPrivateKey,
  MockSigner
} from '../helpers/testUtils';

describe('NuwaIdentityKit - Relationship Management and Permissions', () => {
  let identityKit: NuwaIdentityKit;
  let keyVDR: KeyVDR;
  let didDocument: DIDDocument;
  let masterKeyId: string;
  let did: string;
  
  beforeEach(async () => {
    // Create a test master identity
    const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
    didDocument = identity.didDocument;
    masterKeyId = identity.masterKeyId;
    did = identity.did;
    
    // Create a KeyVDR and reset it for test isolation
    keyVDR = new KeyVDR();
    keyVDR.reset();
    
    // Create the NuwaIdentityKit instance
    identityKit = new NuwaIdentityKit(didDocument, {
      operationalPrivateKeys: new Map([[masterKeyId, identity.masterPrivateKey]]),
      vdrs: [keyVDR]
    });
    
    // Publish the document
    await identityKit.publishDIDDocument();
  });
  
  describe('Verification Method Relationships', () => {
    it('should update relationships for a verification method', async () => {
      // First add a key
      const keyInfo = {
        idFragment: 'relationship-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKeyAndPublish(
        keyInfo,
        ['authentication'], // Initially only has authentication
        masterKeyId
      );
      
      // Now update the relationships
      const updated = await identityKit.updateRelationships(
        keyId,
        ['assertionMethod', 'capabilityInvocation'], // Add these
        [], // Don't remove any
        masterKeyId
      );
      
      expect(updated).toBe(true);
      
      // Check that the relationships were updated
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.authentication!.includes(keyId)).toBe(true); // Still has authentication
      expect(resolved!.assertionMethod!.includes(keyId)).toBe(true); // Added assertionMethod
      expect(resolved!.capabilityInvocation!.includes(keyId)).toBe(true); // Added capabilityInvocation
    });
    
    it('should both add and remove relationships in one operation', async () => {
      // First add a key with multiple relationships
      const keyInfo = {
        idFragment: 'multi-rel-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKeyAndPublish(
        keyInfo,
        ['authentication', 'assertionMethod'], // Initially has these
        masterKeyId
      );
      
      // Now update the relationships
      const updated = await identityKit.updateRelationships(
        keyId,
        ['capabilityInvocation'], // Add this
        ['authentication'], // Remove this
        masterKeyId
      );
      
      expect(updated).toBe(true);
      
      // Check that the relationships were updated correctly
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.authentication!.includes(keyId)).toBe(false); // Removed
      expect(resolved!.assertionMethod!.includes(keyId)).toBe(true); // Unchanged
      expect(resolved!.capabilityInvocation!.includes(keyId)).toBe(true); // Added
    });
  });
  
  describe('Permission Model Testing', () => {
    let delegationKeyId: string;
    let invocationKeyId: string;
    let noPermissionKeyId: string;
    
    beforeEach(async () => {
      // Add keys with different permissions
      // 1. A key with capabilityDelegation
      const delegationKeyInfo = {
        idFragment: 'delegation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([5, 6, 7, 8])
      };
      
      delegationKeyId = await identityKit.addOperationalKeyAndPublish(
        delegationKeyInfo,
        ['capabilityDelegation'],
        masterKeyId
      );
      
      // 2. A key with capabilityInvocation
      const invocationKeyInfo = {
        idFragment: 'invocation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([9, 10, 11, 12])
      };
      
      invocationKeyId = await identityKit.addOperationalKeyAndPublish(
        invocationKeyInfo,
        ['capabilityInvocation'],
        masterKeyId
      );
      
      // 3. A key with no special permissions
      const noPermissionKeyInfo = {
        idFragment: 'no-permission-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([13, 14, 15, 16])
      };
      
      noPermissionKeyId = await identityKit.addOperationalKeyAndPublish(
        noPermissionKeyInfo,
        ['authentication'], // Only authentication, no delegation or invocation
        masterKeyId
      );
      
      // Create an external signer with all keys
      const mockSigner = new MockSigner();
      mockSigner.addKey(masterKeyId, (identityKit as any).operationalPrivateKeys.get(masterKeyId));
      mockSigner.addKey(delegationKeyId, createMockPrivateKey());
      mockSigner.addKey(invocationKeyId, createMockPrivateKey());
      mockSigner.addKey(noPermissionKeyId, createMockPrivateKey());
      
      // Replace the identity kit instance with one using the external signer
      identityKit = new NuwaIdentityKit((identityKit as any).didDocument, {
        externalSigner: mockSigner,
        vdrs: [keyVDR]
      });
    });
    
    it('should allow key operations with capabilityDelegation permission', async () => {
      // Try to add a key using the delegation key
      const newKeyInfo = {
        idFragment: 'new-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([17, 18, 19, 20])
      };
      
      // Should succeed with delegationKeyId
      const keyId = await identityKit.addOperationalKeyAndPublish(
        newKeyInfo,
        ['authentication'],
        delegationKeyId
      );
      
      expect(keyId).toEqual(`${did}#new-key`);
    });
    
    it('should not allow key operations without capabilityDelegation permission', async () => {
      // Try to add a key using a key without delegation permission
      const newKeyInfo = {
        idFragment: 'fail-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([21, 22, 23, 24])
      };
      
      // Should fail with invocationKeyId (has invocation but no delegation)
      await expect(async () => {
        await identityKit.addOperationalKeyAndPublish(
          newKeyInfo,
          ['authentication'],
          invocationKeyId
        );
      }).rejects.toThrow(/does not have capabilityDelegation permission/);
      
      // Should also fail with noPermissionKeyId
      await expect(async () => {
        await identityKit.addOperationalKeyAndPublish(
          newKeyInfo,
          ['authentication'],
          noPermissionKeyId
        );
      }).rejects.toThrow(/does not have capabilityDelegation permission/);
    });
    
    it('should allow service operations with capabilityInvocation permission', async () => {
      // Try to add a service using the invocation key
      const serviceInfo = {
        idFragment: 'test-service',
        type: 'TestService',
        serviceEndpoint: 'https://example.com/service'
      };
      
      // Should succeed with invocationKeyId
      const serviceId = await identityKit.addServiceAndPublish(
        serviceInfo,
        invocationKeyId
      );
      
      expect(serviceId).toEqual(`${did}#test-service`);
    });
    
    it('should not allow service operations without capabilityInvocation permission', async () => {
      // Try to add a service using a key without invocation permission
      const serviceInfo = {
        idFragment: 'fail-service',
        type: 'FailService',
        serviceEndpoint: 'https://example.com/fail'
      };
      
      // Should fail with delegationKeyId (has delegation but no invocation)
      await expect(async () => {
        await identityKit.addServiceAndPublish(
          serviceInfo,
          delegationKeyId
        );
      }).rejects.toThrow(/does not have capabilityInvocation permission/);
      
      // Should also fail with noPermissionKeyId
      await expect(async () => {
        await identityKit.addServiceAndPublish(
          serviceInfo,
          noPermissionKeyId
        );
      }).rejects.toThrow(/does not have capabilityInvocation permission/);
    });
    
    it('should require capabilityDelegation for relationship updates', async () => {
      // Try to update relationships using different keys
      
      // Should succeed with delegationKeyId
      const successUpdate = await identityKit.updateRelationships(
        noPermissionKeyId,
        ['assertionMethod'],
        [],
        delegationKeyId
      );
      
      expect(successUpdate).toBe(true);
      
      // Should fail with invocationKeyId
      await expect(async () => {
        await identityKit.updateRelationships(
          noPermissionKeyId,
          ['capabilityInvocation'],
          [],
          invocationKeyId
        );
      }).rejects.toThrow(/does not have capabilityDelegation permission/);
      
      // Should also fail with noPermissionKeyId
      await expect(async () => {
        await identityKit.updateRelationships(
          noPermissionKeyId,
          ['capabilityInvocation'],
          [],
          noPermissionKeyId
        );
      }).rejects.toThrow(/does not have capabilityDelegation permission/);
    });
  });
});
