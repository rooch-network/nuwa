import {
  UserCircleIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ArrowLeftOnRectangleIcon,
} from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import useAgentBalance from "@/hooks/useAgentBalance";
import { useChannelLeave } from "@/hooks/useChannelLeave";
import useChannelJoinedStatus from "@/hooks/useChannelJoinedStatus";
import useAgentJoined from "@/hooks/useAgentJoined";
import useChannelMembers from "@/hooks/useChannelMembers";
import { useAgentChat } from "@/contexts/AgentChatContext";
import { SessionKeyGuard } from "@roochnetwork/rooch-sdk-kit";

/**
 * AgentProfile component - Displays agent information and channel statistics
 * Features:
 * - Agent avatar and name
 * - Channel member count
 * - Agent balance
 * - Profile navigation button
 */
export function AgentInfo() {
  const navigate = useNavigate();
  const { agent, selectedChannel, memberCount } = useAgentChat();
  const { balance, isPending: isBalancePending } = useAgentBalance(
    agent?.agent_address
  );

  const { isJoined, refetch: refetchIsjoined } = useChannelJoinedStatus(
    selectedChannel || ""
  );
  const { refetch: refetchJoinedAgent } = useAgentJoined();
  const { refetch: refetchChannelMembers } = useChannelMembers({
    channelId: selectedChannel || "",
    limit: "100",
  });
  const { mutateAsync: leaveChannel, isPending: leaveIsPending } =
    useChannelLeave();

  const handleLeaveChannel = async () => {
    if (!selectedChannel) {
      return;
    }
    leaveChannel({
      id: selectedChannel,
    }).finally(() => {
      refetchIsjoined();
      refetchJoinedAgent();
      refetchChannelMembers();
    });
  };

  if (!agent) {
    return (
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          No agent information available
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col space-y-4">
        {/* Header Section with Avatar and Basic Info */}
        <div className="flex items-start space-x-4">
          {/* Avatar Section */}
          <div className="relative">
            <img
              src={
                agent.avatar ||
                "https://api.dicebear.com/7.x/bottts/svg?seed=" + agent.id
              }
              alt="AI Avatar"
              className="w-16 h-16 rounded-full ring-2 ring-purple-100 dark:ring-purple-900/30"
            />
          </div>

          {/* Basic Info Section */}
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {agent.name}
            </h2>
            <div className="text-sm text-purple-600 dark:text-purple-400">
              @{agent.username}
            </div>
          </div>
        </div>

        {/* Description Section */}
        {agent.description && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            {agent.description}
          </div>
        )}

        {/* Stats Section */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <UserGroupIcon className="w-4 h-4 mr-1" />
            <span>{memberCount || 0}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
            <CurrencyDollarIcon className="w-4 h-4 mr-1" />
            {isBalancePending ? (
              <span className="animate-pulse">...</span>
            ) : (
              <span>
                {(Number(balance?.balance || 0) / 1e8).toLocaleString()} RGAS
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => navigate(`/profile/${agent.agent_address}`)}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
          >
            <UserCircleIcon className="w-5 h-5" />
            <span className="font-medium">View Profile</span>
          </button>

          {isJoined && (
            <SessionKeyGuard onClick={handleLeaveChannel}>
              <button className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg transition-colors">
                <ArrowLeftOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">
                  {leaveIsPending ? "Leaving..." : "Leave Channel"}
                </span>
              </button>
            </SessionKeyGuard>
          )}
        </div>
      </div>
    </div>
  );
}
