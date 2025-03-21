import { Agent } from "../types/agent";
import { AgentCard } from "./AgentCard";

interface AgentListProps {
  agents: Agent[];
  userAuthorizedAgentIds: Set<string>;
  onAgentClick: (agent: Agent) => void;
}

export function AgentList({
  agents,
  userAuthorizedAgentIds,
  onAgentClick,
}: AgentListProps) {
  console.log("🚀 ~ AgentList.tsx:10 ~ AgentList ~ agents:", agents);
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {agents.map((agent) => (
        <AgentCard
          key={agent.id}
          agent={agent}
          userAuthorizedAgentIds={userAuthorizedAgentIds}
          onAgentClick={onAgentClick}
        />
      ))}
    </div>
  );
}
