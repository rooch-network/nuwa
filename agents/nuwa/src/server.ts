import express, { Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import bodyParser from 'body-parser';
import { handleMessage } from './agent'; // Import our agent logic
import * as schema from '../a2a-schema'; // Use TS extension
import {
    Task,
    Message,
    TextPart,
    TaskSendParams,
    TaskStatus,
    A2AError,
    ErrorCodeInternalError
} from './a2a-schema'; // Import A2A types
import { TaskStore, InMemoryTaskStore, TaskAndHistory } from './server/store'; // Use TS extension
import { TaskHandler, TaskContext } from './server/handler'; // Use TS extension
import { getCurrentTimestamp, isTaskStatusUpdate, isArtifactUpdate } from './server/utils'; // Use TS extension
import { AgentCard } from './a2a-schema'; // Import AgentCard type
import { A2AError as A2AErrorClass } from './server/error'; // Import class with alias
import type { A2AError as A2AErrorType } from './server/error'; // Import type separately

// --- In-memory storage for task message history ---
// WARNING: Simple in-memory store. Not suitable for production (memory leaks, no persistence).
const taskHistories = new Map<string, Message[]>();
// -------------------------------------------------

/**
 * Options for configuring the Nuwa A2AServer.
 */
export interface NuwaA2AServerOptions {
    taskStore?: TaskStore;
    cors?: CorsOptions | boolean | string;
    basePath?: string;
    // Agent card will be defined within the server
}

/**
 * Simple Task Handler for Nuwa Agent.
 * Wraps the existing agent.ts handleMessage function.
 * Does not currently support streaming yields, just final result.
 */
const nuwaAgentTaskHandler: TaskHandler = async function* (context: TaskContext) {
    console.log(`[TaskHandler ${context.task.id}] Handling task.`);
    const { userMessage, history, isCancelled } = context;

    // Extract text from the current user message
    const userTextPart = userMessage.parts.find((part): part is TextPart => part.type === 'text') as TextPart | undefined;
    if (!userTextPart?.text) {
        console.error(`[TaskHandler ${context.task.id}] No text found in user message.`);
        yield { state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: 'Could not extract text from user message.' }] } };
        return; // End the generator
    }

    // Check for cancellation before calling LLM
    if (isCancelled()) {
        console.log(`[TaskHandler ${context.task.id}] Task was cancelled.`);
        yield { state: 'canceled' };
        return;
    }

    try {
        // Prepare history for the agent (excluding the current user message which is passed separately by agent.ts)
        const agentHistory = history.slice(0, -1); // History includes current msg, remove it
        const agentResponseText = await handleMessage(userTextPart.text, agentHistory);

        // Yield the final 'completed' state with the response message
        const agentResponseMessage: Message = {
            role: 'agent',
            parts: [{ type: 'text', text: agentResponseText }]
        };
        yield { state: 'completed', message: agentResponseMessage };
        console.log(`[TaskHandler ${context.task.id}] Task completed successfully.`);

    } catch (error) {
        console.error(`[TaskHandler ${context.task.id}] Error calling agent logic:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in agent logic.';
        yield { state: 'failed', message: { role: 'agent', parts: [{ type: 'text', text: `Agent failed: ${errorMessage}` }] } };
    }
};

/**
 * Implements an A2A specification compliant server for the Nuwa Agent.
 * Based on the A2A sample server structure.
 */
export class NuwaA2AServer {
    private taskHandler: TaskHandler;
    private taskStore: TaskStore;
    private corsOptions: CorsOptions | boolean | string;
    private basePath: string;
    private activeCancellations: Set<string> = new Set();
    private agentCard: schema.AgentCard;

    constructor(options: NuwaA2AServerOptions = {}) {
        this.taskHandler = nuwaAgentTaskHandler;
        this.taskStore = options.taskStore ?? new InMemoryTaskStore();
        this.corsOptions = options.cors ?? true;
        this.basePath = options.basePath ?? "/a2a";

        // Define the Agent Card
        this.agentCard = {
            name: "Nuwa Agent",
            description: "An AI assistant powered by NuwaScript and LLMs.",
            url: `${this.basePath}`, // Will be updated after path formatting
            version: "0.1.0",
            capabilities: {
                streaming: false, // Our handler is not streaming yet
                pushNotifications: false,
                stateTransitionHistory: false
            },
            authentication: null,
            defaultInputModes: ["text"],
            defaultOutputModes: ["text"],
            skills: [{ id: "chat", name: "General Chat", description: "Have a general conversation." }]
        };

        // Ensure base path format
        if (!this.basePath.startsWith("/")) this.basePath = "/" + this.basePath;
        if (this.basePath.endsWith("/")) this.basePath = this.basePath.slice(0, -1);
        this.agentCard.url = this.basePath; // Final URL for the card

        console.log(`[A2AServer] Initialized with base path: ${this.basePath}`);
    }

    /**
     * Starts the Express server listening on the specified port.
     */
    start(port = 3000): express.Express {
        const app = express();

        // Configure CORS
        if (this.corsOptions !== false) {
            const corsConfig = typeof this.corsOptions === "string" ? { origin: this.corsOptions } : this.corsOptions === true ? undefined : this.corsOptions;
            app.use(cors(corsConfig));
        }

        // Middleware
        app.use(express.json()); // Parse JSON bodies

        // Agent Card endpoint
        app.get("/.well-known/agent.json", (req, res) => {
            console.log(`[A2AServer] Serving agent card at /.well-known/agent.json`);
            res.json(this.agentCard);
        });

        // Mount the A2A endpoint handler
        app.post(this.basePath, this.endpoint());
        console.log(`[A2AServer] A2A endpoint mounted at POST ${this.basePath}`);

        // Basic error handler
        app.use(this.errorHandler);

        // Start listening
        app.listen(port, () => {
            console.log(`[A2AServer] Nuwa Agent A2A server listening on http://localhost:${port}`);
        });

        return app;
    }

    /**
     * Returns an Express RequestHandler function to handle A2A requests.
     */
    endpoint(): express.RequestHandler {
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
            const requestBody = req.body;
            let taskId: string | undefined;
            let reqId: string | number | null = null; // Capture reqId early

            try {
                // Try to get reqId even before full validation
                if (typeof requestBody === 'object' && requestBody !== null && 'id' in requestBody) {
                    reqId = requestBody.id;
                }

                if (!this.isValidJsonRpcRequest(requestBody)) {
                    // Use imported class with static method
                    throw A2AErrorClass.invalidRequest("Invalid JSON-RPC request structure.");
                }
                taskId = (requestBody.params as any)?.id;

                switch (requestBody.method) {
                    case "tasks/send":
                        await this.handleTaskSend(requestBody as schema.SendTaskRequest, res);
                        break;
                    // case "tasks/sendSubscribe": // Not supported yet
                    //     await this.handleTaskSendSubscribe(requestBody as schema.SendTaskStreamingRequest, res);
                    //     break;
                    case "tasks/get":
                        await this.handleTaskGet(requestBody as schema.GetTaskRequest, res);
                        break;
                    case "tasks/cancel":
                        await this.handleTaskCancel(requestBody as schema.CancelTaskRequest, res);
                        break;
                    default:
                        throw A2AErrorClass.methodNotFound(requestBody.method);
                }
            } catch (error) {
                let normalizedError = error;
                // Ensure it's an A2AError instance before adding taskId
                if (normalizedError instanceof A2AErrorClass && taskId && !normalizedError.taskId) {
                    normalizedError.taskId = taskId;
                }
                // Pass potentially non-A2AError to normalizeError
                next(this.normalizeError(normalizedError, reqId, taskId));
            }
        };
    }

    // --- Request Handlers (Adapted from sample) ---

    private async handleTaskSend(req: schema.SendTaskRequest, res: express.Response): Promise<void> {
        this.validateTaskSendParams(req.params);
        const { id: taskId, message, sessionId, metadata } = req.params;

        let currentData = await this.loadOrCreateTaskAndHistory(taskId, message, sessionId, metadata);
        const context = this.createTaskContext(currentData.task, message, currentData.history);
        const generator = this.taskHandler(context);

        try {
            for await (const yieldValue of generator) {
                currentData = this.applyUpdateToTaskAndHistory(currentData, yieldValue);
                await this.taskStore.save(currentData);
                // DO NOT update context.task here, it's readonly
            }
        } catch (handlerError) {
            const failureStatusUpdate: Omit<schema.TaskStatus, "timestamp"> = {
                 state: "failed",
                 message: { role: "agent", parts: [{ type: "text", text: `Handler failed: ${handlerError instanceof Error ? handlerError.message : String(handlerError)}` }] }
            };
            currentData = this.applyUpdateToTaskAndHistory(currentData, failureStatusUpdate);
            try { await this.taskStore.save(currentData); } catch (saveError) {
                 console.error(`[A2AServer ${taskId}] Failed to save task after handler error:`, saveError); 
            }
            // Throw the original error wrapped or an A2AError
            let errorToThrow: Error;
            if (handlerError instanceof A2AErrorClass) {
                errorToThrow = handlerError;
            } else if (handlerError instanceof Error) {
                errorToThrow = A2AErrorClass.internalError(handlerError.message, { stack: handlerError.stack });
            } else {
                errorToThrow = A2AErrorClass.internalError("Unknown handler error.", handlerError);
            }
             // Add taskId context if missing
            if (errorToThrow instanceof A2AErrorClass && !errorToThrow.taskId) {
                errorToThrow.taskId = taskId;
            }
            throw errorToThrow; // Let the main error handler normalize and send response
        }
        // Send final task state
        this.sendJsonResponse(res, req.id, currentData.task);
    }

    private async handleTaskGet(req: schema.GetTaskRequest, res: express.Response): Promise<void> {
        const { id: taskId } = req.params;
        if (!taskId) throw A2AErrorClass.invalidParams("Missing task ID.");
        const data = await this.taskStore.load(taskId);
        if (!data) throw A2AErrorClass.taskNotFound(taskId);
        this.sendJsonResponse(res, req.id, data.task);
    }

    private async handleTaskCancel(req: schema.CancelTaskRequest, res: express.Response): Promise<void> {
        const { id: taskId } = req.params;
        if (!taskId) throw A2AErrorClass.invalidParams("Missing task ID.");

        let data = await this.taskStore.load(taskId);
        if (!data) throw A2AErrorClass.taskNotFound(taskId);

        const finalStates: schema.TaskState[] = ["completed", "failed", "canceled"];
        if (finalStates.includes(data.task.status.state)) {
            console.log(`[A2AServer ${taskId}] Already in final state ${data.task.status.state}, cannot cancel.`);
            this.sendJsonResponse(res, req.id, data.task);
            return;
        }

        this.activeCancellations.add(taskId);
        const cancelUpdate: Omit<schema.TaskStatus, "timestamp"> = {
            state: "canceled",
            message: { role: "agent", parts: [{ type: "text", text: "Task cancelled by request." }] }
        };
        data = this.applyUpdateToTaskAndHistory(data, cancelUpdate);
        await this.taskStore.save(data);
        this.activeCancellations.delete(taskId);
        this.sendJsonResponse(res, req.id, data.task);
    }

    // --- Helper Methods (Adapted from sample) ---

    private applyUpdateToTaskAndHistory(current: TaskAndHistory, update: Omit<schema.TaskStatus, "timestamp"> | schema.Artifact): TaskAndHistory {
        let newTask = { ...current.task };
        let newHistory = [...current.history];

        if (isTaskStatusUpdate(update)) {
            newTask.status = { ...newTask.status, ...update, timestamp: getCurrentTimestamp() };
            if (update.message?.role === "agent") {
                newHistory.push(update.message);
            }
        } else if (isArtifactUpdate(update)) { // Basic artifact handling (no append/replace logic yet)
            newTask.artifacts = [...(newTask.artifacts || []), { ...update }];
            if (newTask.artifacts.some(a => a.index !== undefined)) {
                newTask.artifacts.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
            }
        }
        return { task: newTask, history: newHistory };
    }

    private async loadOrCreateTaskAndHistory(taskId: string, initialMessage: schema.Message, sessionId?: string | null, metadata?: Record<string, unknown> | null): Promise<TaskAndHistory> {
        let data = await this.taskStore.load(taskId);
        let needsSave = false;

        if (!data) {
            const initialTask: schema.Task = {
                id: taskId,
                sessionId: sessionId ?? undefined,
                status: { state: "submitted", timestamp: getCurrentTimestamp(), message: null },
                artifacts: [],
                metadata: metadata ?? undefined
            };
            const initialHistory: schema.Message[] = [initialMessage];
            data = { task: initialTask, history: initialHistory };
            needsSave = true;
            console.log(`[A2AServer ${taskId}] Created new task and history.`);
        } else {
            console.log(`[A2AServer ${taskId}] Loaded existing task and history.`);
            data = { task: { ...data.task }, history: [...data.history, initialMessage] }; // Use copies
            needsSave = true;

            const finalStates: schema.TaskState[] = ["completed", "failed", "canceled"];
            if (finalStates.includes(data.task.status.state)) {
                console.warn(`[A2AServer ${taskId}] Received message for task in final state ${data.task.status.state}. Resetting to submitted.`);
                const resetUpdate: Omit<schema.TaskStatus, "timestamp"> = { state: "submitted", message: null };
                data = this.applyUpdateToTaskAndHistory(data, resetUpdate);
            } else if (data.task.status.state === "input-required") {
                console.log(`[A2AServer ${taskId}] Received message while 'input-required', changing state to 'working'.`);
                const workingUpdate: Omit<schema.TaskStatus, "timestamp"> = { state: "working" };
                data = this.applyUpdateToTaskAndHistory(data, workingUpdate);
            }
        }
        if (needsSave) {
            await this.taskStore.save(data);
        }
        return { task: { ...data.task }, history: [...data.history] }; // Return copies
    }

    private createTaskContext(task: schema.Task, userMessage: schema.Message, history: schema.Message[]): TaskContext {
        // Ensure we pass copies to the handler to prevent mutation
        return {
            task: { ...task },
            userMessage: JSON.parse(JSON.stringify(userMessage)), // Deep copy message
            history: JSON.parse(JSON.stringify(history)), // Deep copy history
            isCancelled: () => this.activeCancellations.has(task.id)
        };
    }

    private isValidJsonRpcRequest(body: any): body is schema.JSONRPCRequest {
       return (
            typeof body === "object" && body !== null && body.jsonrpc === "2.0" &&
            typeof body.method === "string" &&
            (body.id === null || typeof body.id === "string" || typeof body.id === "number") &&
            (body.params === undefined || typeof body.params === "object") // Allows null, object, array
       );
    }

    private validateTaskSendParams(params: any): asserts params is schema.TaskSendParams {
        if (!params || typeof params !== "object") throw A2AErrorClass.invalidParams("Missing or invalid params object.");
        if (typeof params.id !== "string" || params.id === "") throw A2AErrorClass.invalidParams("Invalid or missing task ID (params.id).");
        if (!params.message || typeof params.message !== "object" || !Array.isArray(params.message.parts)) throw A2AErrorClass.invalidParams("Invalid or missing message object (params.message).");
    }

    private createSuccessResponse<T>(id: number | string | null, result: T): schema.JSONRPCResponse<T> {
        if (id === null) throw A2AErrorClass.internalError("Cannot create success response for null ID.");
        return { jsonrpc: "2.0", id: id, result: result };
    }

    private createErrorResponse(id: number | string | null, error: schema.JSONRPCError<unknown>): schema.JSONRPCResponse<null, unknown> {
        return { jsonrpc: "2.0", id: id, error: error };
    }

    private normalizeError(error: unknown, reqId: number | string | null, taskId?: string): schema.JSONRPCResponse<null, unknown> {
        let a2aError: A2AErrorClass;
        if (error instanceof A2AErrorClass) {
            a2aError = error;
        } else if (error instanceof Error) {
            // Convert generic Error to internal A2AError
            a2aError = A2AErrorClass.internalError(error.message, { stack: error.stack });
        } else {
            // Handle non-Error throws
            a2aError = A2AErrorClass.internalError("An unknown error occurred.", error);
        }
        // Ensure taskId context
        if (taskId && !a2aError.taskId) {
            a2aError.taskId = taskId;
        }
        console.error(`[A2AServer Error] Task: ${a2aError.taskId ?? "N/A"}, ReqID: ${reqId ?? "N/A"}, Code: ${a2aError.code}, Message: ${a2aError.message}`);
        if (a2aError.data) console.error("[A2AServer Error Data]:", a2aError.data);
        // Use createErrorResponse helper
        return this.createErrorResponse(reqId, a2aError.toJSONRPCError());
    }

    private errorHandler = (err: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
        if (res.headersSent) {
             // Extract potential taskId from the error if it's an A2AError
             const taskId = (err instanceof A2AErrorClass) ? err.taskId : undefined;
             console.error(`[A2AServer ErrorHandler] Error after headers sent (ReqID: ${req.body?.id ?? "N/A"}, TaskID: ${taskId ?? "N/A"}):`, (err instanceof Error) ? err.message : err);
             if (!res.writableEnded) res.end();
             return;
        }
        let reqId = null;
        try { reqId = req.body?.id ?? null; } catch (_) { /* ignore */ }
        // Normalize the error (which might be anything)
        const responseError = this.normalizeError(err, reqId);
        res.status(200).json(responseError); // JSON-RPC errors use 200 OK
    };

    private sendJsonResponse<T>(res: express.Response, reqId: number | string | null, result: T): void {
        if (reqId === null) {
            console.warn("[A2AServer] Attempted to send JSON response for a request with null ID.");
            return; // Don't send response if ID was null (likely notification)
        }
        res.json(this.createSuccessResponse(reqId, result));
    }
}

