
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Paperclip, XCircle, FileText, Loader2, ChevronDown, Check, Bot, Brain, Leaf, Scale } from 'lucide-react'; 
import { AIPersona } from '../constants'; 
import type { AIPersona as AIPersonaType } from '../constants'; 

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];
const SMALL_SCREEN_BREAKPOINT = 768; // Tailwind's 'md' breakpoint

// Constants for dynamic width calculation
const AVG_CHAR_WIDTH_XS = 7; 
const BUTTON_ICON_WIDTH = 16; 
const BUTTON_HORIZONTAL_PADDING = 12; 
const BUTTON_INTERNAL_SPACING = 6; 
const BUTTON_GAP_BETWEEN = 6; 
const CONTAINER_BUFFER_MARGIN = 16; 

interface ChatInputProps {
  onSendMessage: (message: string, fileData?: { base64Data: string; mimeType: string; fileName: string }) => void;
  isLoading: boolean;
  activePersona: AIPersonaType;
  onPersonaChange: (personaId: string) => void;
  allPersonas: AIPersonaType[];
}

const PersonaIconInternal: React.FC<{ persona: AIPersonaType, className?: string }> = ({ persona, className }) => {
  const finalClassName = `${className || `w-3.5 h-3.5`} text-${persona.accentColor}-400 group-hover:text-${persona.accentColor}-300`;
  
  const commonProps = {
    className: finalClassName,
    strokeWidth: 1.5,
  };

  switch (persona.iconVariant) {
    case 'scientist': return <Brain {...commonProps} />;
    case 'cultivator': return <Leaf {...commonProps} />;
    case 'policy': return <Scale {...commonProps} />;
    case 'general':
    default: return <Bot {...commonProps} />;
  }
};


