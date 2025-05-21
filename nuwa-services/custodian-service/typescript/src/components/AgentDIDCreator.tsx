import { useState, useEffect } from 'react';

interface AgentDIDCreatorProps {
  userHash: string;
}

export default function AgentDIDCreator({ userHash }: AgentDIDCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [agentDID, setAgentDID] = useState<string | null>(null);
  const [devicePublicKey, setDevicePublicKey] = useState<string | null>(null);
  const [devicePrivateKey, setDevicePrivateKey] = useState<string | null>(null);

  // Generate device key pair on component load
  useEffect(() => {
    const generateKeyPair = async () => {
      try {
        // Note: In a real application, you should use a proper cryptography library to generate key pairs
        // This is just an example
        
        // Simulate key pair generation
        console.log('Generating device key pair...');
        
        // Actual implementation should use Web Crypto API or professional cryptography libraries
        // For example:
        /*
        const keyPair = await window.crypto.subtle.generateKey(
          {
            name: 'ECDSA',
            namedCurve: 'P-256',
          },
          true,
          ['sign', 'verify']
        );
        const publicKey = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
        const privateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
        const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));
        */
        
        // Generate sample keys (use the code above in a real application)
        const mockPublicKey = 'z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK';
        const mockPrivateKey = 'sample_private_key_should_never_be_exposed';
        
        setDevicePublicKey(mockPublicKey);
        setDevicePrivateKey(mockPrivateKey);
      } catch (err) {
        console.error('Failed to generate key pair:', err);
        setError('Failed to generate device key pair. Please refresh the page and try again.');
      }
    };

    generateKeyPair();
  }, []);

  // Create Agent DID
  const createAgentDID = async () => {
    if (!devicePublicKey) {
      setError('Device key has not been generated yet. Please wait or refresh the page.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Call API to create Agent DID
      const response = await fetch('/api/agent-did', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userIdentifierHash: userHash,
          devicePublicKey: devicePublicKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create Agent DID');
      }

      setAgentDID(data.agentDID);
      setSuccess(true);
      
      // Securely store the device private key (use a more secure storage method in a real application)
      localStorage.setItem(`${data.agentDID}_privateKey`, devicePrivateKey || '');
    } catch (err) {
      console.error('Failed to create Agent DID:', err);
      setError(err instanceof Error ? err.message : 'Failed to create Agent DID. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!devicePublicKey) {
    return <div>Generating device keys...</div>;
  }

  return (
    <div className="agent-did-creator">
      <h2>Create Your Agent DID</h2>
      
      {!success ? (
        <>
          <p>
            This will create an Agent DID controlled by the Custodian service,
            with your device-generated key ensuring your operational control over the Agent.
          </p>
          
          <div className="did-creation-info">
            <div className="info-row">
              <span className="label">User Identifier Hash:</span>
              <span className="value">{userHash}</span>
            </div>
            <div className="info-row">
              <span className="label">Device Public Key:</span>
              <span className="value truncate">{devicePublicKey}</span>
            </div>
          </div>
          
          <button 
            className="create-did-button"
            onClick={createAgentDID}
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Agent DID'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </>
      ) : (
        <div className="success-message">
          <h3>Agent DID Created Successfully!</h3>
          <div className="info-row">
            <span className="label">Agent DID:</span>
            <span className="value">{agentDID}</span>
          </div>
          <p className="key-warning">
            Important: Your device private key has been securely stored locally. Do not clear your browser data or you will lose control of this DID.
          </p>
        </div>
      )}
    </div>
  );
} 