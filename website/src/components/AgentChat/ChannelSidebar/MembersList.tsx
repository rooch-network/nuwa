import { UserGroupIcon } from "@heroicons/react/24/outline";
import { RoochAddress, toShortStr } from "@roochnetwork/rooch-sdk";
import useUserInfo from "@/hooks/useUserInfo";
import { Member } from "@/types/channel";
import { Link } from "react-router-dom";
import { useAgentChat } from "@/contexts/AgentChatContext";

interface MemberItemProps {
  member: Member;
}

function MemberItem({ member }: MemberItemProps) {
  const { userInfo } = useUserInfo(member.address);
  const { agent } = useAgentChat();

  const avatar = member.isAgent
    ? agent?.avatar
    : userInfo?.avatar || member.avatar;
  const name = member.isAgent
    ? agent?.name
    : userInfo?.name ||
      toShortStr(new RoochAddress(member.address).toBech32Address());
  const username = member.isAgent
    ? agent?.username
    : userInfo?.username ||
      toShortStr(new RoochAddress(member.address).toBech32Address());

  const profileUrl = `/profile/${new RoochAddress(
    member.address
  ).toBech32Address()}`;

  return (
    <Link
      to={profileUrl}
      className={`flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-lg cursor-pointer transition-colors duration-150`}
    >
      <img src={avatar} alt={name} className="w-8 h-8 rounded-full" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {name}
          </p>
          {member.isAgent && (
            <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              Agent
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          @{username}
        </p>
      </div>
    </Link>
  );
}

/**
 * MembersList component - Displays the list of channel members
 * Features:
 * - Member avatars and addresses
 * - RGAS balance display
 * - Add member functionality (TODO)
 */
export function MembersList() {
  const { agent, members } = useAgentChat();
  const agentAddress = agent?.address ? new RoochAddress(agent.address) : null;

  // 对成员列表进行排序，将当前 agent 放在最前面
  const sortedMembers = [...members].sort((a, b) => {
    // 如果没有 agent 地址，保持原有顺序
    if (!agentAddress) return 0;

    const memberAddressA = new RoochAddress(a.address);
    const memberAddressB = new RoochAddress(b.address);

    if (memberAddressA.toBech32Address() === agentAddress.toBech32Address()) {
      return -1;
    }
    if (memberAddressB.toBech32Address() === agentAddress.toBech32Address()) {
      return 1;
    }
    return 0;
  });

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <UserGroupIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Members ({members.length})
          </h3>
        </div>
      </div>
      <div className="space-y-2 overflow-y-auto flex-1">
        {sortedMembers.map((member) => {
          const isAgent = Boolean(
            agentAddress &&
              new RoochAddress(member.address).toBech32Address() ===
                agentAddress.toBech32Address()
          );
          return (
            <MemberItem
              key={member.address}
              member={{
                ...member,
                isAgent,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
