// This file is being phased out in favor of lucide-react.
// Kept for reference for any truly custom SVGs if needed.
// Components below are not expected to be used by the main app anymore.

import React from 'react';

// Example of how a Lucide icon might be used (for reference, actual usage in components):
// import { Bot } from 'lucide-react';
// const MyComponent = () => <Bot color="blue" size={24} />;


export const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || "w-6 h-6"}
  >
    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
  </svg>
);

export const GeneralBotIcon: React.FC<{ className?: string; accentColor?: string }> = ({ className, accentColor }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || `w-9 h-9 text-${accentColor || 'emerald-600'}`}
  >
    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25ZM9.5 8.75a.75.75 0 0 0-1.5 0v.001a.75.75 0 0 0 1.5 0V8.75Zm4.75.75a.75.75 0 0 1 0-1.5h.001a.75.75 0 0 1 0 1.5H14.25ZM12 16.5a3.5 3.5 0 0 0 3.5-3.5H8.5a3.5 3.5 0 0 0 3.5 3.5Z" clipRule="evenodd" />
    <path d="M16.5 7.5c0-3.038-2.462-5.5-5.5-5.5S5.5 4.462 5.5 7.5c0 1.52.616 2.899 1.608 3.892L5.5 13.5h11l-1.608-2.108A5.479 5.479 0 0016.5 7.5zM9.5 9.5a1 1 0 11-2 0 1 1 0 012 0zM14.5 9.5a1 1 0 11-2 0 1 1 0 012 0z" />
  </svg>
);

// Other specific icons (ResearchScientistIcon, CultivatorIcon, PolicyLawIcon) are also deprecated
// in favor of lucide-react. Their SVGs are removed for brevity as they won't be used.

// PersonaSwitcherIcon is removed. Specific lucide icons will be chosen per persona.

export const UserIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className || "w-9 h-9 text-teal-600"} 
  >
    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 015.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
  </svg>
);


// Simplified icon list, assuming most will come from lucide-react
// Specific icons like PaperclipIcon, DocumentTextIcon, TrashIcon, PlusIcon, EditIcon, SparklesIcon, MenuIcon, CloseIcon, CheckIcon, CopyIcon etc.
// should be replaced by their lucide-react equivalents in the components that use them.
// For example, instead of <MenuIcon />, use <Menu /> from 'lucide-react'.
// Keeping their definitions here briefly in case some specific complex path is needed later, but they should be considered deprecated.

export const PaperclipIcon: React.FC<{ className?: string }> = ({ className }) => ( /* ... existing svg ... */ <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.693 7.693a2.25 2.25 0 0 0 3.182 3.182l7.693-7.693a.75.75 0 1 0-1.06-1.06l-7.693 7.693a.75.75 0 0 0 1.06 1.06l7.693-7.693Z" /></svg>);
export const ImageIcon: React.FC<{ className?: string }> = ({ className }) => ( /* ... existing svg ... */  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.158 0a.225.225 0 0 1 .225-.225h.01a.225.225 0 0 1 .225.225v.01a.225.225 0 0 1-.225.225h-.01a.225.225 0 0 1-.225-.225v-.01Z" /></svg>);
export const DocumentTextIcon: React.FC<{ className?: string }> = ({ className }) => ( /* ... existing svg ... */ <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>);
// Other icons would follow a similar pattern of deprecation.
