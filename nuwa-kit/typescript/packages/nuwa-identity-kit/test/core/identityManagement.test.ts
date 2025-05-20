import { NuwaIdentityKit } from '../../src';
import { KeyVDR } from '../../src/vdr/keyVDR';
import { DIDDocument, VerificationMethod, VerificationRelationship } from '../../src/types';
import { 
  createTestDIDDocument, 
  createTestVerificationMethod, 
  createTestService,
  createMockPrivateKey,
  MockSigner,
  createTestOptionsWithSigner
} from '../helpers/testUtils';

// Create a mock implementation of SignerInterface for testing
class MockExternalSigner extends MockSigner {
  constructor(keys?: Map<string, Uint8Array>) {
    super(keys);
  }

  // Explicitly add the addKey method to make TypeScript happy
  addKey(keyId: string, privateKey: Uint8Array | CryptoKey): void {
    super.addKey(keyId, privateKey);
  }
}

describe('NuwaIdentityKit', () => {
  describe('Master Identity Creation', () => {
    it('should create a new master identity with a key method', async () => {
      const identity = await NuwaIdentityKit.createMasterIdentity({
        method: 'key'
      });
      
      expect(identity).toBeDefined();
      expect(identity.did).toMatch(/^did:key:/);
      expect(identity.didDocument).toBeDefined();
      expect(identity.didDocument.id).toEqual(identity.did);
      expect(identity.masterKeyId).toBeDefined();
      expect(identity.masterKeyId).toContain(identity.did);
      expect(identity.masterPrivateKey).toBeDefined();
      
      // Check that the DID document has the expected verification relationships
      expect(identity.didDocument.verificationMethod).toBeDefined();
      expect(identity.didDocument.verificationMethod!.length).toBeGreaterThan(0);
      expect(identity.didDocument.authentication).toContain(identity.masterKeyId);
      expect(identity.didDocument.assertionMethod).toContain(identity.masterKeyId);
      expect(identity.didDocument.capabilityInvocation).toContain(identity.masterKeyId);
      expect(identity.didDocument.capabilityDelegation).toContain(identity.masterKeyId);
    });
    
    it('should allow custom key curve selection', async () => {
      const identity = await NuwaIdentityKit.createMasterIdentity({
        method: 'key',
        keyCurve: 'secp256k1'
      });
      
      expect(identity).toBeDefined();
      expect(identity.did).toMatch(/^did:key:/);
      
      // Check that the key type is correct for secp256k1
      const verificationMethod = identity.didDocument.verificationMethod?.[0];
      expect(verificationMethod).toBeDefined();
      expect(verificationMethod!.type).toEqual('EcdsaSecp256k1VerificationKey2019');
    });
    
    it('should support custom key ID fragment', async () => {
      const customIdFragment = 'my-custom-key';
      const identity = await NuwaIdentityKit.createMasterIdentity({
        method: 'key',
        masterKeyIdFragment: customIdFragment
      });
      
      expect(identity).toBeDefined();
      expect(identity.masterKeyId).toContain(customIdFragment);
    });
  });
  
  describe('Instance Creation and VDR Registration', () => {
    let didDocument: DIDDocument;
    let masterKeyId: string;
    let masterPrivateKey: CryptoKey | Uint8Array;
    
    beforeEach(async () => {
      // Create a test master identity
      const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
      didDocument = identity.didDocument;
      masterKeyId = identity.masterKeyId;
      masterPrivateKey = identity.masterPrivateKey;
    });
    
    it('should create an instance with the document and private key', () => {
      const identityKit = new NuwaIdentityKit(didDocument, {
        operationalPrivateKeys: new Map([[masterKeyId, masterPrivateKey]])
      });
      
      expect(identityKit).toBeDefined();
      // Test that the instance has the correct document
      expect((identityKit as any).didDocument).toEqual(didDocument);
    });
    
    it('should create an instance with the document and external signer', () => {
      const mockSigner = new MockExternalSigner();
      mockSigner.addKey(masterKeyId, masterPrivateKey);
      
      const identityKit = new NuwaIdentityKit(didDocument, {
        externalSigner: mockSigner
      });
      
      expect(identityKit).toBeDefined();
      // Test that the instance has the correct document and external signer
      expect((identityKit as any).didDocument).toEqual(didDocument);
      expect((identityKit as any).externalSigner).toBe(mockSigner);
    });
    
    it('should register VDRs', () => {
      const keyVDR = new KeyVDR();
      
      const identityKit = new NuwaIdentityKit(didDocument, {
        operationalPrivateKeys: new Map([[masterKeyId, masterPrivateKey]]),
        vdrs: [keyVDR]
      });
      
      expect(identityKit).toBeDefined();
      // Test that the VDR was registered
      expect((identityKit as any).vdrRegistry.get('key')).toBe(keyVDR);
    });
    
    it('should throw if no private key or external signer is provided', () => {
      expect(() => {
        new NuwaIdentityKit(didDocument, {});
      }).toThrow(/must provide either operationalPrivateKeys or externalSigner/);
    });
  });
  
  describe('DID Document Publishing', () => {
    let identityKit: NuwaIdentityKit;
    let keyVDR: KeyVDR;
    let didDocument: DIDDocument;
    let masterKeyId: string;
    
    beforeEach(async () => {
      // Create a test master identity
      const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
      didDocument = identity.didDocument;
      masterKeyId = identity.masterKeyId;
      
      // Create a KeyVDR and reset it for test isolation
      keyVDR = new KeyVDR();
      keyVDR.reset();
      
      // Create the NuwaIdentityKit instance
      identityKit = new NuwaIdentityKit(didDocument, {
        operationalPrivateKeys: new Map([[masterKeyId, identity.masterPrivateKey]]),
        vdrs: [keyVDR]
      });
    });
    
    it('should publish the DID document', async () => {
      const published = await identityKit.publishDIDDocument();
      expect(published).toBe(true);
      
      // Check that it was published to the VDR
      const resolved = await keyVDR.resolve(didDocument.id);
      expect(resolved).toEqual(didDocument);
    });
    
    it('should check if a DID already exists', async () => {
      // First, the DID doesn't exist
      let exists = await identityKit.didExists(didDocument.id);
      expect(exists).toBe(false);
      
      // Publish the document
      await identityKit.publishDIDDocument();
      
      // Now the DID should exist
      exists = await identityKit.didExists(didDocument.id);
      expect(exists).toBe(true);
    });
    
    it("should only publish if the DID does not exist", async () => {
      // First time should publish
      const published1 = await identityKit.createAndPublishIfNotExists();
      expect(published1).toBe(true);
      
      // Second time should not publish (already exists)
      const published2 = await identityKit.createAndPublishIfNotExists();
      expect(published2).toBe(false);
    });
  });
  
  describe('Operational Key Management', () => {
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
    
    it('should add an operational key to the local document', async () => {
      const keyInfo = {
        idFragment: 'operation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKey(keyInfo, ['authentication']);
      
      expect(keyId).toEqual(`${did}#operation-key`);
      
      // Check that it was added to the local document
      const updatedDoc = (identityKit as any).didDocument;
      expect(updatedDoc.verificationMethod!.some((vm: VerificationMethod) => vm.id === keyId)).toBe(true);
      expect(updatedDoc.authentication!.includes(keyId)).toBe(true);
    });
    
    it('should publish an operational key update', async () => {
      // 确保每次测试前都重置KeyVDR，避免其他测试的干扰
      keyVDR.reset();
      
      const keyInfo = {
        idFragment: 'operation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKeyAndPublish(
        keyInfo,
        ['authentication'],
        masterKeyId
      );
      
      expect(keyId).toEqual(`${did}#operation-key`);
      
      // Check that it was published to the VDR
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.verificationMethod!.some((vm: VerificationMethod) => vm.id === keyId)).toBe(true);
      expect(resolved!.authentication!.includes(keyId)).toBe(true);
    });
    
    it('should remove an operational key from the local document', async () => {
      // First add a key
      const keyInfo = {
        idFragment: 'operation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKey(keyInfo, ['authentication']);
      
      // Now remove it
      identityKit.removeOperationalKey(keyId);
      
      // Check that it was removed from the local document
      const updatedDoc = (identityKit as any).didDocument;
      expect(updatedDoc.verificationMethod!.some((vm: VerificationMethod) => vm.id === keyId)).toBe(false);
      expect(updatedDoc.authentication!.includes(keyId)).toBe(false);
    });
    
    it('should publish an operational key removal', async () => {
      // First add and publish a key
      const keyInfo = {
        idFragment: 'operation-key',
        type: 'Ed25519VerificationKey2020',
        publicKeyMaterial: new Uint8Array([1, 2, 3, 4])
      };
      
      const keyId = await identityKit.addOperationalKeyAndPublish(
        keyInfo,
        ['authentication'],
        masterKeyId
      );
      
      // Now remove it
      const removed = await identityKit.removeOperationalKeyAndPublish(
        keyId,
        masterKeyId
      );
      
      expect(removed).toBe(true);
      
      // Check that it was removed from the published document
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.verificationMethod!.some((vm: VerificationMethod) => vm.id === keyId)).toBe(false);
      expect(resolved!.authentication!.includes(keyId)).toBe(false);
    });
  });
});
