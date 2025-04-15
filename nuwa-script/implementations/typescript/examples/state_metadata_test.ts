import { ToolRegistry, StateMetadata, StateValueWithMetadata } from '../src/tools.js';
import { NuwaValue } from '../src/values.js';

/**
 * Helper function to create state entries with metadata
 */
function createState<T extends NuwaValue>(
  value: T, 
  description: string, 
  formatter?: (value: NuwaValue) => string
): StateValueWithMetadata {
  return {
    value,
    metadata: {
      description,
      formatter
    }
  };
}

function main() {
  console.log("Starting ToolRegistry State Metadata Test...");

  // Create registry
  const registry = new ToolRegistry();

  // Method 1: Using StateValueWithMetadata
  console.log("\n=== Setting state with metadata ===");
  const priceWithMetadata = createState(
    68500.75,
    "The most recent Bitcoin price in USD",
    (value) => `$${value} USD`
  );
  registry.setState('btc_price', priceWithMetadata);
  console.log(`Set btc_price to ${priceWithMetadata.value} with metadata`);
  
  // Method 2: Setting state and metadata separately
  registry.setState('user_id', 'user123');
  registry.registerStateMetadata('user_id', {
    description: "The user's unique identifier"
  });
  console.log(`Set user_id to user123 with separate metadata registration`);
  
  // Method 3: Using timestamp
  const now = Date.now();
  registry.setState('last_query_time', now);
  registry.registerStateMetadata('last_query_time', {
    description: "Time of the most recent query",
    formatter: (value) => {
      const date = new Date(value as number);
      return `${value} (${date.toLocaleString()})`;
    }
  });
  console.log(`Set last_query_time to ${now} with custom formatter`);
  
  // Print formatted state
  console.log("\n=== Current System State ===");
  console.log(registry.formatStateForPrompt());
  console.log("===========================\n");
  
  // Update a state value
  console.log("=== Updating state value ===");
  registry.setState('btc_price', 69250.50);
  console.log(`Updated btc_price to 69250.50`);
  
  // Print formatted state again
  console.log("\n=== Updated System State ===");
  console.log(registry.formatStateForPrompt());
  console.log("===========================\n");
  
  // Clear state
  console.log("=== Clearing state ===");
  registry.clearState();
  console.log(`State cleared`);
  
  // Print formatted state one last time
  console.log("\n=== Final System State ===");
  console.log(registry.formatStateForPrompt());
  console.log("===========================\n");
}

// Run the test
main(); 