import * as nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

/**
 * CryptoUtils provides cross-platform cryptographic utilities for DID operations.
 * It abstracts the complexity of different key types (Ed25519, ECDSA), formats, and
 * crypto APIs (browser vs Node.js).
 */
export class CryptoUtils {
  /**
   * Generates a key pair of the specified type.
   * Currently supports Ed25519VerificationKey2020.
   */
  static async generateKeyPair(type: string): Promise<{ 
    publicKey: Uint8Array | JsonWebKey, 
    privateKey: Uint8Array | CryptoKey 
  }> {
    if (type === 'Ed25519VerificationKey2020') {
      // Use TweetNaCl for Ed25519 keys
      const keyPair = nacl.sign.keyPair();
      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.secretKey
      };
    } else if (type === 'EcdsaSecp256k1VerificationKey2019' || type === 'JsonWebKey2020') {
      // Use Web Crypto API for ECDSA keys
      // Note: The actual curve might depend on the specific verification key type
      const algorithm = {
        name: 'ECDSA',
        namedCurve: 'P-256' // Use 'K-256' for secp256k1 if supported
      };
      
      const keyPair = await crypto.subtle.generateKey(
        algorithm,
        true, // extractable
        ['sign', 'verify']
      );
      
      const jwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
      return {
        publicKey: jwk,
        privateKey: keyPair.privateKey
      };
    }
    
    throw new Error(`Unsupported key type: ${type}`);
  }

  /**
   * Signs data using the specified private key and key type.
   */
  static async sign(
    data: Uint8Array, 
    privateKey: CryptoKey | Uint8Array, 
    keyType: string
  ): Promise<string> {
    if (privateKey instanceof Uint8Array && keyType === 'Ed25519VerificationKey2020') {
      // Use TweetNaCl for Ed25519 signatures
      const signature = nacl.sign.detached(data, privateKey);
      return encodeBase64(signature);
    } else if (privateKey instanceof CryptoKey) {
      // Use Web Crypto API for ECDSA signatures
      const algorithm = {
        name: 'ECDSA',
        hash: { name: 'SHA-256' }
      };
      
      const signatureBuffer = await crypto.subtle.sign(
        algorithm,
        privateKey,
        data
      );
      
      // Convert the signature to a base64 string
      return encodeBase64(new Uint8Array(signatureBuffer));
    }
    
    throw new Error('Unsupported private key type for signing');
  }

  /**
   * Verifies a signature using the specified public key and key type.
   */
  static async verify(
    data: Uint8Array,
    signature: string,
    publicKey: JsonWebKey | Uint8Array,
    keyType: string
  ): Promise<boolean> {
    try {
      if (publicKey instanceof Uint8Array && keyType === 'Ed25519VerificationKey2020') {
        // Use TweetNaCl for Ed25519 verification
        const signatureBytes = decodeBase64(signature);
        return nacl.sign.detached.verify(data, signatureBytes, publicKey);
      } else if (typeof publicKey === 'object' && publicKey !== null && 'kty' in publicKey) {
        // Use Web Crypto API for ECDSA verification
        const algorithm = {
          name: 'ECDSA',
          hash: { name: 'SHA-256' }
        };
        
        // If publicKey is a JsonWebKey (has kty property), we can safely import it
        const jwk = publicKey as Record<string, any>;
        const cryptoKey = await crypto.subtle.importKey(
          'jwk',
          jwk,
          algorithm,
          true,
          ['verify']
        );
        
        const signatureBuffer = decodeBase64(signature);
        return await crypto.subtle.verify(
          algorithm,
          cryptoKey,
          signatureBuffer,
          data
        );
      }
      
      return false;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Converts a public key to a multibase encoded string.
   * This is a simplified implementation that needs to be expanded based on actual requirements.
   */
  static publicKeyToMultibase(publicKey: Uint8Array, type: string): string {
    // In a real implementation, you would use the multicodec and multibase libraries properly
    // For now, this is a very simplified version
    if (type === 'Ed25519VerificationKey2020') {
      // For Ed25519, we would prefix with the multicodec code point
      // and then encode with multibase (e.g., base58btc)
      return `z${encodeBase64(publicKey)}`;
    }
    
    // Fallback
    return `z${encodeBase64(publicKey)}`;
  }

  /**
   * Converts a JWK to a multibase encoded string.
   */
  static async jwkToMultibase(jwk: JsonWebKey): Promise<string> {
    // In a real implementation, you would handle this properly based on the JWK type
    // For now, this is a very simplified placeholder
    const jwkString = JSON.stringify(jwk);
    const encoder = new TextEncoder();
    return `z${encodeBase64(encoder.encode(jwkString))}`;
  }
}
