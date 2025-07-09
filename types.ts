

export enum MessageSender {
  USER = 'user',
  BOT = 'bot',
  SYSTEM = 'system', // For system messages like errors, initial greetings, mode changes
  HISTORY_INFO = 'history_info', // For system messages specific to history operations (e.g. thread created)
}

export interface Message {
  id: string;
  text: string;
  sender: MessageSender;
  timestamp: string;
  suggestions?: string[];
  isSpecializedPersona?: boolean; // True if a specific persona (not General) is active
  imagePreviewUrl?: string;
  imageMimeType?: string;
  fileName?: string;
  personaId?: string; // ID of the persona used for this message
  groundingSources?: Array<{ // For Research Scientist persona with Google Search
    uri: string;
    title: string;
  }>;
}

export interface ChatThread {
  id: string;
  title: string; // Derived from the first user message or a default
  messages: Message[];
  createdAt: string; // ISO string
  lastUpdatedAt: string; // ISO string
  systemInstruction: string; 
  modelName: string;
  activePersonaId: string; // Persona active for this thread
}

// Reflects the structure in constants.ts AIPersona
export interface AIPersonaExtended {
  id: string;
  name: string;
  description: string;
  systemInstruction: string;
  modelName: string;
  greeting?: string;
  accentColor: string; // Tailwind color name e.g. 'blue', 'emerald' (used as a base)
  accentColorHex?: { light: string, DEFAULT: string, dark: string }; // For inline styles if needed for aurora
  iconVariant: 'general' | 'scientist' | 'cultivator' | 'policy';
  placeholderText: string;
  conversationStarters: string[];
  chatBgColor: string; // e.g., 'bg-slate-950' - very dark base for aurora
  chatBgAnimationClass?: string; // e.g., 'animate-aurora-sky' - class for CSS driven animation
  iconIdleAnimationClass?: string; // e.g., 'animate-icon-pulse-blue'
}