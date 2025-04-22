import { AgentInfo } from "./AgentInfo";
import { MembersList } from "./MembersList";
import { useAgentChat } from "../../../contexts/AgentChatContext";

/**
 * ChannelSidebar component - Displays channel information and member list
 * Features:
 * - Agent profile display
 * - Channel statistics
 * - Member list with avatars and addresses
 */
export function ChannelSidebar() {
  const { selectedChannel } = useAgentChat();

  if (!selectedChannel) {
    return null;
  }

  return (
    <div className="w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Agent profile section with stats */}
      <AgentInfo />
      {/* List of channel members */}
      <div className="flex-1 overflow-hidden">
        <MembersList />
      </div>
    </div>
  );
}
