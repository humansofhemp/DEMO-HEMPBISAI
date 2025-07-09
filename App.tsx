
// Ensure @tailwindcss/typography is in your importmap if using prose classes directly
// import type { Typography } from '@tailwindcss/typography'; // For type checking if needed

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Message, MessageSender, ChatThread } from './types';
import {
  AI_PERSONAS,
  DEFAULT_PERSONA_ID,
  LOCAL_STORAGE_THREADS_KEY,
  DEFAULT_THREAD_TITLE,
  PERSONA_RESEARCH_SCIENTIST_ID,
} from './constants';
import type { AIPersona } from './constants';
import Header from './components/Header';
import ChatMessage from './components/ChatMessage';
import ChatInput from './components/ChatInput';
import Footer from './components/Footer';
import LoadingSpinner from './components/LoadingSpinner';
import ChatHistorySidebar from './components/ChatHistorySidebar';
import { 
  initializeGeminiGlobal, 
  createChatWithHistory, 
  sendMessageToGeminiStream, 
  isApiKeyAvailable, 
  FileData 
} from './services/geminiService';
import { Sparkles, Bot, Brain, Leaf, Scale } from 'lucide-react'; 
import type { Chat, GenerateContentResponse } from '@google/genai';

const PersonaDisplayIconApp: React.FC<{ persona: AIPersona, className?: string, applyIdleAnimation?: boolean }> = ({ persona, className, applyIdleAnimation }) => {
  const idleAnimationClass = applyIdleAnimation ? persona.iconIdleAnimationClass : '';
  const finalClassName = `${className || `w-6 h-6`} ${idleAnimationClass || ''} text-${persona.accentColor}-400`;
  
  const commonProps = {
    className: finalClassName,
    strokeWidth: 1.5, // Consistent stroke width
  };
  switch (persona.iconVariant) {
    case 'scientist': return <Brain {...commonProps} />;
    case 'cultivator': return <Leaf {...commonProps} />;
    case 'policy': return <Scale {...commonProps} />;
    case 'general':
    default: return <Bot {...commonProps} />;
  }
};


