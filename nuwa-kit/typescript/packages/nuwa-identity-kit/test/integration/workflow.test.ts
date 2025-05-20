import { NuwaIdentityKit } from '../../src';
import { KeyVDR } from '../../src/vdr/keyVDR';
import { DIDDocument, ServiceEndpoint, VerificationMethod } from '../../src/types';
import { 
  createMockPrivateKey,
  MockSigner
} from '../helpers/testUtils';

describe('NuwaIdentityKit - Workflow Integration Tests', () => {
  describe('Complete Identity Lifecycle', () => {
    // Create a fresh KeyVDR for each test
    let keyVDR: KeyVDR;
    
    beforeEach(() => {
      keyVDR = new KeyVDR();
      keyVDR.reset();
    });
    
    it('should handle a complete identity lifecycle workflow', async () => {
      // Step 1: Create a master identity
      const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
      const did = identity.did;
      const masterKeyId = identity.masterKeyId;
      
      const identityKit = new NuwaIdentityKit(identity.didDocument, {
        operationalPrivateKeys: new Map([[masterKeyId, identity.masterPrivateKey]]),
        vdrs: [keyVDR]
      });
      
      // Step 3: Publish the initial DID document
      await identityKit.publishDIDDocument();
      
      // Verify initial state
      let currentDoc = await keyVDR.resolve(did);
      expect(currentDoc).toBeDefined();
      expect(currentDoc!.id).toEqual(did);
      expect(currentDoc!.verificationMethod!.length).toEqual(1);
      expect(currentDoc!.service).toBeUndefined();
      
      // Step 4: Add an operational key
      const authKeyInfo = {
        idFragment: 'auth-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const authKeyId = await identityKit.addOperationalKeyAndPublish(
        authKeyInfo,
        ['authentication'],
        masterKeyId
      );
      
      // Verify the key was added
      currentDoc = await keyVDR.resolve(did);
      expect(currentDoc!.verificationMethod!.length).toEqual(2);
      expect(currentDoc!.authentication!.includes(authKeyId)).toBe(true);
      
      // Step 5: Add a service
      const serviceInfo = {
        idFragment: 'messaging',
        type: 'MessagingService',
        serviceEndpoint: 'https://example.com/messaging',
        additionalProperties: {
          description: 'A secure messaging service',
          protocols: ['https', 'wss']
        }
      };
      
      const serviceId = await identityKit.addServiceAndPublish(
        serviceInfo,
        masterKeyId
      );
      
      // Verify the service was added
      currentDoc = await keyVDR.resolve(did);
      expect(currentDoc!.service!.length).toEqual(1);
      expect(currentDoc!.service![0].id).toEqual(serviceId);
      
      // Step 6: Add a delegation key
      const delegationKeyInfo = {
        idFragment: 'delegation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([5, 6, 7, 8])
      };
      
      const delegationKeyId = await identityKit.addOperationalKeyAndPublish(
        delegationKeyInfo,
        ['capabilityDelegation'],
        masterKeyId
      );
      
      // Step 7: Use the delegation key to add another key
      // First set up a new signer with both keys
      const mockSigner = new MockSigner();
      mockSigner.addKey(masterKeyId, identity.masterPrivateKey);
      mockSigner.addKey(delegationKeyId, createMockPrivateKey());
      
      // Create a new identity kit with the external signer
      const identityKit2 = new NuwaIdentityKit((identityKit as any).didDocument, {
        externalSigner: mockSigner,
        vdrs: [keyVDR]
      });
      
      // Add a new key using the delegation key
      const newKeyInfo = {
        idFragment: 'new-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([9, 10, 11, 12])
      };
      
      const newKeyId = await identityKit2.addOperationalKeyAndPublish(
        newKeyInfo,
        ['authentication', 'assertionMethod'],
        delegationKeyId // Using the delegation key, not the master key
      );
      
      // Verify the key was added
      currentDoc = await keyVDR.resolve(did);
      expect(currentDoc!.verificationMethod!.length).toEqual(4);
      expect(currentDoc!.authentication!.includes(newKeyId)).toBe(true);
      expect(currentDoc!.assertionMethod!.includes(newKeyId)).toBe(true);
      
      // Step 8: Update relationships for a key
      await identityKit2.updateRelationships(
        newKeyId,
        ['capabilityInvocation'], // Add this
        ['authentication'], // Remove this
        delegationKeyId // Again using the delegation key
      );
      
      // Verify the relationships were updated
      currentDoc = await keyVDR.resolve(did);
      expect(currentDoc!.authentication!.includes(newKeyId)).toBe(false); // Removed
      expect(currentDoc!.assertionMethod!.includes(newKeyId)).toBe(true); // Unchanged
      expect(currentDoc!.capabilityInvocation!.includes(newKeyId)).toBe(true); // Added
      
      // Step 9: Remove a service
      await identityKit2.removeServiceAndPublish(
        serviceId,
        masterKeyId // Need to use master key as it has capabilityInvocation
      );
      
      // Verify the service was removed
      currentDoc = await keyVDR.resolve(did);
      expect(currentDoc!.service!.length).toEqual(0);
      
      // Step 10: Remove a key
      await identityKit2.removeOperationalKeyAndPublish(
        authKeyId,
        delegationKeyId // Using delegation key to remove another key
      );
      
      // Verify the key was removed
      currentDoc = await keyVDR.resolve(did);
      const verificationMethods = currentDoc!.verificationMethod!;
      expect(verificationMethods.length).toEqual(3);
      expect(verificationMethods.every(vm => vm.id !== authKeyId)).toBe(true);
    });
  });
  
  describe('Edge Case: Error Handling', () => {
    let identityKit: NuwaIdentityKit;
    let keyVDR: KeyVDR;
    let did: string;
    let masterKeyId: string;
    
    beforeEach(async () => {
      // Set up a basic identity
      const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
      did = identity.did;
      masterKeyId = identity.masterKeyId;
      
      keyVDR = new KeyVDR();
      keyVDR.reset();
      
      identityKit = new NuwaIdentityKit(identity.didDocument, {
        operationalPrivateKeys: new Map([[masterKeyId, identity.masterPrivateKey]]),
        vdrs: [keyVDR]
      });
      
      await identityKit.publishDIDDocument();
    });
    
    it('should handle removing a key that does not exist', async () => {
      const nonExistentKeyId = `${did}#non-existent`;
      
      await expect(async () => {
        await identityKit.removeOperationalKeyAndPublish(
          nonExistentKeyId,
          masterKeyId
        );
      }).rejects.toThrow(/not found in local document/);
    });
    
    it('should handle removing a service that does not exist', async () => {
      const nonExistentServiceId = `${did}#non-existent-service`;
      
      await expect(async () => {
        await identityKit.removeServiceAndPublish(
          nonExistentServiceId,
          masterKeyId
        );
      }).rejects.toThrow(/not found in local document/);
    });
    
    it('should prevent removing the master key', async () => {
      await expect(async () => {
        await identityKit.removeOperationalKeyAndPublish(
          masterKeyId,
          masterKeyId
        );
      }).rejects.toThrow(/primary key/); // The KeyVDR will reject removing the primary key
    });
    
    it('should silently succeed when adding a verification method with an ID that already exists in test mode', async () => {
      // First add a key
      const keyInfo = {
        idFragment: 'duplicate-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      await identityKit.addOperationalKeyAndPublish(
        keyInfo,
        ['authentication'],
        masterKeyId
      );
      
      // Try to add a key with the same ID - should succeed in test mode
      // We need to check added relationships too
      const result = await identityKit.addOperationalKeyAndPublish(
        keyInfo, // Same keyInfo with the same idFragment
        ['assertionMethod'],
        masterKeyId
      );

      expect(result).toEqual(`${did}#duplicate-key`);
      
      // Check that we can still add completely new keys
      const newKeyInfo = {
        idFragment: 'new-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([5, 6, 7, 8])
      };
      
      const newKeyId = await identityKit.addOperationalKeyAndPublish(
        newKeyInfo,
        ['authentication'],
        masterKeyId
      );
      
      expect(newKeyId).toEqual(`${did}#new-key`);
    });
  });
});
