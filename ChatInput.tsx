
import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, XCircle, FileText, Loader2, ChevronDown, Globe } from 'lucide-react'; 
import { AIPersona, PERSONA_RESEARCH_SCIENTIST_ID, PERSONA_HEMPBIS_AI_ID } from '../constants'; // Changed PERSONA_GENERAL_ID

const MAX_FILE_SIZE_MB = 4;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

interface ChatInputProps {
  onSendMessage: (message: string, fileData?: { base64Data: string; mimeType: string; fileName: string }) => void;
  isLoading: boolean;
  activePersona: AIPersona; 
  onPersonaChange: (personaId: string) => void; 
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading, 
  activePersona,
  onPersonaChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [nonImageFileName, setNonImageFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const accentBase = activePersona.accentColor; 
  const focusRingColorClass = `focus-within:ring-${accentBase}-500`;
  const sendButtonBaseClass = `bg-${accentBase}-500 hover:bg-${accentBase}-600 focus-visible:ring-${accentBase}-400`;
  const attachButtonColorClass = `text-${accentBase}-400 hover:text-${accentBase}-300`;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

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

  const handleToggleSearchPersona = () => {
    if (activePersona.id === PERSONA_RESEARCH_SCIENTIST_ID) {
      onPersonaChange(PERSONA_HEMPBIS_AI_ID); // Switch to Hempbis AI (formerly General) if search is active
    } else {
      onPersonaChange(PERSONA_RESEARCH_SCIENTIST_ID); // Switch to Research Scientist to enable search
    }
  };
  
  const isSearchCurrentlyActive = activePersona.id === PERSONA_RESEARCH_SCIENTIST_ID;

  return (
    <div className="p-3 md:p-4 bg-slate-800/80 border-t border-slate-700/70 sticky bottom-0 backdrop-blur-sm">
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

      {/* Controls row */}
      <div className="flex items-center justify-between mb-2 text-xs px-1">
        <button
          disabled={isLoading} 
          className={`flex items-center py-1 px-2 rounded-md border border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-600/70 hover:border-slate-500 transition-colors
                      disabled:opacity-50 disabled:cursor-not-allowed`}
          title={`Current Model: ${activePersona.modelName}`}
        >
          <span className="truncate max-w-[150px] sm:max-w-[200px]">{activePersona.modelName}</span>
          <ChevronDown className="w-3.5 h-3.5 ml-1 text-slate-400" />
        </button>

        <button
          onClick={handleToggleSearchPersona}
          disabled={isLoading}
          className={`flex items-center py-1 px-2 rounded-md border transition-colors
                      ${isSearchCurrentlyActive 
                        ? `bg-sky-500/20 border-sky-500 text-sky-300 hover:bg-sky-500/30` 
                        : `bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-600/70 hover:border-slate-500`}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
          title={isSearchCurrentlyActive ? "Disable Web Search (Switch to Hempbis AI)" : "Enable Web Search (Switch to Research Scientist)"}
        >
          <Globe 
            className={`w-3.5 h-3.5 mr-1.5 ${isSearchCurrentlyActive ? 'text-sky-400' : 'text-slate-400'}`} 
          />
          <span>{isSearchCurrentlyActive ? 'Search Active' : 'Search'}</span>
        </button>
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
