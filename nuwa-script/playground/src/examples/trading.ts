import { ExampleConfig, ComponentStateManager } from '../types/Example';
// Import necessary types from nuwa-script (re-exported via services)
import type { 
  ToolSchema, 
  ToolFunction, 
  EvaluatedToolArguments,
  StateValueWithMetadata,
  ToolRegistry,
  ToolContext
} from '../services/interpreter';
import type { JsonValue } from '../../../implementations/typescript/src/values';

// --- Trading State Management ---

// Asset state interface
export interface Asset {
  symbol: string;
  balance: number;
  price: number;
  change24h?: number;
}

// Trade history interface
export interface TradeHistory {
  id: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmount: number;
  timestamp: number;
}

// Trading state interface
export interface TradingState {
  assets: Asset[];
  tradeHistory: TradeHistory[];
  totalValue: number;
  lastUpdated: number;
}

// Initialize trading state
export const tradingState: TradingState = {
  assets: [
    { symbol: 'USDC', balance: 10000, price: 1.0, change24h: 0 },
    { symbol: 'BTC', balance: 0.5, price: 67500.42, change24h: 2.3 },
    { symbol: 'ETH', balance: 5.0, price: 3250.18, change24h: -1.2 },
    { symbol: 'SOL', balance: 100.0, price: 142.87, change24h: 5.7 },
    { symbol: 'AVAX', balance: 50.0, price: 35.62, change24h: -0.8 },
  ],
  tradeHistory: [
    {
      id: '1',
      fromSymbol: 'USDC',
      toSymbol: 'BTC',
      fromAmount: 1000,
      toAmount: 0.01478,
      timestamp: Date.now() - 3600000 * 2, // 2 hours ago
    },
    {
      id: '2',
      fromSymbol: 'USDC',
      toSymbol: 'ETH',
      fromAmount: 500,
      toAmount: 0.1525,
      timestamp: Date.now() - 3600000 * 24, // 1 day ago
    },
    {
      id: '3',
      fromSymbol: 'ETH',
      toSymbol: 'SOL',
      fromAmount: 0.5,
      toAmount: 11.26,
      timestamp: Date.now() - 3600000 * 48, // 2 days ago
    },
  ],
  totalValue: 0, // Will be calculated during updateTradingState
  lastUpdated: Date.now()
};

// Calculate total value of assets
const calculateTotalValue = (assets: Asset[]): number => {
  return assets.reduce((sum, asset) => sum + asset.balance * asset.price, 0);
};

// Update total value
tradingState.totalValue = calculateTotalValue(tradingState.assets);

// Function for React components to subscribe to changes
let tradingChangeListeners: (() => void)[] = [];
export const subscribeToTradingChanges = (listener: () => void): (() => void) => {
  tradingChangeListeners.push(listener);
  // Return unsubscribe function
  return () => {
    tradingChangeListeners = tradingChangeListeners.filter(l => l !== listener);
  };
};

// Notify all listeners of state changes
const notifyTradingChange = () => {
  tradingChangeListeners.forEach(listener => listener());
};

// Helper function to create state with metadata
function createState<T>(value: T, description: string, formatter?: (value: unknown) => string): StateValueWithMetadata {
  return {
    value: value as unknown as JsonValue,
    metadata: {
      description,
      formatter: formatter as unknown as ((value: JsonValue) => string) | undefined
    }
  };
}

// Update trading state in the registry
export function updateTradingState(context?: ToolContext): void {
  if (!context) {
    // If no context, try to get global registry
    const globalObj = typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : {});
    const registry = (globalObj as { __toolRegistry?: ToolRegistry }).__toolRegistry;
    if (!registry) return;
    
    updateTradingStateWithRegistry(registry);
    return;
  }
  
  // Get registry from context
  const registry = (context as unknown as { registry?: ToolRegistry }).registry;
  if (!registry) return;
  
  updateTradingStateWithRegistry(registry);
}

