
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-800/50 border-t border-slate-700/60 text-slate-400 p-3 text-center text-xs backdrop-blur-sm">
      <p>
        &copy; {new Date().getFullYear()} Hempbis AI. For educational and research purposes only.
      </p>
      <p>Always consult qualified experts for specific legal, medical, or business advice.</p>
    </footer>
  );
};

export default Footer;