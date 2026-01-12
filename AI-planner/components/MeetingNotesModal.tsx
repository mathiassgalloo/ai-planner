import React, { useState } from 'react';
import { X, Sparkles, Loader2, PlayCircle, ArrowRight, Type } from 'lucide-react';

interface MeetingNotesModalProps {
  onClose: () => void;
  onProcess: (text: string) => Promise<void>;
  isProcessing: boolean;
}

const MeetingNotesModal: React.FC<MeetingNotesModalProps> = ({ onClose, onProcess, isProcessing }) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!notes.trim()) return;
    
    // Create a structured input string for Gemini
    const formattedInput = `Mötesanteckningar (Rubrik: ${title || 'Namnlöst möte'})\n${notes}`;
    
    await onProcess(formattedInput);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-800/50 rounded-t-2xl">
          <div className="flex items-center gap-2">
             <div className="p-2 bg-indigo-500/20 rounded-lg">
                <PlayCircle className="w-5 h-5 text-indigo-400" />
             </div>
             <div>
                 <h3 className="font-bold text-white">Mötesanteckningar</h3>
                 <p className="text-xs text-slate-400">Skriv fritt – jag skapar uppgifter och struktur sen.</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-4 bg-slate-900 overflow-y-auto">
            
            <div className="mb-4">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Rubrik</label>
                <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Vad handlade mötet om?"
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-3 pl-9 pr-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        autoFocus
                    />
                </div>
            </div>

            <div className="h-full flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Anteckningar</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="flex-1 w-full bg-slate-950/50 border border-slate-800 rounded-xl p-6 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none font-mono text-sm leading-relaxed"
                    placeholder="• Viktor pratade om budgeten...&#10;• Vi måste skicka offerten innan fredag...&#10;• Glöm inte att kolla med Anna om materialet..."
                />
            </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex justify-between items-center">
            <span className="text-xs text-slate-500 hidden sm:inline-block">
                Tips: Använd punkter för att separera tankar.
            </span>
            <button
                onClick={handleSubmit}
                disabled={!notes.trim() || isProcessing}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all ${
                !notes.trim() || isProcessing
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                }`}
            >
                {isProcessing ? (
                    <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyserar och skapar uppgifter...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4" />
                        Omvandla till uppgift
                        <ArrowRight className="w-4 h-4" />
                    </>
                )}
            </button>
        </div>

      </div>
    </div>
  );
};

export default MeetingNotesModal;