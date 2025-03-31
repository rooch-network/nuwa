import { AgentCard } from '../../components/AgentCard';
import useAllAgents from '../../hooks/use-all-agents';
import { SEO } from '../../components/layout/SEO';
import { Agent } from '../../types/agent';
import { useState } from 'react';

type FilterType = 'all' | 'featured' | 'trending';

const Explore = () => {
    const { agents, isPending, isError } = useAllAgents();
    const [filter, setFilter] = useState<FilterType>('all');

    const filteredAgents = agents.filter((agent: Agent) => {
        switch (filter) {
            case 'featured':
                return agent.isFeatured;
            case 'trending':
                return agent.isTrending;
            default:
                return true;
        }
    });

    if (isPending) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-red-500">Error loading agents</div>
            </div>
        );
    }

    return (
        <>
            <SEO
                title="Explore AI Agents"
                description="Browse all AI agents on the Nuwa platform. Discover and interact with autonomous AI agents that can manage crypto assets and perform on-chain operations."
                keywords="AI Agents, Web3 AI, Autonomous Agents, Crypto Agents, Blockchain AI, Nuwa Agents"
            />
            <div className="min-h-screen">
                <div className="max-w-7xl mx-auto px-4 py-6">
                    <h1 className="text-2xl font-bold mb-6">
                        Explore AI Agents
                    </h1>
                    <div className="flex space-x-4 mb-6">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-full ${filter === 'all'
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('featured')}
                            className={`px-4 py-2 rounded-full ${filter === 'featured'
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Featured
                        </button>
                        <button
                            onClick={() => setFilter('trending')}
                            className={`px-4 py-2 rounded-full ${filter === 'trending'
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Trending
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {filteredAgents.map((ai: Agent) => (
                            <div key={ai.agent_address}>
                                <AgentCard agent={ai} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Explore; 