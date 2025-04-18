import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
// import { handleMessage } from './agent'; // No longer call agent directly
import * as schema from './a2a-schema'; // Import A2A types
import { A2AClient } from './client/client'; // Import the new client class
import { RpcError } from './client/error'; // Import the client error class
import { randomUUID } from 'node:crypto'; // For generating Task IDs

// Define the server URL (base URL for the A2A server)
// Should match the basePath used in NuwaA2AServer
const SERVER_BASE_URL = 'http://localhost:3000/a2a';

export async function runCli() {
    console.log('Starting Nuwa Agent CLI (A2A Client Mode)...');
    console.log(`Connecting to server base URL: ${SERVER_BASE_URL}`);
    console.log('Type your message below, or type "exit" to quit.');

    const rl = readline.createInterface({ input, output });
    const client = new A2AClient(SERVER_BASE_URL); // Create client instance

    while (true) {
        const userInput = await rl.question('> ');

        if (userInput.toLowerCase() === 'exit') {
            console.log('Exiting Nuwa Agent CLI.');
            break;
        }

        if (!userInput.trim()) {
            continue; // Skip empty input
        }

        const taskId = randomUUID(); // Generate a unique ID for each task
        console.log(`[CLI] Sending task [${taskId}]...`);

        try {
            // 1. Construct the A2A TaskSendParams payload
            const userTextPart: schema.TextPart = { type: 'text', text: userInput };
            const userMessage: schema.Message = {
                role: 'user',
                parts: [userTextPart]
            };
            const taskParams: schema.TaskSendParams = {
                id: taskId,
                message: userMessage
                // sessionId: 'cli-session-1' // Optionally add session ID
            };

            // 2. Use the client to send the task
            // The sendTask method now returns the Task object directly or null
            const taskResult = await client.sendTask(taskParams);

            // 3. Process the result
            if (taskResult?.status?.message?.role === 'agent') {
                const agentMessage = taskResult.status.message;
                const agentTextPart = agentMessage.parts.find((part): part is schema.TextPart => part.type === 'text');
                if (agentTextPart?.text) {
                    console.log(`Agent: ${agentTextPart.text}`);
                } else {
                    console.log(`Agent: (Received response, but no text part found) Status: ${taskResult.status.state}`);
                }
            } else if (taskResult) {
                // Task completed but no agent message in status? Log status.
                console.log(`Agent: (Task completed with status: ${taskResult.status?.state})`);
            } else {
                // Should not happen if no error was thrown, but handle defensively
                console.error(`[CLI] Received null result without error for task [${taskId}]`);
                console.log(`Agent: Sorry, received an unexpected empty response from the server.`);
            }

        } catch (error) {
            // 4. Handle errors (expecting RpcError from the client)
            if (error instanceof RpcError) {
                console.error(`[CLI] A2A Error sending task [${taskId}]: Code: ${error.code}, Message: ${error.message}`, error.data ? `Data: ${JSON.stringify(error.data)}` : '');
                console.log(`Agent: Sorry, an error occurred (Code: ${error.code}).`);
            } else {
                 console.error(`[CLI] Unknown error for task [${taskId}]:`, error);
                 console.log('Agent: Sorry, an unknown error occurred.');
            }
        }
    }

    rl.close();
} 