import { useParams, useNavigate } from "react-router-dom";
import { DialogSidebar, ChatArea, ChannelSidebar } from "../components/AgentChat";
import { useEffect } from "react";
import { AgentChatProvider, useAgentChat } from "../contexts/AgentChatContext";
import { LoadingScreen } from "../components/layout/LoadingScreen";
import { NotFound } from "./NotFound";

/**
 * AgentChat component - Main chat interface for interacting with an AI agent
 * Features:
 * - Real-time messaging with AI agent
 * - Channel management (join/leave)
 * - Member list display
 * - Message history
 */
export function AgentChat() {
  const { username, channelTitle } = useParams<{ username: string; channelTitle?: string }>();


  if (!username) {
    return <NotFound />
  }

  // 将 URL 中的下划线转换回空格
  const decodedChannelTitle = channelTitle ? channelTitle.replace(/_/g, ' ') : undefined;

  return (
    <AgentChatProvider agentUsername={username}>
      <AgentChatContent initialChannelTitle={decodedChannelTitle} />
    </AgentChatProvider>
  );
}

interface AgentChatContentProps {
  initialChannelTitle?: string;
}

function AgentChatContent({ initialChannelTitle }: AgentChatContentProps) {
  const { agent, channels, isChannelsPending, isAgentPending, selectedChannel, setSelectedChannel, refetchChannels, isAddressError } = useAgentChat();
  const navigate = useNavigate();
  const { username } = useParams<{ username: string }>();

  // 将 channel title 转换为 URL 友好的格式（用下划线替代空格）
  const encodeChannelTitle = (title: string) => title.replace(/\s+/g, '_');

  useEffect(() => {

    if (channels) {
      if (initialChannelTitle) {
        // 如果提供了 channel title，尝试找到对应的 channel
        const channel = channels.find(c => c.title === initialChannelTitle);
        if (channel) {
          setSelectedChannel(channel.id);
        }
      } else if (!selectedChannel) {
        // 只有在没有 initialChannelTitle 且没有选中 channel 时，才使用第一个 channel
        setSelectedChannel(channels[0].id);
        // 更新 URL 为第一个 channel 的 title（使用下划线）
        navigate(`/agent/${username}/${encodeChannelTitle(channels[0].title)}`, { replace: true });
      }
    }
  }, [channels, initialChannelTitle, navigate, username, selectedChannel]);

  // Handle channel switch
  const handleChannelSelect = (channelId: string) => {
    const channel = channels?.find(c => c.id === channelId);
    if (channel) {
      setSelectedChannel(channelId);
      // Update URL to the selected channel's title (using underscores)
      navigate(`/agent/${username}/${encodeChannelTitle(channel.title)}`, { replace: true });
    }
  };

  // If the address is not found, show 404 page
  if (isAddressError) {
    return <NotFound />;
  }

  // Show loading state for agent or channels
  if (isAgentPending || isChannelsPending || !channels) {
    return <LoadingScreen agentName={agent?.name} />;
  }



  // 修改错误处理的逻辑
  if (channels && initialChannelTitle) {
    const channelExists = channels.some(c =>
      c.title === initialChannelTitle ||
      c.title === initialChannelTitle.replace(/\s+/g, '_')
    );
    if (!channelExists) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Can't find the specified dialog</h2>
            <p className="text-gray-600 dark:text-gray-400">Please check the URL is correct, or choose another dialog.</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar showing dialog list */}
        <DialogSidebar
          channels={channels}
          onChannelSelect={handleChannelSelect}
          onRefresh={refetchChannels}
        />

        {/* Main chat area with messages and input */}
        <ChatArea />

        {/* Right sidebar showing channel info and members */}
        <ChannelSidebar />
      </div>
    </div>
  );
}
