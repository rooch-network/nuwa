import { AgentCard } from "@/components/AgentCard";
import { SEO } from "@/components/layout/SEO";
import useAllAgents from "@/hooks/useAllAgents";
import { IndexerStateIDView } from "@roochnetwork/rooch-sdk";
import { useMemo, useState } from "react";

export const AllAgents = () => {
  const [page, setPage] = useState(1);
  const [lastCursor, setLastCursor] = useState<IndexerStateIDView | undefined>(
    undefined
  );
  const [allAgents, setAllAgents] = useState<any[]>([]);
  const { agents, isPending, isError, hasNext, cursor } = useAllAgents({
    limit: "8",
    cursor: page > 1 ? lastCursor : undefined,
  });

  useMemo(() => {
    if (agents.length > 0) {
      // Use Set to deduplicate based on agent_address
      const existingAddresses = new Set(
        allAgents.map((agent) => agent.agent_address)
      );
      const newAgents = agents.filter(
        (agent) => !existingAddresses.has(agent.agent_address)
      );
      setAllAgents((prev) => [...prev, ...newAgents]);
    }
  }, [agents]);

  const handleLoadMore = () => {
    if (cursor) {
      setLastCursor(cursor as IndexerStateIDView);
    }
    setPage((prev) => prev + 1);
  };

  if (isPending && page === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Error loading agents</div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="All Agents"
        description="Browse all AI agents on Nuwa platform. Discover and interact with autonomous AI agents that can manage crypto assets and execute on-chain operations."
        keywords="AI Agents, Web3 AI, Autonomous Agents, Crypto Agents, Blockchain AI, Nuwa Agents"
      />
      <div className="min-h-screen">
        <div className="container mx-auto px-4 py-12">
          <h1 className="text-3xl font-bold mb-8">All Agents</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {allAgents.map((ai) => (
              <AgentCard key={ai.agent_address} agent={ai} />
            ))}
          </div>
          {hasNext && (
            <div className="mt-8 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={isPending}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
