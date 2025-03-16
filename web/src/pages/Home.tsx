import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { useRoochClient, useRoochClientQuery, useCurrentWallet, useCurrentSession, SessionKeyGuard, WalletGuard } from '@roochnetwork/rooch-sdk-kit';
import { Agent } from '../types/agent';
import { RoochAddress } from '@roochnetwork/rooch-sdk';

export function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'authorized'>('all');
  const [userAuthorizedAgentIds, setUserAuthorizedAgentIds] = useState<Set<string>>(new Set());

  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const wallet = useCurrentWallet();
  const session = useCurrentSession();
  const navigate = useNavigate();
  
  // Query all Agent objects using useRoochClientQuery
  const { data: agentsResponse, isLoading: isQueryLoading, error: queryError } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_type: `${packageId}::agent::Agent`,
      },
    },
    {
      enabled: !!client && !!packageId,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Query to fetch AgentCap objects for the current user
  const { data: agentCapsResponse, isLoading: isAgentCapsLoading } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_type_with_owner: {
          object_type: `${packageId}::agent_cap::AgentCap`,
          owner: wallet?.wallet?.getBitcoinAddress().toStr() || '',
        },
      },
    },
    {
      enabled: !!client && !!packageId && !!wallet?.wallet,
      refetchOnWindowFocus: true,
    }
  );

  useEffect(() => {
    if (isQueryLoading || isAgentCapsLoading) {
      setIsLoading(true);
      return;
    }
    
    if (queryError) {
      console.error('Failed to fetch agents:', queryError);
      setError('Failed to load agents. Please try again.');
      setIsLoading(false);
      return;
    }

    if (agentsResponse?.data) {
      try {
        // Transform the agent objects
        const parsedAgents = agentsResponse.data.map(obj => {
          const agentData = obj.decoded_value?.value || {};
          const agentAddress = agentData.agent_address ? 
            new RoochAddress(String(agentData.agent_address)).toBech32Address() : '';
          
          return {
            id: obj.id,
            name: String(agentData.name || 'Unnamed Agent'),
            description: String(agentData.description || ''),
            agent_address: agentAddress,
            modelProvider: String(agentData.model_provider || 'Unknown'),
            createdAt: Number(agentData.last_active_timestamp) || Date.now(),
          };
        });
        
        // Create a Set of agent object IDs that the user has capability for
        const newUserAuthorizedAgentIds = new Set<string>();
        if (agentCapsResponse?.data && wallet?.wallet) {
          agentCapsResponse.data.forEach(obj => {
            const capData = obj.decoded_value?.value || {};
            if (capData.agent_obj_id) {
              newUserAuthorizedAgentIds.add(String(capData.agent_obj_id));
            }
          });
          console.log('User has capabilities for agents:', newUserAuthorizedAgentIds);
        }
        
        // Update the state with the authorized agent IDs
        setUserAuthorizedAgentIds(newUserAuthorizedAgentIds);
        
        // Apply filter based on agent caps
        const filteredAgents = filter === 'authorized' && session?.getRoochAddress()
          ? parsedAgents.filter(agent => newUserAuthorizedAgentIds.has(agent.id))
          : parsedAgents;
          
        // Sort agents by creation time (newest first)
        const sortedAgents = filteredAgents.sort((a, b) => b.createdAt - a.createdAt);
        
        setAgents(sortedAgents);
      } catch (err) {
        console.error('Failed to parse agents:', err);
        setError('Error parsing agent data. Please try again.');
      }
    } else {
      setAgents([]);
    }
    
    setIsLoading(false);
  }, [agentsResponse, agentCapsResponse, isQueryLoading, isAgentCapsLoading, queryError, session, filter]);

  const handleAgentClick = (agent: Agent) => {
    navigate(`/agent/${agent.id}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Header with filter tabs */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Agents</h1>
            <p className="text-gray-600">Discover and interact with autonomous onchain AI agents</p>
          </div>
          
          {/* Create Agent Button - Always visible */}
          <div className="mt-4 sm:mt-0">
            <SessionKeyGuard onClick={() => navigate('/create-agent')}>
              <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors">
                Create New AI Agent
              </button>
            </SessionKeyGuard>
          </div>
        </div>
        
        {/* Filter tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setFilter('all')}
              className={`${
                filter === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              All Agents
            </button>
            {wallet && (
              <WalletGuard onClick={() => setFilter('authorized')}>
                <button
                  className={`${
                    filter === 'authorized'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Agents You Authorized
                </button>
              </WalletGuard>
            )}
          </nav>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-6">
              {filter === 'authorized' 
                ? "You don't have authorized control of any agents yet." 
                : "No AI agents found on the network."}
            </p>
            <SessionKeyGuard onClick={() => navigate('/create-agent')}>
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
              >
                Create New Agent
              </button>
            </SessionKeyGuard>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div 
                key={agent.id}
                onClick={() => handleAgentClick(agent)}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
              >
                <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
                {agent.description && (
                  <p className="text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
                )}
                <div className="flex items-center justify-between text-gray-500 text-sm">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {agent.agent_address && (
                      <span title={agent.agent_address} className="text-xs">
                        {agent.agent_address.substring(0, 8)}...{agent.agent_address.substring(agent.agent_address.length - 6)}
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1 bg-blue-50 rounded text-blue-600 text-xs">
                    {agent.modelProvider}
                  </div>
                </div>
                <div className="text-gray-500 text-xs mt-3">
                  Active since: {new Date(agent.createdAt).toLocaleDateString()}
                </div>
                {userAuthorizedAgentIds && userAuthorizedAgentIds.has(agent.id) && (
                  <div className="mt-3 flex items-center text-xs text-green-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>You have authorization</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
