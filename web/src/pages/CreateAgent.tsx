import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { useRoochClient, useCurrentSession, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import { Transaction, Args } from '@roochnetwork/rooch-sdk';

export function CreateAgent() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [instructions, setInstructions] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);
  
  const navigate = useNavigate();
  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const session = useCurrentSession();
  
  // Validate username format
  const validateUsernameFormat = (value: string): boolean => {
    // Username must be 4-16 characters
    if (value.length < 4 || value.length > 16) {
      setUsernameError('Username must be 4-16 characters long');
      return false;
    }
    
    // Username can only contain letters, numbers, and underscores
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    
    // Username can't be all numbers
    if (/^\d+$/.test(value)) {
      setUsernameError('Username cannot be all numbers');
      return false;
    }
    
    setUsernameError(null);
    return true;
  };
  
  // Check username availability using the contract's is_username_available method
  const checkUsernameAvailability = async (username: string) => {
    if (!client || !packageId) return;
    
    try {
      setIsCheckingUsername(true);
      
      // Call the is_username_available function from the agent module
      const result = await client.executeViewFunction({
        target: `${packageId}::name_registry::is_username_available`,
        args: [Args.string(username)],
      });
      
      // The result should be a boolean indicating if the username is available
      const isAvailable = result?.return_values?.[0]?.decoded_value || false;
      setIsUsernameAvailable(!!isAvailable);
      
      if (!isAvailable) {
        setUsernameError('Username is already taken. Please choose another one.');
      }
      
      return !!isAvailable;
    } catch (err) {
      console.error('Error checking username availability:', err);
      setUsernameError('Error checking username availability. Please try again.');
      return false;
    } finally {
      setIsCheckingUsername(false);
    }
  };
  
  // Check username availability when it changes
  useEffect(() => {
    if (username.length >= 4) {
      const timer = setTimeout(() => {
        if (validateUsernameFormat(username)) {
          checkUsernameAvailability(username);
        }
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setIsUsernameAvailable(null);
    }
  }, [username, packageId, client]);
  
  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUsername(value);
    validateUsernameFormat(value);
    setIsUsernameAvailable(null);
  };
  
  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Agent name is required');
      return;
    }
    
    if (!username.trim() || usernameError) {
      setError('Valid username is required');
      return;
    }
    
    if (!client || !packageId || !session) {
      setError('Wallet connection required');
      return;
    }
    
    // Final check for username availability before submission
    if (isUsernameAvailable === null) {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        return;
      }
    } else if (!isUsernameAvailable) {
      setError('Username is already taken. Please choose another one.');
      return;
    }
    
    try {
      setIsCreating(true);
      setError(null);
      
      // Create an Agent
      const agentTx = new Transaction();
      agentTx.callFunction({
        target: `${packageId}::agent_entry::create_agent`,
        args: [
          Args.string(name),
          Args.string(username),
          Args.string(avatar || ''),
          Args.string(description || ''),
          Args.string(instructions || '')
        ],
      });
      
      agentTx.setMaxGas(5_00000000);
      
      const agentResult = await client.signAndExecuteTransaction({
        transaction: agentTx,
        signer: session,
      });
      
      if (agentResult.execution_info.status.type !== 'executed') {
        console.error('Agent creation failed:', agentResult.execution_info);
        throw new Error(`Agent creation failed: ${JSON.stringify(agentResult.execution_info.status)}`);
      }
      
      // Find the Agent object from changeset
      const agentChange = agentResult.output?.changeset.changes.find(
        change => change.metadata.object_type.endsWith('::agent::Agent')
      );
      
      if (!agentChange?.metadata.id) {
        throw new Error('Failed to get agent ID from transaction result');
      }
      
      const agentObjectId = agentChange.metadata.id;
      console.log('Created agent with ID:', agentObjectId);
      
      // Navigate to the agents list page after successful creation
      navigate('/');
    } catch (err) {
      console.error('Failed to create agent:', err);
      setError(`Failed to create agent: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New AI Agent</h1>
          <p className="text-gray-600">Configure your new AI Agent</p>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Agent Name*
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="E.g., Aria"
              required
            />
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Username*
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={handleUsernameChange}
                className={`w-full px-4 py-2 border ${
                  usernameError ? 'border-red-300' : 
                  isUsernameAvailable === true ? 'border-green-300' : 
                  'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                placeholder="E.g., aria"
                required
              />
              {isCheckingUsername && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              )}
              {!isCheckingUsername && isUsernameAvailable === true && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            {usernameError && (
              <p className="mt-1 text-sm text-red-600">{usernameError}</p>
            )}
            {!usernameError && isUsernameAvailable === true && (
              <p className="mt-1 text-sm text-green-600">Username is available!</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Username must be 4-16 characters long, contain only letters, numbers, and underscores, and cannot be all numbers.
            </p>
          </div>
          
          <div>
            <label htmlFor="avatar" className="block text-sm font-medium text-gray-700 mb-1">
              Avatar URL (Optional)
            </label>
            <input
              type="text"
              id="avatar"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter avatar URL..."
            />
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe what this agent does and its personality..."
              rows={4}
            />
          </div>
          
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-1">
              Instructions (Optional)
            </label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Special instructions for the agent..."
              rows={4}
            />
          </div>
          
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <SessionKeyGuard onClick={handleSubmit}>
              <button
                type="button"
                disabled={isCreating || !!usernameError || isUsernameAvailable === false || isCheckingUsername}
                className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                  (isCreating || !!usernameError || isUsernameAvailable === false || isCheckingUsername) ? 'opacity-75 cursor-not-allowed' : ''
                }`}
              >
                {isCreating ? 'Creating...' : 'Create Agent'}
              </button>
            </SessionKeyGuard>
          </div>
        </div>
      </div>
    </Layout>
  );
}
