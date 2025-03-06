import { Message } from '../types/channel';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { formatTimestamp } from '../utils/time';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useState } from 'react';
import { ClipboardDocumentIcon, ShareIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { shortenAddress } from '../utils/address';
import { Link } from 'react-router-dom';
import { RoochAddress } from '@roochnetwork/rooch-sdk';

interface ChatMessageProps {
  message: Message;
  isCurrentUser: boolean;
  isAI: boolean;
  agentName?: string;
  agentId?: string; // Add this to receive the agent's object ID
}

export function ChatMessage({ message, isCurrentUser, isAI, agentName, agentId }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const timestamp = message.timestamp;

  //TODO use the scanUrl via the network.
  const roochscanBaseUrl = "https://test.roochscan.io";

  const senderAddress = new RoochAddress(message.sender).toBech32Address();
  
  // Use the agent's actual name if provided, otherwise fallback to address
  const displayName = isAI 
    ? (agentName || 'AI Agent')  // Changed from 'AI Assistant' to 'AI Agent'
    : shortenAddress(senderAddress);

  const handleCopy = async () => {
    const shareText = `${message.content}\n\n${window.location.href}`;
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const shareText = `${message.content}\n\n${window.location.href}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank');
  };

  return (
    <div className="flex justify-center w-full">
      <div className="w-full max-w-3xl flex gap-3">
        {!isCurrentUser && (
          <div className="flex-shrink-0 w-8 h-8">
            {isAI ? (
              // Wrap the avatar in a Link component if agentId is provided
              agentId ? (
                <Link 
                  to={`/agent/${agentId}`} 
                  className="block w-8 h-8 rounded-full cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all"
                  title={`View ${agentName || 'AI Agent'}'s profile`}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                    {agentName ? agentName.substring(0, 2).toUpperCase() : 'AI'}
                  </div>
                </Link>
              ) : (
                // Original div if no agentId provided
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {agentName ? agentName.substring(0, 2).toUpperCase() : 'AI'}
                </div>
              )
            ) : (
              // User avatar with Roochscan link
              <a 
                href={`${roochscanBaseUrl}/account/${senderAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all rounded-full"
                title={`View ${shortenAddress(senderAddress)} on Roochscan`}
              >
                <UserCircleIcon className="w-8 h-8 text-gray-400" />
              </a>
            )}
          </div>
        )}
        <div className={`flex flex-col flex-1 ${isCurrentUser ? 'items-end' : 'items-start'}`}>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <span className="font-medium">
              {isCurrentUser ? 'You' : (
                // Also add Roochscan link to the display name for non-AI users
                isAI ? displayName : (
                  <a 
                    href={`${roochscanBaseUrl}/account/${senderAddress}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:text-blue-600 hover:underline transition-colors"
                    title={`View ${senderAddress} on Roochscan`}
                  >
                    {displayName}
                  </a>
                )
              )}
            </span>
            <span>•</span>
            <span>
            {formatTimestamp(message.timestamp)}
            </span>
          </div>
          <div className="relative group">
            <div
              className={`rounded-lg px-4 py-2 max-w-[80%] ${
                isCurrentUser
                  ? 'bg-blue-50 text-gray-900 border border-blue-100'  // Lighter blue for user messages
                  : isAI
                  ? 'bg-purple-50 border border-purple-100'            // Keep AI message style
                  : 'bg-gray-50 border border-gray-100'               // Lighter gray for other users
              }`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="text-sm leading-relaxed flex-1">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    className="prose prose-sm max-w-none"
                    components={{
                      pre: ({children}) => children,
                      code: ({node, inline, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '')
                        const language = match ? match[1] : ''
                        
                        return !inline ? (
                          <div className="my-4">
                            <SyntaxHighlighter
                              language={language}
                              style={oneLight}
                              customStyle={{
                                backgroundColor: '#f8fafc',  // bg-slate-50
                                padding: '1rem',
                                borderRadius: '0.375rem',
                                border: '1px solid #e2e8f0',  // border-slate-200
                              }}
                            >
                              {String(children).replace(/\n$/, '')}
                            </SyntaxHighlighter>
                          </div>
                        ) : (
                          <code
                            className={`px-1.5 py-0.5 rounded ${
                              isCurrentUser 
                                ? 'bg-blue-100/50 text-blue-800' 
                                : 'bg-slate-100 text-slate-800'
                            }`}
                            {...props}
                          >
                            {children}
                          </code>
                        )
                      },
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                </div>
                
                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Copy message"
                  >
                    {copied ? (
                      <CheckIcon className="w-4 h-4 text-green-500" />
                    ) : (
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    className="p-1.5 rounded-full hover:bg-white/50 text-gray-500 hover:text-gray-700 transition-colors"
                    title="Share on Twitter"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isCurrentUser && (
          <div className="flex-shrink-0 w-8 h-8">
            {/* Add Roochscan link for current user's avatar too */}
            {senderAddress && (
              <a 
                href={`${roochscanBaseUrl}/account/${senderAddress}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="block w-8 h-8 cursor-pointer hover:ring-2 hover:ring-blue-300 transition-all rounded-full"
                title={`View your account on Roochscan`}
              >
                <UserCircleIcon className="w-8 h-8 text-blue-400" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}