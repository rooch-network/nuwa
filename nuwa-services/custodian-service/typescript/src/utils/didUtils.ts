import { 
  CUSTODIAN_DID, 
  CUSTODIAN_SERVICE_NAME, 
  CUSTODIAN_SERVICE_ENDPOINT, 
  SUPPORTED_AUTH_METHODS 
} from '../config';
import type { DIDDocument, Service } from '../types';

/**
 * Generate Custodian DID Document
 * Based on NIP-3 specification, includes CustodianServiceNIP3 service
 */
export function generateCustodianDIDDocument(): DIDDocument {
  const custodianService: Service = {
    id: `${CUSTODIAN_DID}#custodian-service`,
    type: 'CustodianServiceNIP3',
    serviceEndpoint: CUSTODIAN_SERVICE_ENDPOINT,
    metadata: {
      name: CUSTODIAN_SERVICE_NAME,
      auth_methods: SUPPORTED_AUTH_METHODS
    }
  };

  return {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: CUSTODIAN_DID,
    service: [custodianService]
  };
}

/**
 * Create Agent DID Document
 * @param agentDID Agent's DID identifier
 * @param controller Controller's DID
 * @param devicePublicKey User device's public key
 */
export function generateAgentDIDDocument(
  agentDID: string, 
  controller: string, 
  devicePublicKey: string
): DIDDocument {
  const deviceKeyId = `${agentDID}#device-key`;
  
  return {
    '@context': 'https://www.w3.org/ns/did/v1',
    id: agentDID,
    controller,
    verificationMethod: [
      {
        id: deviceKeyId,
        type: 'Ed25519VerificationKey2020', // Assuming Ed25519 key type
        controller: agentDID,
        publicKeyMultibase: devicePublicKey // Assuming multibase format
      }
    ],
    authentication: [deviceKeyId]
  };
}

/**
 * Compute a hash of the user identifier (for privacy protection)
 * @param provider Identity provider (e.g., 'google', 'github', etc.)
 * @param userIdentifier User identifier (e.g., email, ID, etc.)
 */
export function computeUserIdentifierHash(provider: string, userIdentifier: string): string {
  // Actual implementation should use a secure hashing algorithm, like SHA-256
  // This is just an example
  return `${provider}:${userIdentifier}`; // Note: Replace with a real hash function in actual use
}

/**
 * Generate Agent DID identifier
 * Note: Actual implementation will be created on-chain
 */
export function generateAgentDIDIdentifier(): string {
  // This is just an example, actual implementation should integrate with on-chain DID creation
  const uuid = crypto.randomUUID();
  return `did:rooch:agent:${uuid}`;
} 