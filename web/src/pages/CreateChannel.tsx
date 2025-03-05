import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { useRoochClient, useRoochClientQuery, useCurrentSession } from '@roochnetwork/rooch-sdk-kit';
import { Args, Transaction } from '@roochnetwork/rooch-sdk';

export function CreateChannel() {
  const [searchParams] = useSearchParams();
  const agentId = searchParams.get('agent');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>('AI Agent');
  
  const navigate = useNavigate();
  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const session = useCurrentSession();

  // Get Agent details to display name
  const { data: agentResponse, isLoading: isAgentLoading } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_id: agentId,
      },
    },
    {
      enabled: !!client && !!packageId && !!agentId,
    }
  );

  // Check if channel already exists
  const { data: existingChannelResponse, isLoading: isChannelCheckLoading } = useRoochClientQuery(
    'executeViewFunction',
    {
      target: `${packageId}::channel::get_ai_peer_channel_id`,
      args: agentId && session 
        ? [Args.objectId(agentId), Args.address(session.getRoochAddress())]
        : [],
    },
    {
      enabled: !!client && !!packageId && !!agentId && !!session,
    }
  );

  // Process agent data to get name
  useEffect(() => {
    if (agentResponse?.data && agentResponse.data.length > 0) {
      const agentObj = agentResponse.data[0];
      const agentData = agentObj.decoded_value.value;
      
      // Get the character ID from the agent data
      const characterId = agentData.character?.value?.id;
      
      if (characterId && client) {
        // Fetch character to get name
        client.queryObjectStates({
          filter: {
            object_id: characterId,
          },
        }).then(characterResponse => {
          if (characterResponse?.data?.[0]?.decoded_value?.value) {
            const characterData = characterResponse.data[0].decoded_value.value;
            setAgentName(characterData.name || 'AI Agent');
          }
        }).catch(err => {
          console.error('Failed to fetch character:', err);
        });
      }
    }
  }, [agentResponse, client]);

  // Check for existing channel and redirect if found
  useEffect(() => {
    if (isAgentLoading || isChannelCheckLoading || !session) {
      return;
    }

    const channelCheckComplete = existingChannelResponse !== undefined;
    
    if (channelCheckComplete) {
      console.log('Existing channel response:', existingChannelResponse);
      
      // Check if we have a valid option with a value
      // When Option is Some(value), it will have a value in the vec
      // When Option is None, vec will be empty
      const hasChannel = existingChannelResponse?.return_values?.[0]?.decoded_value?.value?.vec?.value?.length > 0;
      
      if (hasChannel) {
        // Channel exists, get the object ID from the option value
        const channelId = existingChannelResponse.return_values[0].decoded_value.value.vec.value[0];
        console.log('Channel exists, redirecting to:', channelId);
        navigate(`/channel/${channelId}`);
        return;
      }
      
      // No existing channel, proceed with creation (handled in next effect)
      console.log('No existing channel found, will proceed to creation');
      setIsLoading(false);
    }
  }, [existingChannelResponse, isAgentLoading, isChannelCheckLoading, navigate, session]);

  // Create channel if needed and we've confirmed one doesn't exist
  const createChannel = async () => {
    if (!client || !session || !agentId || !packageId) {
      setError("Missing required data to create channel");
      return;
    }

    setIsLoading(true);
    try {
      const tx = new Transaction();
      tx.callFunction({
        target: `${packageId}::channel::create_ai_peer_channel_entry`,
        args: [Args.objectId(agentId)],
      });
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error('Failed to create channel: ' + JSON.stringify(result.execution_info));
      }
      
      // Extract the Channel object ID from the changeset
      const channelChange = result.output?.changeset?.changes?.find(
        change => change.metadata?.object_type?.endsWith('::channel::Channel')
      );
      
      if (channelChange?.metadata?.id) {
        // Found the channel ID in the changeset
        const channelId = channelChange.metadata.id;
        console.log('Channel created successfully:', channelId);
        navigate(`/channel/${channelId}`);
      } else {
        // If we can't find the Channel in changeset, try an alternative approach
        
        // Generate the expected peer channel ID to see if it matches
        if (session && agentId) {
          // Wait a moment for the transaction to be fully processed
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Query the channel ID using the view function again
          try {
            const checkResponse = await client.executeViewFunction({
              target: `${packageId}::channel::get_ai_peer_channel_id`,
              args: [Args.objectId(agentId), Args.address(session.getRoochAddress())],
            });
            
            // Check if the Option contains a value (Some)
            const hasChannel = checkResponse?.return_values?.[0]?.decoded_value?.value?.vec?.length > 0;
            
            if (hasChannel) {
              const channelId = checkResponse.return_values[0].decoded_value.value.vec[0];
              console.log('Found channel after creation:', channelId);
              navigate(`/channel/${channelId}`);
              return;
            }
          } catch (checkErr) {
            console.error('Error checking for channel after creation:', checkErr);
          }
        }
        
        // If all else fails
        console.error('Could not find channel ID in transaction output');
        setError("Channel was created but we couldn't detect its ID. Redirecting to home page.");
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      console.error('Error creating channel:', error);
      setError(`Failed to create channel: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
    }
  };

  // Auto-create channel when loaded and no existing channel found
  useEffect(() => {
    // Only create if we've confirmed there's no existing channel
    // and we're not already loading
    if (!isLoading && !error && agentId && session && 
        !isChannelCheckLoading && existingChannelResponse && 
        // Check that the Option is None (empty vec)
        existingChannelResponse?.return_values?.[0]?.decoded_value?.value?.vec?.length === 0) {
      console.log('Creating new channel for agent:', agentId);
      createChannel();
    }
  }, [isLoading, error, agentId, session, isChannelCheckLoading, existingChannelResponse]);

  // Redirect to home if no agent ID provided
  useEffect(() => {
    if (!agentId && !isLoading) {
      navigate('/');
    }
  }, [agentId, navigate, isLoading]);

  return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <h1 className="text-xl font-semibold text-center mb-4">
            {isLoading ? 'Setting up chat with ' + agentName : 'Creating a new chat'}
          </h1>
          
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
              <p className="text-gray-500 text-center">
                {isAgentLoading || isChannelCheckLoading ? 
                  'Checking for existing conversations...' : 
                  'Creating a new conversation with ' + agentName + '...'}
              </p>
            </div>
          )}
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-center mt-4">
            <button 
              onClick={() => navigate('/')}
              className="text-blue-600 hover:text-blue-800"
            >
              ← Back to Agents
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}