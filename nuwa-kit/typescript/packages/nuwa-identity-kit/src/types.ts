// Using the DOM's JsonWebKey interface directly
// No need to redefine it here, TypeScript already knows about it
// from lib.dom.d.ts when "lib": ["dom"] is in tsconfig.json

export interface VerificationMethod {
  id: string; // e.g., did:example:alice#key-1
  type: string; // e.g., Ed25519VerificationKey2020 or EcdsaSecp256k1VerificationKey2019
  controller: string; // DID of the controller
  publicKeyMultibase?: string; // Base64 URL encoded public key
  publicKeyJwk?: JsonWebKey; // JWK format public key
  blockchainAccountId?: string; // For on-chain keys, e.g., an account ID or address
  expires?: string; // ISO 8601 datetime string, e.g., 2025-12-31T23:59:59Z
}

export interface ServiceEndpoint {
  id: string; // e.g., did:example:alice#llm-gateway
  type: string; // Standardized service type, e.g., LLMGatewayNIP9
  serviceEndpoint: string; // URL of the service
  [key: string]: any; // Allows for additional service-specific properties
}

export interface DIDDocument {
  '@context': string | string[];
  id: string; // The DID itself
  controller?: string | string[]; // DID(s) of the controller(s)
  verificationMethod?: VerificationMethod[];
  authentication?: (string | VerificationMethod)[]; // Array of verification method IDs or embedded verification methods
  assertionMethod?: (string | VerificationMethod)[];
  keyAgreement?: (string | VerificationMethod)[];
  capabilityInvocation?: (string | VerificationMethod)[];
  capabilityDelegation?: (string | VerificationMethod)[];
  service?: ServiceEndpoint[];
  [key: string]: any; // Allows for additional properties
}

// As per NIP-1 Signature Structure Specification
export interface SignedData {
  operation: string;
  params: Record<string, any>;
  nonce: string;
  timestamp: number; // Unix timestamp
}

export interface NIP1Signature {
  signer_did: string;
  key_id: string; // The id of the verificationMethod used for signing
  value: string; // The signature value, typically hex or base64 encoded
}

export interface NIP1SignedObject {
  signed_data: SignedData;
  signature: NIP1Signature;
}

/**
 * Represents the information needed to create a new operational key.
 */
export interface OperationalKeyInfo {
  idFragment?: string; // Optional fragment for the key id (e.g., 'key-2'). If not provided, one might be generated.
  type: string; // Cryptographic suite of the key, e.g., Ed25519VerificationKey2020
  publicKeyMaterial: Uint8Array | JsonWebKey; // The public key material
  controller?: string; // Defaults to the master DID if not provided
  expires?: string; // Optional expiration timestamp
}

/**
 * Represents the information needed to add a new service to the DID document.
 */
export interface ServiceInfo {
  idFragment: string; // Fragment for the service id, e.g., 'my-service'
  type: string; // Standardized service type
  serviceEndpoint: string; // URL of the service
  additionalProperties?: Record<string, any>; // Other service-specific metadata
}

/**
 * Options for creating a master DID.
 */
export interface CreateMasterIdentityOptions {
  method?: string; // e.g., 'key', 'web', or a future chain-specific method like 'rooch'
  // Additional options specific to the DID method can be added here
  initialOperationalKey?: {
    publicKeyMaterial: Uint8Array | JsonWebKey;
    type: string; // e.g., Ed25519VerificationKey2020
    relationships?: VerificationRelationship[];
  };
}

export type VerificationRelationship = 
  | 'authentication' 
  | 'assertionMethod' 
  | 'keyAgreement' 
  | 'capabilityInvocation' 
  | 'capabilityDelegation';

/**
 * Result of creating a master identity.
 */
export interface MasterIdentity {
  did: string;
  didDocument: DIDDocument;
  masterKeyId: string; // ID of the primary master key in verificationMethod
  masterPrivateKey: CryptoKey | Uint8Array; // The private key material for the master key
}
