import { AgentCard } from '../../components/AgentCard';
import useAllAgents from '../../hooks/use-all-agents';
import { Agent } from '../../types/agent';
import { useState } from 'react';
import FilterSidebar, { FilterType } from '../../components/explore/FilterSidebar';


const Explore = () => {
    const { agents, isPending, isError } = useAllAgents();
    const [filter, setFilter] = useState<FilterType>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

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
                <div className="h-full flex items-center px-4 relative">
                    <button
                        onClick={() => setIsFilterOpen(true)}
                        className="p-2 rounded-full hover:bg-gray-100 absolute right-4"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                    </button>
                    <h1 className="text-lg font-semibold w-full text-center">Explore</h1>
                </div>
            </div>

            <FilterSidebar
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                currentFilter={filter}
                onFilterChange={setFilter}
            />

            <div className="min-h-screen pt-14 pb-16">
                <div className="max-w-7xl mx-auto px-4 py-6">
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