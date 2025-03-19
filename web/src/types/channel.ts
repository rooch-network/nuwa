import { bcs, BcsSerializer } from '@roochnetwork/rooch-sdk';

export interface Attachment {
  attachment_type: number;
  attachment_json: string;
}

export interface Message {
  index: number;
  channel_id: string;
  sender: string;
  content: string;
  timestamp: number;
  message_type: number;
  mentions: string[];
  reply_to: number;
  attachments: Attachment[];
}

export interface Channel {
  parent_channel: string | null;
  title: string;
  creator: string;
  members: Record<string, {
    address: string;
    joined_at: number;
    last_active: number;
  }>;
  messages: Record<number, string>;
  topics: Record<string, string>;
  message_counter: number;
  created_at: number;
  last_active: number;
  status: number;
  channel_type: number;
}

export const CHANNEL_STATUS = {
  ACTIVE: 0,
  CLOSED: 1,
  BANNED: 2,
} as const;

export const CHANNEL_TYPE = {
  AI_HOME: 0,
  AI_PEER: 1,
  TOPIC: 2,
} as const;

export const MESSAGE_TYPE = {
  NORMAL: 0,
  ACTION_EVENT: 1,
  SYSTEM_EVENT: 2,
} as const;

// BCS schema for Message
export const MessageSchema = {
  serialize(serializer: BcsSerializer, message: Message) {
    serializer.serializeU64(message.index);
    serializer.serializeStr(message.channel_id);
    serializer.serializeStr(message.sender);
    serializer.serializeStr(message.content);
    serializer.serializeU64(message.timestamp);
    serializer.serializeU8(message.message_type);
    serializer.serializeVec(message.mentions, (s, addr) => s.serializeStr(addr));
    serializer.serializeU64(message.reply_to);
  },
  deserialize(deserializer: any): Message {
    const index = deserializer.deserializeU64();
    const channel_id = deserializer.deserializeStr();
    const sender = deserializer.deserializeStr();
    const content = deserializer.deserializeStr();
    const timestamp = deserializer.deserializeU64();
    const message_type = deserializer.deserializeU8();
    const mentions = deserializer.deserializeVec((d: any) => d.deserializeStr());
    const reply_to = deserializer.deserializeU64();
    return {
      index,
      channel_id,
      sender,
      content,
      timestamp,
      message_type,
      mentions,
      reply_to,
    };
  }
};

export const ChannelSchema = bcs.struct('Channel', {
  id: bcs.string(),
  title: bcs.string(),
  creator: bcs.string(),
  created_at: bcs.string(),
  last_active: bcs.string(),
  status: bcs.u8(),
  channel_type: bcs.u8(),
  message_counter: bcs.string(),
});
