
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message, MessageSender } from '../types';
import { UserCircle, Bot as BotIconLucide, Copy, Check, FileText, Link2, Brain, Leaf, Scale } from 'lucide-react'; 
import { AI_PERSONAS, PERSONA_RESEARCH_SCIENTIST_ID, DEFAULT_PERSONA_ID } from '../constants';
import type { AIPersona } from '../constants';

interface ChatMessageProps {
  message: Message;
  onSuggestionClick?: (suggestionText: string, personaId?: string) => void;
}

const PersonaBotIcon: React.FC<{ persona?: AIPersona, className?: string, isStreaming?: boolean }> = ({ persona, className, isStreaming }) => {
  const effectivePersona = persona || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
  const accentColor = effectivePersona.accentColor;

  let animationClass = effectivePersona.iconIdleAnimationClass || '';
  if (isStreaming) {
    animationClass = `animate-icon-active-pulse text-${accentColor}-400`; 
  }
  
  const iconProps = {
    className: `${className || `w-7 h-7`} ${animationClass} text-${accentColor}-400`,
    strokeWidth: 1.5,
  };

  switch (effectivePersona.iconVariant) {
    case 'scientist': return <Brain {...iconProps} />;
    case 'cultivator': return <Leaf {...iconProps} />;
    case 'policy': return <Scale {...iconProps} />;
    case 'general':
    default: return <BotIconLucide {...iconProps} />;
  }
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message, onSuggestionClick }) => {
  const [copied, setCopied] = useState(false);

  const isUser = message.sender === MessageSender.USER;
  const isBot = message.sender === MessageSender.BOT;
  const isSystem = message.sender === MessageSender.SYSTEM;
  const isHistoryInfo = message.sender === MessageSender.HISTORY_INFO;

  const persona = AI_PERSONAS.find(p => p.id === (message.personaId || DEFAULT_PERSONA_ID))!;
  const personaDisplayName = persona && persona.id !== DEFAULT_PERSONA_ID ? persona.name : null;
  const currentAccentColorName = persona?.accentColor || 'slate';

  const bubbleAlignment = (isSystem || isHistoryInfo) ? 'justify-center' : (isUser ? 'justify-end' : 'justify-start');
  
  let bubbleStyles = '';
  if (isUser) {
    bubbleStyles = `bg-${currentAccentColorName}-600 text-${currentAccentColorName}-50 rounded-xl rounded-br-sm shadow-md`;
  } else if (isBot) {
    bubbleStyles = `bg-slate-700/60 shadow-md rounded-xl rounded-bl-sm border border-slate-600/50`;
  } else if (isHistoryInfo) {
    bubbleStyles = 'bg-sky-800/50 text-sky-300 text-xs italic rounded-lg border border-sky-700 px-3 py-1.5';
  } 
  else { // System messages
    bubbleStyles = 'bg-slate-700/80 text-slate-300 italic text-sm rounded-lg border border-slate-600';
  }
  
  const avatarOrder = isUser ? 'order-2 ml-2' : 'order-1 mr-2';
  
  const handleCopy = () => {
    navigator.clipboard.writeText(message.text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const bubbleMaxWidthClass = (isSystem || isHistoryInfo)
    ? 'max-w-full sm:max-w-[90%]' 
    : 'max-w-[95%] sm:max-w-[75%] md:max-w-[70%]';

  const isPersonaSwitchMessage = isBot && message.text.toLowerCase().startsWith("switched to") && message.text.toLowerCase().includes(persona.name.toLowerCase());
  const isStreamingBotMessage = isBot && message.text.endsWith('▋');

  return (
    <div className={`flex ${bubbleAlignment} mb-3 group animate-fadeIn`} role="log" aria-live={isBot ? "polite" : "off"}>
      <div className={`flex items-end space-x-0 ${bubbleMaxWidthClass} ${isUser ? 'ml-auto' : ((isSystem || isHistoryInfo) ? 'mx-auto' : 'mr-auto')}`}>
        {!(isSystem || isHistoryInfo) && (
          <div className={`${avatarOrder} self-end shrink-0 mb-1`}>
            {isUser ? 
              <UserCircle className={`w-7 h-7 text-${currentAccentColorName}-400 opacity-90`} strokeWidth={1.5}/> :
              <PersonaBotIcon persona={persona} isStreaming={isStreamingBotMessage} />
            }
          </div>
        )}
        
        <div
          className={`p-3 ${bubbleStyles} relative ${(isSystem || isHistoryInfo) ? 'text-center' : ''} w-full`}
        >
          {isBot && personaDisplayName && !isPersonaSwitchMessage && (
            <span 
              className={`absolute -top-2.5 left-2 text-xs font-medium px-1.5 py-0.5 rounded-full shadow-sm
                         bg-${currentAccentColorName}-500/80 text-white border border-${currentAccentColorName}-400/70`}
            >
              {personaDisplayName}
            </span>
          )}
           {isUser && message.imagePreviewUrl && (
            <img 
              src={message.imagePreviewUrl} 
              alt="User upload preview" 
              className={`max-w-full sm:max-w-xs max-h-60 rounded-md my-1.5 border border-${currentAccentColorName}-400/50 object-contain`}
            />
          )}
          {isUser && !message.imagePreviewUrl && message.fileName && message.imageMimeType && (
            <div className={`my-1.5 p-2 border border-${currentAccentColorName}-500 rounded-md bg-${currentAccentColorName}-700/30 text-${currentAccentColorName}-100 flex items-center space-x-2 max-w-xs`}>
              <FileText className="w-5 h-5 shrink-0" />
              <div className="truncate">
                <p className="text-sm font-medium truncate" title={message.fileName}>{message.fileName}</p>
                <p className="text-xs opacity-80">{message.imageMimeType}</p>
              </div>
            </div>
          )}
          
          { isHistoryInfo ? (
            <p className="text-xs">{message.text}</p>
          ) : (
            <div className={`markdown-content prose prose-invert max-w-none 
                            prose-p:my-4 prose-p:leading-relaxed
                            prose-ul:my-4 prose-ol:my-4
                            prose-li:my-2 prose-li:leading-relaxed
                            prose-strong:text-slate-50 prose-strong:font-bold
                            prose-headings:text-slate-100 prose-headings:font-semibold prose-headings:mt-6 prose-headings:mb-3
                            prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline hover:prose-a:text-sky-300
                            prose-code:text-pink-400 prose-code:font-mono prose-code:text-sm prose-code:bg-slate-800/70 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md
                            prose-pre:bg-slate-800/90 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg prose-pre:p-4 prose-pre:text-slate-200 prose-pre:text-sm prose-pre:leading-relaxed
                            prose-blockquote:border-l-4 prose-blockquote:border-sky-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-slate-300
                            prose-table:border prose-table:border-slate-600 prose-th:bg-slate-800 prose-th:p-2 prose-th:border prose-th:border-slate-600 prose-td:p-2 prose-td:border prose-td:border-slate-600
                            ${isBot && personaDisplayName && !isPersonaSwitchMessage ? 'pt-2.5' : ''} 
                            ${isPersonaSwitchMessage ? 'flex items-center text-sm text-slate-300' : ''} 
                            `}
            >
              {isPersonaSwitchMessage && (
                <PersonaBotIcon persona={persona} className={`w-4 h-4 mr-1.5`} />
              )}
              {isStreamingBotMessage ? (
                <>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {message.text.slice(0, -1)}
                  </ReactMarkdown>
                  <span className="animate-typing-cursor text-current opacity-100">▋</span>
                </>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.text}
                </ReactMarkdown>
              )}
            </div>
          )}

          {isBot && message.personaId === PERSONA_RESEARCH_SCIENTIST_ID && message.groundingSources && message.groundingSources.length > 0 && (
            <div className="mt-2.5 pt-2 border-t border-slate-600">
              <h4 className="text-xs font-semibold text-slate-400 mb-1">Sources Consulted:</h4>
              <ul className="list-none pl-0 space-y-1">
                {message.groundingSources.map((source, index) => (
                  <li key={index} className="text-xs">
                    <a 
                      href={source.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sky-400 hover:text-sky-300 hover:underline break-all group/link"
                      title={source.title || source.uri}
                    >
                       <Link2 className="w-3 h-3 mr-1 shrink-0 opacity-70 group-hover/link:opacity-100" />
                      <span className="truncate">{source.title || source.uri}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isBot && message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-600/70 flex flex-wrap gap-2">
              {message.suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick?.(suggestion, message.personaId)}
                  className={`text-sm text-left w-full text-sky-300 hover:text-sky-200 bg-sky-800/30 hover:bg-sky-800/60 px-3 py-2 rounded-md transition-colors duration-200 border border-sky-700/50`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}

          {!(isSystem || isHistoryInfo) && (
             <p className={`text-xs mt-1.5 ${isUser ? `text-${currentAccentColorName}-200/70 text-right` : 'text-slate-400 text-left'}`}>
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
             </p>
          )}
          {message.text && !isHistoryInfo && !isPersonaSwitchMessage && !isStreamingBotMessage && (
            <button
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy text"}
              aria-label={copied ? "Message content copied to clipboard" : "Copy message content to clipboard"}
              className={`absolute top-1 right-1 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                isUser
                  ? `text-${currentAccentColorName}-300 hover:text-${currentAccentColorName}-100 hover:bg-${currentAccentColorName}-700/50`
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-600/50'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;
