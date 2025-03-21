import { ReactNode, useState, useEffect } from 'react';
import { ConnectButton } from '@roochnetwork/rooch-sdk-kit';
import { ErrorGuard } from '../ErrorGuard';
import { Link } from 'react-router-dom';
import { ProfileSetupModal } from './ProfileSetupModal';
import { useRoochClient, useCurrentSession, useCurrentWallet } from '@roochnetwork/rooch-sdk-kit';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { Args } from '@roochnetwork/rooch-sdk';

interface LayoutProps {
  children: ReactNode;
  showRoomList?: boolean;
}

export function Layout({ children, showRoomList = false }: LayoutProps) {
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const client = useRoochClient();
  const session = useCurrentSession();
  const wallet = useCurrentWallet();
  const packageId = useNetworkVariable('packageId');

  // Check if user has set up their profile
  useEffect(() => {
    const checkProfile = async () => {
      if (!client || !packageId || !wallet?.wallet) return;

      try {
        const userAddress = wallet.wallet.getBitcoinAddress().toStr();
        const result = await client.executeViewFunction({
          target: `${packageId}::user_profile::exists_profile`,
          args: [Args.address(userAddress)],
        });

        const exists = result?.return_values?.[0]?.decoded_value || false;
        if (!exists) {
          setShowProfileSetup(true);
        }
      } catch (error) {
        console.error('Failed to check user profile:', error);
      }
    };

    checkProfile();
  }, [client, packageId, wallet?.wallet]);

  return (
    <div className="h-screen flex flex-col">
      <header className="flex-none flex items-center justify-between px-6 h-16 border-b bg-white">
        <div className="flex items-center space-x-6">
          <Link to="/" className="text-2xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
            Nuwa AI
          </Link>
          <div className="flex items-center space-x-4 text-sm">
            <a 
              href="https://github.com/rooch-network/nuwa" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900 flex items-center space-x-1"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
            <a 
              href="https://rooch.network" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-600 hover:text-gray-900"
            >
              Rooch Network
            </a>
          </div>
        </div>
        <ConnectButton />
      </header>
      
      <div className="flex-1 flex min-h-0 bg-gray-50">
        {showRoomList && (
          <aside className="w-64 flex-none overflow-y-auto border-r bg-white">
            <ErrorGuard />
          </aside>
        )}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      <ProfileSetupModal
        isOpen={showProfileSetup}
        onClose={() => setShowProfileSetup(false)}
        onSuccess={() => {
          setShowProfileSetup(false);
          // You can add success notification or other operations here
        }}
      />
    </div>
  );
}