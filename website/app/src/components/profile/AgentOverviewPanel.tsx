import { ClipboardIcon } from "@heroicons/react/24/outline";
import { useAgentProfile } from "./AgentProfileContext";

const roochScanBaseUrl = "https://test.roochscan.io";

export function AgentOverviewPanel() {
  const { agent, handleCopy } = useAgentProfile();

  return (
    <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
          Overview
        </h2>

        <div className="space-y-6">
          {/* Character Username */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Username
            </h3>
            <div className="flex items-center group">
              <code className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-800/50 p-2 rounded flex-1">
                {agent?.username}
              </code>
            </div>
          </div>

          {/* Agent ID */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Agent ID
            </h3>
            <div className="flex items-center group">
              <code className="text-sm text-gray-900 dark:text-gray-100 font-mono bg-gray-50 dark:bg-gray-800/50 p-2 rounded flex-1 break-all">
                {agent?.id}
              </code>
              <button
                onClick={() => handleCopy(agent?.id || "")}
                className="ml-2 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                title="Copy to clipboard"
              >
                <ClipboardIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Agent Address */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              Agent Address
            </h3>
            <div className="flex items-center group">
              <div className="flex flex-col flex-1">
                <div className="flex items-center space-x-2">
                  <code className="text-sm text-gray-900 dark:text-gray-100 font-mono break-all">
                    {agent?.agent_address}
                  </code>
                  <button
                    onClick={() => handleCopy(agent?.agent_address || "")}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    title="Copy address"
                  >
                    <ClipboardIcon className="w-4 h-4" />
                  </button>
                </div>
                <a
                  href={`${roochScanBaseUrl}/account/${agent?.agent_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 cursor-pointer mt-0.5"
                >
                  <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                    View in browser
                  </span>
                </a>
              </div>
            </div>
          </div>

          {/* Other Info Grid */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Model Provider
              </h3>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {agent?.modelProvider}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                Last Active Time
              </h3>
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {agent?.lastActive}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
