export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export type Conversation = {
  id: string;
  client_id: string;
  professional_id: string;
  created_at: string;
  updated_at: string;
}

export type ConversationWithUser = {
  id: string;
  client_id: string;
  professional_id: string;
  created_at: string;
  updated_at: string;
  other_user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_photo_url?: string;
  };
  last_message?: ChatMessage | undefined;
  unread_count: number;
}

export type MessageUser = {
  id: string;
  first_name: string;
  last_name: string;
  name: string; // Computed from first_name + last_name
}

export type ChatMessageWithUser = {
  user: MessageUser;
} & ChatMessage 