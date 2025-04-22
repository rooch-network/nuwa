import { useState } from "react";
import { PencilIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { SessionKeyGuard } from "@roochnetwork/rooch-sdk-kit";
import { useAgentProfile } from "./AgentProfileContext";
import { toast } from 'react-toastify';

export function AgentPromptPanel() {
    const { agent, isOwner, caps, updateAgent, refetchAgent } = useAgentProfile();
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [isSaveingPop, setIsSaveingPop] = useState(false);

    const [editForm, setEditForm] = useState({
        prompt: agent?.instructions,
    });

    const [formErrors, setFormErrors] = useState<{
        prompt?: string;
    }>({});

    const validatePrompt = (prompt: string): string | null => {
        if (prompt.length > 4096) {
            return 'Prompt cannot be longer than 4096 characters'
        }
        if (prompt.trim() && /^\s+$/.test(prompt)) {
            return 'Prompt cannot only contain spaces'
        }
        return null
    }

    const handlePromptEdit = async () => {
        if (!isOwner) return;

        if (isEditingPrompt) {
            // validate the prompt
            const promptError = validatePrompt(editForm.prompt || '');
            if (promptError) {
                setFormErrors(prev => ({
                    ...prev,
                    prompt: promptError
                }));
                return;
            }

            // Save changes
            if (editForm.prompt === agent?.instructions) {
                setIsEditingPrompt(false);
                return;
            }

            setIsSaveingPop(true);
            try {
                if (editForm.prompt !== agent?.instructions) {
                    await updateAgent({
                        cap: caps.get(agent?.id!)!.id,
                        instructions: editForm.prompt,
                    });
                }

                toast.success('Agent prompt updated successfully!', {
                    position: "top-right",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
            } finally {
                refetchAgent();
                setIsSaveingPop(false);
            }
        } else {
            // Start editing
            setEditForm({
                ...editForm,
                prompt: agent?.instructions || "",
            });
            setFormErrors(prev => ({
                ...prev,
                prompt: undefined
            }));
        }
        setIsEditingPrompt(!isEditingPrompt);
    };

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Prompt
                    </h2>
                    {isOwner ? (
                        <SessionKeyGuard onClick={handlePromptEdit}>
                            <button className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                <PencilIcon className="w-4 h-4 mr-2" />
                                {isSaveingPop ? (
                                    <svg
                                        className="w-5 h-5 animate-spin mx-auto text-white"
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        ></circle>
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        ></path>
                                    </svg>
                                ) : isEditingPrompt ? (
                                    "Save"
                                ) : (
                                    "Edit"
                                )}
                            </button>
                        </SessionKeyGuard>
                    ) : (
                        <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <LockClosedIcon className="w-4 h-4 mr-2" />
                            <span className="text-sm">Only the owner can edit</span>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    {isEditingPrompt ? (
                        <>
                            <textarea
                                value={editForm.prompt}
                                onChange={(e) =>
                                    setEditForm((prev) => ({
                                        ...prev,
                                        prompt: e.target.value,
                                    }))
                                }
                                className={`block w-full text-gray-600 dark:text-gray-300 bg-transparent border rounded-lg p-4 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none font-mono text-sm leading-relaxed ${formErrors.prompt ? 'border-red-500' : ''}`}
                                placeholder="Input the prompt of the AI role..."
                                rows={12}
                            />
                            <div className="flex justify-between items-center mt-1">
                                {formErrors.prompt && (
                                    <p className="text-sm text-red-500">{formErrors.prompt}</p>
                                )}
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {4096 - (editForm.prompt?.length || 0)}/4096 characters remaining
                                </p>
                            </div>
                        </>
                    ) : (
                        <pre className="whitespace-pre-wrap text-gray-600 dark:text-gray-300 font-mono text-sm leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg">
                            {agent?.instructions}
                        </pre>
                    )}
                </div>
            </div>
        </div>
    );
} 