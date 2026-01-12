import React, { useState, useRef, useEffect } from 'react';
import { Task, TaskType, Priority, Attachment, Subtask } from '../types';
import { CheckCircle2, Phone, Mail, Users, FileText, CalendarClock, AlertCircle, Trash2, Edit2, X, Paperclip, File, ListTodo, RotateCcw, Ban, Star, Wand2, Sparkles, Loader2, CheckSquare, Square, Undo2, Plus } from 'lucide-react';
import { enhanceTaskContent, suggestTaskSchedule } from '../services/geminiService';

interface TimelineItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (updatedTask: Task) => void;
  onRestore?: (id: string) => void;
  onPermanentDelete?: (id: string) => void;
  viewMode?: 'ACTIVE' | 'COMPLETED' | 'TRASH';
}

const TimelineItem: React.FC<TimelineItemProps> = ({ 
    task, 
    onToggleComplete, 
    onDelete, 
    onUpdate, 
    onRestore, 
    onPermanentDelete, 
    viewMode = 'ACTIVE' 
}) => {
  const [isExpandedEditing, setIsExpandedEditing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  // State for AI Undo History Stack (Multiple steps)
  const [historyStack, setHistoryStack] = useState<Task[]>([]);
  const [showUndoBanner, setShowUndoBanner] = useState(false);
  
  // Local state for inline editing
  const [localTitle, setLocalTitle] = useState(task.title);
  const [localDesc, setLocalDesc] = useState(task.description || '');
  
  // State for new manual subtask
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Parse date/time for inline inputs
  const initialDate = task.deadline ? task.deadline.split('T')[0] : '';
  const initialTime = task.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1].substring(0, 5) : '';
  
  const [localDate, setLocalDate] = useState(initialDate);
  const [localTime, setLocalTime] = useState(initialTime);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for direct picker access
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const isTrash = viewMode === 'TRASH';
  const isReadOnly = isTrash || viewMode === 'COMPLETED';

  useEffect(() => {
    setLocalTitle(task.title);
    setLocalDesc(task.description || '');
    const d = task.deadline ? task.deadline.split('T')[0] : '';
    const t = task.deadline && task.deadline.includes('T') ? task.deadline.split('T')[1].substring(0, 5) : '';
    setLocalDate(d);
    setLocalTime(t);
  }, [task]);

  const getIcon = (type: TaskType) => {
    switch (type) {
      case TaskType.CALL: return <Phone className="w-4 h-4 text-blue-400" />;
      case TaskType.EMAIL: return <Mail className="w-4 h-4 text-purple-400" />;
      case TaskType.MEETING: return <Users className="w-4 h-4 text-orange-400" />;
      case TaskType.TODO: return <ListTodo className="w-4 h-4 text-emerald-400" />;
      case TaskType.NOTE: return <FileText className="w-4 h-4 text-gray-400" />;
      default: return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getPriorityColor = (priority: Priority) => {
    if (isTrash) return 'border-l-4 border-slate-600 bg-slate-900/50 opacity-50';

    switch (priority) {
      case Priority.HIGH: return 'border-l-4 border-red-500 bg-red-500/10';
      case Priority.MEDIUM: return 'border-l-4 border-yellow-500 bg-yellow-500/10';
      default: return 'border-l-4 border-blue-500 bg-slate-800';
    }
  };

  const handleAutoSave = () => {
    if (isReadOnly) return;

    let newDeadline = null;
    if (localDate) {
        const timeStr = localTime || '08:00';
        newDeadline = new Date(`${localDate}T${timeStr}`).toISOString();
    }

    if (
        localTitle !== task.title || 
        localDesc !== (task.description || '') || 
        newDeadline !== task.deadline
    ) {
        onUpdate({
            ...task,
            title: localTitle,
            description: localDesc,
            deadline: newDeadline
        });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        e.currentTarget.blur();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("Filen är för stor. Max 2MB.");
        return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
        const base64String = reader.result as string;
        const newAttachment: Attachment = {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            data: base64String
        };
        
        onUpdate({
            ...task,
            attachments: [...(task.attachments || []), newAttachment]
        });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (attachId: string) => {
      if (isReadOnly) return;
      if(window.confirm("Ta bort bilaga?")) {
        onUpdate({
            ...task,
            attachments: (task.attachments || []).filter(a => a.id !== attachId)
        });
      }
  };

  const toggleFocus = () => {
      if (isReadOnly) return;
      onUpdate({ ...task, isFocus: !task.isFocus });
  };

  const toggleSubtask = (subtaskId: string) => {
      if (isReadOnly || !task.checklist) return;
      const newChecklist = task.checklist.map(st => 
          st.id === subtaskId ? { ...st, isCompleted: !st.isCompleted } : st
      );
      onUpdate({ ...task, checklist: newChecklist });
  };

  const handleAddSubtask = () => {
      if (!newSubtaskText.trim() || isReadOnly) return;
      
      const newSubtask: Subtask = {
          id: crypto.randomUUID(),
          text: newSubtaskText,
          isCompleted: false
      };
      
      onUpdate({
          ...task,
          checklist: [...(task.checklist || []), newSubtask]
      });
      setNewSubtaskText('');
  };

  // HISTORY HELPER
  const addToHistory = () => {
      // Push current task state to stack
      setHistoryStack(prev => [...prev, { ...task }]);
      setShowUndoBanner(true);
  };

  // AI ACTIONS
  const handleAiSchedule = async () => {
      setIsAiLoading(true);
      addToHistory(); // Save current state
      try {
          const suggestion = await suggestTaskSchedule(task);
          if (suggestion.deadline) {
              const d = suggestion.deadline.split('T')[0];
              const t = suggestion.deadline.split('T')[1].substring(0, 5);
              setLocalDate(d);
              setLocalTime(t);
              onUpdate({
                  ...task,
                  deadline: suggestion.deadline,
                  estimatedDuration: suggestion.estimatedDuration
              });
          }
      } catch (error) {
          console.error("Failed to schedule", error);
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleAiEnhance = async () => {
      setIsAiLoading(true);
      addToHistory(); // Save current state
      
      try {
          const content = await enhanceTaskContent(task.title);
          const newChecklist: Subtask[] = content.checklist.map(txt => ({
             id: crypto.randomUUID(),
             text: txt,
             isCompleted: false
          }));
          
          setLocalDesc(content.description);
          onUpdate({
              ...task,
              description: content.description,
              checklist: [...(task.checklist || []), ...newChecklist]
          });
      } catch (error) {
          console.error("Failed to enhance", error);
      } finally {
          setIsAiLoading(false);
      }
  };

  const handleUndoAiEnhance = () => {
      if (historyStack.length === 0) return;

      // Get the last state
      const previousState = historyStack[historyStack.length - 1];
      
      // Restore logic
      onUpdate(previousState);
      setLocalDesc(previousState.description || '');
      // Restore date/time locals if they changed
      if (previousState.deadline) {
          setLocalDate(previousState.deadline.split('T')[0]);
          setLocalTime(previousState.deadline.split('T')[1].substring(0, 5));
      } else {
          setLocalDate('');
          setLocalTime('');
      }

      // Remove last state from stack
      const newStack = historyStack.slice(0, -1);
      setHistoryStack(newStack);

      // Hide banner if stack is empty
      if (newStack.length === 0) {
          setShowUndoBanner(false);
      }
  };

  // Helpers to open pickers programmatically
  const openDatePicker = () => {
    if (!isReadOnly && dateInputRef.current) {
        try { dateInputRef.current.showPicker(); } catch (e) { dateInputRef.current.focus(); }
    }
  };

  const openTimePicker = () => {
    if (!isReadOnly && timeInputRef.current) {
        try { timeInputRef.current.showPicker(); } catch (e) { timeInputRef.current.focus(); }
    }
  };

  return (
    <div className={`relative pl-8 pb-8 group transition-all duration-500`}>
      {/* Timeline Line */}
      <div className="absolute left-3 top-3 bottom-0 w-0.5 bg-slate-700 group-last:bg-transparent"></div>
      
      {/* Timeline Dot */}
      <div className={`absolute left-[5px] top-3 w-4 h-4 rounded-full border-2 border-slate-600 bg-slate-900 flex items-center justify-center z-10 ${task.isCompleted ? 'bg-emerald-900/50 border-emerald-500' : ''} ${isTrash ? 'border-red-900 bg-red-950' : ''}`}>
        {task.isCompleted && <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>}
        {isTrash && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
      </div>

      {/* Card */}
      <div className={`relative rounded-lg p-4 transition-all border border-slate-700/50 hover:border-slate-600 
        ${getPriorityColor(task.priority)} 
        ${task.isCompleted ? 'opacity-60 grayscale' : 'opacity-100'} 
        ${task.isFocus && !isTrash && !task.isCompleted ? 'shadow-[0_0_15px_-3px_rgba(250,204,21,0.1)] border-yellow-500/30' : ''}
      `}>
        
        {/* HEADER SECTION */}
        <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-2 flex-wrap">
                <div className="p-1.5 rounded-md bg-slate-700/50">
                {getIcon(task.type)}
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                    {task.type === 'TODO' ? 'TO-DO' : task.type}
                </span>
                {task.priority === Priority.HIGH && !isTrash && (
                    <span className="flex items-center gap-1 text-xs text-red-400 font-bold ml-2">
                        <AlertCircle className="w-3 h-3" /> VIKTIGT
                    </span>
                )}
                {task.isFocus && !isTrash && (
                    <span className="flex items-center gap-1 text-xs text-yellow-400 font-bold ml-2 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        <Star className="w-3 h-3 fill-yellow-400" /> FOKUS
                    </span>
                )}
                {isTrash && (
                     <span className="flex items-center gap-1 text-xs text-red-400 font-bold ml-2">
                        RADERAD
                    </span>
                )}
                {task.estimatedDuration && (
                    <span className="text-xs text-slate-500 ml-2">
                        ({task.estimatedDuration})
                    </span>
                )}
            </div>
            
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!isReadOnly && (
                    <>
                        <button 
                            onClick={toggleFocus} 
                            className={`p-1.5 rounded hover:bg-slate-700 transition-colors ${task.isFocus ? 'text-yellow-400' : 'text-slate-500 hover:text-yellow-400'}`} 
                            title="Dagens Fokus"
                        >
                            <Star className={`w-4 h-4 ${task.isFocus ? 'fill-yellow-400' : ''}`} />
                        </button>
                        
                        {/* AI TOOLS */}
                        <div className="h-4 w-[1px] bg-slate-700 mx-1 self-center"></div>
                        
                        <button 
                            onClick={handleAiSchedule} 
                            disabled={isAiLoading}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-blue-400" 
                            title="När ska jag göra detta?"
                        >
                            {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={handleAiEnhance} 
                            disabled={isAiLoading}
                            className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-purple-400" 
                            title="AI: Skapa beskrivning & checklista"
                        >
                           {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4" />}
                        </button>

                        <div className="h-4 w-[1px] bg-slate-700 mx-1 self-center"></div>

                        <button onClick={() => setIsExpandedEditing(!isExpandedEditing)} className="p-1.5 hover:bg-slate-700 rounded text-slate-400 hover:text-white" title="Expandera">
                            {isExpandedEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => onDelete(task.id)} className="p-1.5 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400" title="Ta bort">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </>
                )}
                {isTrash && onRestore && onPermanentDelete && (
                    <>
                        <button onClick={() => onRestore(task.id)} className="p-1.5 hover:bg-emerald-900/30 rounded text-slate-400 hover:text-emerald-400" title="Återställ">
                            <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => onPermanentDelete(task.id)} className="p-1.5 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400" title="Radera permanent">
                            <Ban className="w-4 h-4" />
                        </button>
                    </>
                )}
            </div>
        </div>

        {/* AI UNDO BANNER */}
        {showUndoBanner && historyStack.length > 0 && (
            <div className="mb-3 p-2 bg-indigo-500/10 border border-indigo-500/30 rounded flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AI har uppdaterat uppgiften ({historyStack.length} steg)</span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowUndoBanner(false)} 
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        OK, behåll
                    </button>
                    <button 
                        onClick={handleUndoAiEnhance} 
                        className="flex items-center gap-1 font-bold text-red-400 hover:text-red-300 transition-colors"
                    >
                        <Undo2 className="w-3.5 h-3.5" />
                        Ångra
                    </button>
                </div>
            </div>
        )}

        {/* INLINE EDITING CONTENT */}
        <div className="mb-2 group/edit">
            <input 
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleAutoSave}
                onKeyDown={handleKeyDown}
                disabled={isReadOnly}
                className={`w-full bg-transparent border-none p-0 text-lg font-semibold text-slate-100 focus:ring-0 focus:outline-none placeholder-slate-600 ${task.isCompleted ? 'line-through text-slate-500' : ''} ${isReadOnly ? 'cursor-default' : ''}`}
                placeholder="Uppgiftens rubrik"
            />
            
            <textarea 
                value={localDesc}
                onChange={(e) => setLocalDesc(e.target.value)}
                onBlur={handleAutoSave}
                rows={localDesc ? undefined : 1}
                disabled={isReadOnly}
                className={`w-full mt-1 bg-transparent border-none p-0 text-sm text-slate-400 focus:ring-0 focus:outline-none placeholder-slate-600/50 resize-none overflow-hidden ${isReadOnly ? 'cursor-default' : ''}`}
                placeholder="Lägg till beskrivning..."
                style={{ minHeight: '1.5em' }}
                onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = target.scrollHeight + 'px';
                }}
            />
        </div>

        {/* CHECKLIST / SUBTASKS */}
        <div className="mt-3 space-y-1 pl-1">
            {(task.checklist || []).map(subtask => (
                <div key={subtask.id} className="flex items-start gap-2 group/sub">
                    <button 
                        onClick={() => toggleSubtask(subtask.id)}
                        disabled={isReadOnly}
                        className={`mt-0.5 flex-shrink-0 ${subtask.isCompleted ? 'text-slate-500' : 'text-slate-400 hover:text-primary'}`}
                    >
                        {subtask.isCompleted ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                    </button>
                    <span className={`text-sm ${subtask.isCompleted ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                        {subtask.text}
                    </span>
                </div>
            ))}
            
            {/* Manual Add Subtask Field */}
            {!isReadOnly && (
                <div className="flex items-center gap-2 group/add opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Square className="w-3.5 h-3.5 text-slate-500 mt-0.5 flex-shrink-0" />
                    <input 
                        type="text"
                        value={newSubtaskText}
                        onChange={(e) => setNewSubtaskText(e.target.value)}
                        onBlur={handleAddSubtask}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                        placeholder="Lägg till underrubrik..."
                        className="bg-transparent border-none p-0 text-sm text-slate-300 placeholder-slate-600 focus:ring-0 focus:outline-none w-full"
                    />
                </div>
            )}
        </div>

        {/* Attachments Section */}
        {(task.attachments && task.attachments.length > 0) && (
            <div className="flex flex-wrap gap-2 mt-3 mb-3">
                {task.attachments.map(att => (
                    <div key={att.id} className="group/file relative flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md p-2 pr-8">
                        {att.type.startsWith('image/') ? (
                            <img src={att.data} alt={att.name} className="w-8 h-8 object-cover rounded" />
                        ) : (
                            <File className="w-8 h-8 text-slate-500 p-1" />
                        )}
                        <div className="overflow-hidden">
                            <p className="text-xs text-slate-300 truncate max-w-[100px]">{att.name}</p>
                        </div>
                        {!isReadOnly && (
                            <button 
                                onClick={() => removeAttachment(att.id)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full text-slate-500 hover:text-red-400 opacity-0 group-hover/file:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-white hover:text-slate-200 transition-colors cursor-pointer" onClick={openDatePicker}>
                    <CalendarClock 
                        className="w-4 h-4 text-white" 
                    />
                    <input 
                        ref={dateInputRef}
                        type="date"
                        value={localDate}
                        onChange={(e) => setLocalDate(e.target.value)}
                        onBlur={handleAutoSave}
                        onClick={(e) => { e.stopPropagation(); openDatePicker(); }}
                        disabled={isReadOnly}
                        className="bg-transparent border-none p-0 w-[120px] text-xs focus:ring-0 focus:outline-none cursor-pointer text-white font-medium disabled:cursor-default disabled:text-slate-600"
                        style={{ colorScheme: 'dark' }} 
                    />
                    <input 
                        ref={timeInputRef}
                        type="time"
                        value={localTime}
                        onChange={(e) => setLocalTime(e.target.value)}
                        onBlur={handleAutoSave}
                        onClick={(e) => { e.stopPropagation(); openTimePicker(); }}
                        disabled={isReadOnly}
                        className="bg-transparent border-none p-0 w-[70px] text-xs focus:ring-0 focus:outline-none cursor-pointer text-white font-medium disabled:cursor-default disabled:text-slate-600"
                        style={{ colorScheme: 'dark' }}
                    />
                </div>

                {!isReadOnly && (
                    <div className="relative">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            className="hidden" 
                            id={`file-upload-${task.id}`}
                        />
                        <label 
                            htmlFor={`file-upload-${task.id}`} 
                            className="flex items-center gap-1 text-xs text-slate-500 hover:text-primary cursor-pointer transition-colors"
                            title="Bifoga fil"
                        >
                            <Paperclip className="w-3.5 h-3.5" />
                            Bifoga
                        </label>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-4">
                {/* Creation Date Display */}
                <div className="text-[10px] text-slate-600 font-mono">
                    Skapad: {new Date(task.createdAt).toLocaleString('sv-SE', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute:'2-digit' })}
                </div>

                {!isTrash && (
                    <button 
                        onClick={() => onToggleComplete(task.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${task.isCompleted ? 'bg-emerald-900/20 text-emerald-400 hover:bg-slate-700 hover:text-slate-200' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                    >
                        {task.isCompleted ? 'Ångra' : 'Markera klar'}
                    </button>
                )}
            </div>
        </div>
        
        {isExpandedEditing && !isReadOnly && (
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 animate-in slide-in-from-top-2">
                 <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-slate-500 font-semibold uppercase">Avancerad redigering</p>
                    {historyStack.length > 0 && (
                        <button 
                            onClick={handleUndoAiEnhance}
                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                        >
                            <Undo2 className="w-3 h-3" />
                            Ångra ({historyStack.length})
                        </button>
                    )}
                 </div>
                 <div className="grid grid-cols-2 gap-4 mb-4">
                     <div>
                        <label className="block text-xs text-slate-500 mb-1">Prioritet</label>
                        <select 
                            value={task.priority}
                            onChange={(e) => onUpdate({...task, priority: e.target.value as Priority})}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                        >
                            <option value={Priority.HIGH}>Hög</option>
                            <option value={Priority.MEDIUM}>Medium</option>
                            <option value={Priority.LOW}>Låg</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-xs text-slate-500 mb-1">Typ</label>
                        <select 
                            value={task.type}
                            onChange={(e) => onUpdate({...task, type: e.target.value as TaskType})}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs"
                        >
                            <option value={TaskType.TODO}>To-Do</option>
                            <option value={TaskType.CALL}>Samtal</option>
                            <option value={TaskType.MEETING}>Möte</option>
                            <option value={TaskType.EMAIL}>Mail</option>
                            <option value={TaskType.NOTE}>Notering</option>
                        </select>
                     </div>
                 </div>
                 <div className="flex justify-end">
                     <button onClick={() => setIsExpandedEditing(false)} className="text-xs text-slate-400 hover:text-white">Stäng</button>
                 </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default TimelineItem;