const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [inputLoading, setInputLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [currentStreamingBotId, setCurrentStreamingBotId] = useState<string | null>(null);
  const currentChatSessionRef = useRef<Chat | null>(null);

  const [activePersonaId, setActivePersonaId] = useState<string>(DEFAULT_PERSONA_ID);
  const activePersona = AI_PERSONAS.find(p => p.id === activePersonaId) || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;

  const [isSidebarVisible, setIsSidebarVisible] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [showConversationStarters, setShowConversationStarters] = useState<boolean>(false);


  useEffect(() => {
    const storedThreads = localStorage.getItem(LOCAL_STORAGE_THREADS_KEY);
    if (storedThreads) {
      try {
        const parsedThreads = JSON.parse(storedThreads) as ChatThread[];
        const threadsWithPersona = parsedThreads.map(thread => ({
            ...thread,
            activePersonaId: thread.activePersonaId || DEFAULT_PERSONA_ID,
            messages: thread.messages.map(msg => ({
                ...msg,
                personaId: msg.sender === MessageSender.BOT ? (msg.personaId || thread.activePersonaId || DEFAULT_PERSONA_ID) : undefined,
                isSpecializedPersona: msg.sender === MessageSender.BOT ? (msg.personaId || thread.activePersonaId) !== DEFAULT_PERSONA_ID : undefined
            }))
        }));
        setChatThreads(threadsWithPersona);
      } catch (e) {
        console.error("Failed to parse threads from localStorage", e);
        localStorage.removeItem(LOCAL_STORAGE_THREADS_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (chatThreads.length > 0 || localStorage.getItem(LOCAL_STORAGE_THREADS_KEY)) {
        localStorage.setItem(LOCAL_STORAGE_THREADS_KEY, JSON.stringify(chatThreads));
    }
  }, [chatThreads]);


  const addSystemMessage = useCallback((text: string, idSuffix: string = Date.now().toString(), type: MessageSender = MessageSender.SYSTEM, msgPersonaId?: string) => {
    const currentPersonaForMsg = AI_PERSONAS.find(p => p.id === (msgPersonaId || activePersona.id)) || activePersona;
    const systemMessage: Message = {
      id: `system-${idSuffix}`,
      text,
      sender: type,
      timestamp: new Date().toISOString(),
      personaId: currentPersonaForMsg.id, 
      isSpecializedPersona: currentPersonaForMsg.id !== DEFAULT_PERSONA_ID,
    };
    setMessages(prev => [...prev, systemMessage]);
  }, [activePersona]);

  const initializeNewChatSession = useCallback(async (
    personaToUse: AIPersona, 
    threadToContinue?: ChatThread
  ): Promise<boolean> => { 
    setInputLoading(true);
    setError(null);
    
    if (!isApiKeyAvailable()) {
      setApiKeyMissing(true);
      const errorText = "Hempbis AI requires an API Key. Please ensure it's configured.";
      setError(errorText);
      addSystemMessage(errorText, 'apikey-error-main', MessageSender.SYSTEM, personaToUse.id);
      setInputLoading(false);
      return false;
    }
    setApiKeyMissing(false);
  
    if (!initializeGeminiGlobal()) {
      const errorText = "Failed to initialize AI Service. Please try refreshing.";
      setError(errorText);
      addSystemMessage(errorText, 'init-error-main', MessageSender.SYSTEM, personaToUse.id);
      setInputLoading(false);
      return false;
    }
      
    const historyForChat = threadToContinue ? threadToContinue.messages.filter(m => m.sender === MessageSender.USER || m.sender === MessageSender.BOT) : [];

    const chat = await createChatWithHistory(
        personaToUse.modelName, 
        personaToUse.systemInstruction, 
        personaToUse.id, 
        historyForChat
    );
    
    if (!chat) {
      const errorText = "Failed to start or resume chat session. Please try again.";
      setError(errorText);
      addSystemMessage(errorText, 'session-error-main', MessageSender.SYSTEM, personaToUse.id);
      setInputLoading(false);
      currentChatSessionRef.current = null;
      return false;
    }
    
    currentChatSessionRef.current = chat;
    setInputLoading(false); // Input loading is for the current operation; overall app might still load thread
    return true;
  }, [addSystemMessage]);

  const handleStartNewChat = useCallback(async (triggeredByPersonaChange: boolean = false, newPersonaId?: string) => {
    setIsLoading(true); // For overall screen state
    const newThreadId = `thread-${Date.now()}`;
    
    const personaForNewChat = AI_PERSONAS.find(p => p.id === (newPersonaId || activePersonaId)) || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
    if(newPersonaId && newPersonaId !== activePersonaId) { 
        setActivePersonaId(newPersonaId); // Directly set if new chat implies persona switch
    }

    const success = await initializeNewChatSession(personaForNewChat);
    if (!success) {
      setIsLoading(false);
      return;
    }
    
    setActiveThreadId(newThreadId);
    
    const initialMessageText = personaForNewChat.greeting || `Namaste! Switched to ${personaForNewChat.name}. How can I assist?`;
    const initialMessage: Message = {
      id: `bot-${Date.now()}`,
      text: initialMessageText,
      sender: MessageSender.BOT,
      timestamp: new Date().toISOString(),
      isSpecializedPersona: personaForNewChat.id !== DEFAULT_PERSONA_ID,
      personaId: personaForNewChat.id,
    };
    setMessages([initialMessage]);
    setShowConversationStarters(true);

    if (!triggeredByPersonaChange) {
       addSystemMessage(`New chat started with ${personaForNewChat.name}.`, `newchat-${newThreadId}`, MessageSender.HISTORY_INFO, personaForNewChat.id);
    }
    setIsLoading(false);
  }, [activePersonaId, initializeNewChatSession, addSystemMessage]);

  useEffect(() => {
    if (!isLoading && chatThreads.length === 0 && !activeThreadId) {
        handleStartNewChat(false);
    } else if (!isLoading && chatThreads.length > 0 && !activeThreadId) {
        const sortedThreads = [...chatThreads].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());
        if (sortedThreads.length > 0) {
            handleSelectThread(sortedThreads[0].id);
        } else {
             handleStartNewChat(false);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, chatThreads]); // Removed handleStartNewChat from deps to avoid loops. Logic ensures it runs once appropriately.

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const parseSuggestions = (text: string): { mainText: string; suggestions: string[] } => {
    const suggestionsStartMarker = '---SUGGESTIONS_START---';
    const suggestionsEndMarker = '---SUGGESTIONS_END---';
    const startIdx = text.indexOf(suggestionsStartMarker);
    const endIdx = text.indexOf(suggestionsEndMarker);

    if (startIdx !== -1 && endIdx !== -1 && startIdx < endIdx) {
      const mainText = text.substring(0, startIdx).trim();
      const suggestionsBlock = text.substring(startIdx + suggestionsStartMarker.length, endIdx).trim();
      const suggestions = suggestionsBlock
        .split(/\\n|\n/) 
        .map(s => s.replace(/^-|^\* ?/, '').trim())
        .filter(s => s.length > 0);
      return { mainText, suggestions };
    }
    return { mainText: text, suggestions: [] };
  };

  const handleSelectThread = useCallback(async (threadId: string) => {
    const thread = chatThreads.find(t => t.id === threadId);
    if (!thread) return;

    setIsLoading(true); 
    setMessages(thread.messages);
    setActiveThreadId(thread.id);
    
    const newThreadPersona = AI_PERSONAS.find(p => p.id === (thread.activePersonaId || DEFAULT_PERSONA_ID))!;
    setActivePersonaId(newThreadPersona.id); 

    const success = await initializeNewChatSession(newThreadPersona, thread);
     if (!success) {
      setIsLoading(false); // Ensure loading state is cleared on failure
      return;
    }
    addSystemMessage(`Opened: "${thread.title}" (Persona: ${newThreadPersona.name}).`, `select-${thread.id}`, MessageSender.HISTORY_INFO, newThreadPersona.id);
    setShowConversationStarters(thread.messages.length <= 2 && thread.messages.some(m => m.sender === MessageSender.BOT));
    setIsLoading(false);
  }, [chatThreads, initializeNewChatSession, addSystemMessage]);

  const handlePersonaChange = async (newPersonaId: string): Promise<boolean> => {
    if (newPersonaId === activePersonaId) return true;

    setInputLoading(true);
    const newPersona = AI_PERSONAS.find(p => p.id === newPersonaId) || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
    
    addSystemMessage(
        `Switched to ${newPersona.name}. ${newPersona.greeting || 'How can I help?'}`,
        `persona-switch-${newPersonaId}`,
        MessageSender.BOT,
        newPersona.id 
    );
    setActivePersonaId(newPersonaId); 
    setShowConversationStarters(true);
    
    const currentActiveThread = chatThreads.find(t => t.id === activeThreadId);
    const success = await initializeNewChatSession(newPersona, currentActiveThread);
    if (!success) {
      addSystemMessage(`Error initializing chat session for ${newPersona.name}. Please try again.`, `init-fail-${newPersonaId}`, MessageSender.SYSTEM, newPersona.id);
      setInputLoading(false); // Ensure input loading is false on failure
      return false; 
    }

    if (currentActiveThread) {
        setChatThreads(prevThreads => prevThreads.map(t => 
            t.id === activeThreadId ? {...t, activePersonaId: newPersonaId, lastUpdatedAt: new Date().toISOString() } : t
        ));
    }
    setInputLoading(false); // Ensure input loading is false on success
    return true; 
  };

  const handleDeleteThread = (threadId: string) => {
    setChatThreads(prevThreads => prevThreads.filter(t => t.id !== threadId));
    if (activeThreadId === threadId) {
      setActiveThreadId(null);
      setMessages([]);
      currentChatSessionRef.current = null;
      const remainingThreads = chatThreads.filter(t => t.id !== threadId);
      if (remainingThreads.length > 0) {
        // Select the most recently updated among remaining threads
        handleSelectThread(remainingThreads.sort((a,b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime())[0].id);
      } else {
        handleStartNewChat(false, DEFAULT_PERSONA_ID); // Start fresh if no threads left
      }
    }
  };
  
  const handleRenameThread = (threadId: string, newTitle: string) => {
    setChatThreads(prevThreads =>
      prevThreads.map(t =>
        t.id === threadId ? { ...t, title: newTitle, lastUpdatedAt: new Date().toISOString() } : t
      )
    );
  };

  const handleSendMessage = async (
    text: string, 
    fileData?: FileData,
    explicitPersona?: AIPersona // New parameter
  ) => {
    setShowConversationStarters(false);
    setInputLoading(true);

    // Use explicitPersona if provided, otherwise fallback to current activePersona from state
    const currentEffectivePersona = explicitPersona || activePersona;
    const currentEffectivePersonaId = currentEffectivePersona.id;

    if (!currentChatSessionRef.current && !apiKeyMissing) {
      const currentThread = chatThreads.find(t => t.id === activeThreadId);
      // Use currentEffectivePersona for initialization if needed
      const success = await initializeNewChatSession(currentEffectivePersona, currentThread || undefined);
      if (!success) {
        addSystemMessage("Could not send message. Chat session is not active. Please try again or start a new chat.", "send-error-no-session", MessageSender.SYSTEM, currentEffectivePersonaId);
        setInputLoading(false);
        return;
      }
    } else if (apiKeyMissing) {
      addSystemMessage("Cannot send message: API Key is missing.", "send-error-apikey", MessageSender.SYSTEM, currentEffectivePersonaId);
      setInputLoading(false);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      text,
      sender: MessageSender.USER,
      timestamp: new Date().toISOString(),
      isSpecializedPersona: currentEffectivePersonaId !== DEFAULT_PERSONA_ID,
      personaId: currentEffectivePersonaId, // Use currentEffectivePersonaId
      imagePreviewUrl: (fileData && fileData.mimeType.startsWith('image/')) ? `data:${fileData.mimeType};base64,${fileData.base64Data}` : undefined,
      imageMimeType: fileData?.mimeType,
      fileName: fileData?.fileName,
    };
    
    const currentMessagesSnapshot = [...messages, userMessage];
    setMessages(currentMessagesSnapshot);


    const botMessageId = `bot-${Date.now()}`;
    setCurrentStreamingBotId(botMessageId);

    const initialBotMessage: Message = {
      id: botMessageId,
      text: `${activePersona.name} is typing... ▋`,
      sender: MessageSender.BOT,
      timestamp: new Date().toISOString(),
      personaId: currentEffectivePersona.id, // Use currentEffectivePersona.id
      isSpecializedPersona: currentEffectivePersona.id !== DEFAULT_PERSONA_ID,
      suggestions: [],
      groundingSources: [],
    };
    
    const messagesWithBotPlaceholder = [...currentMessagesSnapshot, initialBotMessage];
    setMessages(messagesWithBotPlaceholder);

    let fullBotText = '';
    let botSuggestions: string[] = [];
    let botGroundingSources: Array<{ uri: string; title: string }> = [];

    await sendMessageToGeminiStream(
      currentChatSessionRef.current,
      text,
      fileData,
      (chunk, isFinalChunk, streamError) => {
        if (streamError) {
          setMessages(prev => prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, text: streamError, suggestions: [], groundingSources: [] }
              : msg
          ));
          setError(streamError);
          setInputLoading(false);
          setCurrentStreamingBotId(null);
          return;
        }

        if (chunk && chunk.text) {
          fullBotText += chunk.text;
        }

        if (currentEffectivePersona.id === PERSONA_RESEARCH_SCIENTIST_ID && chunk.candidates && chunk.candidates.length > 0) {
          const metadata = chunk.candidates[0].groundingMetadata;
          if (metadata && metadata.groundingChunks && metadata.groundingChunks.length > 0) {
            botGroundingSources = metadata.groundingChunks
              .filter(gc => gc.web && gc.web.uri) 
              .map(gc => ({ uri: gc.web!.uri!, title: gc.web!.title || gc.web!.uri! }));
          }
        }
        
        setMessages(prev => prev.map(msg => {
            if (msg.id === botMessageId) {
              const { mainText: parsedMainText, suggestions: currentSuggestions } = parseSuggestions(fullBotText);
              if (JSON.stringify(currentSuggestions) !== JSON.stringify(botSuggestions)) {
                botSuggestions = currentSuggestions;
              }
              return {
                ...msg,
                text: isFinalChunk ? parsedMainText : parsedMainText + '▋',
                suggestions: isFinalChunk ? botSuggestions : [], // Only set suggestions on final chunk
                groundingSources: botGroundingSources.length > 0 ? botGroundingSources : undefined,
              };
            }
            return msg;
          })
        );

        if (isFinalChunk) {
          setCurrentStreamingBotId(null);
          setInputLoading(false);
          
          const finalBotMessageForThread: Message = {
            id: botMessageId,
            text: parseSuggestions(fullBotText).mainText,
            sender: MessageSender.BOT,
            timestamp: new Date().toISOString(), 
            personaId: currentEffectivePersona.id, // Use currentEffectivePersona.id
            isSpecializedPersona: currentEffectivePersona.id !== DEFAULT_PERSONA_ID,
            suggestions: botSuggestions,
            groundingSources: botGroundingSources.length > 0 ? botGroundingSources : undefined,
          };
          
          setChatThreads(prevThreads => {
            const messagesForThread = [...currentMessagesSnapshot, finalBotMessageForThread];
            
            if (!prevThreads.find(t => t.id === activeThreadId)) {
              const newThread: ChatThread = {
                id: activeThreadId || `thread-${Date.now()}`, // Use current activeThreadId if available
                title: userMessage.text.substring(0, 40).trim() || DEFAULT_THREAD_TITLE,
                messages: messagesForThread,
                createdAt: new Date().toISOString(),
                lastUpdatedAt: new Date().toISOString(),
                systemInstruction: currentEffectivePersona.systemInstruction, // Use currentEffectivePersona
                modelName: currentEffectivePersona.modelName, // Use currentEffectivePersona
                activePersonaId: currentEffectivePersona.id, // Use currentEffectivePersona
              };
              // Update activeThreadId if it was null and a new thread is created
              if (!activeThreadId) setActiveThreadId(newThread.id);
              return [...prevThreads, newThread];
            }
            return prevThreads.map(t =>
              t.id === activeThreadId
                ? { ...t, messages: messagesForThread, lastUpdatedAt: new Date().toISOString(), activePersonaId: currentEffectivePersona.id } // Use currentEffectivePersona
                : t
            );
          });
        }
      }
    );
  };
  
  const getTargetPersonaIdFromSuggestion = (suggestionText: string): { personaId: string | null, isAutoForward: boolean } => {
    const lowerSuggestion = suggestionText.toLowerCase().trim();
    for (const persona of AI_PERSONAS) {
        // New, more specific pattern for auto-forwarding
        const autoForwardPattern = `ask the ${persona.name.toLowerCase()} instead?`;
        if (lowerSuggestion === autoForwardPattern) {
            return { personaId: persona.id, isAutoForward: true };
        }

        // Existing, more general patterns for switching
        const patterns = [
            `switch to ${persona.name.toLowerCase()}`,
            `consult the ${persona.name.toLowerCase()}`,
            `${persona.name.toLowerCase()}'s domain`,
        ];
        if (patterns.some(pattern => lowerSuggestion.includes(pattern))) {
            return { personaId: persona.id, isAutoForward: false };
        }
    }
    return { personaId: null, isAutoForward: false };
  };

  const handleAiSuggestionClick = async (suggestionText: string, suggestionForPersonaId?: string) => {
    const { personaId: targetPersonaIdFromSuggestion, isAutoForward } = getTargetPersonaIdFromSuggestion(suggestionText);

    if (isAutoForward && targetPersonaIdFromSuggestion) {
      const lastUserMessage = [...messages].reverse().find(m => m.sender === MessageSender.USER);
      
      if (!lastUserMessage) {
        addSystemMessage("Could not find a previous question to ask the expert.", "autoforward-error-no-q", MessageSender.SYSTEM);
        return;
      }

      const personaChangedSuccessfully = await handlePersonaChange(targetPersonaIdFromSuggestion);
      if (personaChangedSuccessfully) {
        // We need to find the persona object to pass to handleSendMessage
        const targetPersonaObject = AI_PERSONAS.find(p => p.id === targetPersonaIdFromSuggestion);
        if (targetPersonaObject) {
          // Use a brief timeout to allow UI to settle after persona change before sending message
          setTimeout(() => {
            handleSendMessage(lastUserMessage.text, undefined, targetPersonaObject);
          }, 100);
        }
      }
      // If persona change fails, handlePersonaChange already shows an error message.
      return;
    }

    // This block handles other cases, like general suggestions that become a user prompt
    // or suggestions that just switch persona without resending a message.
    if (targetPersonaIdFromSuggestion && targetPersonaIdFromSuggestion !== activePersonaId) {
      await handlePersonaChange(targetPersonaIdFromSuggestion);
      // After changing persona, we don't automatically send a message unless it was an auto-forward case.
    } else {
      // If it's a regular suggestion (not a persona-switcher), send it as a new message from the user.
      handleSendMessage(suggestionText, undefined, activePersona);
    }
  };

  const handleConversationStarterClick = async (starterText: string, starterPersonaId: string) => {
    let personaForThisMessage = activePersona;

    if (starterPersonaId !== activePersonaId) {
        const targetPersonaObject = AI_PERSONAS.find(p => p.id === starterPersonaId)!;
        const success = await handlePersonaChange(starterPersonaId); // handlePersonaChange manages its own inputLoading
        if (success) {
            personaForThisMessage = targetPersonaObject;
        } else {
            // Error message added by handlePersonaChange, which also sets inputLoading false.
            return; 
        }
    }
    await handleSendMessage(starterText, undefined, personaForThisMessage);
  };
  
  const handleToggleSidebar = () => {
    setIsSidebarVisible(!isSidebarVisible);
  };

  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') { // Ensure window is defined (for SSR or testing edge cases)
        if (window.innerWidth >= 768) { 
          setIsSidebarVisible(true);
        } else {
          // setIsSidebarVisible(false); // Optionally preserve manual toggle on mobile
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  const generateContextualStarters = (messages: Message[]): string[] => {
    // Get last 2 user-bot exchanges (4 messages total)
    const recentExchange = messages
      .filter(m => m.sender === MessageSender.USER || m.sender === MessageSender.BOT)
      .slice(-4);
    
    if (recentExchange.length < 2) return [];

    const lastUserMessage = recentExchange.find(m => m.sender === MessageSender.USER);
    const lastBotMessage = recentExchange.find(m => m.sender === MessageSender.BOT);

    if (!lastUserMessage || !lastBotMessage) return [];

    // Simple keyword-based contextual suggestions
    const userText = lastUserMessage.text.toLowerCase();
    const botText = lastBotMessage.text.toLowerCase();

    const suggestions: string[] = [];

    // Agriculture context
    if (userText.includes('cultivat') || botText.includes('agricultur')) {
      suggestions.push(
        'What are the optimal soil conditions for hemp cultivation?',
        'Which hemp varieties grow best in tropical climates?',
        'How does crop rotation benefit hemp farming?'
      );
    }

    // Policy/legal context
    if (userText.includes('legal') || botText.includes('policy') || userText.includes('law')) {
      suggestions.push(
        'What are the current THC limits for industrial hemp in India?',
        'How do Indian hemp regulations compare to other countries?',
        'What licenses are required for hemp processing?'
      );
    }

    // Medical/research context
    if (userText.includes('medical') || botText.includes('cbd') || userText.includes('health')) {
      suggestions.push(
        'What clinical trials exist for CBD in pain management?',
        'How does CBD interact with other medications?',
        'What are the latest research findings on hemp antioxidants?'
      );
    }

    // Business context
    if (userText.includes('business') || botText.includes('market') || userText.includes('invest')) {
      suggestions.push(
        'What are the startup costs for a hemp processing unit?',
        'Which states offer subsidies for hemp businesses?',
        'What global markets are most promising for Indian hemp?'
      );
    }

    // Fallback to general suggestions if no specific context
    if (suggestions.length === 0) {
      suggestions.push(
        'Can you elaborate on that last point?',
        'What are some related topics I should consider?',
        'Show me research supporting this information'
      );
    }

    return suggestions.slice(0, 3); // Return top 3 suggestions
  };

  const renderConversationStarters = () => {
    if (!showConversationStarters || messages.length > (messages.some(m => m.sender === MessageSender.SYSTEM || m.sender === MessageSender.HISTORY_INFO) ? 2 : 1) ) return null;

    const contextualStarters = generateContextualStarters(messages);
    const showPersonaStarters = contextualStarters.length === 0;

    return (
      <div className="p-4 md:p-6 space-y-8 animate-fadeIn flex-grow overflow-y-auto">
        {apiKeyMissing && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md flex items-center justify-center z-[100] p-8">
            <div className="bg-slate-800 p-8 rounded-xl shadow-2xl border border-red-500/50 text-center max-w-lg">
              <h2 className="text-2xl font-bold text-red-400 mb-4">API Key Required</h2>
              <p className="text-slate-300 mb-6">
                Hempbis AI requires a valid Google Gemini API Key to function. Please ensure the
                <code>API_KEY</code> environment variable is correctly configured in your application setup.
              </p>
              <p className="text-xs text-slate-500">
                Refer to the Gemini API documentation for instructions on obtaining and setting up your API key.
                The application will attempt to re-initialize once the key is available.
              </p>
            </div>
          </div>
        )}
        <div className="text-center mb-8">
          <Sparkles className={`w-16 h-16 text-${activePersona.accentColor}-500 mx-auto mb-4 animate-icon-shimmer`} />
          <h2 className="text-3xl font-bold text-slate-100 mb-2">
            {showPersonaStarters ? 'Welcome to Hempbis AI' : 'Continue the Conversation'}
          </h2>
          <p className="text-slate-400 max-w-2xl mx-auto">
            {showPersonaStarters
              ? "I'm your specialized assistant for hemp and cannabis in India. Explore different expert modes below or ask me anything."
              : "Here are some relevant follow-up questions based on our discussion:"}
          </p>
        </div>

        {showPersonaStarters ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {AI_PERSONAS.map(persona => (
              <div
                key={persona.id}
                className={`bg-slate-800/70 p-4 rounded-lg border border-slate-700 shadow-lg transition-all hover:shadow-xl hover:border-${persona.accentColor}-600/70`}
              >
                <div className="flex items-center mb-3">
                  <PersonaDisplayIconApp persona={persona} className={`w-7 h-7 mr-3 text-${persona.accentColor}-400`} />
                  <div>
                      <h3 className={`text-lg font-semibold text-${persona.accentColor}-300`}>{persona.name}</h3>
                      <p className="text-xs text-slate-400">{persona.description}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {persona.conversationStarters.slice(0, 3).map((starter, index) => (
                    <button
                      key={`${persona.id}-starter-${index}`}
                      onClick={() => handleConversationStarterClick(starter, persona.id)}
                      disabled={inputLoading || isLoading || apiKeyMissing}
                      className={`
                        w-full text-left text-sm px-3 py-2 rounded-md
                        bg-slate-700/80 hover:bg-${persona.accentColor}-700/60
                        text-slate-300 hover:text-${persona.accentColor}-100
                        border border-slate-600/80 hover:border-${persona.accentColor}-600
                        transition-all duration-150 ease-in-out shadow-sm
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-1 gap-3">
              {contextualStarters.map((starter, index) => (
                <button
                  key={`contextual-starter-${index}`}
                  onClick={() => handleConversationStarterClick(starter, activePersonaId)}
                  disabled={inputLoading || isLoading || apiKeyMissing}
                  className={`
                    w-full text-left p-4 rounded-xl
                    bg-slate-800/90 hover:bg-${activePersona.accentColor}-800/40
                    text-slate-200 hover:text-${activePersona.accentColor}-100
                    border border-slate-700 hover:border-${activePersona.accentColor}-600
                    transition-all duration-200 ease-in-out
                    disabled:opacity-50 disabled:cursor-not-allowed
                    text-base
                  `}
                >
                  {starter}
                </button>
              ))}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => setShowConversationStarters(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                Hide suggestions
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };


  if (isLoading && !activeThreadId && chatThreads.length === 0) { // Initial full page load
    return (
        <div className="flex flex-col h-screen bg-slate-950 items-center justify-center text-slate-300">
            <img src="/logo.png" alt="Hempbis AI Loading" className="w-24 h-24 mb-6 animate-pulse opacity-80" />
            <LoadingSpinner size="w-10 h-10" color={`text-${activePersona.accentColor}-500`} />
            <p className="mt-4 text-lg">Initializing Hempbis AI...</p>
            {apiKeyMissing && <p className="text-red-400 text-sm mt-2">API Key not found. Please configure it.</p>}
        </div>
    );
  }
  
  const mainAreaBg = activePersona.chatBgAnimationClass ? `${activePersona.chatBgColor} ${activePersona.chatBgAnimationClass}` : activePersona.chatBgColor;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-900">
      <ChatHistorySidebar
        threads={chatThreads}
        activeThreadId={activeThreadId}
        activePersona={activePersona} 
        onSelectThread={handleSelectThread}
        onNewChat={() => handleStartNewChat(false, activePersonaId)}
        onDeleteThread={handleDeleteThread}
        onRenameThread={handleRenameThread}
        isVisible={isSidebarVisible}
        onToggleVisibility={handleToggleSidebar}
      />
      <div className="flex flex-col flex-1 min-w-0"> {/* Added min-w-0 for flex child truncation */}
        <Header
          activePersona={activePersona}
          onPersonaChange={handlePersonaChange}
          onToggleSidebar={handleToggleSidebar}
          apiKeyAvailable={!apiKeyMissing}
        />
        <main 
            ref={chatContainerRef} 
            className={`flex-1 overflow-y-auto p-4 md:p-6 space-y-4 ${mainAreaBg} transition-colors duration-500 ease-in-out relative`} // Ensure main takes up space
            aria-live="polite"
            role="log"
        >
          {isLoading && activeThreadId && ( // Loading indicator when switching threads or initial load of a thread
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm z-10">
                <LoadingSpinner size="w-10 h-10" color={`text-${activePersona.accentColor}-500`}/>
            </div>
          )}
          {renderConversationStarters()}
          {messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} onSuggestionClick={handleAiSuggestionClick} />
          ))}
          {inputLoading && !currentStreamingBotId && messages.length > 0 && !showConversationStarters && ( // General input loading for non-streaming phase like persona init
              <div className="flex justify-center py-2">
                  <LoadingSpinner size="w-6 h-6" color={`text-${activePersona.accentColor}-400`} />
              </div>
          )}
        </main>
        <ChatInput 
            onSendMessage={handleSendMessage} 
            isLoading={inputLoading || apiKeyMissing} 
            activePersona={activePersona}
            onPersonaChange={handlePersonaChange} // Keep this for ChatInput's own persona switcher
            allPersonas={AI_PERSONAS} // For ChatInput's persona switcher
        />
        <Footer />
      </div>
    </div>
  );
};

export default App;
