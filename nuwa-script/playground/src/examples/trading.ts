import { ExampleConfig } from '../types/Example';
// Import necessary types from nuwa-script (re-exported via services)
import type { 
  ToolSchema, 
  ToolFunction, 
  NuwaValue, 
  EvaluatedToolArguments 
} from '../services/nuwaInterpreter';

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
  const symbolArg = args['symbol'];
  if (symbolArg && symbolArg.type === 'string') {
    const symbol = symbolArg.value as string;
    // Mock price data
    const prices: Record<string, number> = {
      BTC: 67500.42,
      ETH: 3250.18,
      SOL: 142.87,
      AVAX: 35.62,
      DOT: 7.81
    };
    
    if (prices[symbol]) {
      return { type: 'number', value: prices[symbol] };
    }
    // Throw error for unavailable price, caught by interpreter
    throw new Error(`Price unavailable for symbol: ${symbol}`);
  }
  return { type: 'null', value: null }; // Invalid arguments
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
  const symbolArg = args['symbol'];
  if (symbolArg && symbolArg.type === 'string') {
    const symbol = symbolArg.value as string;
    // Mock balance data
    const balances: Record<string, number> = {
      USDC: 10000,
      BTC: 0.5,
      ETH: 5.0,
      SOL: 100.0,
      AVAX: 50.0
    };
    return { type: 'number', value: balances[symbol] || 0 };
  }
  return { type: 'null', value: null }; // Invalid arguments
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
  const fromSymbolArg = args['fromSymbol'];
  const toSymbolArg = args['toSymbol'];
  const amountArg = args['amount'];

  if (fromSymbolArg && fromSymbolArg.type === 'string' &&
      toSymbolArg && toSymbolArg.type === 'string' &&
      amountArg && amountArg.type === 'number') {

    const fromSymbol = fromSymbolArg.value as string;
    const toSymbol = toSymbolArg.value as string;
    const amount = amountArg.value as number;

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
    
    const result = {
      fromAmount: amount,
      fromSymbol,
      toAmount: finalAmount,
      toSymbol,
      fee: fee,
      rate: prices[fromSymbol] / prices[toSymbol]
    };

    return { type: 'object', value: result };
  }
  return { type: 'null', value: null }; // Invalid arguments
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
  const symbolArg = args['symbol'];
  if (symbolArg && symbolArg.type === 'string') {
    const symbol = symbolArg.value as string;
    // Mock market sentiment data
    const sentiments: Record<string, number> = {
      BTC: 65,
      ETH: 48,
      SOL: 72,
      AVAX: 30,
      DOT: -12
    };
    return { type: 'number', value: sentiments[symbol] || 0 };
  }
  return { type: 'null', value: null }; // Invalid arguments
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
  name: 'Crypto Trading Assistant',
  description: 'Create a simple trading decision assistant with NuwaScript',
  category: 'Finance Applications',
  script: `// Auto-trading decision script
LET INVESTMENT = 1000  // USDC investment amount

// Get BTC and ETH prices
LET btcPrice = CALL getPrice(symbol="BTC")
LET ethPrice = CALL getPrice(symbol="ETH")

// Get market sentiment
LET btcSentiment = CALL getMarketSentiment(symbol="BTC")
LET ethSentiment = CALL getMarketSentiment(symbol="ETH")

// Get current balance
LET usdcBalance = CALL getBalance(symbol="USDC")

// Check if we have enough balance
IF usdcBalance >= INVESTMENT THEN
  // Decide which asset to invest in based on market sentiment
  IF btcSentiment > ethSentiment THEN
    // Better sentiment, choose BTC
    CALL swap(fromSymbol="USDC", toSymbol="BTC", amount=INVESTMENT)
  ELSE
    // Otherwise choose ETH
    CALL swap(fromSymbol="USDC", toSymbol="ETH", amount=INVESTMENT)
  END
ELSE
  // Insufficient balance
  LET message = "Insufficient balance, need " + INVESTMENT + " USDC but only have " + usdcBalance
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