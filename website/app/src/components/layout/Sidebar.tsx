import { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import useAllAgents from "@/hooks/useAllAgents";
import useAgentJoined from "@/hooks/useAgentJoined";

interface SidebarProps {
  onCollapse: (isCollapsed: boolean) => void;
  isCollapsed?: boolean;
}

export function Sidebar({
  onCollapse,
  isCollapsed: propIsCollapsed,
}: SidebarProps) {
  const [localIsCollapsed, setLocalIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  const { joinedAgents } = useAgentJoined();
  const { agents: allAgents } = useAllAgents();

  // Get current agent ID from URL
  const currentAgentUsername = location.pathname.split("/agent/")[1];

  // Filter agents based on search query
  const filteredAgents = useMemo(() => {
    // If search query is empty, only show joined agents
    if (!searchQuery.trim()) return joinedAgents || [];

    // If there's a search query, search through all agents
    const query = searchQuery.toLowerCase().trim();
    return (allAgents || []).filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.username.toLowerCase().includes(query)
    );
  }, [joinedAgents, allAgents, searchQuery]);

  // Use prop value or local state
  const isCollapsed = propIsCollapsed ?? localIsCollapsed;

  // Use unified mock data
  // const agentNames = mockAgents

  const handleCollapse = () => {
    const newCollapsedState = !isCollapsed;
    setLocalIsCollapsed(newCollapsedState);
    onCollapse(newCollapsedState);
  };

  return (
    <div
      className={`fixed left-0 top-16 h-[calc(100vh-4rem)] dark:bg-gray-900 border-gray-200 dark:border-gray-800 transition-all duration-300 ease-in-out z-50 ${
        isCollapsed ? "w-16 bg-gray-50" : "w-64 bg-gray-50"
      }`}
    >
      <div className="flex flex-col h-full">
        {/* Header with Collapse Button and Search */}
        <div className="px-2 py-2">
          <div
            className={`flex items-center ${
              isCollapsed ? "justify-center" : "space-x-2"
            }`}
          >
            <div
              className={`relative flex-1 transition-all duration-300 ease-in-out ${
                isCollapsed ? "hidden" : "w-auto"
              }`}
            >
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={handleCollapse}
              className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-0 focus:ring-offset-0 transition-colors duration-200 rounded-lg text-gray-600 dark:text-gray-300"
            >
              <div className="relative w-5 h-5">
                <svg
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isCollapsed
                      ? "opacity-100 rotate-0"
                      : "opacity-0 -rotate-180"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                <svg
                  className={`absolute inset-0 transition-all duration-300 ease-in-out ${
                    isCollapsed
                      ? "opacity-0 rotate-180"
                      : "opacity-100 rotate-0"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Expanded State Content */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              isCollapsed
                ? "opacity-0 h-0 overflow-hidden"
                : "opacity-100 h-auto"
            }`}
          >
            <div className="px-4 pt-2">
              <div className="space-y-3 h-[calc(100vh-12rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.username}
                    className={`flex items-start space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                      agent.username === currentAgentUsername
                        ? "bg-purple-200 dark:bg-purple-500/50"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800"
                    }`}
                    onClick={() => navigate(`/agent/${agent.username}`)}
                  >
                    <img
                      src={agent.avatar}
                      alt={agent.name}
                      className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full aspect-square object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {agent.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                        @{agent.username}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Collapsed State Avatars */}
          <div
            className={`transition-all duration-300 ease-in-out ${
              isCollapsed
                ? "opacity-100 h-auto"
                : "opacity-0 h-0 overflow-hidden"
            }`}
          >
            <div className="px-2 py-2 space-y-3">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.username}
                  className={`flex justify-center cursor-pointer rounded-lg p-2 transition-colors ${
                    agent.username === currentAgentUsername
                      ? "bg-purple-200 dark:bg-purple-500/50"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => navigate(`/agent/${agent.username}`)}
                >
                  <img
                    src={agent.avatar}
                    alt={agent.name}
                    className="min-w-[40px] min-h-[40px] w-10 h-10 rounded-full aspect-square object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
