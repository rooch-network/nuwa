// Main entry point for the Nuwa Agent
import { runCli } from './cli';
import { NuwaA2AServer } from './server';

console.log("Initializing Nuwa Agent...");

// TODO: Potentially add command-line argument parsing 
//       to choose between CLI, server, or other modes.

async function main() {
    const args = process.argv.slice(2); // Get command line arguments, excluding node path and script path

    if (args.includes('--server')) {
        // Start in server mode
        const portArg = args.findIndex(arg => arg === '--port');
        let port = 3000; // Default port
        if (portArg !== -1 && args[portArg + 1]) {
            const parsedPort = parseInt(args[portArg + 1], 10);
            if (!isNaN(parsedPort)) {
                port = parsedPort;
            }
        }
        console.log(`Starting Nuwa Agent in Server mode on port ${port}.`);
        // Instantiate and start the server
        const a2aServer = new NuwaA2AServer({
            // Optionally configure TaskStore, CORS, basePath here
            basePath: "/a2a" // Example: explicit base path
        });
        a2aServer.start(port);
        // Keep the server running (Node.js HTTP server runs indefinitely by default)
    } else {
        // Default to CLI mode
        console.log("Starting Nuwa Agent in CLI mode.");
        await runCli();
    }
}

main().catch(error => {
    console.error("Nuwa Agent failed:", error);
    process.exit(1);
}); 