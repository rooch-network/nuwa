import { ExampleConfig } from '../types/Example';
// Import necessary types from nuwa-script (re-exported via services)
import type { 
  ToolSchema, 
  ToolFunction, 
  NuwaValue,
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';

// --- Helper Functions ---

// Helper function to determine the Nuwa type string from a JavaScript value
const getActualNuwaType = (value: unknown): string => {
  if (value === null) return 'null';
  const jsType = typeof value;
  if (jsType === 'object') {
      return Array.isArray(value) ? 'list' : 'object';
  }
  return jsType; 
};

// Helper to get value from EvaluatedToolArguments
const getArgValue = <T>(args: EvaluatedToolArguments, name: string, expectedType: string, defaultVal: T): T => {
  const value = args[name];

  if (value === undefined) {
      return defaultVal;
  }
  
  const actualType = getActualNuwaType(value);

  if (actualType === expectedType || expectedType === 'any') {
       if (actualType === 'null' && expectedType !== 'null' && expectedType !== 'any') {
           // Fall through to mismatch warning/default value
       } else {
          return value as T;
       }
  }

  console.warn(`Type mismatch for argument '${name}': Expected ${expectedType}, got ${actualType}. Using default.`);
  return defaultVal;
};

// --- Tool Definitions ---

// getPrice Tool
const getPriceSchema: ToolSchema = {
  name: 'getPrice',
  description: 'Get the current price of a cryptocurrency',
  parameters: [
    { name: 'symbol', type: 'string', description: 'Cryptocurrency symbol, e.g. BTC, ETH', required: true }
  ],
  returns: 'number'
};

const getPriceFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const symbol = getArgValue<string>(args, 'symbol', 'string', '');
  if (!symbol) {
    throw new Error('Symbol is required');
  }
  
  // Mock price data
  const prices: Record<string, number> = {
    BTC: 67500.42,
    ETH: 3250.18,
    SOL: 142.87,
    AVAX: 35.62,
    DOT: 7.81
  };
  
  if (prices[symbol]) {
    return prices[symbol];
  }
  // Throw error for unavailable price, caught by interpreter
  throw new Error(`Price unavailable for symbol: ${symbol}`);
};

// getBalance Tool
const getBalanceSchema: ToolSchema = {
  name: 'getBalance',
  description: "Get user's asset balance",
  parameters: [
    { name: 'symbol', type: 'string', description: 'Asset symbol, e.g. USDC, BTC', required: true }
  ],
  returns: 'number'
};

const getBalanceFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const symbol = getArgValue<string>(args, 'symbol', 'string', '');
  if (!symbol) {
    return 0;
  }
  
  // Mock balance data
  const balances: Record<string, number> = {
    USDC: 10000,
    BTC: 0.5,
    ETH: 5.0,
    SOL: 100.0,
    AVAX: 50.0
  };
  return balances[symbol] || 0;
};

// swap Tool
const swapSchema: ToolSchema = {
  name: 'swap',
  description: 'Execute asset exchange',
  parameters: [
    { name: 'fromSymbol', type: 'string', description: 'Source asset symbol to exchange', required: true },
    { name: 'toSymbol', type: 'string', description: 'Target asset symbol to receive', required: true },
    { name: 'amount', type: 'number', description: 'Amount to exchange', required: true }
  ],
  returns: 'object' // Return type is an object
};

const swapFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const fromSymbol = getArgValue<string>(args, 'fromSymbol', 'string', '');
  const toSymbol = getArgValue<string>(args, 'toSymbol', 'string', '');
  const amount = getArgValue<number>(args, 'amount', 'number', 0);

  // Mock swap logic
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Mock prices
  const prices: Record<string, number> = {
    BTC: 67500.42,
    ETH: 3250.18,
    SOL: 142.87,
    AVAX: 35.62,
    DOT: 7.81,
    USDC: 1.0
  };
  
  if (!prices[fromSymbol] || !prices[toSymbol]) {
    throw new Error(`Unsupported assets: ${fromSymbol} or ${toSymbol}`);
  }
  
  const fromValue = amount * prices[fromSymbol];
  const toAmount = fromValue / prices[toSymbol];
  
  // Apply 1% trading fee
  const finalAmount = toAmount * 0.99;
  const fee = toAmount * 0.01;
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: any = {
    fromAmount: amount,
    fromSymbol,
    toAmount: finalAmount,
    toSymbol,
    fee: fee,
    rate: prices[fromSymbol] / prices[toSymbol]
  };
  
  return result;
};

