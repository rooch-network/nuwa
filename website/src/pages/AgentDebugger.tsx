import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { useRoochClient } from "@roochnetwork/rooch-sdk-kit";
import { RoochAddress, Serializer, Args } from "@roochnetwork/rooch-sdk";
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

export function AgentDebugger() {
  const { identifier } = useParams<{ identifier: string }>();
  const navigate = useNavigate();
  const client = useRoochClient();
  const packageId = useNetworkVariable("packageId");

  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('openai_api_key') || '');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [debugMessage, setDebugMessage] = useState('');
  const [renderedPrompt, setRenderedPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [activeTab, setActiveTab] = useState<'prompt' | 'response'>('prompt');
  const [error, setError] = useState<string | null>(null);

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
    try {
      setLoading(true);
      setError(null);
      const response = await client.executeViewFunction({
        target: "agent_framework::prompt_renderer::render_debug_prompt",
        args: [Args.string(agentPrompt), Args.string(debugMessage)],
      });
      setRenderedPrompt(response.return_values?.[0]?.decoded_value as string);
    } catch (error) {
      setError('Failed to render prompt');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Call OpenAI API directly
  const handleTestWithOpenAI = async () => {
    if (!apiKey) {
      setError('Please enter OpenAI API Key');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call OpenAI API directly
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4",
          messages: [{ role: "user", content: renderedPrompt }],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      setAiResponse(data.choices[0].message.content);
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
      <SEO
        title={`Debug ${agent.name}'s Prompt`}
        description={`Debug and test prompts for ${agent.name} on Nuwa platform`}
        keywords="AI Agent, Debug Prompt, Test Prompt, Nuwa Agent"
      />
      <div className="max-w-6xl mx-auto p-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span>Back</span>
          </button>

          <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
            Debug {agent.name}'s Prompt
          </h1>

          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-lg">
              {error}
            </div>
          )}

          {/* API Key Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                localStorage.setItem('openai_api_key', e.target.value);
              }}
              placeholder="Enter your OpenAI API Key"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
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
              placeholder="Input the prompt of the AI role..."
              rows={12}
            />
          </div>

          {/* Debug Message */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Debug Message
            </label>
            <textarea
              rows={4}
              value={debugMessage}
              onChange={(e) => setDebugMessage(e.target.value)}
              placeholder="Enter debug message"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={handleRenderPrompt}
              disabled={loading}
              className={`px-4 py-2 rounded-md text-white ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
              }`}
            >
              {loading ? 'Loading...' : 'Render Prompt'}
            </button>
            <button
              onClick={handleTestWithOpenAI}
              disabled={!renderedPrompt || !apiKey || loading}
              className={`px-4 py-2 rounded-md text-white ${
                !renderedPrompt || !apiKey || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              }`}
            >
              {loading ? 'Loading...' : 'Test with OpenAI'}
            </button>
          </div>

          {/* Results Display */}
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            <div className="flex border-b border-gray-300 dark:border-gray-600">
              <button
                onClick={() => setActiveTab('prompt')}
                className={`flex-1 px-4 py-2 text-center ${
                  activeTab === 'prompt'
                    ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Rendered Prompt
              </button>
              <button
                onClick={() => setActiveTab('response')}
                className={`flex-1 px-4 py-2 text-center ${
                  activeTab === 'response'
                    ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                AI Response
              </button>
            </div>

            <div className="p-4">
              {activeTab === 'prompt' ? (
                <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                  {renderedPrompt}
                </pre>
              ) : (
                <div>
                  <div className="mb-6">
                    <h4 className="text-lg font-medium mb-2">Raw Response:</h4>
                    <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                      {aiResponse}
                    </pre>
                  </div>
                  {aiResponse && (
                    <div>
                      <h4 className="text-lg font-medium mb-2">Parsed Actions:</h4>
                      <div className="space-y-4">
                        {parseActions(aiResponse).map((action, index) => (
                          <div
                            key={index}
                            className="border border-gray-300 dark:border-gray-600 rounded-md p-4"
                          >
                            <h4 className="text-blue-500 dark:text-blue-400 font-medium mb-2">
                              {action.name}
                            </h4>
                            <pre className="bg-gray-50 dark:bg-gray-900 p-2 rounded overflow-x-auto">
                              {JSON.stringify(action.params, null, 2)}
                            </pre>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default AgentDebugger;