// Define a function to create and start the server
export function startServer(port: number = 3000) {
    const app = express();

    // Middleware
    app.use(cors()); // Enable CORS for all origins
    app.use(bodyParser.json()); // Parse JSON request bodies

    // A2A Task Endpoint (Simplified: handles 'tasks/send' for non-streaming)
    app.post('/a2a/tasks/send', async (req: Request, res: Response) => {
        console.log('[Server] Received POST /a2a/tasks/send');
        const taskParams = req.body as TaskSendParams;

        // Basic validation
        if (!taskParams?.id || !taskParams.message?.parts?.length) {
            console.error('[Server] Invalid task parameters received:', taskParams);
            const errorResponse: A2AError = {
                code: -32602, message: 'Invalid A2A task parameters.'
            };
            return res.status(400).json({ jsonrpc: "2.0", error: errorResponse, id: taskParams?.id ?? null });
        }

        const taskId = taskParams.id;
        const currentUserMessage = taskParams.message; // The message just sent by the user

        // Extract user text (ensure it's text before proceeding)
        const userTextPart = currentUserMessage.parts.find((part): part is TextPart => 'text' in part && part.type === 'text');
        if (!userTextPart?.text) {
            console.error(`[Server] Task [${taskId}] Could not find user text in the current message:`, currentUserMessage);
            const errorResponse: A2AError = { code: -32602, message: 'No valid user text part found in the message.' };
            return res.status(400).json({ jsonrpc: "2.0", error: errorResponse, id: taskId });
        }
        const userMessageText = userTextPart.text;

        console.log(`[Server] Task [${taskId}] Extracted user message: ${userMessageText}`);

        // Retrieve history for this task
        const history = taskHistories.get(taskId) || [];
        console.log(`[Server] Task [${taskId}] Retrieved history length: ${history.length}`);

        try {
            // Call the core agent logic, passing the history
            const agentResponseText = await handleMessage(userMessageText, history); // Pass history
            console.log(`[Server] Task [${taskId}] Agent responded: ${agentResponseText}`);

            // Construct the Agent's response message
            const agentResponsePart: TextPart = { type: "text", text: agentResponseText };
            const agentResponseMessage: Message = { role: 'agent', parts: [agentResponsePart] };

            // --- Update History ---
            const newHistory = [...history, currentUserMessage, agentResponseMessage];
            taskHistories.set(taskId, newHistory);
            console.log(`[Server] Task [${taskId}] Updated history length: ${newHistory.length}`);
            // ----------------------

            // Create the final Task status object for the response
            const responseStatus: TaskStatus = {
                state: "completed",
                message: agentResponseMessage // Include the agent's response message
            };
            const responseTask: Task = { id: taskId, status: responseStatus };

            console.log(`[Server] Task [${taskId}] Sending successful task response.`);
            res.status(200).json({ jsonrpc: "2.0", result: responseTask, id: taskId });

        } catch (error) {
            console.error(`[Server] Task [${taskId}] Error handling message in agent:`, error);
            const agentError: A2AError = {
                code: ErrorCodeInternalError,
                message: error instanceof Error ? error.message : 'Agent failed to process the request.'
            };
            const errorStatus: TaskStatus = { state: "failed" };
            const errorTaskResponse: Task = { id: taskId, status: errorStatus };
            res.status(500).json({ jsonrpc: "2.0", error: agentError, id: taskId });
            // Note: We don't update history on error in this simple case
        }
    });

    // TODO: Implement other A2A endpoints (tasks/get, tasks/cancel, tasks/sendSubscribe)
    // TODO: Add endpoint for Agent Card /.well-known/agent.json
    // TODO: Implement proper history cleanup/persistence

    // Start listening
    app.listen(port, () => {
        console.log(`[Server] Nuwa Agent A2A server listening on http://localhost:${port}`);
    });

    return app; // Return the app instance if needed
} 