import type { BubblePosition } from '@/hooks/useDraggableBubble';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatbotContextType {
  // Chat window state
  isOpen: boolean;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;

  // Bubble position
  bubblePosition: BubblePosition;
  setBubblePosition: (position: BubblePosition) => void;

  // Chat window width
  chatWidth: number;
  setChatWidth: (width: number) => void;

  // Chat window side (left or right)
  chatSide: 'left' | 'right';
  setChatSide: (side: 'left' | 'right') => void;

  // Active thread (API-based)
  activeThreadId: number | null;
  setActiveThreadId: (id: number | null) => void;

  // Legacy: Conversations (for backward compatibility with old components)
  conversations: ChatConversation[];
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  createConversation: (title?: string) => string;
  deleteConversation: (id: string) => void;
  addMessage: (
    conversationId: string,
    message: Omit<ChatMessage, 'id' | 'timestamp'>,
  ) => void;
  getActiveConversation: () => ChatConversation | null;
}

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

const STORAGE_KEYS = {
  BUBBLE_POSITION: 'chatbot-bubble-position',
  CHAT_WIDTH: 'chatbot-chat-width',
  CHAT_SIDE: 'chatbot-chat-side',
  ACTIVE_THREAD_ID: 'chatbot-active-thread-id',
  // Legacy keys for backward compatibility
  CONVERSATIONS: 'chatbot-conversations',
  ACTIVE_CONVERSATION_ID: 'chatbot-active-conversation-id',
};

const DEFAULT_BUBBLE_POSITION: BubblePosition = {
  edge: 'bottom-right',
  percentage: 0,
};
const DEFAULT_CHAT_WIDTH = 450;
const DEFAULT_CHAT_SIDE: 'left' | 'right' = 'left';

// Shared with chat-window.tsx's drag-resize handle, so a width picked by
// dragging and one restored from localStorage on a narrower screen are
// bounded the same way.
export const MIN_CHAT_WIDTH = 320;

