import { useNavigate } from "react-router-dom";
import {
  ChatBubbleLeftIcon,
  PencilIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import useAllAgents from "@/hooks/useAllAgents";
import useAgentCaps from "@/hooks/useAgentCaps";
import { useMemo } from "react";
import { SEO } from "../components/layout/SEO";
import {
  ConnectButton,
  SessionKeyGuard,
  useConnectionStatus,
} from "@roochnetwork/rooch-sdk-kit";

/**
 * AIStudio Component
 * Main page for managing AI agents, allowing users to create, view, and interact with their AI agents
 */
export const AIStudio = () => {
  const navigate = useNavigate();
  const connectStatus = useConnectionStatus();

  // Fetch all agents and their capabilities
  const { agents } = useAllAgents();
  const { caps } = useAgentCaps();

  // Filter agents based on user's capabilities
  const filteredAgents = useMemo(() => {
    return agents.filter((agent) => caps.has(agent.id));
  }, [agents, caps]);

  return (
    <>
      {/* SEO metadata for the page */}
      <SEO
        title="AI Studio"
        description="Nuwa AI Studio - Create, test, and deploy AI agents. A powerful platform for developing and experimenting with Web3 AI Agents on blockchain."
        keywords="AI Studio, Web3 AI Development, AI Agent Testing, Blockchain AI, Nuwa Development Platform"
      />
      <div className="min-h-screen dark:bg-gray-900">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Page header with title and new agent button */}
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                AI Studio
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create, test, and manage your AI agents
              </p>
            </div>
            {connectStatus === "connected" && (
              <SessionKeyGuard onClick={() => navigate("/studio/create")}>
                <button className="flex items-center space-x-2 bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700">
                  <PlusIcon className="w-5 h-5" />
                  <span>New Agent</span>
                </button>
              </SessionKeyGuard>
            )}
          </div>

          {/* Main content panel for displaying agents */}
          <div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border border-gray-200 dark:border-gray-800">
              {/* Wallet connection prompt */}
              {connectStatus !== "connected" ? (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 mb-4">
                    <PlusIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Connect Your Wallet
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Please connect your wallet to view and manage your AI agents
                  </p>
                  <ConnectButton className="!inline-flex !items-center !space-x-2 !bg-purple-600 !text-white !rounded-lg !px-6 !py-3 hover:!bg-purple-700 !transition-colors !duration-200 !text-sm !font-medium !leading-5 !border-0">
                    <PlusIcon className="w-5 h-5" />
                    <span>Connect Wallet</span>
                  </ConnectButton>
                </div>
              ) : filteredAgents.length === 0 ? (
                // Empty state when no agents are created
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 dark:bg-purple-900 mb-4">
                    <PlusIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    No Agents Created Yet
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    Start by creating your first AI Agent
                  </p>
                  <SessionKeyGuard onClick={() => navigate("/studio/create")}>
                    <button className="inline-flex items-center space-x-2 bg-purple-600 text-white rounded-lg px-6 py-3 hover:bg-purple-700">
                      <PlusIcon className="w-5 h-5" />
                      <span>Create New Agent</span>
                    </button>
                  </SessionKeyGuard>
                </div>
              ) : (
                // Grid of agent cards
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAgents.map((agent) => (
                    <div
                      key={agent.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 relative flex flex-col min-h-[200px]"
                    >
                      {/* Chat button for each agent */}
                      <button
                        onClick={() => navigate(`/agent/${agent.username}`)}
                        className="absolute top-3 right-3 flex items-center justify-center p-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                        title="Chat"
                      >
                        <ChatBubbleLeftIcon className="w-5 h-5" />
                      </button>
                      {/* Agent information display */}
                      <div className="flex items-center space-x-4 mb-4">
                        <img
                          src={
                            agent.avatar ||
                            "https://api.dicebear.com/7.x/bottts/svg?seed=task_helper"
                          }
                          alt={agent.name}
                          className="w-12 h-12 rounded-full bg-gray-100"
                        />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {agent.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            @{agent.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {agent.description}
                          </p>
                        </div>
                      </div>
                      {/* Profile edit button */}
                      <div className="flex items-center space-x-3 mt-auto">
                        <button
                          onClick={() => navigate(`/profile/${agent.address}`)}
                          className="flex-1 flex items-center justify-center space-x-2 bg-purple-600 text-white rounded-lg px-4 py-2 hover:bg-purple-700"
                        >
                          <PencilIcon className="w-5 h-5" />
                          <span>Profile</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
