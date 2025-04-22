interface LoadingScreenProps {
    agentName?: string;
}

export function LoadingScreen({ agentName }: LoadingScreenProps) {
    return (
        <div className="flex flex-col h-full overflow-hidden bg-gray-50 dark:bg-gray-900">
            <div className="flex flex-col items-center justify-center h-full space-y-6">
                {/* Logo */}
                <div className="relative w-32 h-32 animate-float">
                    <img
                        src="/nuwa-logo-horizontal-dark.svg"
                        className="w-full h-full object-contain hidden dark:block"
                        alt="Nuwa"
                    />
                    <img
                        src="/nuwa-logo-horizontal.svg"
                        className="w-full h-full object-contain dark:hidden"
                        alt="Nuwa"
                    />
                </div>
                {/* Loading Spinner */}
                <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce"></div>
                </div>
                {/* Loading Text */}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    {agentName ? `Connecting to ${agentName} assistant...` : 'Loading...'}
                </p>
            </div>
        </div>
    );
} 