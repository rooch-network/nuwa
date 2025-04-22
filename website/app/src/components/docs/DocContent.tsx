import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import mermaid from 'mermaid';
import { useTheme } from '../../providers/ThemeProvider';

interface DocContentProps {
    content: string;
}

const extractMermaidTitle = (content: string): string => {
    // 尝试从注释中获取标题
    const commentMatch = content.match(/%%\s*(.+)/);
    if (commentMatch) {
        return commentMatch[1].trim();
    }

    // 尝试从图表标题中获取
    const titleMatch = content.match(/title\s+(.+)/);
    if (titleMatch) {
        return titleMatch[1].trim();
    }

    // 如果没有找到标题，返回默认值
    return '图表';
};

export const DocContent = ({ content }: DocContentProps) => {
    const { isDarkMode } = useTheme();

    useEffect(() => {
        mermaid.initialize({
            startOnLoad: true,
            securityLevel: 'loose',
            theme: isDarkMode ? 'dark' : 'base',
            darkMode: isDarkMode,
        });
        // Update all mermaid diagrams
        setTimeout(() => {
            mermaid.run();
        }, 0);
    }, [content, isDarkMode]); // Re-run when content or theme changes

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
            <div className="prose prose-slate dark:prose-invert max-w-none
                prose-headings:font-bold prose-headings:tracking-tight
                prose-h1:text-3xl prose-h1:mb-6 prose-h1:border-b prose-h1:border-gray-200 dark:prose-h1:border-gray-700 prose-h1:pb-3
                prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-gray-800 dark:prose-h2:text-gray-100
                prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-gray-700 dark:prose-h3:text-gray-200
                prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-p:leading-7 prose-p:text-base
                prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
                prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-blue-50 dark:prose-code:bg-blue-900/20
                prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-sm
                prose-pre:bg-gray-50 dark:prose-pre:bg-gray-800/60 prose-pre:rounded-lg prose-pre:p-4
                prose-pre:border prose-pre:border-gray-200 dark:prose-pre:border-gray-700/50
                prose-pre:shadow-sm hover:prose-pre:shadow-md transition-shadow duration-200
                prose-pre:overflow-x-auto
                prose-strong:text-gray-900 dark:prose-strong:text-gray-50 prose-strong:font-semibold
                prose-ul:list-disc prose-ul:pl-4 prose-ul:space-y-1.5
                prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-li:leading-7
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500
                prose-blockquote:pl-4 prose-blockquote:italic
                prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-300
                prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/20
                prose-blockquote:py-1 prose-blockquote:px-3 prose-blockquote:rounded-r-lg
                prose-hr:border-gray-200 dark:prose-hr:border-gray-700 prose-hr:my-8
                prose-table:border-collapse prose-table:w-full
                prose-th:border prose-th:border-gray-200 dark:prose-th:border-gray-700
                prose-th:bg-gray-50 dark:prose-th:bg-gray-800/60
                prose-th:px-3 prose-th:py-2 prose-th:text-sm
                prose-td:border prose-td:border-gray-200 dark:prose-td:border-gray-700
                prose-td:px-3 prose-td:py-2 prose-td:text-sm
                prose-img:rounded-lg prose-img:shadow-md hover:prose-img:shadow-lg prose-img:mx-auto prose-img:transition-shadow duration-200
                prose-figure:my-6">
                <ReactMarkdown
                    components={{
                        code({ className, children }) {
                            const match = /language-(\w+)/.exec(className || '');
                            if (match && match[1] === 'mermaid') {
                                const mermaidContent = String(children).replace(/\n$/, '');
                                const title = extractMermaidTitle(mermaidContent);
                                return (
                                    <div className="space-y-2 flex flex-col items-center">
                                        <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h4>
                                        <div className="mermaid my-6 w-full flex justify-center">
                                            {mermaidContent}
                                        </div>
                                    </div>
                                );
                            }
                            return <code className={className}>{children}</code>;
                        },
                    }}
                >
                    {content}
                </ReactMarkdown>
            </div>
        </div>
    );
}; 