import React, { useState, useCallback, useEffect } from 'react';
import { Sparkles, Loader2, ArrowRight, Mic, MicOff } from 'lucide-react';

interface BrainDumpProps {
  onProcess: (text: string) => Promise<void>;
  isProcessing: boolean;
}

// Simple type definition for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  } & { length: number };
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: any) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

const BrainDump: React.FC<BrainDumpProps> = ({ onProcess, isProcessing }) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  useEffect(() => {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'sv-SE';

      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        setIsListening(false);
      };

      rec.onerror = (event) => {
        console.error("Speech recognition error", event);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      setRecognition(rec);
    }
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognition) {
        alert("Din webbläsare stödjer inte röststyrning.");
        return;
    }

    if (isListening) {
      recognition.stop();
    } else {
      setIsListening(true);
      recognition.start();
    }
  }, [isListening, recognition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    await onProcess(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e as unknown as React.FormEvent);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-4 shadow-xl sticky top-4 z-20">
      <h2 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        QUICK CAPTURE
      </h2>
      
      <form onSubmit={handleSubmit} className="relative">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder=""
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-4 pr-10 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary min-h-[100px] resize-none transition-all"
        />
        
        {/* Voice Input Button */}
        <button
            type="button"
            onClick={toggleListening}
            className={`absolute right-3 top-3 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500/20 text-red-400 animate-pulse' : 'hover:bg-slate-700 text-slate-500 hover:text-white'}`}
            title="Prata in uppgift"
        >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
        
        <div className="flex justify-end items-center mt-3">
            <button
                type="submit"
                disabled={!input.trim() || isProcessing}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                !input.trim() || isProcessing
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                    : 'bg-primary hover:bg-primary-hover text-white shadow-lg shadow-blue-900/20'
                }`}
            >
                {isProcessing ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyserar...
                </>
                ) : (
                <>
                    Skapa uppgift
                    <ArrowRight className="w-4 h-4" />
                </>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default BrainDump;