import { DIDDocument } from '../../src/types';
import * as jsonld from 'jsonld';

/**
 * Utility class for validating DID documents according to W3C standards
 */
export class DIDValidator {
  /**
   * Validates the basic structure of a DID document
   * 
   * @param didDocument - The DID document to validate
   * @returns An object containing validation results
   */
  static validateBasicStructure(didDocument: DIDDocument): {valid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    if (!didDocument) {
      errors.push('DID document is undefined');
      return { valid: false, errors };
    }
    
    if (!didDocument.id) {
      errors.push('DID document must have an id property');
    } else if (!didDocument.id.startsWith('did:')) {
      errors.push('DID id must start with "did:"');
    }
    
    if (!didDocument.verificationMethod || !Array.isArray(didDocument.verificationMethod)) {
      errors.push('DID document must have an array of verification methods');
    } else if (didDocument.verificationMethod.length === 0) {
      errors.push('DID document must have at least one verification method');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates verification methods in a DID document
   * 
   * @param didDocument - The DID document to validate
   * @returns An object containing validation results
   */
  static validateVerificationMethods(didDocument: DIDDocument): {valid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    if (!didDocument || !didDocument.verificationMethod || !Array.isArray(didDocument.verificationMethod)) {
      errors.push('DID document must have valid verification methods');
      return { valid: false, errors };
    }
    
    for (const vm of didDocument.verificationMethod) {
      if (!vm.id) {
        errors.push('Verification method must have an id');
      } else if (!vm.id.startsWith(didDocument.id)) {
        errors.push(`Verification method id ${vm.id} must start with DID id ${didDocument.id}`);
      }
      
      if (!vm.controller) {
        errors.push(`Verification method ${vm.id} must have a controller`);
      }
      
      if (!vm.type) {
        errors.push(`Verification method ${vm.id} must have a type`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validates that verification relationships reference existing verification methods
   * 
   * @param didDocument - The DID document to validate
   * @returns An object containing validation results
   */
  static validateVerificationRelationships(didDocument: DIDDocument): {valid: boolean, errors: string[]} {
    const errors: string[] = [];
    
    if (!didDocument || !didDocument.verificationMethod) {
      errors.push('DID document must have verification methods');
      return { valid: false, errors };
    }
    
    const methodIds = didDocument.verificationMethod.map(vm => vm.id);
    
    const relationships = [
      'authentication',
      'assertionMethod',
      'keyAgreement',
      'capabilityInvocation',
      'capabilityDelegation'
    ];
    
    for (const rel of relationships) {
      const refs = (didDocument as any)[rel];
      if (refs && Array.isArray(refs)) {
        for (const ref of refs) {
          if (typeof ref === 'string') {
            if (!methodIds.includes(ref)) {
              errors.push(`${rel} references non-existent verification method: ${ref}`);
            }
          } else if (ref && typeof ref === 'object' && ref.id) {
            if (!methodIds.includes(ref.id)) {
              errors.push(`${rel} references non-existent verification method: ${ref.id}`);
            }
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Custom document loader for JSON-LD processing
   * This handles common DID contexts without remote requests
   */
  private static customDocumentLoader(url: string): Promise<any> {
    // Handle common DID contexts
    if (url === 'https://www.w3.org/ns/did/v1' || url.includes('w3id.org/did/v')) {
      return Promise.resolve({
        contextUrl: null,
        documentUrl: url,
        document: {
          "@context": {
            "@protected": true,
            "id": "@id",
            "type": "@type",
            "alsoKnownAs": {
              "@id": "https://www.w3.org/ns/activitystreams#alsoKnownAs",
              "@type": "@id"
            },
            "assertionMethod": {
              "@id": "https://w3id.org/security#assertionMethod",
              "@type": "@id",
              "@container": "@set"
            },
            "authentication": {
              "@id": "https://w3id.org/security#authenticationMethod",
              "@type": "@id",
              "@container": "@set"
            },
            "controller": {
              "@id": "https://w3id.org/security#controller",
              "@type": "@id"
            },
            "service": {
              "@id": "https://www.w3.org/ns/did#service",
              "@type": "@id",
              "@container": "@set"
            },
            "serviceEndpoint": {
              "@id": "https://www.w3.org/ns/did#serviceEndpoint",
              "@type": "@id"
            },
            "verificationMethod": {
              "@id": "https://w3id.org/security#verificationMethod",
              "@type": "@id"
            },
            "capabilityInvocation": {
              "@id": "https://w3id.org/security#capabilityInvocationMethod",
              "@type": "@id",
              "@container": "@set"
            },
            "capabilityDelegation": {
              "@id": "https://w3id.org/security#capabilityDelegationMethod",
              "@type": "@id",
              "@container": "@set"
            },
            "keyAgreement": {
              "@id": "https://w3id.org/security#keyAgreementMethod",
              "@type": "@id",
              "@container": "@set"
            }
          }
        }
      });
    }
    
    // For other URLs, return a default empty context
    // This prevents network requests during testing
    return Promise.resolve({
      contextUrl: null,
      documentUrl: url,
      document: {
        "@context": {}
      }
    });
  }
  
  /**
   * Validates a DID document against the JSON-LD context
   * 
   * @param didDocument - The DID document to validate
   * @returns A promise that resolves to an object containing validation results
   */
  static async validateJsonLd(didDocument: DIDDocument): Promise<{valid: boolean, errors: string[]}> {
    try {
      // Use our custom document loader to avoid network requests
      const options = {
        documentLoader: this.customDocumentLoader
      };
      
      // Process the document with JSON-LD
      await jsonld.expand(didDocument, options);
      
      return { valid: true, errors: [] };
    } catch (error) {
      console.error('JSON-LD validation error:', error);
      return {
        valid: false,
        errors: [`JSON-LD validation error: ${(error as Error).message}`]
      };
    }
  }
  
  /**
   * Performs comprehensive validation of a DID document
   * 
   * @param didDocument - The DID document to validate
   * @returns A promise that resolves to an object containing all validation results
   */
  static async validateDIDDocument(didDocument: DIDDocument): Promise<{
    valid: boolean,
    structureValid: boolean,
    methodsValid: boolean,
    relationshipsValid: boolean,
    jsonLdValid: boolean,
    errors: string[]
  }> {
    const structureResult = this.validateBasicStructure(didDocument);
    const methodsResult = this.validateVerificationMethods(didDocument);
    const relationshipsResult = this.validateVerificationRelationships(didDocument);
    const jsonLdResult = await this.validateJsonLd(didDocument);
    
    const allErrors = [
      ...structureResult.errors,
      ...methodsResult.errors,
      ...relationshipsResult.errors,
      ...jsonLdResult.errors
    ];
    
    return {
      valid: structureResult.valid && methodsResult.valid && relationshipsResult.valid && jsonLdResult.valid,
      structureValid: structureResult.valid,
      methodsValid: methodsResult.valid,
      relationshipsValid: relationshipsResult.valid,
      jsonLdValid: jsonLdResult.valid,
      errors: allErrors
    };
  }
} 