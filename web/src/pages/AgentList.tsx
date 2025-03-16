import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { useRoochClient, useCurrentSession, useRoochClientQuery, useCurrentWallet } from '@roochnetwork/rooch-sdk-kit';
import { RoochAddress } from '@roochnetwork/rooch-sdk';

// Define Agent type
interface Agent {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar: string;
  agent_address: string;
}

export function AgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const wallet = useCurrentWallet();
  
  // Query to fetch agent objects owned by the current user
  const { data: agentsResponse, isLoading: isAgentsLoading, error: agentsError } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_type_with_owner: {
          object_type: `${packageId}::agent::Agent`,
          owner: wallet?.wallet?.getBitcoinAddress().toStr() || '',
        },
      },
    },
    {
      enabled: !!client && !!packageId && !!wallet?.wallet,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );
  
  // Process the agent data when it's available
  useEffect(() => {
    if (isAgentsLoading) {
      setLoading(true);
      return;
    }
    
    if (agentsError) {
      console.error('Failed to fetch agents:', agentsError);
      setError('Failed to load agents. Please try again later.');
      setLoading(false);
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
            username: String(agentData.username || 'unnamed'),
            description: String(agentData.description || 'No description available'),
            avatar: String(agentData.avatar || ''),
            agent_address: agentAddress,
          };
        });
        
        setAgents(parsedAgents);
      } catch (err) {
        console.error('Failed to parse agents:', err);
        setError('Error parsing agent data. Please try again.');
      }
    } else {
      setAgents([]);
    }
    
    setLoading(false);
  }, [agentsResponse, isAgentsLoading, agentsError]);
  
  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">My AI Agents</h1>
            <p className="text-gray-600">Manage your AI agents</p>
          </div>
          <button
            onClick={() => navigate('/create-agent')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Create New Agent
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't created any AI agents yet</p>
            <button
              onClick={() => navigate('/create-agent')}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Create Your First Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-center mb-4">
                    {agent.avatar && (
                      <img 
                        src={agent.avatar} 
                        alt={agent.name} 
                        className="w-12 h-12 rounded-full mr-4"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{agent.name}</h3>
                      <p className="text-gray-500 text-sm">@{agent.username}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-6 line-clamp-3">{agent.description}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => navigate(`/agent/${agent.id}`)}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
} 