/**
 * A `chatWidth` persisted from a wide monitor has no relation to the
 * viewport it's being restored into — without this, opening the app on a
 * laptop after resizing the chat to 800px on an ultrawide left the panel
 * wider than the window itself (or positioned partly off-screen, since
 * chat-window.tsx positions it via `window.innerWidth - chatWidth -
 * margins`).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function clampChatWidth(width: number): number {
  if (typeof window === 'undefined') {
    return Math.max(MIN_CHAT_WIDTH, width);
  }
  const maxWidth = Math.max(MIN_CHAT_WIDTH, window.innerWidth - 48);
  return Math.min(Math.max(width, MIN_CHAT_WIDTH), maxWidth);
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function ChatbotProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const [bubblePosition, setBubblePositionState] = useState<BubblePosition>(
    () => {
      const stored = localStorage.getItem(STORAGE_KEYS.BUBBLE_POSITION);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Migration: convert old format (x, y) to new format (edge, percentage)
          if ('x' in parsed && 'y' in parsed && !('edge' in parsed)) {
            // Old format detected - convert to bottom-right corner as default
            return DEFAULT_BUBBLE_POSITION;
          }
          // Validate new format
          if (
            'edge' in parsed &&
            'percentage' in parsed &&
            typeof parsed.edge === 'string' &&
            typeof parsed.percentage === 'number'
          ) {
            return parsed as BubblePosition;
          }
          return DEFAULT_BUBBLE_POSITION;
        } catch {
          return DEFAULT_BUBBLE_POSITION;
        }
      }
      return DEFAULT_BUBBLE_POSITION;
    },
  );

  const [chatWidth, setChatWidthState] = useState<number>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_WIDTH);
    const initial = stored ? Number.parseInt(stored, 10) : DEFAULT_CHAT_WIDTH;
    return clampChatWidth(initial);
  });

  const [chatSide, setChatSideState] = useState<'left' | 'right'>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SIDE);
    return stored === 'right' ? 'right' : DEFAULT_CHAT_SIDE;
  });

  // Active thread ID (for real API)
  const [activeThreadId, setActiveThreadIdState] = useState<number | null>(
    () => {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_THREAD_ID);
      return stored ? Number.parseInt(stored, 10) : null;
    },
  );

  const [conversations, setConversations] = useState<ChatConversation[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((conv: ChatConversation) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          messages: conv.messages.map((msg: ChatMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          })),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [activeConversationId, setActiveConversationIdState] = useState<
    string | null
  >(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID) || null;
  });

  const setBubblePosition = useCallback((position: BubblePosition) => {
    setBubblePositionState(position);
    localStorage.setItem(
      STORAGE_KEYS.BUBBLE_POSITION,
      JSON.stringify(position),
    );
  }, []);

  const setChatWidth = useCallback((width: number) => {
    const clamped = clampChatWidth(width);
    setChatWidthState(clamped);
    localStorage.setItem(STORAGE_KEYS.CHAT_WIDTH, clamped.toString());
  }, []);

  // Re-clamp on resize too — a width that fit fine gets stuck at whatever
  // it was otherwise (this only reads state on resize, it doesn't need to
  // re-run when chatWidth itself changes).
  useEffect(() => {
    const handleResize = () => {
      setChatWidthState((current) => {
        const clamped = clampChatWidth(current);
        if (clamped !== current) {
          localStorage.setItem(STORAGE_KEYS.CHAT_WIDTH, clamped.toString());
        }
        return clamped;
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const setChatSide = useCallback((side: 'left' | 'right') => {
    setChatSideState(side);
    localStorage.setItem(STORAGE_KEYS.CHAT_SIDE, side);
  }, []);

  const setActiveConversationId = useCallback((id: string | null) => {
    setActiveConversationIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CONVERSATION_ID);
    }
  }, []);

  const setActiveThreadId = useCallback((id: number | null) => {
    setActiveThreadIdState(id);
    if (id !== null) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_THREAD_ID, id.toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_THREAD_ID);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CONVERSATIONS,
      JSON.stringify(conversations),
    );
  }, [conversations]);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const createConversation = useCallback(
    (title?: string): string => {
      const id = generateId();
      const now = new Date();
      const newConversation: ChatConversation = {
        id,
        title: title || `Conversation ${conversations.length + 1}`,
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      setConversations((prev) => [...prev, newConversation]);
      setActiveConversationId(id);
      return id;
    },
    [conversations.length, setActiveConversationId],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((conv) => conv.id !== id));
      if (activeConversationId === id) {
        const remaining = conversations.filter((conv) => conv.id !== id);
        setActiveConversationId(remaining.length > 0 ? remaining[0].id : null);
      }
    },
    [activeConversationId, conversations, setActiveConversationId],
  );

  const addMessage = useCallback(
    (
      conversationId: string,
      message: Omit<ChatMessage, 'id' | 'timestamp'>,
    ) => {
      setConversations((prev) =>
        prev.map((conv) => {
          if (conv.id === conversationId) {
            const newMessage: ChatMessage = {
              ...message,
              id: generateId(),
              timestamp: new Date(),
            };
            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              updatedAt: new Date(),
            };
          }
          return conv;
        }),
      );
    },
    [],
  );

  const getActiveConversation = useCallback((): ChatConversation | null => {
    if (!activeConversationId) return null;
    return (
      conversations.find((conv) => conv.id === activeConversationId) || null
    );
  }, [activeConversationId, conversations]);

  const value: ChatbotContextType = {
    isOpen,
    openChat,
    closeChat,
    toggleChat,
    bubblePosition,
    setBubblePosition,
    chatWidth,
    setChatWidth,
    chatSide,
    setChatSide,
    activeThreadId,
    setActiveThreadId,
    // Legacy support
    conversations,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    deleteConversation,
    addMessage,
    getActiveConversation,
  };

  return (
    <ChatbotContext.Provider value={value}>{children}</ChatbotContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useChatbot() {
  const context = useContext(ChatbotContext);
  if (context === undefined) {
    throw new Error('useChatbot must be used within a ChatbotProvider');
  }
  return context;
}
