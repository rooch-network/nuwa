import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const docs = [
    { path: '/docs/intro', title: 'Nuwa Introduction' },
    { path: '/docs/use-cases', title: 'Use Cases' },
    { path: '/docs/create-agent', title: 'Create Agent' },
    { path: '/docs/security', title: 'Security' },
    { path: '/docs/future-works', title: 'Future Works' },
];

export const DocSidebar: React.FC = () => {
    const location = useLocation();

    return (
        <nav className="w-64 p-6 space-y-1 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Documentation</h2>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Learn how to use Nuwa</p>
            </div>
            {docs.map((doc) => (
                <Link
                    key={doc.path}
                    to={doc.path}
                    className={`block px-4 py-2 rounded-lg transition-all duration-200 ${location.pathname === doc.path
                        ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 font-medium'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                        }`}
                >
                    {doc.title}
                </Link>
            ))}
        </nav>
    );
}; 