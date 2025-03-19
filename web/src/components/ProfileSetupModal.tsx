import { useState, useEffect } from 'react';
import { useRoochClient, useCurrentSession, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import { Transaction, Args } from '@roochnetwork/rooch-sdk';
import { useNetworkVariable } from '../hooks/useNetworkVariable';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ProfileSetupModal({ isOpen, onClose, onSuccess }: ProfileSetupModalProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [avatar, setAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [isUsernameAvailable, setIsUsernameAvailable] = useState<boolean | null>(null);

  const client = useRoochClient();
  const session = useCurrentSession();
  const packageId = useNetworkVariable('packageId');

  // Validate username format
  const validateUsernameFormat = (value: string): boolean => {
    if (value.length < 4 || value.length > 16) {
      setUsernameError('Username must be between 4-16 characters');
      return false;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(value)) {
      setUsernameError('Username can only contain letters, numbers, and underscores');
      return false;
    }
    
    if (/^\d+$/.test(value)) {
      setUsernameError('Username cannot be all numbers');
      return false;
    }
    
    setUsernameError(null);
    return true;
  };

  // Check username availability
  const checkUsernameAvailability = async (username: string) => {
    if (!client || !packageId) return;
    
    try {
      setIsCheckingUsername(true);
      
      const result = await client.executeViewFunction({
        target: `${packageId}::name_registry::is_username_available`,
        args: [Args.string(username)],
      });
      
      const isAvailable = result?.return_values?.[0]?.decoded_value || false;
      setIsUsernameAvailable(!!isAvailable);
      
      if (!isAvailable) {
        setUsernameError('This username is already taken, please choose another one');
      }
      
      return !!isAvailable;
    } catch (err) {
      console.error('Error checking username availability:', err);
      setUsernameError('Error checking username availability, please try again');
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

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Please enter your display name');
      return;
    }
    
    if (!username.trim() || usernameError) {
      setError('Please enter a valid username');
      return;
    }
    
    if (!client || !packageId || !session) {
      setError('Wallet connection failed');
      return;
    }
    
    if (isUsernameAvailable === null) {
      const isAvailable = await checkUsernameAvailability(username);
      if (!isAvailable) {
        return;
      }
    } else if (!isUsernameAvailable) {
      setError('This username is already taken, please choose another one');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const tx = new Transaction();
      tx.callFunction({
        target: `${packageId}::user_profile::init_profile`,
        args: [
          Args.string(name),
          Args.string(username),
          Args.string(avatar || ''),
        ],
      });
      
      tx.setMaxGas(5_00000000);
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error(`Failed to create profile: ${JSON.stringify(result.execution_info.status)}`);
      }
      
      onSuccess();
      onClose();
    } catch (err) {
      console.error('Failed to create profile:', err);
      setError(`Failed to create profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Complete Your Profile</h2>
        <p className="text-gray-600 mb-6">Please set up your basic information that will be displayed on your profile.</p>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Display Name*
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your display name"
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
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full px-4 py-2 border ${
                  usernameError ? 'border-red-300' : 
                  isUsernameAvailable === true ? 'border-green-300' : 
                  'border-gray-300'
                } rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500`}
                placeholder="Enter username"
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
              Username must be between 4-16 characters, can only contain letters, numbers, and underscores, and cannot be all numbers.
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
              placeholder="Enter avatar image URL"
            />
          </div>
        </div>
        
        <div className="mt-6 flex justify-end gap-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Set Later
          </button>
          <SessionKeyGuard onClick={handleSubmit}>
            <button
              type="button"
              disabled={isSubmitting || !!usernameError || isUsernameAvailable === false || isCheckingUsername}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (isSubmitting || !!usernameError || isUsernameAvailable === false || isCheckingUsername) ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Complete Setup'}
            </button>
          </SessionKeyGuard>
        </div>
      </div>
    </div>
  );
} 