// getMarketSentiment Tool
const getMarketSentimentSchema: ToolSchema = {
  name: 'getMarketSentiment',
  description: 'Get market sentiment index (-100 to 100)',
  parameters: [
    { name: 'symbol', type: 'string', description: 'Cryptocurrency symbol', required: true }
  ],
  returns: 'number'
};

const getMarketSentimentFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<NuwaValue> => {
  const symbol = getArgValue<string>(args, 'symbol', 'string', '');
  if (!symbol) {
    return 0;
  }
  
  // Mock market sentiment data
  const sentiments: Record<string, number> = {
    BTC: 65,
    ETH: 48,
    SOL: 72,
    AVAX: 30,
    DOT: -12
  };
  return sentiments[symbol] || 0;
};

// Export tools in the required structure
export const tradingTools: { schema: ToolSchema, execute: ToolFunction }[] = [
  { schema: getPriceSchema, execute: getPriceFunc },
  { schema: getBalanceSchema, execute: getBalanceFunc },
  { schema: swapSchema, execute: swapFunc },
  { schema: getMarketSentimentSchema, execute: getMarketSentimentFunc }
];


// --- Trading Example Configuration (Keep for now) ---
const tradingExample: ExampleConfig = {
  id: 'trading',
  name: 'DeFi Trading',
  description: 'Cryptocurrency trading and DeFi operations with NuwaScript',
  category: 'DeFi',
  script: `// Auto-trading decision script
LET INVESTMENT = 1000  // USDC investment amount

// Get BTC and ETH prices using tool call expression
LET btcPrice = CALL getPrice {symbol: "BTC"}
LET ethPrice = CALL getPrice {symbol: "ETH"}
PRINT("BTC Price:")
PRINT(btcPrice)
PRINT("ETH Price:")
PRINT(ethPrice)

// Get market sentiment
LET btcSentiment = CALL getMarketSentiment {symbol: "BTC"}
LET ethSentiment = CALL getMarketSentiment {symbol: "ETH"}
PRINT("BTC Sentiment:")
PRINT(btcSentiment)
PRINT("ETH Sentiment:")
PRINT(ethSentiment)

// Get current balance
LET usdcBalance = CALL getBalance {symbol: "USDC"}
PRINT("USDC Balance:")
PRINT(usdcBalance)

// Check if we have enough balance
IF usdcBalance >= INVESTMENT THEN
  PRINT("Sufficient balance. Evaluating trade...")
  // Decide which asset to invest in based on market sentiment
  IF btcSentiment > ethSentiment THEN
    PRINT("BTC sentiment is higher. Swapping USDC for BTC...")
    // Use CALL statement as we don't need the return value immediately
    CALL swap {fromSymbol: "USDC", toSymbol: "BTC", amount: INVESTMENT}
    PRINT("Swap requested for BTC.")
  ELSE
    PRINT("ETH sentiment is higher or equal. Swapping USDC for ETH...")
    CALL swap {fromSymbol: "USDC", toSymbol: "ETH", amount: INVESTMENT}
    PRINT("Swap requested for ETH.")
  END
ELSE
  // Insufficient balance
  PRINT("Insufficient balance, need")
  PRINT(INVESTMENT)
  PRINT("USDC but only have")
  PRINT(usdcBalance)
END
`,
  // Keep the old tools structure for ExampleConfig compatibility if UI needs it
  tools: [
    {
      name: 'getPrice',
      description: 'Get the current price of a cryptocurrency',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Cryptocurrency symbol, e.g. BTC, ETH'
          }
        },
        required: ['symbol']
      },
      returnType: 'number'
    },
    {
      name: 'getBalance',
      description: 'Get user\'s asset balance',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Asset symbol, e.g. USDC, BTC'
          }
        },
        required: ['symbol']
      },
      returnType: 'number'
    },
    {
      name: 'swap',
      description: 'Execute asset exchange',
      parameters: {
        type: 'object',
        properties: {
          fromSymbol: {
            type: 'string',
            description: 'Source asset symbol to exchange'
          },
          toSymbol: {
            type: 'string',
            description: 'Target asset symbol to receive'
          },
          amount: {
            type: 'number',
            description: 'Amount to exchange'
          }
        },
        required: ['fromSymbol', 'toSymbol', 'amount']
      },
      returnType: 'object'
    },
    {
      name: 'getMarketSentiment',
      description: 'Get market sentiment index',
      parameters: {
        type: 'object',
        properties: {
          symbol: {
            type: 'string',
            description: 'Cryptocurrency symbol'
          }
        },
        required: ['symbol']
      },
      returnType: 'number'
    }
  ],
  aiPrompt: 'Suggest a trading strategy for BTC and ETH based on current price and market sentiment. The investment amount is 1000 USDC.'
};

export default tradingExample;