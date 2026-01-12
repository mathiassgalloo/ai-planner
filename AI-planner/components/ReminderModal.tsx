import React from 'react';
import { Task } from '../types';
import { X, Bell, AlertCircle, Calendar, Clock } from 'lucide-react';

interface ReminderModalProps {
  tasks: Task[];
  onClose: () => void;
}

const ReminderModal: React.FC<ReminderModalProps> = ({ tasks, onClose }) => {
  // Helper to calculate days remaining (ignoring time, just comparing dates)
  const getDaysRemaining = (deadlineStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const deadline = new Date(deadlineStr);
    deadline.setHours(0, 0, 0, 0);
    
    const diffTime = deadline.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
  };

  // Filter tasks based on the 3-2-1 rule + Today
  const relevantTasks = tasks.filter(t => {
    if (!t.deadline || t.isCompleted || t.isDeleted) return false;
    const days = getDaysRemaining(t.deadline);
    // Show if it's today (0), overdue (<0 but not done), or upcoming within 3 days (1, 2, 3)
    return days <= 3 && days >= -7; // Keep overdue visible for a week just in case
  }).sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime());

  if (relevantTasks.length === 0) return null;

  const groupedTasks = {
    today: relevantTasks.filter(t => getDaysRemaining(t.deadline!) <= 0),
    tomorrow: relevantTasks.filter(t => getDaysRemaining(t.deadline!) === 1),
    upcoming: relevantTasks.filter(t => getDaysRemaining(t.deadline!) > 1)
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <Bell className="w-5 h-5 text-primary" />
            <h3>Dagens genomgång</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-0 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          {/* TODAY / OVERDUE */}
          {groupedTasks.today.length > 0 && (
            <div className="p-4 border-b border-slate-800/50">
              <h4 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Att göra idag (eller försenat)
              </h4>
              <div className="space-y-2">
                {groupedTasks.today.map(task => (
                  <div key={task.id} className="bg-slate-800/50 border-l-4 border-red-500 p-3 rounded-r-md">
                    <div className="flex justify-between items-start">
                        <span className="font-medium text-slate-200 text-sm">{task.title}</span>
                        <span className="text-xs text-red-400 font-mono whitespace-nowrap">
                            {task.deadline?.split('T')[1].substring(0, 5)}
                        </span>
                    </div>
                    {task.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.description}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TOMORROW */}
          {groupedTasks.tomorrow.length > 0 && (
            <div className="p-4 border-b border-slate-800/50">
              <h4 className="text-orange-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Förberedelse: Deadline imorgon
              </h4>
              <div className="space-y-2">
                {groupedTasks.tomorrow.map(task => (
                  <div key={task.id} className="bg-slate-800/50 border-l-4 border-orange-500 p-3 rounded-r-md">
                    <span className="font-medium text-slate-200 text-sm">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* UPCOMING (2-3 DAYS) */}
          {groupedTasks.upcoming.length > 0 && (
            <div className="p-4">
              <h4 className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Kommande (2-3 dagar)
              </h4>
              <div className="space-y-2">
                {groupedTasks.upcoming.map(task => {
                    const days = getDaysRemaining(task.deadline!);
                    return (
                        <div key={task.id} className="bg-slate-800/50 border-l-4 border-blue-500 p-3 rounded-r-md flex justify-between items-center">
                            <span className="font-medium text-slate-200 text-sm">{task.title}</span>
                            <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">Om {days} dagar</span>
                        </div>
                    );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-900 border-t border-slate-800">
            <button 
                onClick={onClose}
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors text-sm"
            >
                Jag har koll!
            </button>
        </div>

      </div>
    </div>
  );
};

export default ReminderModal;