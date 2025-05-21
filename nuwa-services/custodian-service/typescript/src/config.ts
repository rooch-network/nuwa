// Configuration for the Custodian Service

// Supabase configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Custodian Service configuration
export const CUSTODIAN_DID = import.meta.env.VITE_CUSTODIAN_DID || 'did:example:custodian123';
export const CUSTODIAN_SERVICE_NAME = import.meta.env.VITE_CUSTODIAN_SERVICE_NAME || 'Example Custodian Service';
export const CUSTODIAN_SERVICE_ENDPOINT = import.meta.env.VITE_CUSTODIAN_SERVICE_ENDPOINT || 'https://custodian.example.com/api';

// Supported authentication method codes (reference NIP-3)
export enum AuthMethod {
  GoogleOAuth = 1,
  TwitterOAuth = 2,
  AppleSignIn = 3,
  GitHubOAuth = 4,
  EmailOTP = 5,
  SMSOTP = 6,
  WebAuthnPasskey = 7,
  WeChatQR = 8,
  DiscordOAuth = 9
}

// Default supported authentication methods
export const SUPPORTED_AUTH_METHODS = [
  AuthMethod.GoogleOAuth,
  AuthMethod.GitHubOAuth,
  AuthMethod.EmailOTP,
  AuthMethod.WebAuthnPasskey
]; 