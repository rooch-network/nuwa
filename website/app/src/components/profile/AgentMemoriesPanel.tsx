import { useState } from "react";
import {
  InboxIcon,
  ClockIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useAgentProfile } from "./AgentProfileContext";
import { useAgentMemories } from "@/hooks/useAgentMemories";

export function AgentMemoriesPanel() {
  const { agent, currentAddress } = useAgentProfile();
  const [activeMemoryTab, setActiveMemoryTab] = useState<"all" | "user">("all");

  const {
    memories: allMemories,
    isLoading: isLoadingMemories,
    error: memoriesError,
    refetch: refetchMemories,
  } = useAgentMemories({
    agentId: agent?.id || "",
  });

  const {
    memories: userMemories,
    isLoading: isLoadingUserMemories,
    error: userMemoriesError,
    refetch: refetchUserMemories,
  } = useAgentMemories({
    agentId: agent?.id || "",
    targetAddress: currentAddress || undefined,
  });

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Agent Memory
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveMemoryTab("all")}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  activeMemoryTab === "all"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Agent Self Memory
              </button>
              {currentAddress && (
                <button
                  onClick={() => setActiveMemoryTab("user")}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeMemoryTab === "user"
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Agent Memories About You
                </button>
              )}
            </div>
          </div>
          <button
            onClick={
              activeMemoryTab === "all" ? refetchMemories : refetchUserMemories
            }
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <ArrowPathIcon className="w-4 h-4 mr-1.5" />
            Refresh
          </button>
        </div>

        {activeMemoryTab === "all" ? (
          isLoadingMemories ? (
            <div className="flex justify-center items-center py-8">
              <svg
                className="w-8 h-8 animate-spin text-purple-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                ></path>
              </svg>
            </div>
          ) : memoriesError ? (
            <div className="text-center py-8 px-4">
              <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-4">
                <svg
                  className="w-16 h-16 text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                Load failed
              </h3>
              <p className="text-sm text-red-500 dark:text-red-400 max-w-sm mx-auto mb-4">
                {memoriesError || "Load memory failed"}
              </p>
              <button
                onClick={refetchMemories}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : allMemories.length === 0 ? (
            <div className="text-center py-8 px-4">
              <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center mb-4">
                <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No memories
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                The agent has not created any memories yet.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {allMemories.map((memory, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-2">
                        <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                          记忆 #{index + 1}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {memory.content}
                      </p>
                      {memory.context && (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                          {memory.context}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                      <ClockIcon className="w-4 h-4 mr-1" />
                      {new Date(memory.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : isLoadingUserMemories ? (
          <div className="flex justify-center items-center py-8">
            <svg
              className="w-8 h-8 animate-spin text-purple-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              ></path>
            </svg>
          </div>
        ) : userMemoriesError ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-16 h-16 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              Load failed
            </h3>
            <p className="text-sm text-red-500 dark:text-red-400 max-w-sm mx-auto mb-4">
              {userMemoriesError || "Load memory failed"}
            </p>
            <button
              onClick={refetchUserMemories}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : userMemories.length === 0 ? (
          <div className="text-center py-8 px-4">
            <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center mb-4">
              <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No memories about you
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              The agent has not created any memories about you yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {userMemories.map((memory, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded">
                        Memory #{index + 1}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 dark:text-gray-100">
                      {memory.content}
                    </p>
                    {memory.context && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        {memory.context}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <ClockIcon className="w-4 h-4 mr-1" />
                    {new Date(memory.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
