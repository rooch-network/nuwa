import { AgentCard } from '../../components/AgentCard';
import useAllAgents from '../../hooks/use-all-agents';
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
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50">
                <div className="h-full flex items-center px-4">
                    <h1 className="text-lg font-semibold flex-1 text-center">Explore</h1>
                </div>
            </div>
            <div className="min-h-screen pt-14 pb-16">
                <div className="max-w-7xl mx-auto px-4 py-6">
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