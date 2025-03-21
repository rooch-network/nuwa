import { Agent } from "../types/agent";

interface AgentCardProps {
  agent: Agent;
  userAuthorizedAgentIds: Set<string>;
  onAgentClick: (agent: Agent) => void;
}

export function AgentCard({
  agent,
  userAuthorizedAgentIds,
  onAgentClick,
}: AgentCardProps) {
  return (
    <div
      onClick={() => onAgentClick(agent)}
      className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <h2 className="text-xl font-semibold mb-2">{agent.name}</h2>
      {agent.description && (
        <p className="text-gray-600 mb-4 line-clamp-2">{agent.description}</p>
      )}
      <div className="flex items-center justify-between text-gray-500 text-sm">
        <div className="flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          {agent.agentAddress && (
            <span title={agent.agentAddress} className="text-xs">
              {agent.agentAddress.substring(0, 8)}...
              {agent.agentAddress.substring(agent.agentAddress.length - 6)}
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
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
          <span>You have authorization</span>
        </div>
      )}
    </div>
  );
}
