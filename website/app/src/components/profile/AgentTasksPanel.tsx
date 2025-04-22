import { useState, useEffect } from "react";
import { PencilIcon, LockClosedIcon, PlusIcon, InboxIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { SessionKeyGuard } from "@roochnetwork/rooch-sdk-kit";
import { useAgentProfile } from "./AgentProfileContext";
import { TaskSpecification } from "../../types/task-types";
import { createEmptyTaskSpec } from "../../utils/task";
import { toast } from 'react-toastify';

export function AgentTasksPanel() {
    const { agent, agentTask, isOwner, caps, updateAgentTaskTask, refetchAgentTask } = useAgentProfile();

    const [taskSpecs, setTaskSpecs] = useState<TaskSpecification[]>([]);
    const [isAddingTask, setIsAddingTask] = useState(false);
    const [isJsonMode, setIsJsonMode] = useState(false);
    const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
    const [jsonInput, setJsonInput] = useState<string>('');

    useEffect(() => {
        if (agentTask) {
            setTaskSpecs(agentTask);
            setJsonInput(JSON.stringify(agentTask, null, 2));
        }
    }, [agentTask]);

    useEffect(() => {
        if (JSON.stringify(taskSpecs) === JSON.stringify(agentTask || [])) {
            setIsAddingTask(false);
        } else {
            setIsAddingTask(true);
        }
    }, [taskSpecs]);

    const validateTaskSpecs = (parsed: any): boolean => {
        // 如果输入是单个对象，将其转换为数组
        const tasks = Array.isArray(parsed) ? parsed : [parsed];

        const isValidTask = (task: any) => {
            return typeof task === 'object' &&
                task !== null &&
                typeof task.name === 'string' &&
                typeof task.description === 'string' &&
                typeof task.resolver === 'string' &&
                typeof task.price === 'number' &&
                typeof task.on_chain === 'boolean' &&
                Array.isArray(task.arguments);
        };

        if (!tasks.every(isValidTask)) {
            toast.error('Invalid task format in JSON', {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            return false;
        }

        // 更新状态时使用数组形式
        setTaskSpecs(tasks);
        return true;
    };

    const handleJsonModeToggle = () => {
        if (isJsonMode) {
            try {
                const parsed = JSON.parse(jsonInput);
                if (validateTaskSpecs(parsed)) {
                    setIsJsonMode(false);
                }
            } catch (error) {
                toast.error('Invalid JSON format', {
                    position: "top-right",
                    autoClose: 2000,
                    hideProgressBar: false,
                    closeOnClick: true,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    theme: "light",
                });
            }
        } else {
            setIsJsonMode(true);
        }
    };

    const handleSubmmitTask = async () => {
        try {
            if (isJsonMode) {
                const parsed = JSON.parse(jsonInput);
                if (!validateTaskSpecs(parsed)) {
                    return;
                }
            }

            await updateAgentTaskTask({
                cap: caps.get(agent?.id!)!.id,
                taskSpecs: taskSpecs,
            });

            toast.success('Tasks updated successfully!', {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
            setEditingTaskIndex(null);
            setIsJsonMode(false);
        } finally {
            refetchAgentTask();
        }
    };

    const handleEditTask = (index: number) => {
        setEditingTaskIndex(index);
    };

    const handleCancelEdit = () => {
        setEditingTaskIndex(null);
        setTaskSpecs(agentTask || []);
    };

    const handleSaveTask = async () => {
        await handleSubmmitTask();
    };

    const handleDeleteTask = async (index: number) => {
        try {
            const newTasks = [...taskSpecs];
            newTasks.splice(index, 1);
            await updateAgentTaskTask({
                cap: caps.get(agent?.id!)!.id,
                taskSpecs: newTasks,
            });
            setTaskSpecs(newTasks);
            setEditingTaskIndex(null);
            toast.success('Task deleted successfully!', {
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
            refetchAgentTask();
        }
    };

    const handleCopyJson = async (task: TaskSpecification) => {
        try {
            await navigator.clipboard.writeText(JSON.stringify(task, null, 2));
            toast.success('Task JSON copied to clipboard!', {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        } catch (err) {
            toast.error('Failed to copy JSON', {
                position: "top-right",
                autoClose: 2000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
                theme: "light",
            });
        }
    };

    return (
        <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                        Tasks
                    </h2>
                    {isOwner ? (
                        <SessionKeyGuard onClick={() => {
                            if (!isAddingTask) {
                                setIsAddingTask(true);
                                const newTask = createEmptyTaskSpec();
                                setTaskSpecs([...taskSpecs, newTask]);
                                setEditingTaskIndex(taskSpecs.length);
                                setIsJsonMode(false);
                            } else {
                                handleJsonModeToggle();
                            }
                        }}>
                            <button
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                {!isAddingTask ? (
                                    <>
                                        <PlusIcon className="w-4 h-4 mr-2" />
                                        Add Task
                                    </>
                                ) : isJsonMode ? (
                                    "Edit Mode"
                                ) : (
                                    "JSON Mode"
                                )}
                            </button>
                        </SessionKeyGuard>
                    ) : (
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => handleCopyJson(taskSpecs[0])}
                                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            >
                                <ClipboardIcon className="w-4 h-4 mr-2" />
                                Copy JSON
                            </button>
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                                <LockClosedIcon className="w-4 h-4 mr-2" />
                                <span className="text-sm">Only the owner can edit</span>
                            </div>
                        </div>
                    )}
                </div>

                {taskSpecs.length === 0 ? (
                    <div className="text-center py-8 px-4">
                        <div className="mx-auto w-24 h-24 bg-gray-50 dark:bg-gray-800/50 rounded-lg flex items-center justify-center mb-4">
                            <InboxIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                            No tasks yet
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                            This agent has not set any tasks yet.{isOwner ? 'Click the "Add Task" button to create the first task.' : ''}
                        </p>
                    </div>
                ) : isOwner ? (
                    <>
                        {isJsonMode ? (
                            <div className="space-y-4">
                                <textarea
                                    className="w-full h-96 font-mono text-sm p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                    value={jsonInput}
                                    onChange={(e) => setJsonInput(e.target.value)}
                                />
                                <div className="flex justify-end space-x-3">
                                    <button
                                        onClick={() => {
                                            setJsonInput(JSON.stringify(agentTask || [], null, 2));
                                            setIsJsonMode(false);
                                        }}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <SessionKeyGuard onClick={handleSubmmitTask}>
                                        <button
                                            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </SessionKeyGuard>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {taskSpecs.map((task, index) => (
                                    <div
                                        key={index}
                                        className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                                    >
                                        {editingTaskIndex === index ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center space-x-3">
                                                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                                                            Task #{index + 1}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="px-3 py-1 text-sm text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteTask(index)}
                                                            className="px-3 py-1 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30"
                                                        >
                                                            Delete
                                                        </button>
                                                        <SessionKeyGuard onClick={handleSaveTask}>
                                                            <button
                                                                className="px-3 py-1 text-sm text-white bg-purple-600 rounded-lg hover:bg-purple-700"
                                                            >
                                                                Save
                                                            </button>
                                                        </SessionKeyGuard>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Name
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={task.name}
                                                            onChange={(e) => {
                                                                const newTasks = [...taskSpecs];
                                                                newTasks[index] = { ...newTasks[index], name: e.target.value };
                                                                setTaskSpecs(newTasks);
                                                            }}
                                                            className="block w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                            placeholder="Input task name"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Description
                                                        </label>
                                                        <textarea
                                                            value={task.description}
                                                            onChange={(e) => {
                                                                const newTasks = [...taskSpecs];
                                                                newTasks[index] = { ...newTasks[index], description: e.target.value };
                                                                setTaskSpecs(newTasks);
                                                            }}
                                                            className="block w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                            placeholder="Input task description"
                                                            rows={3}
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                            Resolver
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={task.resolver}
                                                            onChange={(e) => {
                                                                const newTasks = [...taskSpecs];
                                                                newTasks[index] = { ...newTasks[index], resolver: e.target.value };
                                                                setTaskSpecs(newTasks);
                                                            }}
                                                            className="block w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                            placeholder="Input resolver"
                                                        />
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                Arguments
                                                            </label>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                const newTasks = [...taskSpecs];
                                                                newTasks[index] = {
                                                                    ...newTasks[index],
                                                                    arguments: [...(newTasks[index].arguments || []), { name: '', type: 'String', type_desc: '', description: '', required: false }]
                                                                };
                                                                setTaskSpecs(newTasks);
                                                            }}
                                                            className="w-full flex items-center justify-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 bg-purple-50 dark:bg-purple-900/20 py-2 rounded-lg mb-3"
                                                        >
                                                            <PlusIcon className="w-4 h-4 mr-1" />
                                                            Add Argument
                                                        </button>
                                                        <div className="space-y-3">
                                                            {(task.arguments || []).map((arg, argIndex) => (
                                                                <div key={argIndex} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                                    <div className="flex items-start justify-between mb-2">
                                                                        <div className="flex-1 space-y-2">
                                                                            <input
                                                                                type="text"
                                                                                value={arg.name}
                                                                                onChange={(e) => {
                                                                                    const newTasks = [...taskSpecs];
                                                                                    newTasks[index].arguments[argIndex] = { ...arg, name: e.target.value };
                                                                                    setTaskSpecs(newTasks);
                                                                                }}
                                                                                className="block w-full text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                                                placeholder="Argument Name"
                                                                            />
                                                                            <input
                                                                                type="text"
                                                                                value={arg.type_desc}
                                                                                onChange={(e) => {
                                                                                    const newTasks = [...taskSpecs];
                                                                                    newTasks[index].arguments[argIndex] = { ...arg, type_desc: e.target.value };
                                                                                    setTaskSpecs(newTasks);
                                                                                }}
                                                                                className="block w-full text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                                                placeholder="Type Description"
                                                                            />
                                                                            <textarea
                                                                                value={arg.description}
                                                                                onChange={(e) => {
                                                                                    const newTasks = [...taskSpecs];
                                                                                    newTasks[index].arguments[argIndex] = { ...arg, description: e.target.value };
                                                                                    setTaskSpecs(newTasks);
                                                                                }}
                                                                                className="block w-full text-sm bg-transparent border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                                                placeholder="Argument Description"
                                                                                rows={2}
                                                                            />
                                                                        </div>
                                                                        <div className="flex items-center space-x-2 ml-2">
                                                                            <label className="flex items-center">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={arg.required}
                                                                                    onChange={(e) => {
                                                                                        const newTasks = [...taskSpecs];
                                                                                        newTasks[index].arguments[argIndex] = { ...arg, required: e.target.checked };
                                                                                        setTaskSpecs(newTasks);
                                                                                    }}
                                                                                    className="w-4 h-4 text-purple-600 dark:text-purple-400 border-gray-300 dark:border-gray-600 rounded focus:ring-purple-500 dark:focus:ring-purple-400"
                                                                                />
                                                                                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Required</span>
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                Price (RGas)
                                                            </label>
                                                            <input
                                                                type="number"
                                                                value={task.price}
                                                                onChange={(e) => {
                                                                    const newTasks = [...taskSpecs];
                                                                    newTasks[index] = { ...newTasks[index], price: e.target.value };
                                                                    setTaskSpecs(newTasks);
                                                                }}
                                                                className="block w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                                placeholder="Input price"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                                Type
                                                            </label>
                                                            <select
                                                                value={task.on_chain ? "on-chain" : "off-chain"}
                                                                onChange={(e) => {
                                                                    const newTasks = [...taskSpecs];
                                                                    newTasks[index] = { ...newTasks[index], on_chain: e.target.value === "on-chain" };
                                                                    setTaskSpecs(newTasks);
                                                                }}
                                                                className="block w-full text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-2 focus:border-purple-500 dark:focus:border-purple-400 focus:outline-none"
                                                            >
                                                                <option value="on-chain">On-Chain</option>
                                                                <option value="off-chain">Off-Chain</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                                                            Task #{index + 1}
                                                        </span>
                                                        <button
                                                            onClick={() => handleEditTask(index)}
                                                            className="flex items-center text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                                        >
                                                            <PencilIcon className="w-4 h-4 mr-1" />
                                                            Edit
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                                Name
                                                            </label>
                                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                                {task.name || 'No name specified'}
                                                            </h4>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                                Description
                                                            </label>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {task.description || 'No description'}
                                                            </p>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                                Resolver
                                                            </label>
                                                            <div className="flex items-center gap-2">
                                                                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm rounded-lg">
                                                                    {task.resolver || 'No resolver specified'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                                                Arguments
                                                            </label>
                                                            {task.arguments && task.arguments.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {task.arguments.map((arg, argIndex) => (
                                                                        <div key={argIndex} className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                                                    {arg.name}
                                                                                </span>
                                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                                    ({arg.type_desc})
                                                                                </span>
                                                                                {arg.required && (
                                                                                    <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                                                        Required
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                                                                {arg.description || 'No description'}
                                                                            </p>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700">
                                                                    No arguments defined
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex flex-wrap gap-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-500 dark:text-gray-400">Price:</span>
                                                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg">
                                                                    {task.price || 0} RGas
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
                                                                <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                                                                    {task.on_chain ? "On-Chain" : "Off-Chain"}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="space-y-4">
                        {taskSpecs.map((task, index) => (
                            <div
                                key={index}
                                className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center mb-3">
                                            <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full">
                                                Task #{index + 1}
                                            </span>
                                        </div>

                                        <div className="mb-3">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                Name
                                            </label>
                                            <h4 className="font-medium text-gray-900 dark:text-gray-100">
                                                {task.name || 'No name specified'}
                                            </h4>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                Description
                                            </label>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {task.description || 'No description'}
                                            </p>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                                                Resolver
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-sm rounded-lg flex-1">
                                                    {task.resolver || 'No resolver specified'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
                                                Arguments
                                            </label>
                                            {task.arguments && task.arguments.length > 0 ? (
                                                <div className="space-y-3">
                                                    {task.arguments.map((arg, argIndex) => (
                                                        <div key={argIndex} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                                                    {arg.name}
                                                                </span>
                                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                                    ({arg.type_desc})
                                                                </span>
                                                                {arg.required && (
                                                                    <span className="text-xs text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                                                                        Required
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                                {arg.description || 'No description'}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                                                    No arguments defined
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Price:</span>
                                                <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-sm rounded-lg">
                                                    {task.price || 0} RGas
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
                                                <span className="px-3 py-1 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 text-sm rounded-lg">
                                                    {task.on_chain ? "On-Chain" : "Off-Chain"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
} 