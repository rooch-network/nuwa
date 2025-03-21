import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "../components/Layout";
import { useNetworkVariable } from "../hooks/useNetworkVariable";
import {
  useRoochClient,
  useRoochClientQuery,
  useCurrentWallet,
  useCurrentSession,
  SessionKeyGuard,
  WalletGuard,
} from "@roochnetwork/rooch-sdk-kit";
import { Agent } from "../types/agent";
import { RoochAddress } from "@roochnetwork/rooch-sdk";
import { AgentList } from "../components/AgentList";
import { Button, Tabs } from "@radix-ui/themes";

export function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "authorized">("all");
  const [userAuthorizedAgentIds, setUserAuthorizedAgentIds] = useState<
    Set<string>
  >(new Set());

  const packageId = useNetworkVariable("packageId");
  const client = useRoochClient();
  const wallet = useCurrentWallet();
  const session = useCurrentSession();
  const navigate = useNavigate();

  // Query all Agent objects using useRoochClientQuery
  const {
    data: agentsResponse,
    isLoading: isQueryLoading,
    error: queryError,
  } = useRoochClientQuery(
    "queryObjectStates",
    {
      filter: {
        object_type: `${packageId}::agent::Agent`,
      },
    },
    {
      enabled: !!client && !!packageId,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Query to fetch AgentCap objects for the current user
  const { data: agentCapsResponse, isLoading: isAgentCapsLoading } =
    useRoochClientQuery(
      "queryObjectStates",
      {
        filter: {
          object_type_with_owner: {
            object_type: `${packageId}::agent_cap::AgentCap`,
            owner: wallet?.wallet?.getBitcoinAddress().toStr() || "",
          },
        },
      },
      {
        enabled: !!client && !!packageId && !!wallet?.wallet,
        refetchOnWindowFocus: true,
      }
    );

  useEffect(() => {
    if (isQueryLoading || isAgentCapsLoading) {
      setIsLoading(true);
      return;
    }

    if (queryError) {
      console.error("Failed to fetch agents:", queryError);
      setError("Failed to load agents. Please try again.");
      setIsLoading(false);
      return;
    }

    if (agentsResponse?.data) {
      try {
        // Transform the agent objects
        const parsedAgents = agentsResponse.data.map((obj) => {
          const agentData = obj.decoded_value?.value || {};
          const agentAddress = agentData.agent_address
            ? new RoochAddress(
                String(agentData.agent_address)
              ).toBech32Address()
            : "";

          return {
            id: obj.id,
            name: String(agentData.name || "Unnamed Agent"),
            username: String(agentData.username || ""),
            description: String(agentData.description || ""),
            agentAddress,
            modelProvider: String(agentData.model_provider || "Unknown"),
            createdAt: Number(agentData.last_active_timestamp) || Date.now(),
            instructions: String(agentData.instructions || ""),
            lastActiveTimestamp:
              Number(agentData.last_active_timestamp) || Date.now(),
          };
        });

        // Create a Set of agent object IDs that the user has capability for
        const newUserAuthorizedAgentIds = new Set<string>();
        if (agentCapsResponse?.data && wallet?.wallet) {
          agentCapsResponse.data.forEach((obj) => {
            const capData = obj.decoded_value?.value || {};
            if (capData.agent_obj_id) {
              newUserAuthorizedAgentIds.add(String(capData.agent_obj_id));
            }
          });
        }

        // Update the state with the authorized agent IDs
        setUserAuthorizedAgentIds(newUserAuthorizedAgentIds);

        // Apply filter based on agent caps
        const filteredAgents =
          filter === "authorized" && session?.getRoochAddress()
            ? parsedAgents.filter((agent) =>
                newUserAuthorizedAgentIds.has(agent.id)
              )
            : parsedAgents;

        // Sort agents by creation time (newest first)
        const sortedAgents = filteredAgents.sort(
          (a, b) => b.createdAt - a.createdAt
        );

        setAgents(sortedAgents);
      } catch (err) {
        console.error("Failed to parse agents:", err);
        setError("Error parsing agent data. Please try again.");
      }
    } else {
      setAgents([]);
    }

    setIsLoading(false);
  }, [
    agentsResponse,
    agentCapsResponse,
    isQueryLoading,
    isAgentCapsLoading,
    queryError,
    session,
    filter,
  ]);

  const handleAgentClick = (agent: Agent) => {
    navigate(`/agent/${agent.id}`);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 flex-1">
        {/* Header with filter tabs */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Agents</h1>
            <p className="text-gray-600">
              Discover and interact with autonomous onchain AI agents
            </p>
          </div>

          {/* Create Agent Button - Always visible */}
          <div className="mt-4 sm:mt-0">
            <SessionKeyGuard onClick={() => navigate("/create-agent")}>
              <Button variant="solid" size="3">
                Create New AI Agent
              </Button>
            </SessionKeyGuard>
          </div>
        </div>

        <Tabs.Root
          defaultValue="all"
          onValueChange={(value) => setFilter(value as "all" | "authorized")}
          className="mb-4"
        >
          <Tabs.List>
            <Tabs.Trigger value="all">All Agents</Tabs.Trigger>
            {wallet && (
              <Tabs.Trigger value="authorized">
                <WalletGuard onClick={() => setFilter("authorized")}>
                  Authorized Agents
                </WalletGuard>
              </Tabs.Trigger>
            )}
          </Tabs.List>
        </Tabs.Root>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-600">{error}</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-lg text-gray-600 mb-6">
              {filter === "authorized"
                ? "You don't have authorized control of any agents yet."
                : "No AI agents found on the network."}
            </p>
            <SessionKeyGuard onClick={() => navigate("/create-agent")}>
              <Button variant="solid" size="3">
                Create New Agent
              </Button>
            </SessionKeyGuard>
          </div>
        ) : (
          <AgentList
            agents={agents}
            userAuthorizedAgentIds={userAuthorizedAgentIds}
            onAgentClick={handleAgentClick}
          />
        )}
      </div>
    </Layout>
  );
}
