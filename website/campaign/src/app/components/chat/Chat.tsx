'use client'

import { useChat } from '@ai-sdk/react';
import { useScrollToBottom } from './useScrollToBottom';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Missions } from './Missions';
import { MessageContainer } from './MessageContainer';
import { InputContainer } from './InputContainer';
import NeubrutalismButton from '@/app/components/shared/NeubrutalismButton';
import { useMissions } from '@/app/context/MissionsContext';
import { useSupabaseAuth } from '../providers/SupabaseAuthProvider';

// Define classification state interface
interface ClassificationState {
    missionId: string;
    confidence: number;
    reasoning: string;
}

export function Chat() {
    const { session } = useSupabaseAuth();
    const { missions } = useMissions();
    const userInfo = {
        name: session?.user?.user_metadata?.name || "visitor",
        twitterHandle: session?.user?.user_metadata?.twitter_handle || "visitor"
    };

    // Save the last user message for retry
    const lastUserMessageRef = useRef<string>('');

    // Add mission classification state
    const [classification, setClassification] = useState<ClassificationState | null>(null);

    const { messages, input, handleInputChange, handleSubmit, status, append, setMessages } = useChat({
        body: {
            userInfo: userInfo,
            classifiedMissionId: classification?.missionId
        }
    });

    const [messagesContainerRef, messagesEndRef] = useScrollToBottom<HTMLDivElement>();
    const [showGridCards, setShowGridCards] = useState(false);

    // Classify user messages when new messages are added
    useEffect(() => {
        const classifyUserMessage = async (message: string) => {
            if (!message || classification) return;

            try {
                // Build query parameters
                const params = new URLSearchParams({
                    message,
                    userName: userInfo.name,
                    twitterHandle: userInfo.twitterHandle
                });

                // Call classification API
                const response = await fetch(`/api/chat?${params.toString()}`);

                if (!response.ok) {
                    throw new Error('Classification request failed');
                }

                const result = await response.json();

                // Only set classification when confidence exceeds threshold
                if (result.confidence > 0.7) {
                    setClassification({
                        missionId: result.missionId,
                        confidence: result.confidence,
                        reasoning: result.reasoning
                    });
                }
            } catch (error) {
                // Silent error handling
            }
        };

        // Classify when there are new user messages
        const lastUserMessage = messages
            .filter(msg => msg.role === 'user')
            .pop()?.content;

        if (lastUserMessage && !classification && messages.length > 0) {
            classifyUserMessage(lastUserMessage);
        }
    }, [messages, classification, userInfo]);

    const handleSelectSuggestion = (suggestion: string) => {
        if (status === 'streaming') {
            return;
        }
        lastUserMessageRef.current = suggestion;
        append({ role: 'user', content: suggestion });
    };

    const handleInputChangeWrapper = (value: string) => {
        handleInputChange({ target: { value } } as any);
    };

    const handleShowGridCards = () => {
        setShowGridCards(true);
    };

    const handleCloseGridCards = () => {
        setShowGridCards(false);
    };

    const handleNewChat = () => {
        if (status === 'streaming') return;
        setMessages([]);
        setClassification(null);
        handleInputChangeWrapper('');
        lastUserMessageRef.current = '';
    };

    // Handle form submission, save the last user message
    const handleSubmitWrapper = (e: React.FormEvent<HTMLFormElement>) => {
        if (input.trim()) {
            lastUserMessageRef.current = input;
        }
        handleSubmit(e);
    };

    // Retry functionality
    const handleRetry = () => {
        if (lastUserMessageRef.current) {
            // Remove the last message (usually an error message)
            if (messages.length > 0) {
                setMessages(messages.slice(0, -1));
            }
            // Resend the last user message
            append({ role: 'user', content: lastUserMessageRef.current });
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-100px)] sm:h-[calc(100vh-120px)] bg-background rounded-xl">
            <AnimatePresence mode="wait">
                {showGridCards ? (
                    <Missions
                        showGridCards={showGridCards}
                        onCloseGridCards={handleCloseGridCards}
                        onSelectSuggestion={handleSelectSuggestion}
                        onShowGridCards={handleShowGridCards}
                    />
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -100 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col h-full"
                    >
                        <div className="flex flex-col h-full">
                            {messages.length > 0 && (
                                <div className="flex flex-col sm:flex-row sm:justify-between p-2 sm:p-3">
                                    <div className="order-2 sm:order-1">
                                        {classification && (
                                            <div className="hidden sm:block text-xs text-gray-500">
                                                Current Mission: {missions.find(m => m.id === classification.missionId)?.title || 'Unknown'} (ID: {classification.missionId})
                                            </div>
                                        )}
                                    </div>
                                    <div className="order-1 sm:order-2">
                                        <NeubrutalismButton
                                            text="Start New Chat"
                                            onClick={handleNewChat}
                                        />
                                    </div>
                                </div>
                            )}
                            <MessageContainer
                                messages={messages}
                                status={status}
                                messagesContainerRef={messagesContainerRef as React.RefObject<HTMLDivElement>}
                                messagesEndRef={messagesEndRef as React.RefObject<HTMLDivElement>}
                                onRetry={handleRetry}
                            />
                            <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
                                {messages.length === 0 && (
                                    <Missions
                                        showGridCards={showGridCards}
                                        onCloseGridCards={handleCloseGridCards}
                                        onSelectSuggestion={handleSelectSuggestion}
                                        onShowGridCards={handleShowGridCards}
                                    />
                                )}
                                <InputContainer
                                    input={input}
                                    onInputChange={handleInputChangeWrapper}
                                    onSubmit={handleSubmitWrapper}
                                    isStreaming={status === 'streaming'}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
} 