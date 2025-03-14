import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRoochClient, useRoochClientQuery, useCurrentWallet, useCurrentSession, SessionKeyGuard } from '@roochnetwork/rooch-sdk-kit';
import { useNetworkVariable } from '../hooks/useNetworkVariable';
import { Args, Transaction, bcs } from '@roochnetwork/rooch-sdk';
import { Layout } from '../components/Layout';
import { ChatMessage } from '../components/ChatMessage';
import { ChatInput } from '../components/ChatInput';
import { TypingIndicator } from '../components/TypingIndicator';
import { Channel, Message, CHANNEL_STATUS, MessageSchema } from '../types/channel'; // Add MessageSchema to imports
import { formatTimestamp } from '../utils/time';

export function ChannelPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const [isJoining, setIsJoining] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const packageId = useNetworkVariable('packageId');
  const client = useRoochClient();
  const wallet = useCurrentWallet();
  const session = useCurrentSession();
  
  // Add AI address state
  const [aiAddress, setAiAddress] = useState<string | null>(null);

  // If you want to store more agent info for display
  const [agentInfo, setAgentInfo] = useState<{
    id: string | null;
    name: string | null;
    username: string | null;
    description: string | null;
    agent_address: string | null;
  }>({
    id: null,
    name: null,
    username: null,
    description: null,
    agent_address: null
  });

  // Keep just these two state variables for tracking AI state
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [lastMessageSentByAi, setLastMessageSentByAi] = useState<boolean>(false);

  const logDebug = (message: string, data?: any) => {
    console.log(`[AI-DEBUG] ${message}`, data || '');
  };

  // Fetch channel details
  const { data: channelData, isLoading: isChannelLoading } = useRoochClientQuery(
    'queryObjectStates',
    {
      filter: {
        object_id: channelId,
      },
    },
    {
      enabled: !!packageId && !!channelId,
    }
  );
  
  // Extract channel data from the response
  const channel = channelData?.data?.[0]?.decoded_value?.value;
  
  // Check if the channel is active
  const isChannelActive = channel?.status === CHANNEL_STATUS.ACTIVE;
  
  // Add useEffect to fetch AI address
  useEffect(() => {
    // For AI HOME channels, the creator is the AI
    // For AI PEER channels, we need to find the AI member
    if (channel) {
      const channelType = channel.channel_type;
      
      if (channelType === 0) { // AI HOME
        // In AI HOME channels, the creator is the AI
        setAiAddress(channel.creator);
        console.log('AI HOME channel detected, AI address:', channel.creator);
      } else if (channelType === 1) { // AI PEER
        // In AI PEER channels, find the member that is not the current user
        // This assumes there are only 2 members: the user and the AI
        // We'll need to implement logic to find the AI address in the members
        
        // For now, use the channel.creator as a fallback
        // In a real implementation, you'd determine the AI address from the member list
        const potentialAiAddress = channel.creator;
        setAiAddress(potentialAiAddress);
        console.log('AI PEER channel detected, potential AI address:', potentialAiAddress);
      }
    }
  }, [channel]);

  // Replace the current agent character info fetching useEffect with this simpler one
  useEffect(() => {
    if (channel && client && packageId) {
      // For both AI_HOME and AI_PEER channels, we want to get the agent's name
      
      // Determine which agent to look up
      let agentToLookup = null;
      
      if (channel.channel_type === 0) { // AI HOME
        // In AI HOME, the creator is the agent
        agentToLookup = channel.creator;
      } else if (channel.channel_type === 1) { // AI PEER
        // In AI PEER, the creator also is the agent
        agentToLookup = channel.creator;
      }
      
      if (agentToLookup) {
        // Use the get_agent_info_by_address function to get all agent info in one call
        client.executeViewFunction({
          target: `${packageId}::agent::get_agent_info_by_address`,
          args: [Args.address(agentToLookup)],
        })
        .then(response => {
          console.log('Agent info response:', response);
          
          // Extract the correct agent name from the response
          if (response?.return_values?.[0]?.decoded_value?.value) {
            const agentInfoValue = response.return_values[0].decoded_value.value;
            
            setAgentInfo({
              id: agentInfoValue.id || null,
              name: agentInfoValue.name || null,
              username: agentInfoValue.username || null,
              description: agentInfoValue.description || null,
              agent_address: agentInfoValue.agent_address || null
            });
            
            console.log('Agent info set:', agentInfoValue);
          } else {
            console.warn('No agent info returned');
          }
        })
        .catch(err => {
          console.error('Failed to fetch agent info:', err);
        });
      }
    }
  }, [channel, client, packageId, session]);
  
  // Fetch channel messages
  const { data: messagesData, isLoading: isMessagesLoading, refetch: refetchMessages } = useRoochClientQuery(
    'executeViewFunction',
    {
      target: `${packageId}::channel::get_messages`,
      args: [Args.objectId(channelId)],
    },
    {
      enabled: !!packageId && !!channelId,
      refetchInterval: 5000,
    }
  );
  console.log('Messages data response:', messagesData);
  
  // Define function to deserialize messages
  const deserializeMessages = useMemo(() => {
    if (!messagesData?.return_values?.[0]?.value?.value) {
      console.log('No message data available');
      return [];
    }

    try {
      // Get the hex value from the response
      const hexValue = messagesData.return_values[0].value.value;
      console.log('Hex value:', hexValue);
      
      // Convert hex to bytes
      const cleanHexValue = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
      const bytes = new Uint8Array(
        cleanHexValue.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
      );
      
      // Parse using BCS
      if (!MessageSchema) {
        console.error('MessageSchema is not defined!');
        return [];
      }
      
      console.log('Parsing bytes with BCS:', bytes);
      const parsedMessages = bcs.vector(MessageSchema).parse(bytes);
      console.log('Parsed messages:', parsedMessages);
      
      // Map to our Message interface format
      return parsedMessages.map((message: any) => ({
        id: message.id,
        sender: message.sender,
        content: message.content,
        timestamp: message.timestamp,
        message_type: message.message_type, 
      }));
    } catch (error) {
      console.error('BCS deserialization error:', error);
      return [];
    }
  }, [messagesData]);
  
  // Use the deserialized messages
  const messages: Message[] = deserializeMessages;
  console.log('Processed messages:', messages);
  
  // First, extract the isMember query and refetch functionality
  const { 
    data: isMemberData, 
    isLoading: isMemberLoading, 
    refetch: refetchMembership 
  } = useRoochClientQuery(
    'executeViewFunction',
    {
      target: `${packageId}::channel::is_channel_member`,
      args: channelId && wallet?.wallet? [
        Args.objectId(channelId), 
        Args.address(wallet?.wallet?.getBitcoinAddress())
      ] : [],
    },
    {
      // Only run this query when session is available
      enabled: !!packageId && !!channelId && !!wallet?.wallet,
    }
  );
  
  // Default to false if not a member or if session doesn't exist
  const isMember: boolean = isMemberData?.return_values?.[0]?.decoded_value || false;
  
  // 1. First, add a ref for the messages container
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Update the auto-scroll effect to be more reliable
  useEffect(() => {
    // Check if we should scroll based on proximity to bottom
    const shouldScroll = () => {
      const container = messagesContainerRef.current;
      if (!container) return true; // Default to scrolling if ref not available
      
      // Check if user is already near bottom (within 150px)
      return container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    };
    
    // Only scroll if we're near the bottom already, or if there's AI thinking happening
    if (shouldScroll() || isAiThinking) {
      // Use requestAnimationFrame to ensure DOM is updated first
      requestAnimationFrame(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end' 
          });
        }
      });
    }
  }, [messages, isAiThinking]);  // Also trigger scroll when AI thinking state changes
  
  // Handle joining the channel
  const handleJoinChannel = async () => {
    if (!client || !session || !channelId || !packageId) return;
    
    try {
      setIsJoining(true);
      setErrorMessage('');
      
      const tx = new Transaction();
      tx.callFunction({
        target: `${packageId}::channel::join_channel_entry`,
        args: [Args.objectId(channelId)],
      });
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error('Failed to join channel');
      }
      
      // Refetch both messages and membership status
      setTimeout(() => {
        refetchMessages();
        refetchMembership(); // Add this to update the isMember state
        
        // Local state update for immediate UI response
        // This will make the UI update immediately without waiting for the refetch
        // It will eventually be overridden by the actual result from refetchMembership
        // setIsMember(true);  // We can't do this directly since isMember comes from the query
      }, 1000);
      
    } catch (error) {
      console.error('Error joining channel:', error);
      setErrorMessage('Failed to join channel. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };
  
  // Update the handleSendMessage function to properly handle payment messages
  const handleSendMessage = async (content: string, payment?: { amount: string }) => {
    if (!client || !session || !channelId || !packageId || content.trim() === '') return;
    
    try {
      setIsSending(true);
      setErrorMessage('');
      
      const isAiPeerChannel = channel?.channel_type === 1; // CHANNEL_TYPE_AI_PEER
      const hasExplicitAiMention = content.includes('@AI') || content.toLowerCase().startsWith('/ai');
      
      // In AI PEER channels, always mention the AI
      // In AI HOME channels, mention if explicitly asked or if payment is included
      // Always mention AI when payment is included
      const mentionAI = isAiPeerChannel || hasExplicitAiMention || (payment && !!payment.amount);
      
      // Prepare mentions array
      const mentions = [];
      if (mentionAI && aiAddress) {
        mentions.push(aiAddress);
      }
      
      // Only set AI thinking state if we're actually mentioning the AI
      if (mentionAI && aiAddress) {
                setIsAiThinking(true);
        setLastMessageSentByAi(false);
        console.log('AI thinking state activated for:', agentInfo.name || 'AI Agent', 
          payment ? `with payment of ${payment.amount}` : 'without payment');
      }
      
      // Clean up the content if it starts with /ai
      let finalContent = content;
      if (hasExplicitAiMention && content.toLowerCase().startsWith('/ai')) {
        finalContent = content.substring(3).trim();
      }
      
      const tx = new Transaction();
      
      // Check if this is a payment message
      if (payment && aiAddress && payment.amount) {
          
        console.log(`Sending payment message with ${payment.amount} RGas`);
        
        // Use send_message_with_coin function
        tx.callFunction({
          target: `${packageId}::channel_entry::send_message_with_coin`,
          args: [
            Args.objectId(channelId),
            Args.string(finalContent),
            Args.address(aiAddress), // AI address as recipient
            Args.u256(payment.amount), // Payment amount as raw value
          ],
          typeArgs: ['0x3::gas_coin::RGas'], // Add RGas as coin type
        });
      } else {
        // Use regular send_message function
        tx.callFunction({
          target: `${packageId}::channel_entry::send_message`,
          args: [
            Args.objectId(channelId), 
            Args.string(finalContent),
            Args.vec('address', mentions)
          ],
        });
      }
      
      tx.setMaxGas(5_00000000);
      
      const result = await client.signAndExecuteTransaction({
        transaction: tx,
        signer: session,
      });
      
      if (result.execution_info.status.type !== 'executed') {
        throw new Error('Failed to send message'+JSON.stringify(result.execution_info));
      }

      // Refetch messages after sending
      refetchMessages();
      
      // Set up multiple refetches to ensure we get the AI's response
      const refetchTimes = [1000, 3000, 6000, 10000]; // Try at 1s, 3s, 6s, and 10s
      refetchTimes.forEach(delay => {
        setTimeout(() => refetchMessages(), delay);
      });
      
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message. Please try again.');
      // Reset AI thinking state on error
      setIsAiThinking(false);
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!isAiThinking) return;
    
    // If AI has been "thinking" for more than 1 minute, reset the state
    const timeoutId = setTimeout(() => {
      setIsAiThinking(false);
    }, 60000); // 1 minute timeout
    
    return () => clearTimeout(timeoutId);
  }, [isAiThinking]);

  // Let's also fix the message tracking effect to properly detect AI responses
  useEffect(() => {
    if (!messages || messages.length === 0 || !aiAddress) return;
    
    // Get the last message
    const lastMessage = messages[messages.length - 1];

    logDebug(`Checking last message:`, {
      id: lastMessage.id,
      sender: lastMessage.sender,
      message_type: lastMessage.message_type,
      content: lastMessage.content.substring(0, 50) + '...',
      currentAiThinking: isAiThinking,
      aiAddress,
    });
    
    // If the last message is from AI (based on sender address), the AI has responded
    const isFromAI = lastMessage.sender === aiAddress;
    if (isFromAI) {
      console.log('AI response received, turning off thinking state');
      setIsAiThinking(false);
      setLastMessageSentByAi(true);
      return;
    }
    
    // If the last message is from the current user
    const isFromCurrentUser = lastMessage.sender === session?.getRoochAddress().toHexAddress();
    if (isFromCurrentUser) {
      const isAiPeerChannel = channel?.channel_type === 1;
      
      // In AI_PEER channels, always show thinking indicator after user message
      if (isAiPeerChannel) {
        console.log('AI PEER channel: Setting thinking state after user message');
        setIsAiThinking(true);
        setLastMessageSentByAi(false);
        return;
      }
      
      // In other channels, check if AI is mentioned
      const messageContent = lastMessage.content.toLowerCase();
      const isAiMentioned = messageContent.includes('@ai') || messageContent.startsWith('/ai');
      
      if (isAiMentioned) {
        console.log('AI mentioned: Setting thinking state');
        setIsAiThinking(true);
        setLastMessageSentByAi(false);
      }
    }
  }, [messages, channel?.channel_type, aiAddress, session]);

  // Update the AI thinking timeout to use a longer duration
  useEffect(() => {
    if (!isAiThinking) return;
    
    // If AI has been "thinking" for more than 2 minutes, reset the state
    const timeoutId = setTimeout(() => {
      console.log('AI thinking timeout reached - resetting state');
      setIsAiThinking(false);
    }, 120000); // 2 minute timeout
    
    return () => clearTimeout(timeoutId);
  }, [isAiThinking]);
  
  // Loading state
  if (isChannelLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center flex-1">
          <div className="animate-spin h-10 w-10 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
        </div>
      </Layout>
    );
  }
  
  // Channel not found or error state
  if (!channel) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-4 text-center flex-1 flex items-center justify-center">
          <div>
            <h2 className="text-xl font-semibold text-red-600">Channel not found</h2>
            <p className="mt-2 text-gray-600">The channel you're looking for doesn't exist or has been removed.</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  return (
    <Layout>
     
      <div className="max-w-4xl mx-auto p-4 flex flex-col flex-1">
        {/* Channel Header */}
        <div className="border-b pb-4 mb-4 flex-shrink-0">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{channel.title}</h1>
            <div className={`px-3 py-1 rounded-full text-xs ${
              channel.channel_type === 0 
                ? 'bg-green-100 text-green-800' 
                : 'bg-purple-100 text-purple-800'
            }`}>
              {channel.channel_type === 0 ? 'AI Home' : 'AI 1:1 Chat'}
            </div>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-500 mt-2">
            <div>
              {channel.message_counter} messages • Created: {formatTimestamp(channel.created_at)}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs ${
              isChannelActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isChannelActive ? 'Active' : 'Inactive'}
            </div>
          </div>
        </div>
        
        {/* Error message */}
        {errorMessage && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4 flex-shrink-0">
            {errorMessage}
          </div>
        )}
        
        {/* Join button for non-members */}
        {!isMember && isChannelActive && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4 flex-shrink-0">
            <div className="flex justify-between items-center">
              <p className="text-blue-700">
                Join this channel to participate in the conversation.
              </p>
              <SessionKeyGuard onClick={handleJoinChannel}>
              <button
                className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isJoining}
              >
                {isJoining ? 'Joining...' : 'Join Channel'}
              </button>
              </SessionKeyGuard>
            </div>
          </div>
        )}
        
        {/* Messages - Use flex-1 instead of flex-grow to take up all available space */}
        <div 
          ref={messagesContainerRef}
          className="bg-gray-50 rounded-lg border border-gray-200 p-4 flex-1 flex flex-col overflow-auto"
        >
          {isMessagesLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin h-8 w-8 border-t-2 border-blue-500 border-r-2 rounded-full"></div>
            </div>
          ) : messages && messages.length === 0 ? (
            <div className="flex justify-center items-center h-full text-gray-500">
              No messages yet. Be the first to send a message!
            </div>
          ) : (
            <div className="space-y-4 flex-1">
              {Array.isArray(messages) && messages.map((message, index) => (
                <ChatMessage 
                  key={`${message.id}-${index}`}
                  message={message} 
                  isCurrentUser={message.sender === session?.getRoochAddress().toHexAddress()}
                  isAI={message.sender === aiAddress}
                  agentName={agentInfo.name} // Pass the agent name
                  agentId={agentInfo.id || null} // Pass the agent's object ID from the channel
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message Input - Fixed at bottom */}
        <div className="mt-4 flex-shrink-0">
          {!isChannelActive ? (
            <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
              This channel is no longer active.
            </div>
          ) : !isMember ? (
            <div className="bg-gray-100 rounded-lg p-4 text-center text-gray-600">
              Join this channel to send messages.
            </div>
          ) : (
            <>
              {/* Only show typing indicator when waiting for AI response */}
              {isAiThinking && (
                <TypingIndicator name={agentInfo.name || 'AI Agent'} />
              )}
              
              {/* AI Hint Card */}
              {isMember && isChannelActive && (
                <div className="mb-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-100">
                  <div className="flex items-start space-x-3">
                    <div className="bg-blue-100 rounded-full p-2 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a 1 1 0 011.12-.38z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Interact with AI</h4>
                      {channel.channel_type === 0 ? (
                        // AI HOME instruction
                        <>
                          <p className="text-sm text-gray-600 mt-1">
                            Use <code className="bg-white px-1 py-0.5 rounded border border-gray-200">@AI</code> or start with <code className="bg-white px-1 py-0.5 rounded border border-gray-200">/ai</code> to trigger AI responses.
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            Example: "/ai Tell me more about blockchain technology?" or "Hey @AI, how's the weather today?"
                          </div>
                          <div className="mt-2 text-xs bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-700">
                            <span className="font-medium">Note:</span> Each AI interaction requires a base fee of 5 RGas. You can also add extra tips to prioritize your request.
                          </div>
                        </>
                      ) : (
                        // AI PEER instruction
                        <>
                          <p className="text-sm text-gray-600 mt-1">
                            This is a 1:1 chat with the AI. Every message you send will automatically trigger a response.
                          </p>
                          <div className="mt-2 text-xs text-gray-500">
                            You can simply type your message and send it - no need to use @AI or /ai in this channel.
                          </div>
                          <div className="mt-2 text-xs bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-700">
                            <span className="font-medium">Note:</span> Each message requires a base fee of 5 RGas. You can also add extra tips to prioritize your request.
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <ChatInput 
                onSend={handleSendMessage} 
                disabled={!isMember || isSending || !isChannelActive}
                placeholder={
                  channel.channel_type === 0 
                    ? "Type your message... (Use @AI or /ai to interact with AI)" 
                    : "Type your message to the AI..."
                }
                showPaymentOption={isMember && isChannelActive && aiAddress !== null} // Only show payment option when AI exists
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
