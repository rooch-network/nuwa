import { NuwaIdentityKit } from '../../src';
import { KeyVDR } from '../../src/vdr/keyVDR';
import { DIDDocument, ServiceEndpoint } from '../../src/types';
import { 
  createTestDIDDocument, 
  createTestService,
  createMockPrivateKey,
  MockSigner
} from '../helpers/testUtils';

describe('NuwaIdentityKit - Service Management', () => {
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
  
  describe('Local Service Management', () => {
    it('should add a service to the local document', () => {
      const serviceInfo = {
        idFragment: 'test-service',
        type: 'TestService',
        serviceEndpoint: 'https://example.com/service'
      };
      
      const serviceId = identityKit.addService(serviceInfo);
      
      expect(serviceId).toEqual(`${did}#test-service`);
      
      // Check that it was added to the local document
      const updatedDoc = (identityKit as any).didDocument;
      expect(updatedDoc.service).toBeDefined();
      expect(updatedDoc.service!.some((s: ServiceEndpoint) => s.id === serviceId)).toBe(true);
    });
    
    it('should remove a service from the local document', () => {
      // First add a service
      const serviceInfo = {
        idFragment: 'test-service',
        type: 'TestService',
        serviceEndpoint: 'https://example.com/service'
      };
      
      const serviceId = identityKit.addService(serviceInfo);
      
      // Now remove it
      identityKit.removeService(serviceId);
      
      // Check that it was removed from the local document
      const updatedDoc = (identityKit as any).didDocument;
      expect(updatedDoc.service!.some((s: ServiceEndpoint) => s.id === serviceId)).toBe(false);
    });
    
    it('should support service with additional properties', () => {
      const serviceInfo = {
        idFragment: 'complex-service',
        type: 'ComplexService',
        serviceEndpoint: 'https://example.com/complex',
        additionalProperties: {
          description: 'A complex service with additional properties',
          version: '1.0.0',
          protocols: ['https', 'wss']
        }
      };
      
      const serviceId = identityKit.addService(serviceInfo);
      
      // Check that it was added with all properties
      const updatedDoc = (identityKit as any).didDocument;
      const service = updatedDoc.service!.find((s: ServiceEndpoint) => s.id === serviceId);
      
      expect(service).toBeDefined();
      expect(service.description).toEqual('A complex service with additional properties');
      expect(service.version).toEqual('1.0.0');
      expect(service.protocols).toEqual(['https', 'wss']);
    });
  });
  
  describe('Service Publication', () => {
    it('should publish a service addition', async () => {
      const serviceInfo = {
        idFragment: 'published-service',
        type: 'PublishedService',
        serviceEndpoint: 'https://example.com/published'
      };
      
      const serviceId = await identityKit.addServiceAndPublish(
        serviceInfo,
        masterKeyId
      );
      
      expect(serviceId).toEqual(`${did}#published-service`);
      
      // Check that it was published to the VDR
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.service).toBeDefined();
      expect(resolved!.service!.some(s => s.id === serviceId)).toBe(true);
    });
    
    it('should publish a service removal', async () => {
      // First add and publish a service
      const serviceInfo = {
        idFragment: 'to-remove',
        type: 'RemovableService',
        serviceEndpoint: 'https://example.com/removable'
      };
      
      const serviceId = await identityKit.addServiceAndPublish(
        serviceInfo,
        masterKeyId
      );
      
      // Now remove it
      const removed = await identityKit.removeServiceAndPublish(
        serviceId,
        masterKeyId
      );
      
      expect(removed).toBe(true);
      
      // Check that it was removed from the published document
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.service == null || resolved!.service!.every(s => s.id !== serviceId)).toBe(true);
    });
    
    it('should handle publication failure', async () => {
      // Mock the KeyVDR to simulate failure
      const originalAddService = keyVDR.addService;
      keyVDR.addService = jest.fn().mockResolvedValue(false);
      
      const serviceInfo = {
        idFragment: 'failing-service',
        type: 'FailingService',
        serviceEndpoint: 'https://example.com/failing'
      };
      
      // Attempt to add the service should throw
      await expect(async () => {
        await identityKit.addServiceAndPublish(
          serviceInfo,
          masterKeyId
        );
      }).rejects.toThrow(/Failed to publish service/);
      
      // Verify the service was not added to the local document
      const localDoc = (identityKit as any).didDocument;
      expect(localDoc.service == null || localDoc.service.every((s: ServiceEndpoint) => s.id !== `${did}#failing-service`)).toBe(true);
      
      // Restore the original method
      keyVDR.addService = originalAddService;
    });
    
    it('should require the key to have capabilityInvocation permission', async () => {
      // Create a document with a key that has capabilityDelegation but not capabilityInvocation
      const identity = await NuwaIdentityKit.createMasterIdentity({ method: 'key' });
      
      // Create a new key without capabilityInvocation
      const delegationOnlyKeyId = `${identity.did}#delegation-only`;
      
      // Add the key to the document without capabilityInvocation
      identity.didDocument.verificationMethod!.push({
        id: delegationOnlyKeyId,
        type: 'Ed25519VerificationKey2020',
        controller: identity.did,
        publicKeyMultibase: 'zDelegationOnlyKey'
      });
      identity.didDocument.capabilityDelegation!.push(delegationOnlyKeyId);
      // Note: Not adding to capabilityInvocation
      
      // Create a new identity kit with this document
      const mockSigner = new MockSigner();
      mockSigner.addKey(delegationOnlyKeyId, createMockPrivateKey());
      mockSigner.addKey(identity.masterKeyId, identity.masterPrivateKey);
      
      const testKit = new NuwaIdentityKit(identity.didDocument, {
        externalSigner: mockSigner,
        vdrs: [keyVDR]
      });
      
      // Publish the document
      await testKit.publishDIDDocument();
      
      // Try to add a service using the delegation-only key
      const serviceInfo = {
        idFragment: 'permission-test',
        type: 'PermissionTestService',
        serviceEndpoint: 'https://example.com/permission-test'
      };
      
      // Should throw because the key doesn't have capabilityInvocation
      await expect(async () => {
        await testKit.addServiceAndPublish(
          serviceInfo,
          delegationOnlyKeyId
        );
      }).rejects.toThrow(/does not have capabilityInvocation permission/);
    });
  });
  
  describe('Multiple Services Management', () => {
    it('should handle multiple services', async () => {
      // Add several services
      const serviceInfos = [
        {
          idFragment: 'service1',
          type: 'Service1',
          serviceEndpoint: 'https://example.com/service1'
        },
        {
          idFragment: 'service2',
          type: 'Service2',
          serviceEndpoint: 'https://example.com/service2'
        },
        {
          idFragment: 'service3',
          type: 'Service3',
          serviceEndpoint: 'https://example.com/service3'
        }
      ];
      
      const serviceIds = await Promise.all(
        serviceInfos.map(info => identityKit.addServiceAndPublish(info, masterKeyId))
      );
      
      // Check all services were added
      const resolved = await keyVDR.resolve(did);
      expect(resolved!.service).toBeDefined();
      expect(resolved!.service!.length).toEqual(3);
      
      // Remove one service
      await identityKit.removeServiceAndPublish(serviceIds[1], masterKeyId);
      
      // Check that only the specified service was removed
      const afterRemoval = await keyVDR.resolve(did);
      expect(afterRemoval!.service!.length).toEqual(2);
      expect(afterRemoval!.service!.some(s => s.id === serviceIds[0])).toBe(true);
      expect(afterRemoval!.service!.some(s => s.id === serviceIds[1])).toBe(false);
      expect(afterRemoval!.service!.some(s => s.id === serviceIds[2])).toBe(true);
    });
  });
});