const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  activePersona,
  onPersonaChange,
  allPersonas
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [nonImageFileName, setNonImageFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isPersonaDropdownOpen, setIsPersonaDropdownOpen] = useState(false);
  const personaDropdownRef = useRef<HTMLDivElement>(null);
  const personaSelectorContainerRef = useRef<HTMLDivElement>(null);
  const [personaDisplayMode, setPersonaDisplayMode] = useState<'buttons' | 'dropdown'>('buttons');


  const accentBase = activePersona.accentColor; 
  const focusRingColorClass = `focus-within:ring-${accentBase}-500`;
  const sendButtonBaseClass = `bg-${accentBase}-500 hover:bg-${accentBase}-600 focus-visible:ring-${accentBase}-400`;
  const attachButtonColorClass = `text-${accentBase}-400 hover:text-${accentBase}-300`;
  const topBorderClass = `border-t-${accentBase}-700`; // Dynamic top border for the main component wrapper

  const calculatePersonaDisplayMode = useCallback(() => {
    if (window.innerWidth < SMALL_SCREEN_BREAKPOINT) {
      setPersonaDisplayMode('dropdown');
      return;
    }

    if (personaSelectorContainerRef.current && allPersonas.length > 0) {
      const containerWidth = personaSelectorContainerRef.current.offsetWidth;
      let estimatedTotalButtonWidth = 0;

      allPersonas.forEach(persona => {
        const textWidth = persona.name.length * AVG_CHAR_WIDTH_XS;
        const buttonWidth = BUTTON_ICON_WIDTH + BUTTON_INTERNAL_SPACING + textWidth + BUTTON_HORIZONTAL_PADDING;
        estimatedTotalButtonWidth += buttonWidth;
      });
      estimatedTotalButtonWidth += (allPersonas.length - 1) * BUTTON_GAP_BETWEEN;

      if (estimatedTotalButtonWidth > containerWidth - CONTAINER_BUFFER_MARGIN) {
        setPersonaDisplayMode('dropdown');
      } else {
        setPersonaDisplayMode('buttons');
      }
    } else {
      setPersonaDisplayMode('buttons');
    }
  }, [allPersonas]);

  useEffect(() => {
    calculatePersonaDisplayMode(); 
    window.addEventListener('resize', calculatePersonaDisplayMode);
    return () => window.removeEventListener('resize', calculatePersonaDisplayMode);
  }, [calculatePersonaDisplayMode]);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personaDropdownRef.current && !personaDropdownRef.current.contains(event.target as Node)) {
        setIsPersonaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAttachFileClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; 
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setImagePreviewUrl(null);
    setNonImageFileName(null);
    const file = event.target.files?.[0];

    if (file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setFileError(`Invalid file type. Allowed: JPG, PNG, PDF, TXT.`);
        setSelectedFile(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setFileError(`File is too large (max ${MAX_FILE_SIZE_MB}MB).`);
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setNonImageFileName(file.name);
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setImagePreviewUrl(null);
    setNonImageFileName(null);
    setFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || selectedFile) && !isLoading) {
      if (selectedFile) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Full = reader.result as string;
          const base64Data = base64Full.split(',')[1]; 
          onSendMessage(inputValue.trim(), { base64Data, mimeType: selectedFile.type, fileName: selectedFile.name });
          setInputValue('');
          removeSelectedFile();
        };
        reader.onerror = () => {
          setFileError("Could not read the selected file.");
        }
        reader.readAsDataURL(selectedFile);
      } else {
        onSendMessage(inputValue.trim());
        setInputValue('');
      }
      if (textareaRef.current) { 
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleSelectPersona = (personaId: string) => {
    if (personaId !== activePersona.id) {
      onPersonaChange(personaId);
    }
    setIsPersonaDropdownOpen(false); 
  };

  const renderPersonaSelector = () => {
    if (personaDisplayMode === 'dropdown') {
      return (
        <div className="relative flex items-center justify-start text-xs" ref={personaDropdownRef}>
          <button
            type="button"
            onClick={() => setIsPersonaDropdownOpen(!isPersonaDropdownOpen)}
            disabled={isLoading}
            className={`
              flex items-center space-x-2 py-1.5 pl-2 pr-1.5 text-xs font-medium rounded-md shadow-sm
              bg-slate-700/60 border border-slate-600 text-slate-200 
              hover:border-${accentBase}-500 hover:bg-slate-600/70
              focus:outline-none focus:ring-1 focus:ring-${accentBase}-500 focus:border-${accentBase}-500
              transition-all duration-150
              disabled:opacity-60 disabled:cursor-not-allowed
            `}
            aria-haspopup="listbox"
            aria-expanded={isPersonaDropdownOpen}
            title={`Current Persona: ${activePersona.name}`}
          >
            <PersonaIconInternal persona={activePersona} className="w-4 h-4" />
            <span className="truncate max-w-[120px] sm:max-w-[180px]">{activePersona.name}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isPersonaDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isPersonaDropdownOpen && (
            <div 
              className="absolute left-0 bottom-full mb-1 w-72 origin-bottom-left rounded-md shadow-2xl bg-slate-800/95 backdrop-blur-lg border border-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fadeIn"
              role="listbox"
            >
              <div className="py-1">
                {allPersonas.map(persona => (
                  <button
                    key={persona.id}
                    onClick={() => handleSelectPersona(persona.id)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 text-sm text-left 
                      hover:bg-${persona.accentColor}-600/30 hover:text-${persona.accentColor}-200
                      transition-colors duration-150
                      ${activePersona.id === persona.id ? `bg-${persona.accentColor}-500/20 text-${persona.accentColor}-100` : 'text-slate-200'}
                    `}
                    role="option"
                    aria-selected={activePersona.id === persona.id}
                  >
                    <div className="flex items-center space-x-2.5">
                      <PersonaIconInternal persona={persona} className="w-4 h-4" />
                      <div>
                         <p className="font-medium text-xs">{persona.name}</p>
                         <p className={`text-xs ${activePersona.id === persona.id ? `text-${persona.accentColor}-200/80` : 'text-slate-400/90'}`}>{persona.description}</p>
                      </div>
                    </div>
                    {activePersona.id === persona.id && <Check className={`w-3.5 h-3.5 text-${persona.accentColor}-300`} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Select AI Persona">
          {allPersonas.map(persona => {
            const isActive = activePersona.id === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => handleSelectPersona(persona.id)}
                disabled={isLoading}
                className={`
                  group flex items-center space-x-1.5 py-1 px-2 text-xs font-medium rounded-md border shadow-sm
                  transition-all duration-150
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${isActive
                    ? `bg-${persona.accentColor}-500/30 border-${persona.accentColor}-500 text-${persona.accentColor}-100 ring-1 ring-${persona.accentColor}-400`
                    : `bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-600/70 hover:border-slate-500 hover:text-slate-100`
                  }
                `}
                title={persona.name}
                aria-pressed={isActive}
              >
                <PersonaIconInternal persona={persona} className={`w-3.5 h-3.5 ${isActive ? `text-${persona.accentColor}-200` : `text-${persona.accentColor}-400 group-hover:text-${persona.accentColor}-300`}`} />
                <span className="truncate">{persona.name}</span>
              </button>
            );
          })}
        </div>
      );
    }
  };


  return (
    <div className={`p-3 md:p-4 bg-slate-800/80 border-t ${topBorderClass} sticky bottom-0 backdrop-blur-sm transition-colors duration-300`}>
      {(imagePreviewUrl || nonImageFileName || fileError) && (
        <div className="mb-2 p-2 border border-slate-600 rounded-lg bg-slate-700/50 relative w-full max-w-md shadow-md">
          {fileError && (
            <p className="text-red-400 text-sm py-1">{fileError}</p>
          )}
          {imagePreviewUrl && !fileError && (
            <img src={imagePreviewUrl} alt="Selected preview" className="max-h-32 max-w-full rounded object-contain mx-auto border border-slate-600" />
          )}
          {nonImageFileName && !fileError && (
            <div className="flex items-center space-x-2 p-1">
              <FileText className="w-8 h-8 text-slate-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-200 truncate" title={nonImageFileName}>{nonImageFileName}</p>
                <p className="text-xs text-slate-400">{selectedFile?.type}</p>
              </div>
            </div>
          )}
          {(imagePreviewUrl || nonImageFileName) && !fileError && (
            <button
              type="button"
              onClick={removeSelectedFile}
              className="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-0.5 shadow-lg hover:bg-slate-400"
              aria-label="Remove selected file"
            >
              <XCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      <div ref={personaSelectorContainerRef} className="mb-2 px-1 min-h-[26px]">
        {renderPersonaSelector()}
      </div>

      <form
        onSubmit={handleSubmit}
        className={`flex items-end space-x-2 bg-slate-700/60 rounded-xl p-1.5 shadow-lg border border-slate-600/80 focus-within:ring-2 ${focusRingColorClass} transition-shadow`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={ALLOWED_FILE_TYPES.join(',')}
          className="hidden"
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={handleAttachFileClick}
          disabled={isLoading}
          className={`p-2.5 rounded-lg ${attachButtonColorClass} hover:bg-slate-600/50 disabled:text-slate-500 transition-colors`}
          aria-label="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={activePersona.placeholderText || "Ask Hempbis AI anything..."}
          className="flex-grow py-2.5 px-2 bg-transparent border-none focus:ring-0 resize-none min-h-[2.75rem] max-h-40 leading-tight text-slate-100 placeholder-slate-400 text-sm"
          rows={1}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || (!inputValue.trim() && !selectedFile)}
          className={`p-2.5 rounded-lg text-white transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800
            ${isLoading || (!inputValue.trim() && !selectedFile)
              ? 'bg-slate-500 cursor-not-allowed'
              : `${sendButtonBaseClass}`
            }`}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
