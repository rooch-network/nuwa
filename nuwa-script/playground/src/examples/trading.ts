import { ExampleConfig } from '../types/Example';
import { Tool } from '../services/interpreter';

// Tool implementations for trading example
export const tools: Tool[] = [
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
    handler: async (args) => {
      const { symbol } = args;
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
      throw new Error(`Price unavailable: ${symbol}`);
    }
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
    handler: async (args) => {
      const { symbol } = args;
      // Mock balance data
      const balances: Record<string, number> = {
        USDC: 10000,
        BTC: 0.5,
        ETH: 5.0,
        SOL: 100.0,
        AVAX: 50.0
      };
      
      return balances[symbol] || 0;
    }
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
    handler: async (args) => {
      const { fromSymbol, toSymbol, amount } = args;
      
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
        throw new Error('Unsupported assets');
      }
      
      const fromValue = amount * prices[fromSymbol];
      const toAmount = fromValue / prices[toSymbol];
      
      // Apply 1% trading fee
      const finalAmount = toAmount * 0.99;
      
      return {
        fromAmount: amount,
        fromSymbol,
        toAmount: finalAmount,
        toSymbol,
        fee: toAmount * 0.01,
        rate: prices[fromSymbol] / prices[toSymbol]
      };
    }
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
    handler: async (args) => {
      const { symbol } = args;
      
      // Mock market sentiment data (-100 to 100, negative is bearish, positive is bullish)
      const sentiments: Record<string, number> = {
        BTC: 65,
        ETH: 48,
        SOL: 72,
        AVAX: 30,
        DOT: -12
      };
      
      return sentiments[symbol] || 0;
    }
  }
];

// Trading example configuration
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
  aiPrompt: 'Please create a NuwaScript script that automatically decides whether to invest in BTC or ETH based on market sentiment.'
};

export default tradingExample;