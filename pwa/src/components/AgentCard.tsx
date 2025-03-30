import { Agent } from '../types/agent';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

interface AgentCardProps {
    agent: Agent;
}

export function AgentCard({ agent }: AgentCardProps) {
    const navigate = useNavigate();
    const [isLiked, setIsLiked] = useState(false);
    const [isStarred, setIsStarred] = useState(false);

    const shortenAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    };

    const getTimeAgo = () => {
        const now = new Date();
        const monthsAgo = Math.floor(Math.random() * 5) + 1;
        const createdAt = new Date(now.setMonth(now.getMonth() - monthsAgo));
        const diffInDays = Math.floor((new Date().getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        if (diffInDays > 30) {
            const months = Math.floor(diffInDays / 30);
            return `${months}mo`;
        }
        return `${diffInDays}d`;
    };

    const getPopularity = () => {
        if (agent.isTrending) {
            return Math.floor(Math.random() * 15) + 85;
        }
        return Math.floor(Math.random() * 55) + 30;
    };

    return (
        <div
            className="h-full flex flex-col cursor-pointer bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-200"
            onClick={() => navigate(`/agent/${agent.username}`)}
        >
            <div
                className="h-36 relative bg-gradient-to-r from-purple-600 to-pink-600 rounded-t-lg"
            >
                <button
                    className="absolute top-2 right-2 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsStarred(!isStarred);
                    }}
                >
                    {isStarred ? (
                        <svg className="w-6 h-6 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.363 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.363-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                    )}
                </button>
            </div>
            <div className="flex-grow p-4">
                <div className="flex flex-col items-center mb-4">
                    <img
                        src={agent.avatar}
                        alt={agent.name}
                        className="w-16 h-16 rounded-full mb-2 border-2 border-purple-600"
                    />
                    <h3 className="text-lg font-semibold text-center">
                        {agent.name}
                    </h3>
                    <p className="text-sm text-gray-500 text-center">
                        @{agent.username}
                    </p>
                </div>

                <p className="text-sm text-gray-500 mb-4 max-h-[60px] overflow-auto">
                    {agent.description}
                </p>

                <div className="flex justify-around items-center mb-4">
                    <div className="flex items-center">
                        <button
                            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsLiked(!isLiked);
                            }}
                        >
                            {isLiked ? (
                                <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            )}
                        </button>
                        <span className="text-sm text-gray-500 ml-1">
                            {Math.floor(Math.random() * 1000).toLocaleString()}
                        </span>
                    </div>
                    <span className="text-sm text-gray-500">
                        {getTimeAgo()}
                    </span>
                    <span className={`text-sm ${getPopularity() >= 85 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                        {getPopularity()}%
                    </span>
                </div>

                <button
                    className="w-full py-2 px-4 rounded-lg border-2 border-purple-600 text-purple-600 hover:bg-purple-600 hover:text-white transition-colors"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/agent/${agent.username}`);
                    }}
                >
                    Start Chat
                </button>
            </div>
        </div>
    );
} 