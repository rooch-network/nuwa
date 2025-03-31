import { Outlet, useNavigate } from 'react-router-dom';

const Layout = () => {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col h-screen pt-[env(safe-area-inset-top)] pb-[calc(56px+env(safe-area-inset-top))]">
            <div className="flex-grow overflow-auto">
                <Outlet />
            </div>
            <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg pb-[env(safe-area-inset-bottom)]">
                <nav className="flex justify-around items-center h-14">
                    <button
                        onClick={() => navigate('/chat')}
                        className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-purple-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs mt-1">Chat</span>
                    </button>
                    <button
                        onClick={() => navigate('/explore')}
                        className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-purple-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs mt-1">Explore</span>
                    </button>
                    <button
                        onClick={() => navigate('/profile')}
                        className="flex flex-col items-center justify-center flex-1 h-full text-gray-600 hover:text-purple-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs mt-1">Account</span>
                    </button>
                </nav>
            </div>
        </div>
    );
};

export default Layout; 