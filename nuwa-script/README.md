# NuwaScript Specification

NuwaScript is a lightweight, structured, and cross-platform scripting language designed for AI Agents. It enables AI to generate interpretable, executable, and auditable sequences of logic and actions.

---

## 🧱 Design Goals

- Human- and AI-friendly syntax
- Supports variable binding, conditionals, and loops
- Tool invocation (CALL) and expression evaluation (CALC)
- Executable in any environment (on-chain/off-chain)
- Safe, side-effect-free, and statically analyzable

---

## ✨ Core Syntax

### 1. LET (Variable Assignment)
```nuwa
LET x = 42
LET result = CALC { formula: "a + b", vars: { a: 1, b: 2 } }
LET user = CALL get_user { id: "0xabc" }
```

### 2. CALL (Invoke Tools)
```nuwa
CALL swap {
  from_token: "USDT",
  to_token: "BTC",
  amount: 100
}
```
- All tools follow `CALL tool_name { ...args }`
- Tools are externally defined (e.g., get_price, get_balance)

### 3. IF (Conditional Control)
```nuwa
IF price > 70000 THEN
  CALL swap { from_token: "USDT", to_token: "BTC", amount: 100 }
ELSE
  CALL reply { channel: "nuwa-chat", message: "Price too high." }
END
```
- Supports operators: `==`, `!=`, `>`, `<`, `>=`, `<=`
- Supports logical ops: `AND`, `OR`, `NOT`

### 4. FOR (Iteration over List)
```nuwa
FOR nft IN listed DO
  IF nft.rarity > 90 THEN
    CALL buy_nft { id: nft.id, price: nft.price }
  END
END
```
- The list (`listed`) must be iterable
- The element (`nft`) is scoped per iteration

### 5. CALC (Expression Evaluation)
```nuwa
LET estimated_value = CALC {
  formula: "floor_price + (rarity - 50) * 0.01 * floor_price",
  vars: {
    floor_price: nft.floor_price,
    rarity: nft.rarity
  }
}
```
- Supports basic math and variable substitution
- Executed using a safe embedded math engine

### 6. Built-in Functions
```nuwa
NOW()      // current timestamp
```

---

## 🧰 Tool Function Schema
Every tool must declare its interface:
```json
{
  "name": "get_price",
  "inputs": {
    "token": "String"
  },
  "outputs": "Number"
}
```

Tools may be async and resolved via relayers, APIs, or blockchain modules.

---

## 🧠 Sample Script
```nuwa
LET price = CALL get_price { token: "BTC" }

IF price < 70000 THEN
  CALL swap {
    from_token: "USDT",
    to_token: "BTC",
    amount: 100
  }
ELSE
  CALL reply {
    channel: "trading-room",
    message: "BTC too expensive for now."
  }
END
```

---

## 📦 JSON AST Format
Every NuwaScript can be compiled to JSON:
```json
[
  {
    "type": "let",
    "var": "price",
    "call": { "tool": "get_price", "args": { "token": "BTC" } }
  },
  {
    "type": "if",
    "cond": { "op": "<", "left": "price", "right": 70000 },
    "then": [
      { "type": "call", "tool": "swap", "args": { "from_token": "USDT", "to_token": "BTC", "amount": 100 } }
    ],
    "else": [
      { "type": "call", "tool": "reply", "args": { "channel": "trading-room", "message": "BTC too expensive for now." } }
    ]
  }
]
```

---

## 🚧 Safety & Constraints
- No arbitrary code execution
- No infinite loops or dynamic jumps
- Only registered tools can be used
- Variable scope is either global or block-local

---

## 🔮 Future Extensions
- Function definitions and reuse
- Script imports and modularization
- Signed scripts for verifiable on-chain use
- Agent memory and meta-reasoning integration

---

## 🧩 What is NuwaScript?

> NuwaScript is the language of Agent intent and action. Not a chat template, not a UI flow — it’s a **real behavior script**.

It empowers AI Agents to act autonomously, safely, and transparently across platforms and chains.

Let’s define the next generation of executable intent together.
