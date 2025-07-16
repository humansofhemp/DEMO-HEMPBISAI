
import React, { useState, useRef, useEffect } from 'react';
import { Menu, ChevronDown, Bot, Brain, Leaf, Scale, Check as CheckIcon } from 'lucide-react';
import { AIPersona, AI_PERSONAS, DEFAULT_PERSONA_ID } from '../constants';

interface HeaderProps {
  activePersona: AIPersona;
  onPersonaChange: (personaId: string) => void;
  onToggleSidebar: () => void;
  apiKeyAvailable: boolean;
}

const PersonaIcon: React.FC<{ persona: AIPersona, className?: string, applyIdleAnimation?: boolean }> = ({ persona, className, applyIdleAnimation }) => {
  const idleAnimationClass = applyIdleAnimation ? persona.iconIdleAnimationClass : '';
  // Text color will be on a darker accent background, so ensure contrast (e.g., -100 or -200 for text)
  const finalClassName = `${className || `w-5 h-5`} ${idleAnimationClass || ''} text-${persona.accentColor}-200`; 
  
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

const Header: React.FC<HeaderProps> = ({
  activePersona,
  onPersonaChange,
  onToggleSidebar,
  apiKeyAvailable
}) => {
  const currentPersona = activePersona || AI_PERSONAS.find(p => p.id === DEFAULT_PERSONA_ID)!;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const accentBase = currentPersona.accentColor;
  // Define header background and border based on active persona
  // Using a dark shade like -900 for background, and -700 or -800 for border.
  // Ensure these shades are available in Tailwind config or use appropriate ones.
  // Assuming 'emerald-900', 'sky-900' etc. exist and provide good contrast with light text.
  const headerBgClass = `bg-${accentBase}-900`; 
  const headerBorderClass = `border-${accentBase}-800`; // A slightly lighter shade for the border
  const headerTextColor = `text-slate-100`; // Primary text color for header content

  const handleSelectPersona = (personaId: string) => {
    onPersonaChange(personaId);
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className={`${headerBgClass} border-b ${headerBorderClass} ${headerTextColor} p-2 md:p-3 sticky top-0 z-50 backdrop-blur-md transition-colors duration-300`}> {/* Reduced padding on mobile */}
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button
            onClick={onToggleSidebar}
            className={`p-2.5 rounded-md text-${accentBase}-200 hover:bg-${accentBase}-700/70 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-${accentBase}-400`} // Increased touch target size
            aria-label="Toggle chat history"
            title="Toggle chat history"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-2">
            <img src="https://docs.hempbis.com/logo.png" alt="Hempbis AI Logo" className={`w-8 h-8 rounded-full object-contain bg-${accentBase}-700/50 p-0.5`} />
            <h1 className={`text-xl font-semibold tracking-tight hidden sm:block ${headerTextColor}`}>Hempbis AI</h1>
          </div>
        </div>

        <div className="flex items-center">
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={!apiKeyAvailable}
              className={`
                flex items-center space-x-2 py-2 pl-3 pr-2.5 text-sm font-medium rounded-md shadow-sm
                bg-${accentBase}-700/60 border border-${accentBase}-600 text-${accentBase}-100
                hover:border-${accentBase}-400 hover:bg-${accentBase}-600/80
                focus:outline-none focus:ring-2 focus:ring-${accentBase}-400 focus:border-${accentBase}-400
                transition-all duration-150
                ${!apiKeyAvailable ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
              `} // Adjusted padding for better touch
              aria-haspopup="listbox"
              aria-expanded={isDropdownOpen}
              title={!apiKeyAvailable ? "Persona selection unavailable" : `Current Persona: ${currentPersona.name}`}
            >
              <PersonaIcon persona={currentPersona} className="w-5 h-5" applyIdleAnimation={true} />
              <span className="font-semibold max-w-[100px] sm:max-w-none truncate">{currentPersona.name}</span> {/* Added truncation for small screens */}
              <ChevronDown className={`w-4 h-4 text-${accentBase}-300 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div 
                // Dropdown background should contrast with the new header background
                className={`absolute right-0 mt-2 w-72 origin-top-right rounded-md shadow-2xl bg-${accentBase}-800/95 backdrop-blur-lg border border-${accentBase}-700 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-fadeIn`}
                role="listbox"
              >
                <div className="py-1">
                  {AI_PERSONAS.map(persona => (
                    <button
                      key={persona.id}
                      onClick={() => handleSelectPersona(persona.id)}
                      className={`
                        w-full flex items-center justify-between px-4 py-2.5 text-sm text-left 
                        hover:bg-${persona.accentColor}-600/50 hover:text-${persona.accentColor}-100
                        transition-colors duration-150
                        ${currentPersona.id === persona.id ? `bg-${persona.accentColor}-600/40 text-${persona.accentColor}-50` : `text-${accentBase}-100`}
                      `}
                      role="option"
                      aria-selected={currentPersona.id === persona.id}
                    >
                      <div className="flex items-center space-x-3">
                        {/* PersonaIcon in dropdown needs its color adapted if on accent bg */}
                        <PersonaIcon persona={persona} className="w-5 h-5" /> 
                        <div>
                           <p className="font-medium">{persona.name}</p>
                           <p className={`text-xs ${currentPersona.id === persona.id ? `text-${persona.accentColor}-200/90` : `text-${accentBase}-300/90`}`}>{persona.description}</p>
                        </div>
                      </div>
                      {currentPersona.id === persona.id && <CheckIcon className={`w-4 h-4 text-${persona.accentColor}-200`} />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
