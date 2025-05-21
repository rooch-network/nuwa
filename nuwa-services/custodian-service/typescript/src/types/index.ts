// DID document type definitions
export interface VerificationMethod {
  id: string;
  type: string;
  controller: string;
  publicKeyMultibase?: string;
  publicKeyJwk?: Record<string, unknown>;
}

export interface Service {
  id: string;
  type: string;
  serviceEndpoint: string;
  metadata?: {
    name?: string;
    auth_methods?: number[];
    [key: string]: unknown;
  };
}

export interface DIDDocument {
  '@context': string | string[];
  id: string;
  controller?: string;
  verificationMethod?: VerificationMethod[];
  authentication?: string[];
  assertionMethod?: string[];
  keyAgreement?: string[];
  capabilityInvocation?: string[];
  capabilityDelegation?: string[];
  service?: Service[];
}

// Custodian service types
export interface CustodianService {
  id: string;
  type: string;
  serviceEndpoint: string;
  metadata: {
    name: string;
    auth_methods: number[];
  };
}

// User-related types
export interface User {
  id: string;
  email?: string;
  provider?: string;
  identifierHash: string;
}

// Agent DID related types
export interface AgentDID {
  id: string;
  controller: string;
  owner: User;
  createdAt: Date;
}

// Device key types
export interface DeviceKey {
  id: string;
  publicKey: string;
  agentDID: string;
  createdAt: Date;
}

// Request and response types
export interface CreateAgentDIDRequest {
  userIdentifierHash: string;
  devicePublicKey: string;
}

export interface CreateAgentDIDResponse {
  agentDID: string;
  success: boolean;
  error?: string;
}

export interface SwitchControllerRequest {
  agentDID: string;
  newController: string;
  signature: string;
}

export interface SwitchControllerResponse {
  success: boolean;
  error?: string;
} 