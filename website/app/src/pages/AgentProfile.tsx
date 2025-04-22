import { useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { SEO } from "../components/layout/SEO";
import { AgentProfilePanel } from "../components/profile/AgentProfilePanel";
import { AgentProfileProvider } from "../components/profile/AgentProfileContext";
import { AgentTasksPanel } from "../components/profile/AgentTasksPanel";
import { AgentOverviewPanel } from "../components/profile/AgentOverviewPanel";
import { AgentPromptPanel } from "../components/profile/AgentPromptPanel";
import { AgentMemoriesPanel } from "../components/profile/AgentMemoriesPanel";
import { AgentTemperaturePanel } from "../components/profile/AgentTemperaturePanel";


interface AgentProfileProps {
  address: string
}

export function AgentProfile({ address }: AgentProfileProps) {
  const navigate = useNavigate();

  return (
    <AgentProfileProvider address={address}>
      <SEO
        title="Agent Profile"
        description="View detailed information about this AI agent on Nuwa platform."
        keywords="AI Agent, Web3 AI, Autonomous Agent, Crypto Agent, Blockchain AI, Nuwa Agent"
        ogUrl={`https://nuwa.dev/agents/${address}`}
      />
      <ToastContainer />
      <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 mr-2" />
            <span>Back</span>
          </button>

          {/* Profile Card */}
          <AgentProfilePanel />

          {/* Overview Section */}
          <AgentOverviewPanel />

          {/* Prompt Section */}
          <AgentPromptPanel />

          {/* Temperature Section */}
          <AgentTemperaturePanel />

          {/* Tasks Section */}
          <AgentTasksPanel />

          {/* Memories Section */}
          <AgentMemoriesPanel />
        </div>
      </div>
    </AgentProfileProvider>
  );
}
