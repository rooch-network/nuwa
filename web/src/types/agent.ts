import { bcs } from "@roochnetwork/rooch-sdk";

export interface Memory {
  index: number;
  content: string;
  timestamp: number;
}

// Define BCS MemorySchema for deserialization that matches the Move type
export const MemorySchema = bcs.struct("Memory", {
  index: bcs.u64(),
  content: bcs.string(),
  timestamp: bcs.u64(),
});

export interface Agent {
  id: string;
  name: string;
  username: string;
  description: string;
  // avatar: string;
  agentAddress: string;
  createdAt: number;
  modelProvider: string;
  instructions: string;
  lastActiveTimestamp: number;
}

export interface OnChainAgent {
  account_cap: {
    abilities: number;
    type: string;
    value: {
      addr: string;
    };
  };
  agent_address: string;
  avatar: string;
  description: string;
  instructions: string;
  last_active_timestamp: string;
  memory_store: {
    abilities: number;
    type: string;
    value: {
      memories: {
        abilities: number;
        type: string;
        handle: {
          abilities: number;
          type: string;
          value: {
            id: string;
          };
        };
      };
    };
  };
  model_provider: string;
  name: string;
  status: number;
  temperature: {
    abilities: number;
    type: string;
    value: {
      decimal: number;
      value: string;
    };
  };
  username: string;
}

export interface AgentInput {
  sender: string;
  inputDescription: string;
  inputData: any;
}
