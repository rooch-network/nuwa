import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { useRoochClient, useRoochClientQuery, useCurrentWallet, useCurrentSession, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import { Agent, Memory } from '../types/agent';
import { Args, isValidAddress, bcs, Transaction, RoochAddress } from '@roochnetwork/rooch-sdk';
import { MemoryBrowser } from '../components/MemoryBrowser';
import { MemorySchema } from '../types/agent';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { shortenAddress } from '../utils/address';
import { TaskSpecification } from '../types/task';
import { TaskSpecificationEditor } from '../components/TaskSpecificationEditor';

export function AgentDetail() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [homeChannelId, setHomeChannelId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isHomeChannelLoading, setIsHomeChannelLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'memories'>('details');
  const [isUserAuthorized, setIsUserAuthorized] = useState(false);
  const [agentCaps, setAgentCaps] = useState<{id: string, agentId: string}[]>([]);
  
  // Add state for inline editing
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [taskSpecs, setTaskSpecs] = useState<TaskSpecification[]>([]);
  const [isLoadingTaskSpecs, setIsLoadingTaskSpecs] = useState(true);
  
  const navigate = useNavigate();
  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const wallet = useCurrentWallet();
  const session = useCurrentSession();

  //TODO use the scanUrl via the network.
  const roochscanBaseUrl = "https://test.roochscan.io"
  
  // Add these state variables for memories tab
  const [selfMemories, setSelfMemories] = useState<Memory[]>([]);
  const [userMemories, setUserMemories] = useState<Memory[]>([]);
  const [isLoadingSelfMemories, setIsLoadingSelfMemories] = useState(false);
  const [isLoadingUserMemories, setIsLoadingUserMemories] = useState(false);
  const [searchAddress, setSearchAddress] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Query the specific agent by ID
  const { data: agentResponse, isLoading: isAgentLoading, error: agentError, refetch: refetchAgent } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_id: agentId || '',
      },
    },
    {
      enabled: !!client && !!packageId && !!agentId,
    }
  );

  // Query home channel ID using executeViewFunction
  const { data: homeChannelResponse, isLoading: isHomeChannelQueryLoading } = useRoochClientQuery(
    'executeViewFunction',
    {
      target: `${packageId}::channel::get_agent_home_channel_id`,
      args: [Args.objectId(agentId || '')],
    },
    {
      enabled: !!client && !!packageId && !!agentId,
    }
  );

  // Query agent capabilities owned by the current user
  const { data: agentCapsResponse, isLoading: isAgentCapsLoading } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_type_with_owner: {
          object_type: `${packageId}::agent_cap::AgentCap`,
          owner: wallet?.wallet?.getBitcoinAddress().toStr() || '',
        }
      },
    },
    {
      enabled: !!client && !!packageId && !!wallet?.wallet,
    }
  );

  // Query task specifications
  const { data: taskSpecsResponse, isLoading: isTaskSpecsQueryLoading } = useRoochClientQuery(
    'executeViewFunction',
    {
      target: `${packageId}::agent::get_agent_task_specs_json`,
      args: [Args.objectId(agentId || '')],
    },
    {
      enabled: !!client && !!packageId && !!agentId,
    }
  );

  // Effect to check if user has authorization to edit this agent
  useEffect(() => {
    if (!agentId || !agentCapsResponse?.data || isAgentCapsLoading) return;
    
    try {
      const caps: {id: string, agentId: string}[] = [];
      
      agentCapsResponse.data.forEach(obj => {
        if (obj.decoded_value?.value?.agent_obj_id) {
          caps.push({
            id: obj.id,
            agentId: String(obj.decoded_value.value.agent_obj_id)
          });
        }
      });
      
      setAgentCaps(caps);
      
      // Check if the current agent ID is in the list of authorized agents
      const hasAccess = caps.some(cap => cap.agentId === agentId);
      setIsUserAuthorized(hasAccess);
      
    } catch (error) {
      console.error('Error processing agent caps:', error);
    }
  }, [agentId, agentCapsResponse, isAgentCapsLoading]);

  // Effect to process agent data
  useEffect(() => {
    if (isAgentLoading) {
      setIsLoading(true);
      return;
    }

    if (agentError) {
      console.error('Failed to fetch agent details:', agentError);
      setError('Failed to load agent details. Please try again.');
      setIsLoading(false);
      return;
    }

    const processAgentData = async () => {
      try {
        if (agentResponse?.data && agentResponse.data.length > 0) {
          const agentObj = agentResponse.data[0];
          const agentData = agentObj.decoded_value?.value || {};
          
          if (!agentData) {
            throw new Error('Invalid agent data format');
          }

          const agentAddress = agentData.agent_address ? 
            new RoochAddress(String(agentData.agent_address)).toBech32Address() : '';
          
          const processedAgent: Agent = {
            id: agentObj.id,
            name: String(agentData.name || 'Unnamed Agent'),
            username: String(agentData.username || ''),
            description: String(agentData.description || ''),
            instructions: String(agentData.instructions || ''),
            agent_address: agentAddress,
            model_provider: String(agentData.model_provider || 'Unknown'),
            last_active_timestamp: Number(agentData.last_active_timestamp) || Date.now(),
          };
          
          setAgent(processedAgent);
          setEditName(processedAgent.name);
          setEditDescription(processedAgent.description || '');
          setEditInstructions(processedAgent.instructions || '');
        } else {
          setError('Agent not found:' + agentId);
        }
      } catch (err) {
        console.error('Error processing agent data:', err);
        setError('Failed to process agent data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    processAgentData();
  }, [agentResponse, isAgentLoading, agentError]);

  // Add a separate useEffect to handle the home channel response
  useEffect(() => {
    // Check if home channel query has completed (either with data or null)
    if (!isHomeChannelQueryLoading) {
      if (homeChannelResponse?.return_values?.[0]?.decoded_value) {
        setHomeChannelId(String(homeChannelResponse.return_values[0].decoded_value));
      } else {
        console.log('No home channel found for this agent');
      }
      
      // Always set loading to false when query completes
      setIsHomeChannelLoading(false);
    }
  }, [homeChannelResponse, isHomeChannelQueryLoading]);

  // Save updated agent information
  const handleSaveAgentInfo = async (field: 'name' | 'description' | 'instructions') => {
    if (!client || !packageId || !session || !agentId) {
      setUpdateError('Missing required data for update');
      return;
    }
    
    // Find the matching agent cap for this agent
    const matchingCap = agentCaps.find(cap => cap.agentId === agentId);
    
    if (!matchingCap) {
      setUpdateError('You do not have the required authorization to update this agent');
      return;
    }
    
    try {
      setIsSaving(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      const tx = new Transaction();
      
      // Call different update functions based on the field being updated
      if (field === 'name') {
        tx.callFunction({
          target: `${packageId}::agent::update_agent_name`,
          args: [Args.objectId(matchingCap.id), Args.string(editName)],
        });
      } else if (field === 'description') {
        tx.callFunction({
          target: `${packageId}::agent::update_agent_description`,
          args: [Args.objectId(matchingCap.id), Args.string(editDescription)],
        });
      } else if (field === 'instructions') {
        tx.callFunction({
          target: `${packageId}::agent::update_agent_instructions`,
          args: [Args.objectId(matchingCap.id), Args.string(editInstructions)],
        });
      }
            
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error('Failed to update agent'+ JSON.stringify(result.execution_info));
      }
      
      setUpdateSuccess(true);
        
      // Close edit mode
      if (field === 'name') setIsEditingName(false);
      if (field === 'description') setIsEditingDescription(false);
      if (field === 'instructions') setIsEditingInstructions(false);
      
      refetchAgent();
    } catch (error: any) {
      console.error('Error updating agent:', error);
      setUpdateError(error.message || 'Failed to update agent');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Cancel editing
  const handleCancelEdit = (field: 'name' | 'description' | 'instructions') => {
    if (field === 'name') {
      setEditName(agent?.name || '');
      setIsEditingName(false);
    } else if (field === 'description') {
      setEditDescription(agent?.description || '');
      setIsEditingDescription(false);
    } else if (field === 'instructions') {
      setEditInstructions(agent?.instructions || '');
      setIsEditingInstructions(false);
    }
    setUpdateError(null);
  };

  // Helper to map memory response to our type
  const deserializeMemories = (response: any): Memory[] => {
    if (!response?.return_values?.[0]?.value?.value) {
      console.log('No memory data available in response');
      return [];
    }
  
    try {
      // Get the hex value from the response
      const hexValue = response.return_values[0].value.value;
      
      // Convert hex to bytes
      const cleanHexValue = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
      const bytes = new Uint8Array(
        cleanHexValue.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || []
      );
      
      // Parse using BCS
      if (!MemorySchema) {
        console.error('MemorySchema is not defined!');
        return [];
      }
      
      const parsedMemories = bcs.vector(MemorySchema).parse(bytes);
      console.log(`Successfully parsed ${parsedMemories.length} memories`);
      
      // Map to our Memory interface format
      return parsedMemories.map((memory: any) => ({
        index: memory.index || 0,
        content: memory.content || '',
        context: memory.context || '',
        timestamp: parseInt(memory.timestamp) || Date.now(),
      }));
    } catch (error) {
      console.error('Memory BCS deserialization error:', error);
      return [];
    }
  };

  // Fetch agent's self memories
  useEffect(() => {
    const fetchSelfMemories = async () => {
      if (!client || !packageId || !agent?.id) return;
      
      // Add this check to prevent refetching if we already have memories
      if (selfMemories.length > 0) {
        console.log('Self memories already loaded, skipping fetch');
        return;
      }
      
      try {
        setIsLoadingSelfMemories(true);
        
        const response = await client.executeViewFunction({
          target: `${packageId}::agent::get_agent_self_memories`,
          args: [Args.objectId(agent.id)],
        });
        
        // Use BCS to deserialize memories
        let memories: Memory[] = deserializeMemories(response);
        
        setSelfMemories(memories);
        console.log(`Loaded ${memories.length} self memories`);
      } catch (error) {
        console.error('Failed to fetch agent self memories:', error);
      } finally {
        setIsLoadingSelfMemories(false);
      }
    };

    if (agent && client && packageId) {
      fetchSelfMemories();
    }
  }, [agent?.id, client, packageId]); // Remove selfMemories from dependencies

  // Fetch memories about current user
  useEffect(() => {
    const fetchCurrentUserMemories = async () => {
      if (!client || !packageId || !agent?.id || !wallet?.wallet) return;
      
      // Add this check to prevent refetching if we already have memories
      if (userMemories.length > 0) {
        console.log('User memories already loaded, skipping fetch');
        return;
      }
      
      try {
        setIsLoadingUserMemories(true);
        
        const userAddress = wallet.wallet?.getBitcoinAddress().toStr();
        
        const response = await client.executeViewFunction({
          target: `${packageId}::agent::get_agent_memories_about_user`,
          args: [
            Args.objectId(agent.id),
            Args.address(userAddress)
          ],
        });
        
        // Use BCS to deserialize memories
        let memories: Memory[] = deserializeMemories(response);
        
        setUserMemories(memories);
        console.log(`Loaded ${memories.length} user memories`);
      } catch (error) {
        console.error('Failed to fetch agent memories about current user:', error);
      } finally {
        setIsLoadingUserMemories(false);
      }
    };

    if (agent && wallet?.wallet && client && packageId) {
      fetchCurrentUserMemories();
    }
  }, [agent?.id, wallet?.wallet, client, packageId]); // Remove userMemories from dependencies

  // Handle address search
  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchAddress || !client || !packageId || !agent?.id) return;
    
    try {
      setIsSearching(true);
    
      if (!isValidAddress(searchAddress)) {
        throw new Error('Invalid address format');
      }
      
      const response = await client.executeViewFunction({
        target: `${packageId}::agent::get_agent_memories_about_user`,
        args: [
          Args.objectId(agent.id),
          Args.address(searchAddress)
        ],
      });
      
      // Use BCS to deserialize memories
      let memories: Memory[] = deserializeMemories(response);
      
      setSearchResults(memories);
    } catch (error) {
      console.error('Failed to search memories:', error);
      alert('Failed to search memories. Please check the address format.');
    } finally {
      setIsSearching(false);
    }
  }

  // Add a clean-up action to the address search function to clear results when input is cleared
  const handleSearchAddressChange = (value: string) => {
    setSearchAddress(value);
    if (!value) {
      // Clear search results when the input is cleared
      setSearchResults([]);
    }
  };

  // Effect to process task specifications
  useEffect(() => {
    console.log('taskSpecsResponse', taskSpecsResponse);
    if (!taskSpecsResponse?.return_values?.[0]?.decoded_value) {
      setIsLoadingTaskSpecs(false);
      return;
    }

    try {
      const json_str = String(taskSpecsResponse.return_values[0].decoded_value);
      const specs = JSON.parse(json_str)?.task_specs;
      console.log('specs', specs);
      setTaskSpecs(specs);
    } catch (error) {
      console.error('Error processing task specifications:', error);
      setTaskSpecs([]);
    } finally {
      setIsLoadingTaskSpecs(false);
    }
  }, [taskSpecsResponse]);

  // Modify handleSaveTaskSpecs function
  const handleSaveTaskSpecs = async (newSpecs: TaskSpecification[]) => {
    console.log('Saving task specs:', newSpecs);
    if (!client || !packageId || !session) {
      setUpdateError('Missing required data for update');
      return;
    }
    
    const matchingCap = agentCaps.find(cap => cap.agentId === agentId);
    
    if (!matchingCap) {
      setUpdateError('You do not have the required authorization to update this agent');
      return;
    }
    
    try {
      setIsSaving(true);
      setUpdateError(null);
      setUpdateSuccess(false);

      // Convert TaskSpecification[] to Move format JSON
      const moveFormatSpecs = {
        task_specs: newSpecs.map(spec => ({
          name: spec.name,
          description: spec.description,
          arguments: spec.arguments.map(arg => ({
            name: arg.name,
            type_desc: arg.type_desc,
            description: arg.description,
            required: arg.required,
          })),
          resolver: spec.resolver,
          on_chain: spec.on_chain,
          price: spec.price,
        }))
      };

      const tx = new Transaction();
      tx.callFunction({
        target: `${packageId}::agent::update_agent_task_specs_entry`,
        args: [
          Args.objectId(matchingCap.id), 
          Args.string(JSON.stringify(moveFormatSpecs))
        ],
      });
            
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error('Failed to update task specifications'+ JSON.stringify(result.execution_info));
      }
      
      setUpdateSuccess(true);
      setIsEditingTasks(false);
      refetchAgent();
    } catch (error: any) {
      console.error('Error updating task specifications:', error);
      setUpdateError(error.message || 'Failed to update task specifications');
    } finally {
      setIsSaving(false);
    }
  };

  // Add UI components for username, description, and instructions
  const renderEditableField = (
    field: 'name' | 'description' | 'instructions',
    label: string,
    value: string,
    editValue: string,
    setEditValue: (value: string) => void,
    isEditing: boolean,
    setIsEditing: (value: boolean) => void,
    multiline?: boolean
  ) => {
    return (
      <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
        <dt className="text-sm font-medium text-gray-500 flex items-center">
          {label}
          {isUserAuthorized && !isEditing && (
            <SessionKeyGuard onClick={() => setIsEditing(true)}>
              <button 
                className="ml-2 text-xs text-blue-600 hover:text-blue-800"
                title={`Edit ${label.toLowerCase()}`}
              >
                ✎ Edit
              </button>
            </SessionKeyGuard>
          )}
        </dt>
        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
          {isEditing && isUserAuthorized ? (
            <div>
              {multiline ? (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 mb-2"
                  rows={6}
                  placeholder={`Enter agent ${label.toLowerCase()}...`}
                />
              ) : (
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 mb-2"
                  placeholder={`Enter agent ${label.toLowerCase()}...`}
                />
              )}
              <div className="flex justify-end mt-2">
                <SessionKeyGuard onClick={() => handleSaveAgentInfo(field)}>
                  <button
                    disabled={isSaving}
                    className={`mr-2 text-sm px-3 py-1 rounded ${isSaving ? 'bg-blue-300' : 'bg-blue-600'} text-white`}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </SessionKeyGuard>
                <button
                  onClick={() => handleCancelEdit(field)}
                  className="text-sm px-3 py-1 rounded bg-gray-200 text-gray-700"
                >
                  Cancel
                </button>
              </div>
              {multiline && (
                <div className="mt-4 border-t border-gray-200 pt-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Preview:</h4>
                  <div className="bg-gray-50 p-3 rounded border border-gray-200">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {editValue}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="whitespace-pre-wrap">
              {multiline ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-sm max-w-none"
                >
                  {value || "No content available."}
                </ReactMarkdown>
              ) : (
                value || "Not set"
              )}
            </div>
          )}
        </dd>
      </div>
    );
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error || !agent) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error || 'Agent not found'}</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Agents
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <button 
          onClick={() => navigate('/')}
          className="text-blue-600 hover:text-blue-800 mb-6 inline-flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Agents
        </button>
        
        {/* Status message for updates */}
        {updateSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-green-700 text-sm">Agent updated successfully!</p>
          </div>
        )}
        {updateError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700 text-sm">{updateError}</p>
          </div>
        )}
        
        <div className="mb-6">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              {isEditingName && isUserAuthorized ? (
                <div className="flex-1 flex items-center">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-lg font-medium text-gray-900 border border-gray-300 rounded px-2 py-1 mr-2"
                    autoFocus
                  />
                  <div className="flex items-center">
                    <SessionKeyGuard onClick={() => handleSaveAgentInfo('name')}>
                      <button
                        disabled={isSaving}
                        className={`mr-2 text-sm px-3 py-1 rounded ${isSaving ? 'bg-blue-300' : 'bg-blue-600'} text-white`}
                      >
                        {isSaving ? 'Saving...' : 'Save'}
                      </button>
                    </SessionKeyGuard>
                    <button
                      onClick={() => handleCancelEdit('name')}
                      className="text-sm px-3 py-1 rounded bg-gray-200 text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {agent.name}
                  {isUserAuthorized && (
                    <SessionKeyGuard onClick={() => setIsEditingName(true)}>
                      <button 
                        className="ml-2 text-sm text-blue-600 hover:text-blue-800"
                        title="Edit agent name"
                      >
                        ✎
                      </button>
                    </SessionKeyGuard>
                  )}
                </h3>
              )}
              
              {isUserAuthorized && !isEditingName && (
                <div className="flex items-center">
                  <span className="text-xs text-green-600 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Agent Owner
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('details')}
              className={`${
                activeTab === 'details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Agent Details
            </button>
            <button
              onClick={() => setActiveTab('memories')}
              className={`${
                activeTab === 'memories'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              Memories
              {isLoadingSelfMemories && (
                <div className="ml-2 animate-spin h-4 w-4 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === 'details' ? (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Agent ID</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">{agent.id}</dd>
                </div>
                
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Agent Address</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">
                    <a 
                      href={`${roochscanBaseUrl}/account/${agent.agent_address}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all rounded-full"
                      title={`View ${shortenAddress(agent.agent_address)} on Roochscan`}
                    >
                      {agent.agent_address}
                    </a>
                  </dd>
                </div>

                {/* Username field */}
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Username</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    @{agent.username}
                  </dd>
                </div>

                {/* Description field */}
                {renderEditableField(
                  'description',
                  'Description',
                  agent.description || '',
                  editDescription,
                  setEditDescription,
                  isEditingDescription,
                  setIsEditingDescription,
                  false
                )}

                {/* Instructions field */}
                {renderEditableField(
                  'instructions',
                  'Instructions',
                  agent.instructions || '',
                  editInstructions,
                  setEditInstructions,
                  isEditingInstructions,
                  setIsEditingInstructions,
                  true
                )}

                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Model Provider</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <span className="px-2 py-1 bg-blue-50 rounded text-blue-600 text-xs">
                      {agent.model_provider}
                    </span>
                  </dd>
                </div>

                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Last Active</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {new Date(agent.last_active_timestamp).toLocaleString()}
                  </dd>
                </div>

                {/* Home Channel section */}
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Home Channel</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">
                    {isHomeChannelLoading ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
                        <span className="text-gray-500">Loading home channel...</span>
                      </div>
                    ) : homeChannelId ? (
                      <>
                        <span className="break-all">{homeChannelId}</span>
                        <button 
                          onClick={() => navigate(`/channel/${homeChannelId}`)}
                          className="ml-2 text-blue-600 hover:text-blue-800 text-sm underline"
                        >
                          View
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-500">No home channel found</span>
                    )}
                  </dd>
                </div>

                {/* Task Specifications section */}
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    Task Specifications
                    {isUserAuthorized && !isEditingTasks && (
                      <SessionKeyGuard onClick={() => setIsEditingTasks(true)}>
                        <button className="ml-2 text-xs text-blue-600 hover:text-blue-800">
                          ✎ Edit
                        </button>
                      </SessionKeyGuard>
                    )}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {isLoadingTaskSpecs ? (
                      <div className="flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
                        <span className="text-gray-500">Loading task specifications...</span>
                      </div>
                    ) : isEditingTasks ? (
                      <TaskSpecificationEditor
                        taskSpecs={taskSpecs}
                        onSave={handleSaveTaskSpecs}
                        onCancel={() => setIsEditingTasks(false)}
                      />
                    ) : taskSpecs.length === 0 ? (
                      <p className="text-gray-500">No task specifications available</p>
                    ) : (
                      <div className="space-y-4">
                        {taskSpecs.map((task, index) => (
                          <div key={index} className="border rounded-lg p-4 bg-white">
                            <h4 className="font-medium text-gray-900">{task.name}</h4>
                            <p className="text-gray-600 mt-1">{task.description}</p>
                            
                            {/* Price and Chain Type */}
                            <div className="flex gap-2 mt-2">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                                {task.price} RGas
                              </span>
                              <span className="px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-full">
                                {task.on_chain ? 'On-chain' : 'Off-chain'}
                              </span>
                            </div>
                            
                            {/* Arguments */}
                            {task.arguments.length > 0 && (
                              <div className="mt-3">
                                <h5 className="text-sm font-medium text-gray-700">Arguments:</h5>
                                <div className="mt-2 space-y-2">
                                  {task.arguments.map((arg, argIndex) => (
                                    <div key={argIndex} className="flex items-start space-x-2 text-sm">
                                      <span className="font-mono text-gray-600">{arg.name}</span>
                                      <span className="text-gray-400">|</span>
                                      <span className="text-gray-600">{arg.type_desc}</span>
                                      {arg.required && (
                                        <span className="text-red-500 text-xs">*required</span>
                                      )}
                                      <span className="text-gray-500">{arg.description}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Resolver */}
                            <div className="mt-2 text-sm">
                              <span className="text-gray-500">Resolver: </span>
                              <code className="font-mono text-gray-700">{shortenAddress(task.resolver)}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Agent Memories</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Explore memories formed by this agent through interactions
              </p>
            </div>
            
            {/* Memory search component */}
            <div className="px-4 py-4 border-b border-gray-200">
              <form onSubmit={handleAddressSearch} className="flex">
                <input
                  type="text"
                  value={searchAddress}
                  onChange={(e) => handleSearchAddressChange(e.target.value)}
                  placeholder="Enter an address to view memories about them"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-l-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isSearching || !searchAddress}
                  className={`px-4 py-2 rounded-r-md font-medium text-white ${
                    isSearching || !searchAddress
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isSearching ? 
                    <span className="flex items-center">
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                      Searching...
                    </span> : 
                    'Search'
                  }
                </button>
              </form>
            </div>
        
            {/* Memory sections */}
            <div className="divide-y divide-gray-200">
              {/* Self memories section */}
              <div className="px-4 py-5">
                <h4 className="text-md font-medium text-gray-900 mb-3">Agent's Self-Memories</h4>
                
                {isLoadingSelfMemories ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : selfMemories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">This agent hasn't formed any self memories yet.</p>
                ) : (
                  <MemoryBrowser memories={selfMemories} />
                )}
              </div>
        
              {/* Current user memories section */}
              <div className="px-4 py-5">
                <h4 className="text-md font-medium text-gray-900 mb-3">Memories About You</h4>
                
                {isLoadingUserMemories ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : userMemories.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    This agent hasn't formed any memories about you yet.
                    Interact with the agent to create memories.
                  </p>
                ) : (
                  <MemoryBrowser memories={userMemories} />
                )}
              </div>
        
              {/* Search results section - only show if we've performed a search */}
              {searchAddress && (
                <div className="px-4 py-5">
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Memories About Address: <span className="font-mono text-sm">{searchAddress}</span>
                  </h4>
                  
                  {searchResults.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      No memories found for this address.
                    </p>
                  ) : (
                    <MemoryBrowser memories={searchResults} />
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Agent interactions */}
        <div className="mt-8 p-6 bg-white shadow sm:rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Chat with Agent</h3>
          <p className="text-gray-600 mb-4">Interact with AI agent by sending messages.</p>
          
          <div className="mt-4 flex flex-wrap gap-3">
            {isHomeChannelLoading ? (
              <button
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-400 cursor-not-allowed"
                disabled
              >
                <div className="animate-spin mr-2 h-4 w-4 border-t-2 border-white border-r-2 rounded-full"></div>
                Loading Home Channel...
              </button>
            ) : homeChannelId ? (
              <SessionKeyGuard onClick={() => {
                navigate(`/channel/${homeChannelId}`);
              }}>
              <button 
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Home Channel
              </button>
            </SessionKeyGuard>
            ) : (
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-500 bg-gray-100 cursor-not-allowed"
                disabled
              >
                No Home Channel Available
              </button>
            )}
            <SessionKeyGuard onClick={() => {
              navigate(`/create-channel?agent=${agent.id}`);
            }}>
              <button 
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Direct Message
              </button>
            </SessionKeyGuard>
          </div>
        </div>
      </div>
    </Layout>
  );
}