// Helper function to update state with a registry
function updateTradingStateWithRegistry(registry: ToolRegistry): void {
  // Update total value
  tradingState.totalValue = calculateTotalValue(tradingState.assets);
  tradingState.lastUpdated = Date.now();
  
  // Store basic trading information
  registry.setState('trading_asset_count', createState(
    tradingState.assets.length,
    "Number of assets in portfolio"
  ));
  
  registry.setState('trading_total_value', createState(
    tradingState.totalValue,
    "Total value of all assets in USD",
    (value) => {
      const amount = value as number;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    }
  ));
  
  registry.setState('trading_assets', createState(
    tradingState.assets,
    "List of all assets in portfolio"
  ));
  
  registry.setState('trading_trade_history', createState(
    tradingState.tradeHistory,
    "History of recent trades"
  ));
  
  // Store asset breakdown
  const assetValues: Record<string, number> = {};
  tradingState.assets.forEach(asset => {
    assetValues[asset.symbol] = asset.balance * asset.price;
  });
  
  registry.setState('trading_asset_values', createState(
    assetValues,
    "Value breakdown by asset",
    (value) => {
      const values = value as Record<string, number>;
      return Object.entries(values)
        .map(([symbol, value]) => `${symbol}: ${new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(value)}`)
        .join(', ');
    }
  ));
  
  // Store latest trade if available
  if (tradingState.tradeHistory.length > 0) {
    const latestTrade = tradingState.tradeHistory[0];
    
    registry.setState('trading_last_trade', createState(
      latestTrade,
      "Details of the most recent trade"
    ));
    
    const tradeDescription = `${latestTrade.fromAmount} ${latestTrade.fromSymbol} to ${latestTrade.toAmount.toFixed(4)} ${latestTrade.toSymbol}`;
    
    registry.setState('trading_last_trade_description', createState(
      tradeDescription,
      "Description of the most recent trade"
    ));
  }
  
  // Store last updated timestamp
  registry.setState('trading_last_updated', createState(
    tradingState.lastUpdated,
    "Timestamp of last trading state update",
    (value) => {
      const timestamp = value as number;
      const date = new Date(timestamp);
      return `${timestamp} (${date.toLocaleString()})`;
    }
  ));
}

// Add asset to portfolio or update existing asset
export function updateAsset(asset: Asset): void {
  const existingIndex = tradingState.assets.findIndex(a => a.symbol === asset.symbol);
  
  if (existingIndex >= 0) {
    tradingState.assets[existingIndex] = asset;
  } else {
    tradingState.assets.push(asset);
  }
  
  // Update total value
  tradingState.totalValue = calculateTotalValue(tradingState.assets);
  tradingState.lastUpdated = Date.now();
  
  // Notify listeners
  notifyTradingChange();
  
  // Update registry state
  updateTradingState();
}

// Add trade to history
export function addTrade(trade: TradeHistory): void {
  // Add trade to beginning of history
  tradingState.tradeHistory.unshift(trade);
  
  // Update asset balances
  const fromAsset = tradingState.assets.find(a => a.symbol === trade.fromSymbol);
  const toAsset = tradingState.assets.find(a => a.symbol === trade.toSymbol);
  
  if (fromAsset) {
    fromAsset.balance -= trade.fromAmount;
  }
  
  if (toAsset) {
    toAsset.balance += trade.toAmount;
  } else if (trade.toSymbol) {
    // Create new asset if it doesn't exist
    const mockPrice = 1.0; // This would normally come from API
    tradingState.assets.push({
      symbol: trade.toSymbol,
      balance: trade.toAmount,
      price: mockPrice,
      change24h: 0
    });
  }
  
  // Update total value
  tradingState.totalValue = calculateTotalValue(tradingState.assets);
  tradingState.lastUpdated = Date.now();
  
  // Notify listeners
  notifyTradingChange();
  
  // Update registry state
  updateTradingState();
}

// Trading state manager that implements ComponentStateManager interface
export const tradingStateManager: ComponentStateManager<TradingState> = {
  getState: () => ({ ...tradingState }),
  subscribe: subscribeToTradingChanges,
  updateStateInRegistry: updateTradingState
};

// --- End Trading State Management ---

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

const getPriceFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<JsonValue> => {
  const symbol = getArgValue<string>(args, 'symbol', 'string', '');
  if (!symbol) {
    throw new Error('Symbol is required');
  }
  
  // Check if we have the asset in our state
  const asset = tradingState.assets.find(a => a.symbol === symbol);
  if (asset) {
    return asset.price;
  }
  
  // Mock price data for assets not in portfolio
  const prices: Record<string, number> = {
    BTC: 67500.42,
    ETH: 3250.18,
    SOL: 142.87,
    AVAX: 35.62,
    DOT: 7.81,
    USDC: 1.0
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

const getBalanceFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<JsonValue> => {
  const symbol = getArgValue<string>(args, 'symbol', 'string', '');
  if (!symbol) {
    return 0;
  }
  
  // Check if we have the asset in our state
  const asset = tradingState.assets.find(a => a.symbol === symbol);
  if (asset) {
    return asset.balance;
  }
  
  // Return 0 if asset not found
  return 0;
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
  returns: 'object'
};

const swapFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<JsonValue> => {
  const fromSymbol = getArgValue<string>(args, 'fromSymbol', 'string', '');
  const toSymbol = getArgValue<string>(args, 'toSymbol', 'string', '');
  const amount = getArgValue<number>(args, 'amount', 'number', 0);

  // Validate input
  if (amount <= 0) {
    throw new Error('Amount must be positive');
  }
  
  // Check if fromAsset exists and has sufficient balance
  const fromAsset = tradingState.assets.find(a => a.symbol === fromSymbol);
  if (!fromAsset) {
    throw new Error(`Asset not found: ${fromSymbol}`);
  }
  
  if (fromAsset.balance < amount) {
    throw new Error(`Insufficient balance: ${fromAsset.balance} ${fromSymbol} available, ${amount} ${fromSymbol} requested`);
  }
  
  // Get toAsset if it exists, or price from mock data
  let toAssetPrice = 0;
  const toAsset = tradingState.assets.find(a => a.symbol === toSymbol);
  if (toAsset) {
    toAssetPrice = toAsset.price;
  } else {
    // Mock prices for assets not in portfolio
    const prices: Record<string, number> = {
      BTC: 67500.42,
      ETH: 3250.18,
      SOL: 142.87,
      AVAX: 35.62,
      DOT: 7.81,
      USDC: 1.0
    };
    
    if (!prices[toSymbol]) {
      throw new Error(`Unsupported asset: ${toSymbol}`);
    }
    
    toAssetPrice = prices[toSymbol];
  }
  
  // Calculate the exchange
  const fromValue = amount * fromAsset.price;
  const toAmount = fromValue / toAssetPrice;
  
  // Apply 1% trading fee
  const finalAmount = toAmount * 0.99;
  const fee = toAmount * 0.01;
  
  // Create trade record
  const tradeId = `trade_${Date.now()}`;
  const trade: TradeHistory = {
    id: tradeId,
    fromSymbol,
    toSymbol,
    fromAmount: amount,
    toAmount: finalAmount,
    timestamp: Date.now()
  };
  
  // Add trade to history and update assets
  addTrade(trade);
  
  // Update state in registry
  updateTradingState();
  
  // Return trade details
  const result = {
    tradeId,
    fromAmount: amount,
    fromSymbol,
    toAmount: finalAmount,
    toSymbol,
    fee: fee,
    rate: fromAsset.price / toAssetPrice,
    timestamp: trade.timestamp
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

const getMarketSentimentFunc: ToolFunction = async (args: EvaluatedToolArguments): Promise<JsonValue> => {
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
  
  // Update registry state
  updateTradingState();
  
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
export const tradingExample: ExampleConfig = {
  id: 'trading',
  name: 'Trading Example',
  description: 'Trading simulation API allowing users to fetch price data and execute trades.',
  category: 'Intermediate',
  script: `// Auto-trading decision script
LET INVESTMENT = 1000  // USDC investment amount

// Get BTC and ETH prices using tool call expression
LET btcPrice = CALL getPrice {symbol: "BTC"}
LET ethPrice = CALL getPrice {symbol: "ETH"}
PRINT(FORMAT("BTC Price: {price}", {price: btcPrice}))
PRINT(FORMAT("ETH Price: {price}", {price: ethPrice}))

// Get market sentiment
LET btcSentiment = CALL getMarketSentiment {symbol: "BTC"}
LET ethSentiment = CALL getMarketSentiment {symbol: "ETH"}
PRINT(FORMAT("BTC Sentiment: {sentiment}", {sentiment: btcSentiment}))
PRINT(FORMAT("ETH Sentiment: {sentiment}", {sentiment: ethSentiment}))

// Get current balance
LET usdcBalance = CALL getBalance {symbol: "USDC"}
PRINT(FORMAT("USDC Balance: {balance}", {balance: usdcBalance}))

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
  PRINT(FORMAT("Insufficient balance, need {investment} USDC but only have {balance}", {
    investment: INVESTMENT,
    balance: usdcBalance
  }))
END
`,
  tools: tradingTools.map(tool => tool.schema),
  aiPrompt: `You are an AI assistant helping users write NuwaScript for financial trading.
  
  Here are some guidelines on what you can and cannot do:
  - You can give accurate responses about implementing financial trading strategies
  - Focus on using the available trading tools: getPrice, getBalance, swap, and getMarketSentiment
  - The trading environment simulates a simplified DeFi trading system
  - Users can trade between USD, ETH, BTC, and other crypto assets
  - Suggest complete NuwaScript code examples when asked about implementing trading strategies
  - Feel free to explain concepts like order types, basic trading strategies, and risk management

  When users ask for trading-related functionality:
  1. Check if their request can be implemented with the available tools
  2. If yes, write clear and well-commented NuwaScript code
  3. If not, explain the limitations and suggest alternative approaches
  
  You have access to real-time portfolio information:
  - Current asset balances and values
  - Trade history
  - Total portfolio value
  - Latest trade details
  
  Remember that this is a simulated environment and not connected to real markets.`,
  componentId: 'trading_dashboard',
  stateManager: tradingStateManager
};

export default tradingExample;