
import React, { useState, useRef, useEffect } from 'react';
import { ChatThread } from '../types';
import { Plus, Trash2, Edit3, X, Check, MessageSquareText, Brain, Leaf, Scale, Bot as BotLucide } from 'lucide-react';
import { DEFAULT_THREAD_TITLE, AI_PERSONAS, DEFAULT_PERSONA_ID, AIPersona } from '../constants';

interface ChatHistorySidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  activePersona: AIPersona; // Added to style the "New Chat" button
  onSelectThread: (threadId: string) => void;
  onNewChat: () => void;
  onDeleteThread: (threadId: string) => void;
  onRenameThread: (threadId: string, newTitle: string) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

const ThreadItemIcon: React.FC<{ personaId: string, className?: string, active: boolean }> = ({ personaId, className, active }) => {
  const persona = AI_PERSONAS.find(p => p.id === personaId) || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
  const baseColorClass = active ? `text-${persona.accentColor}-300` : `text-${persona.accentColor}-400 group-hover:text-${persona.accentColor}-300`;
  
  const commonProps = { 
    className: `${className || "w-4 h-4 flex-shrink-0"} ${baseColorClass} opacity-90`, 
    strokeWidth: 1.5 
  };

  switch (persona.iconVariant) {
    case 'scientist': return <Brain {...commonProps} />;
    case 'cultivator': return <Leaf {...commonProps} />;
    case 'policy': return <Scale {...commonProps} />;
    default: return <BotLucide {...commonProps} />;
  }
};


const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  threads,
  activeThreadId,
  activePersona, // Use this for "New Chat" button styling
  onSelectThread,
  onNewChat,
  onDeleteThread,
  onRenameThread,
  isVisible,
  onToggleVisibility
}) => {
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  const sortedThreads = [...threads].sort((a, b) => new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime());

  const handleStartEdit = (thread: ChatThread) => {
    setEditingThreadId(thread.id);
    setEditText(thread.title === DEFAULT_THREAD_TITLE ? '' : thread.title);
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditText('');
  };

  const handleSaveEdit = () => {
    if (editingThreadId && editText.trim()) {
      onRenameThread(editingThreadId, editText.trim());
    }
    setEditingThreadId(null);
    setEditText('');
  };
  
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  useEffect(() => {
    if (editingThreadId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingThreadId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isVisible) {
        onToggleVisibility();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, onToggleVisibility]);

  const newChatButtonBg = `bg-${activePersona.accentColor}-600`;
  const newChatButtonHoverBg = `hover:bg-${activePersona.accentColor}-500`;
  const newChatButtonFocusRing = `focus:ring-${activePersona.accentColor}-400`;

  return (
    <>
      {isVisible && (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 md:hidden"
            onClick={onToggleVisibility}
            aria-hidden="true"
        ></div>
      )}

      <aside 
        ref={sidebarRef}
        className={`
          fixed md:relative 
          inset-y-0 left-0 z-40 
          w-72 bg-slate-800 border-r border-slate-700/60
          text-slate-300 flex flex-col
          ${isVisible ? 'animate-slideInLeft' : 'animate-slideOutLeft md:animate-none md:-ml-72'}
          md:ml-0 
          transition-transform duration-300
        `}
        aria-label="Chat history"
        aria-hidden={!isVisible}
      >
        <div className="p-3 flex justify-between items-center border-b border-slate-700/60">
          <h2 className="text-lg font-semibold tracking-tight text-slate-200">Chat History</h2>
          <button 
            onClick={onToggleVisibility} 
            className="md:hidden p-1.5 rounded-md text-slate-400 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500" // Keep a neutral focus for close button
            aria-label="Close history sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={onNewChat}
            className={`w-full flex items-center justify-center space-x-2 ${newChatButtonBg} ${newChatButtonHoverBg} text-white font-medium py-2.5 px-4 rounded-md shadow-md transition-colors duration-150 focus:outline-none focus:ring-2 ${newChatButtonFocusRing} focus:ring-offset-2 focus:ring-offset-slate-800`}
            aria-label="Start a new chat"
          >
            <Plus className="w-5 h-5" />
            <span>New Chat</span>
          </button>
        </div>

        <nav className="flex-grow overflow-y-auto p-3 pt-0 space-y-1">
          {sortedThreads.length === 0 && (
            <p className="text-sm text-slate-400 px-2 py-4 text-center">No chat history yet.</p>
          )}
          {sortedThreads.map((thread) => {
            const personaOfThread = AI_PERSONAS.find(p => p.id === thread.activePersonaId) || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
            const isActive = activeThreadId === thread.id;
            const activeClasses = isActive ? `bg-${personaOfThread.accentColor}-600/30 text-${personaOfThread.accentColor}-100 shadow-inner border-${personaOfThread.accentColor}-500/50` : `hover:bg-slate-700/70 text-slate-300 border-transparent`;
            
            return (
              <div
                key={thread.id}
                className={`
                  group relative p-2.5 rounded-md cursor-pointer border
                  transition-all duration-150 ease-in-out
                  focus-within:bg-slate-700 
                  ${activeClasses}
                `}
                onClick={() => editingThreadId !== thread.id && onSelectThread(thread.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectThread(thread.id);}}}
                tabIndex={0}
                role="button"
                aria-current={isActive ? "page" : undefined}
              >
                {editingThreadId === thread.id ? (
                  <div className="flex items-center space-x-1.5">
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      onBlur={(e) => {
                          setTimeout(() => {
                              if (document.activeElement !== e.target && !sidebarRef.current?.contains(document.activeElement)) {
                                  handleSaveEdit();
                              }
                          }, 100);
                      }}
                      className={`flex-grow bg-slate-700 text-slate-100 text-sm p-1 rounded border border-${personaOfThread.accentColor}-500 focus:ring-1 focus:ring-${personaOfThread.accentColor}-400 outline-none`}
                      aria-label="Edit thread title"
                    />
                    <button onClick={(e) => {e.stopPropagation(); handleSaveEdit();}} className="p-1 text-slate-400 hover:text-sky-300 rounded" aria-label="Save title">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); handleCancelEdit();}} className="p-1 text-slate-400 hover:text-red-400 rounded" aria-label="Cancel edit">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-2">
                      <ThreadItemIcon personaId={thread.activePersonaId} active={isActive} />
                      <h3 className="text-sm font-medium truncate pr-12" title={thread.title}>
                        {thread.title || DEFAULT_THREAD_TITLE}
                      </h3>
                    </div>
                    <p className={`text-xs opacity-80 truncate mt-0.5 ml-6 ${isActive ? `text-${personaOfThread.accentColor}-200/90` : 'text-slate-400'}`}>
                      {new Date(thread.lastUpdatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 transition-opacity duration-150">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleStartEdit(thread); }}
                        className={`p-1.5 text-slate-400 hover:text-${personaOfThread.accentColor}-300 rounded-md`}
                        aria-label={`Edit title for thread: ${thread.title}`}
                        title="Edit title"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteThread(thread.id); }}
                        className="p-1.5 text-slate-400 hover:text-red-400 rounded-md"
                        aria-label={`Delete thread: ${thread.title}`}
                        title="Delete thread"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </nav>
        <div className="p-3 border-t border-slate-700/60 text-center mt-auto">
            <p className="text-xs text-slate-500">&copy; Hempbis AI History</p>
        </div>
      </aside>
    </>
  );
};

export default ChatHistorySidebar;
