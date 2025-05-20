import { DIDDocument } from '../types';
import { AbstractVDR } from './abstractVDR';

export interface WebVDROptions {
  /**
   * Optional fetch function to use for HTTP requests
   * Defaults to global fetch if available
   */
  fetch?: typeof fetch;
  
  /**
   * Base path where DID documents are stored
   * Default: '/.well-known/did.json'
   */
  basePath?: string;
  
  /**
   * HTTP headers to include in requests
   */
  headers?: Record<string, string>;
  
  /**
   * Optional upload handler for publishing documents
   * Without this, store() will throw an error
   */
  uploadHandler?: (domain: string, path: string, document: DIDDocument) => Promise<boolean>;
}

/**
 * WebVDR handles did:web DIDs
 * 
 * did:web DIDs are typically in the format:
 * - did:web:<domain> -> resolves to https://<domain>/.well-known/did.json
 * - did:web:<domain>:<path> -> resolves to https://<domain>/<path>/did.json
 */
export class WebVDR extends AbstractVDR {
  private readonly options: WebVDROptions;
  private readonly fetchImpl: typeof fetch;
  
  constructor(options: WebVDROptions = {}) {
    super('web');
    
    this.options = {
      basePath: '/.well-known/did.json',
      headers: { Accept: 'application/json' },
      ...options
    };
    
    // Use provided fetch or global fetch
    this.fetchImpl = options.fetch || (typeof window !== 'undefined' ? window.fetch.bind(window) : global.fetch);
    
    if (!this.fetchImpl) {
      throw new Error('No fetch implementation available. Please provide one in the options.');
    }
  }
  
  /**
   * Parses a did:web identifier into domain and path components
   * 
   * @param did The did:web identifier
   * @returns An object with domain and path properties
   */
  private parseDIDWeb(did: string): { domain: string; path: string } {
    this.validateDIDMethod(did);
    
    // Remove 'did:web:' prefix
    const identifier = did.substring(8);
    
    // Split by colons - first part is domain, rest is path
    const parts = identifier.split(':');
    const domain = parts[0];
    
    let path = '';
    if (parts.length > 1) {
      // Join the remaining parts with '/' to form the path
      path = parts.slice(1).join('/');
    }
    
    return { domain, path };
  }
  
  /**
   * Constructs a URL from a did:web identifier
   * 
   * @param did The did:web identifier
   * @returns The URL where the DID document should be located
   */
  public getDocumentUrl(did: string): string {
    const { domain, path } = this.parseDIDWeb(did);
    
    if (path) {
      return `https://${domain}/${path}/did.json`;
    } else {
      return `https://${domain}${this.options.basePath}`;
    }
  }
  
  /**
   * Resolves a did:web identifier to a DID document
   * 
   * @param did The did:web identifier to resolve
   * @returns The resolved DID document or null if not found
   */
  async resolve(did: string): Promise<DIDDocument | null> {
    try {
      this.validateDIDMethod(did);
      
      const documentUrl = this.getDocumentUrl(did);
      
      // Fetch the document
      const response = await this.fetchImpl(documentUrl, {
        headers: this.options.headers
      });
      
      if (!response.ok) {
        console.error(`Failed to resolve ${did}: HTTP ${response.status}`);
        return null;
      }
      
      const document = await response.json();
      
      // Validate that the document ID matches the requested DID
      if (document.id !== did) {
        console.warn(`Document ID (${document.id}) doesn't match requested DID (${did})`);
      }
      
      return document;
    } catch (error) {
      console.error(`Error resolving ${did}:`, error);
      return null;
    }
  }
  
  /**
   * Stores a DID document for a did:web identifier
   * 
   * Requires the uploadHandler option to be set, as the WebVDR
   * itself doesn't handle authentication for uploading documents.
   * 
   * @param didDocument The DID document to store
   * @returns true if successful, throws otherwise
   */
  async store(didDocument: DIDDocument): Promise<boolean> {
    try {
      this.validateDocument(didDocument);
      
      const did = didDocument.id;
      const { domain, path } = this.parseDIDWeb(did);
      
      // We need an upload handler to store the document
      if (!this.options.uploadHandler) {
        throw new Error(
          'No uploadHandler configured for WebVDR. ' +
          'Please provide an uploadHandler in the options to enable document publishing.'
        );
      }
      
      // Use the provided upload handler to store the document
      return await this.options.uploadHandler(domain, path, didDocument);
    } catch (error) {
      console.error(`Error storing document for ${didDocument.id}:`, error);
      throw error;
    }
  }
}
