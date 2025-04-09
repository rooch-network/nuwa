import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRoochClient, useCurrentAddress } from "@roochnetwork/rooch-sdk-kit";
import { RoochClient, RoochAddress, Serializer, Args } from "@roochnetwork/rooch-sdk";
import { useNetworkVariable } from "../hooks/use-networks";
import useAgent from "../hooks/use-agent";
import { SEO } from "../components/layout/SEO";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { NotFound } from "./NotFound";
import useAgentWithAddress from '../hooks/use-agent-with-address'
import useAddressByUsername from '../hooks/use-address-by-username'

interface InputEvent extends React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> {
  target: HTMLInputElement | HTMLTextAreaElement;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

export function AgentDebugger() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const client = useRoochClient();
  const currentAddress = useCurrentAddress();
  const packageId = useNetworkVariable("packageId");

  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [renderedPrompt, setRenderedPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [mockRgasAmount, setMockRgasAmount] = useState<string>("1000000");

  // Check if the identifier is a valid address
  const isAddress = (() => {
      try {
          if (!identifier) return false
          new RoochAddress(identifier)
          return true
      } catch {
          return false
      }
  })()

  const { address, isPending: isAddressPending, isError: isAddressError } = useAddressByUsername(!isAddress ? identifier : undefined)

  // Add agent and userInfo queries for username type
  const { agent, isPending: isAgentPending } = useAgentWithAddress(address || undefined)


  // Update prompt when agent is loaded
  useEffect(() => {
    console.log(agent)
    if (agent?.instructions) {
      setAgentPrompt(agent.instructions);
    }
  }, [agent]);

  // Render Prompt
  const handleRenderPrompt = async () => {
    if (!currentAddress) {
      setError('Please connect your wallet');
      return;
    }

    if (messages.length === 0) {
      setError('Please add at least one message');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get current account address in bech32 format
      const userAddress = currentAddress.genRoochAddress().toBech32Address();

      // Assemble DebugInput
      const debugInput = {
        messages: messages.map((msg, index) => ({
          index: index,
          sender: userAddress,
          content: msg.content,
          timestamp: Date.now(),
          attachments: [],
        })),
        temperature: temperature,
        mock_rgas_amount: mockRgasAmount,
      };

      const response = await client.executeViewFunction({
        target: `${packageId}::agent_debugger::make_debug_ai_request`,
        args: [Args.objectId(agent?.id || ''), Args.string(JSON.stringify(debugInput))],
      });
      console.log(response);

      if (!response.return_values?.[0]?.decoded_value) {
        throw new Error('Failed to get response from contract: ' + JSON.stringify(response));
      }

      const renderedPromptJson = response.return_values[0].decoded_value as string;
      const chatRequest = JSON.parse(renderedPromptJson);
      
      // Extract the system prompt from the chat request
      const systemMessage = (chatRequest.messages as ChatMessage[]).find(msg => msg.role === 'system');
      if (!systemMessage?.content) {
        throw new Error('Invalid response format: missing system message');
      }
      setRenderedPrompt(systemMessage.content);
    } catch (error) {
      console.error('Render prompt error:', error);
      setError(error instanceof Error ? error.message : 'Failed to render prompt');
    } finally {
      setLoading(false);
    }
  };

  // Call OpenAI API
  const handleTestWithOpenAI = async () => {
    if (!apiKey) {
      setError('Please enter OpenAI API Key');
      return;
    }

    if (!userInput.trim()) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Add user message to chat
      const userMessage = { role: 'user' as const, content: userInput };
      setMessages(prev => [...prev, userMessage]);
      setUserInput(''); // Clear input after sending

      // Call OpenAI API directly
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [
            { role: 'system', content: renderedPrompt }, // Use rendered prompt as system message
            ...messages,
            userMessage
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantMessage = { role: 'assistant' as const, content: data.choices[0].message.content };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setError('Failed to call OpenAI API');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Parse Actions from AI response
  const parseActions = (response: string) => {
    const actions: Array<{ name: string; params: any }> = [];
    const lines = response.split('\n');

    for (const line of lines) {
      const match = line.match(/^(\w+::\w+)\s+(.+)$/);
      if (match) {
        try {
          actions.push({
            name: match[1],
            params: JSON.parse(match[2])
          });
        } catch (e) {
          console.warn('Failed to parse action:', line);
        }
      }
    }

    return actions;
  };

  // Handle loading and error states
  if (isAgentPending) {
    return <LoadingScreen agentName={identifier} />;
  }

  if (isAddressError || !agent) {
    return <NotFound />;
  }

  return (
    <> 
      <div className="h-screen flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
          <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 mr-2" />
                <span>Back</span>
              </button>
              <h1 className="ml-6 text-xl font-bold text-gray-900 dark:text-white">
                Debug {agent.name}'s Prompt
              </h1>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Prompt Editor */}
          <div className="w-1/2 flex flex-col border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 p-6 overflow-y-auto">
              {error && (
                <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex items-center space-x-4 mb-4">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    localStorage.setItem('openai_api_key', e.target.value);
                  }}
                  placeholder="Enter your OpenAI API Key"
                  className="w-80 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Temperature:</label>
                  <input
                    type="number"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    min="0"
                    max="2"
                    step="0.1"
                    className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Mock RGas:</label>
                  <input
                    type="text"
                    value={mockRgasAmount}
                    onChange={(e) => setMockRgasAmount(e.target.value)}
                    placeholder="Mock RGas amount"
                    className="w-32 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Prompt Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Agent Prompt
                </label>
                <textarea
                  value={agentPrompt}
                  onChange={(e) => setAgentPrompt(e.target.value)}
                  className="block w-full text-gray-600 dark:text-gray-300 bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-4 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none font-mono text-sm leading-relaxed"
                  placeholder="Enter the AI role prompt..."
                  rows={12}
                />
              </div>

              {/* Rendered Prompt */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Rendered Prompt
                </label>
                <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  {renderedPrompt}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-4">
                <button
                  onClick={handleRenderPrompt}
                  disabled={loading || messages.length === 0}
                  className={`flex-1 px-4 py-2 rounded-md text-white ${
                    loading || messages.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {loading ? 'Loading...' : 'Render Prompt'}
                </button>
                <button
                  onClick={handleTestWithOpenAI}
                  disabled={!renderedPrompt || !apiKey || loading}
                  className={`flex-1 px-4 py-2 rounded-md text-white ${
                    !renderedPrompt || !apiKey || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  {loading ? 'Loading...' : 'Test with OpenAI'}
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel - Chat */}
          <div className="w-1/2 flex flex-col">
            {/* Chat Messages */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${
                      message.role === 'assistant' ? 'justify-start' : 'justify-end'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'assistant'
                          ? 'bg-gray-100 dark:bg-gray-700'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-mono text-sm">
                        {message.content}
                      </pre>
                      {message.role === 'assistant' && (
                        <div className="mt-4 space-y-4">
                          {parseActions(message.content).map((action, actionIndex) => (
                            <div
                              key={actionIndex}
                              className="border border-gray-300 dark:border-gray-600 rounded-md p-4 bg-white dark:bg-gray-800"
                            >
                              <h4 className="text-blue-500 dark:text-blue-400 font-medium mb-2">
                                {action.name}
                              </h4>
                              <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto text-xs">
                                {JSON.stringify(action.params, null, 2)}
                              </pre>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex gap-4">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleTestWithOpenAI();
                    }
                  }}
                  placeholder="Enter message..."
                  className="flex-1 min-h-[80px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-none"
                />
                <button
                  onClick={handleTestWithOpenAI}
                  disabled={!userInput.trim() || !apiKey || loading}
                  className={`px-6 self-end h-10 rounded-md text-white ${
                    !userInput.trim() || !apiKey || loading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AgentDebugger;
