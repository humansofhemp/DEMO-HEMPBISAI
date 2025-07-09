

import { GoogleGenAI, Chat, GenerateContentResponse, Part, Content } from "@google/genai";
import { Message, MessageSender } from '../types'; // Added static import
import { PERSONA_RESEARCH_SCIENTIST_ID } from '../constants'; // Import persona ID

let ai: GoogleGenAI | null = null;
// currentChat will now be managed per thread in App.tsx, this service will create/use chats as needed.

const getApiKey = (): string | undefined => {
  return process.env.API_KEY; 
};

export const initializeGeminiGlobal = (): boolean => {
  if (ai) return true; // Already initialized
  const apiKey = getApiKey();
  if (!apiKey) {
    console.error("API_KEY environment variable not found.");
    return false;
  }
  try {
    ai = new GoogleGenAI({ apiKey });
    return true;
  } catch (error) {
    console.error("Failed to initialize GoogleGenAI:", error);
    return false;
  }
};

// Helper to map our Message[] to Gemini's Content[]
const mapMessagesToGeminiHistory = (messages: Message[]): Content[] => { // Changed to use imported Message
  const history: Content[] = [];
  messages.forEach(msg => {
    // Only include user and bot messages in the history for Gemini
    if (msg.sender === MessageSender.USER) { // Changed to use imported MessageSender
      const parts: Part[] = [];
      if (msg.imageMimeType && msg.imagePreviewUrl) { // Assuming imagePreviewUrl contains base64 for history
          const base64Data = msg.imagePreviewUrl.split(',')[1];
          if (base64Data) {
            parts.push({ inlineData: { mimeType: msg.imageMimeType, data: base64Data } });
          }
      }
      parts.push({ text: msg.text || (msg.imageMimeType ? "Process this file." : "") });
      history.push({ role: "user", parts });
    } else if (msg.sender === MessageSender.BOT) { // Changed to use imported MessageSender
      // For bot messages, text might be empty if it only processed a file and gave no textual response.
      // The API expects non-empty parts, so ensure text is at least a space if empty.
      history.push({ role: "model", parts: [{ text: msg.text || " " }] });
    }
  });
  return history;
};


export const createChatWithHistory = async (
  modelName: string,
  systemInstruction: string,
  personaId: string, // Added personaId to determine if search tool should be enabled
  history?: Message[] // Changed to use imported Message
): Promise<Chat | null> => {
  if (!ai) {
    if (!initializeGeminiGlobal()) {
      console.error("AI not initialized in createChatWithHistory");
      return null;
    }
  }
  if (!ai) return null; // Should not happen if initializeGeminiGlobal succeeded

  try {
    const geminiHistory = history ? mapMessagesToGeminiHistory(history) : [];
    
    const chatConfig: { systemInstruction: string; tools?: any[]; temperature?: number; topP?: number; topK?: number; } = {
        systemInstruction: systemInstruction,
    };

    if (personaId === PERSONA_RESEARCH_SCIENTIST_ID) {
      chatConfig.tools = [{googleSearch: {}}];
      // For potentially better factual recall with search, minor adjustments:
      // chatConfig.temperature = 0.5; // Slightly lower for more factual output with search
      // chatConfig.topP = 0.9; 
      // chatConfig.topK = 32;
      // As per guidelines, DO NOT set responseMimeType: "application/json" when using googleSearch.
    }
    
    const chat = ai.chats.create({
      model: modelName,
      config: chatConfig,
      history: geminiHistory,
    });
    return chat;
  } catch (error) {
    console.error("Failed to create chat session with history:", error);
    return null;
  }
};


export interface FileData {
  base64Data: string;
  mimeType: string;
  fileName: string;
}

export const sendMessageToGeminiStream = async (
  chatSession: Chat | null, // Pass the specific chat session
  messageText: string,
  fileData: FileData | undefined,
  streamCallback: (chunk: GenerateContentResponse, isFinalChunk: boolean, error?: string) => void // Changed to pass full chunk
): Promise<void> => {
  if (!chatSession) {
    // Create a dummy error chunk to satisfy the callback type, although text will be overridden
    const errorChunk = { text: "Error: Chat session not available. Please start or select a chat." } as unknown as GenerateContentResponse;
    streamCallback(errorChunk, true, "Error: Chat session not available. Please start or select a chat.");
    return;
  }

  try {
    const messageParts: Part[] = [];
    if (fileData) {
      messageParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64Data,
        },
      });
    }
    
    messageParts.push({ text: messageText || (fileData ? "Process this file and its contents." : "") });

    const resultStream = await chatSession.sendMessageStream({ message: messageParts });
    for await (const chunk of resultStream) { // chunk type is GenerateContentResponse
        streamCallback(chunk, false); // Pass the full chunk
    }
    // Create a dummy final chunk to signal completion
    const finalEmptyChunk = { text: "" } as unknown as GenerateContentResponse; 
    streamCallback(finalEmptyChunk, true); 
  } catch (error) {
    console.error("Error sending message stream to Gemini:", error);
    let errorMessage = "Sorry, I encountered an error trying to process your request. Please try again.";
    if (error instanceof Error) {
        if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
            errorMessage = "Error: The API key is invalid. Please check your configuration.";
        } else if (error.message.includes('quota') || error.message.includes('Quota')) {
            errorMessage = "Error: API quota exceeded. Please try again later.";
        } else if (error.message.includes('history') && error.message.toLowerCase().includes('role')) {
            errorMessage = "Error with conversation history format. Please try starting a new chat.";
        }
         else {
            errorMessage = `Error processing request: ${error.message.substring(0,150)}`;
        }
    }
     const errorChunk = { text: errorMessage } as unknown as GenerateContentResponse;
    streamCallback(errorChunk, true, errorMessage);
  }
};

export const isApiKeyAvailable = (): boolean => {
    return !!getApiKey();
};