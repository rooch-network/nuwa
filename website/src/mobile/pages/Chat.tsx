import useAgentJoined from "../../hooks/use-agent-joined";
import { Link } from "react-router-dom";

const Chat = () => {
    const { joinedAgents, isPending } = useAgentJoined();

    return (
        <>
            {/* 顶部导航栏 */}
            <div className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-50">
                <div className="h-full flex items-center px-4 relative">
                    <h1 className="text-lg font-semibold w-full text-center">Chat</h1>
                </div>
            </div>

            {/* 可滚动的内容区域 */}
            <div className="min-h-[calc(100vh-3.5rem-3.5rem)] pt-14 max-w-7xl mx-auto px-4 py-6">
                {isPending ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {joinedAgents.map((agent) => (
                            <div
                                key={agent.id}
                                className="flex items-start p-4 bg-white hover:bg-gray-50 cursor-pointer"
                            >
                                <img
                                    src={agent.avatar}
                                    alt={agent.name}
                                    className="w-12 h-12 rounded-full"
                                />
                                <div className="ml-4 flex-1">
                                    <div className="flex items-center">
                                        <h2 className="text-base font-medium text-gray-900">{agent.name}</h2>
                                        <span className="ml-2 text-sm text-gray-500">@{agent.username}</span>
                                    </div>
                                    <p className="text-sm text-gray-500 line-clamp-2 mt-1">{agent.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
};

export default Chat; 