import React, { useState, useEffect, useMemo } from 'react';
import { Task, TaskType, Priority, GeminiParsedTask, Subtask, User, UserRole } from './types';
import { parseTextToTasks } from './services/geminiService';
import TimelineItem from './components/TimelineItem';
import BrainDump from './components/BrainDump';
import CalendarWidget from './components/CalendarWidget';
import ReminderModal from './components/ReminderModal';
import MeetingNotesModal from './components/MeetingNotesModal';
import LoginScreen from './components/LoginScreen';
import AdminPanel from './components/AdminPanel';
import { LayoutDashboard, CalendarDays, Phone, Mail, Filter, BrainCircuit, Users, CheckCircle2, Tag, Hash, ListTodo, Archive, Trash2, RotateCcw, Ban, Activity, Mic, Star, UserCircle2, XCircle, LogOut, ShieldCheck } from 'lucide-react';

const LEGACY_STORAGE_KEY = 'komplement_tasks_v1';
const USERS_STORAGE_KEY = 'ai_planner_users';
const SESSION_STORAGE_KEY = 'ai_planner_active_user';

type ViewMode = 'ACTIVE' | 'COMPLETED' | 'TRASH';

function App() {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  // --- APP STATE ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReminders, setShowReminders] = useState(true);
  const [showMeetingNotes, setShowMeetingNotes] = useState(false);
  
  // Navigation / View State
  const [viewMode, setViewMode] = useState<ViewMode>('ACTIVE');
  const [filterType, setFilterType] = useState<TaskType | 'ALL'>('ALL');
  
  // Tag Filter State (Now an array for multi-select)
  const [filterTags, setFilterTags] = useState<string[]>([]);
  
  // Date Selection State
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // --- AUTH & MIGRATION INITIALIZATION ---
  useEffect(() => {
    // 1. Load Users
    const storedUsers = localStorage.getItem(USERS_STORAGE_KEY);
    let loadedUsers: User[] = [];

    if (storedUsers) {
      try {
        loadedUsers = JSON.parse(storedUsers);
      } catch (e) { console.error("Failed to parse users", e); }
    }

    // 2. Ensure Owner (MG) exists
    const ownerExists = loadedUsers.find(u => u.username === 'MG');
    if (!ownerExists) {
      const owner: User = {
        id: 'owner-mg',
        username: 'MG',
        password: '1121',
        role: UserRole.ADMIN
      };
      loadedUsers.push(owner);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(loadedUsers));
    }
    setUsers(loadedUsers);

    // 3. Check for Legacy Data (Migrate to MG)
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      console.log("Migrating legacy data to owner account...");
      localStorage.setItem(`ai_tasks_MG`, legacyData);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }

    // 4. Restore Session (FROM SESSION STORAGE ONLY)
    // This ensures that closing the tab/browser logs the user out.
    const sessionUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionUser) {
      const user = loadedUsers.find(u => u.username === sessionUser);
      if (user) {
        setCurrentUser(user);
      }
    }
  }, []);

  // --- TASK LOADING (Based on User) ---
  useEffect(() => {
    if (currentUser) {
      const userKey = `ai_tasks_${currentUser.username}`;
      const stored = localStorage.getItem(userKey);
      if (stored) {
        try {
          setTasks(JSON.parse(stored));
        } catch (e) {
          console.error("Failed to parse tasks for user", e);
          setTasks([]);
        }
      } else {
        setTasks([]);
      }
      setShowReminders(true);
    }
  }, [currentUser]);

  // --- TASK PERSISTENCE ---
  useEffect(() => {
    if (currentUser) {
      const userKey = `ai_tasks_${currentUser.username}`;
      localStorage.setItem(userKey, JSON.stringify(tasks));
    }
  }, [tasks, currentUser]);

  // --- AUTH ACTIONS ---
  const handleLogin = (username: string, code: string) => {
    const user = users.find(u => u.username === username && u.password === code);
    if (user) {
      setCurrentUser(user);
      // Use sessionStorage so session dies when tab closes
      sessionStorage.setItem(SESSION_STORAGE_KEY, user.username);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setTasks([]);
  };

  const handleAddUser = (username: string, code: string) => {
    setUsers(prevUsers => {
        if (prevUsers.find(u => u.username === username)) {
            alert("Användarnamnet finns redan.");
            return prevUsers;
        }
        const newUser: User = {
            id: crypto.randomUUID(),
            username,
            password: code,
            role: UserRole.USER
        };
        const newUsers = [...prevUsers, newUser];
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
        return newUsers;
    });
  };

  const handleUpdateUser = (id: string, newUsername: string, newPassword: string) => {
    setUsers(prevUsers => {
        const userIndex = prevUsers.findIndex(u => u.id === id);
        if (userIndex === -1) return prevUsers;
        
        const existingUser = prevUsers[userIndex];

        if (existingUser.username !== newUsername && prevUsers.find(u => u.username === newUsername)) {
            alert("Det användarnamnet är upptaget.");
            return prevUsers;
        }

        // Migrate Data if username changes
        if (existingUser.username !== newUsername) {
            const oldKey = `ai_tasks_${existingUser.username}`;
            const newKey = `ai_tasks_${newUsername}`;
            const data = localStorage.getItem(oldKey);
            if (data) {
                localStorage.setItem(newKey, data);
                localStorage.removeItem(oldKey);
            }
            // If updating current user's name, update session
            if (currentUser && currentUser.id === id) {
                 sessionStorage.setItem(SESSION_STORAGE_KEY, newUsername);
            }
        }

        const updatedUsers = [...prevUsers];
        updatedUsers[userIndex] = {
            ...existingUser,
            username: newUsername,
            password: newPassword
        };
        
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
        
        if (currentUser && currentUser.id === id) {
            setCurrentUser(updatedUsers[userIndex]);
        }

        return updatedUsers;
    });
  };

  const handleRemoveUser = (userId: string) => {
    setUsers(prevUsers => {
        const userToRemove = prevUsers.find(u => u.id === userId);
        if (!userToRemove) return prevUsers;

        const newUsers = prevUsers.filter(u => u.id !== userId);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(newUsers));
        localStorage.removeItem(`ai_tasks_${userToRemove.username}`);
        return newUsers;
    });
  };

  // --- APP LOGIC ---

  const handleProcessText = async (text: string) => {
    setIsProcessing(true);
    try {
      const parsedTasks: GeminiParsedTask[] = await parseTextToTasks(text);
      
      const newTasks: Task[] = parsedTasks.map(pt => ({
        id: crypto.randomUUID(),
        title: pt.title,
        description: pt.description,
        type: pt.type as TaskType,
        deadline: pt.deadline,
        priority: pt.priority as Priority,
        isCompleted: false,
        isDeleted: false,
        isFocus: false,
        createdAt: new Date().toISOString(),
        tags: pt.tags || [],
        attachments: [],
        checklist: pt.checklist?.map(c => ({
            id: crypto.randomUUID(),
            text: c,
            isCompleted: false
        })) || [],
        estimatedDuration: pt.estimatedDuration
      }));

      setTasks(prev => [...newTasks, ...prev]);
      setViewMode('ACTIVE'); // Switch to active view to see new task
    } catch (error) {
      alert("Kunde inte bearbeta texten just nu. Kontrollera din API-nyckel.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDateSelect = (dateStr: string) => {
    if (selectedDate === dateStr) {
        setSelectedDate(null); // Deselect if clicking the same date
    } else {
        setSelectedDate(dateStr);
    }
  };

  // ACTIONS
  const toggleComplete = (id: string) => {
    setTasks(tasks.map(t => {
        if (t.id === id) {
            const isNowCompleted = !t.isCompleted;
            return { 
                ...t, 
                isCompleted: isNowCompleted,
                completedAt: isNowCompleted ? new Date().toISOString() : undefined 
            };
        }
        return t;
    }));
  };

  const moveToTrash = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isDeleted: true } : t));
  };

  const restoreFromTrash = (id: string) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, isDeleted: false } : t));
  };

  const permanentDelete = (id: string) => {
    if(window.confirm("Detta tar bort uppgiften permanent. Går ej att ångra.")) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const emptyTrash = () => {
    if(window.confirm("Är du säker på att du vill tömma papperskorgen?")) {
      setTasks(tasks.filter(t => !t.isDeleted));
    }
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map(t => t.id === updatedTask.id ? updatedTask : t));
  }

  // Helper to toggle tags
  const toggleTagFilter = (tag: string) => {
      setFilterTags(prev => {
          if (prev.includes(tag)) {
              return prev.filter(t => t !== tag);
          } else {
              return [...prev, tag];
          }
      });
  };

  // Extract unique tags from ACTIVE tasks only
  const availableTags = useMemo(() => {
    const activeTasks = tasks.filter(t => !t.isDeleted && !t.isCompleted);
    const allTags = activeTasks.flatMap(t => t.tags || []);
    const counts: Record<string, number> = {};
    allTags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; });
    return Object.keys(counts).sort((a, b) => counts[b] - counts[a] || a.localeCompare(b));
  }, [tasks]);

  // Sorting and Grouping based on ViewMode
  const { focusTasks, regularTasks } = useMemo(() => {
    const now = Date.now();
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    let filtered = tasks.filter(t => {
      // Base search
      const matchesSearch = (t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            t.description?.toLowerCase().includes(searchTerm.toLowerCase()));
      
      if (!matchesSearch) return false;

      // View Logic
      if (viewMode === 'ACTIVE') {
        if (t.isDeleted) return false;
        if (!t.isCompleted) return true;
        
        // Include completed tasks if they were completed within the last 12 hours
        if (t.isCompleted && t.completedAt) {
            const completedTime = new Date(t.completedAt).getTime();
            if (now - completedTime < TWELVE_HOURS_MS) {
                return true;
            }
        }
        return false;
      } else if (viewMode === 'COMPLETED') {
        return !t.isDeleted && t.isCompleted;
      } else if (viewMode === 'TRASH') {
        return t.isDeleted === true;
      }
      return false;
    });

    // Apply Type/Tag filters only in Active view usually, but let's allow in all for flexibility
    if (viewMode === 'ACTIVE') {
        // Type Filter
        filtered = filtered.filter(t => (filterType === 'ALL' || t.type === filterType));
        
        // Tag Filter (Multi-select)
        // If filterTags has items, task must have AT LEAST ONE of those tags
        if (filterTags.length > 0) {
            filtered = filtered.filter(t => t.tags && t.tags.some(tag => filterTags.includes(tag)));
        }

        // Date Filter (from Calendar)
        if (selectedDate) {
            filtered = filtered.filter(t => t.deadline && t.deadline.startsWith(selectedDate));
        }
    }

    const sorted = filtered.sort((a, b) => {
      // Date Sorting
      if (a.deadline && b.deadline) {
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      
      // Priority
      const priorityOrder = { [Priority.HIGH]: 0, [Priority.MEDIUM]: 1, [Priority.LOW]: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Split into Focus tasks and Regular tasks
    const focus = sorted.filter(t => t.isFocus && viewMode === 'ACTIVE');
    const regular = sorted.filter(t => !t.isFocus || viewMode !== 'ACTIVE');

    return { focusTasks: focus, regularTasks: regular };

  }, [tasks, searchTerm, filterType, filterTags, viewMode, selectedDate]);

  // Statistics
  const upcomingTasks = tasks.filter(t => !t.isCompleted && !t.isDeleted).length;
  const urgentTasks = tasks.filter(t => !t.isCompleted && !t.isDeleted && t.priority === Priority.HIGH).length;
  const trashCount = tasks.filter(t => t.isDeleted).length;
  const completedCount = tasks.filter(t => !t.isDeleted && t.isCompleted).length;

  // Tag/Person Stats
  const tagStats = useMemo(() => {
      if(filterTags.length === 0) return null;
      // Filter tasks that match ANY of the selected tags
      const allWithTag = tasks.filter(t => !t.isDeleted && t.tags && t.tags.some(tag => filterTags.includes(tag)));
      const completed = allWithTag.filter(t => t.isCompleted).length;
      const pending = allWithTag.filter(t => !t.isCompleted).length;
      return { completed, pending, count: filterTags.length };
  }, [tasks, filterTags]);

  // --- RENDER LOGIN IF NO USER ---
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-primary/30 selection:text-white">
      
      {/* ADMIN PANEL MODAL */}
      {showAdminPanel && currentUser.role === UserRole.ADMIN && (
        <AdminPanel 
          users={users} 
          onAddUser={handleAddUser}
          onUpdateUser={handleUpdateUser}
          onRemoveUser={handleRemoveUser} 
          onClose={() => setShowAdminPanel(false)} 
          currentUser={currentUser}
        />
      )}

      {/* REMINDER POPUP */}
      {showReminders && (
        <ReminderModal tasks={tasks} onClose={() => setShowReminders(false)} />
      )}

      {/* MEETING NOTES MODAL */}
      {showMeetingNotes && (
          <MeetingNotesModal 
            onClose={() => setShowMeetingNotes(false)} 
            onProcess={handleProcessText} 
            isProcessing={isProcessing} 
          />
      )}

      {/* Top Navigation / Header */}
      <header className="bg-slate-900/50 backdrop-blur border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
                <h1 className="font-bold text-white text-lg tracking-tight">AI-PLANNER</h1>
                <p className="text-xs text-slate-400">Your daily tasks</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="hidden md:flex gap-6 text-sm">
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-xs">Att göra</span>
                    <span className="font-bold text-white">{upcomingTasks}</span>
                </div>
                <div className="flex flex-col items-end">
                    <span className="text-slate-400 text-xs">Viktigt</span>
                    <span className="font-bold text-red-400">{urgentTasks}</span>
                </div>
             </div>
             
             <div className="h-8 w-[1px] bg-slate-800 mx-2 hidden md:block"></div>

             <div className="flex items-center gap-3">
                {currentUser.role === UserRole.ADMIN && (
                  <button 
                    onClick={() => setShowAdminPanel(true)}
                    className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-emerald-400 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-slate-700"
                    title="Hantera användare"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Admin
                  </button>
                )}
                
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white hidden sm:block">{currentUser.username}</span>
                  <button 
                    onClick={handleLogout}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors"
                    title="Logga ut"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar / Controls */}
        <div className="lg:col-span-3 space-y-6 order-1">
          <BrainDump onProcess={handleProcessText} isProcessing={isProcessing} />
          
          <button 
            onClick={() => setShowMeetingNotes(true)}
            className="w-full py-3 bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 hover:border-indigo-500 rounded-xl flex items-center justify-center gap-2 text-indigo-200 font-medium transition-all"
          >
              <Mic className="w-4 h-4" />
              Mötesanteckningar
          </button>

          {/* Filters */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm font-semibold">
                <Filter className="w-4 h-4" />
                FILTRERA
            </div>
            
            <div className="relative mb-4">
                <Filter className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Sök uppgift..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary"
                />
            </div>

            <div className="space-y-1">
                <button
                    onClick={() => { setViewMode('ACTIVE'); setFilterType('ALL'); setSelectedDate(null); setFilterTags([]); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === 'ACTIVE' && filterType === 'ALL' && !selectedDate && filterTags.length === 0 ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                >
                    <div className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Alla aktiva</span>
                    </div>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{upcomingTasks}</span>
                </button>

                {[
                    { id: TaskType.TODO, label: 'To-Do', icon: ListTodo },
                    { id: TaskType.CALL, label: 'Samtal', icon: Phone },
                    { id: TaskType.MEETING, label: 'Möten', icon: Users },
                    { id: TaskType.EMAIL, label: 'Mail', icon: Mail },
                ].map((type) => {
                    const count = tasks.filter(t => !t.isCompleted && !t.isDeleted && t.type === type.id).length;

                    return (
                        <button
                            key={type.id}
                            onClick={() => {
                                setViewMode('ACTIVE');
                                setFilterType(type.id as any);
                                setFilterTags([]);
                                setSelectedDate(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === 'ACTIVE' && filterType === type.id ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                        >
                            <div className="flex items-center gap-2">
                                <type.icon className="w-4 h-4" />
                                <span>{type.label}</span>
                            </div>
                            <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{count}</span>
                        </button>
                    );
                })}
            </div>
          </div>

          {/* Entity Filters (Multi-select) */}
          {availableTags.length > 0 && viewMode === 'ACTIVE' && (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm font-semibold uppercase">
                    <Tag className="w-4 h-4" />
                    Taggar
                </div>
                
                <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                        const isActive = filterTags.includes(tag);
                        return (
                            <button
                                key={tag}
                                onClick={() => toggleTagFilter(tag)}
                                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors border ${
                                    isActive 
                                        ? 'bg-primary text-white border-primary' 
                                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-600'
                                }`}
                            >
                                {tag}
                            </button>
                        )
                    })}
                </div>
              </div>
          )}

          {/* Archive Section */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
             <div className="flex items-center gap-2 mb-4 text-slate-400 text-sm font-semibold uppercase">
                <Archive className="w-4 h-4" />
                ARKIV
             </div>
             <div className="space-y-1">
                <button
                    onClick={() => { setViewMode('ACTIVE'); setSelectedDate(null); }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === 'ACTIVE' && !selectedDate && filterTags.length === 0 ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4" />
                        <span>Pågående</span>
                    </div>
                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{upcomingTasks}</span>
                </button>

                <button
                    onClick={() => setViewMode('COMPLETED')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === 'COMPLETED' ? 'bg-emerald-900/20 text-emerald-400' : 'text-slate-400 hover:bg-slate-800 hover:text-emerald-400'}`}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Slutförda</span>
                    </div>
                    {completedCount > 0 && (
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{completedCount}</span>
                    )}
                </button>
                <button
                    onClick={() => setViewMode('TRASH')}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${viewMode === 'TRASH' ? 'bg-red-900/20 text-red-400' : 'text-slate-400 hover:bg-slate-800 hover:text-red-400'}`}
                >
                    <div className="flex items-center gap-2">
                        <Trash2 className="w-4 h-4" />
                        <span>Papperskorg</span>
                    </div>
                    {trashCount > 0 && (
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-full text-slate-400">{trashCount}</span>
                    )}
                </button>
             </div>
          </div>
        </div>

        {/* Main Timeline */}
        <div className="lg:col-span-6 order-2">
          
          {/* PERSON VIEW HEADER (Supports multiple tags) */}
          {filterTags.length > 0 && viewMode === 'ACTIVE' && (
             <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl mb-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <UserCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white flex flex-wrap gap-2">
                            {filterTags.map(tag => (
                                <span key={tag} className="bg-slate-800 px-2 py-0.5 rounded text-base border border-slate-700">{tag}</span>
                            ))}
                        </h2>
                        <p className="text-xs text-slate-400">
                            {filterTags.length > 1 ? 'Filtrerat på flera taggar' : 'Personöversikt & historik'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4 text-right">
                    <div>
                        <span className="block text-xl font-bold text-white">{tagStats?.pending}</span>
                        <span className="text-xs text-slate-500 uppercase">Kvar</span>
                    </div>
                    <div>
                        <span className="block text-xl font-bold text-emerald-400">{tagStats?.completed}</span>
                        <span className="text-xs text-slate-500 uppercase">Klara</span>
                    </div>
                </div>
             </div>
          )}

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {viewMode === 'ACTIVE' && <><CalendarDays className="w-5 h-5 text-primary" /> Tidslinje</>}
                    {viewMode === 'COMPLETED' && <><CheckCircle2 className="w-5 h-5 text-emerald-400" /> Slutförda uppgifter</>}
                    {viewMode === 'TRASH' && <><Trash2 className="w-5 h-5 text-red-400" /> Papperskorg</>}
                </h2>
                {selectedDate && (
                    <div className="flex items-center gap-2 ml-2 bg-primary/20 text-primary px-3 py-1 rounded-full text-sm font-medium border border-primary/30">
                        <span>{selectedDate}</span>
                        <button onClick={() => setSelectedDate(null)} className="hover:text-white"><XCircle className="w-4 h-4" /></button>
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                {viewMode === 'TRASH' && tasks.filter(t => t.isDeleted).length > 0 && (
                    <button 
                        onClick={emptyTrash}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 bg-red-900/20 px-3 py-1.5 rounded border border-red-900/50"
                    >
                        <Trash2 className="w-3 h-3" />
                        Töm papperskorgen
                    </button>
                )}
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                    {new Date().toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                </span>
            </div>
          </div>

          <div className="space-y-0">
            
            {/* FOCUS SECTION */}
            {focusTasks.length > 0 && (
                <div className="mb-8 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-2 mb-4 px-2">
                        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        <span className="text-xs font-bold text-yellow-400 uppercase tracking-widest">Dagens Fokus</span>
                        <div className="h-[1px] flex-1 bg-yellow-900/30"></div>
                    </div>
                    {focusTasks.map(task => (
                        <TimelineItem 
                            key={task.id} 
                            task={task} 
                            onToggleComplete={toggleComplete}
                            onDelete={moveToTrash}
                            onUpdate={updateTask}
                            onRestore={restoreFromTrash}
                            onPermanentDelete={permanentDelete}
                            viewMode={viewMode}
                        />
                    ))}
                </div>
            )}

            {regularTasks.length === 0 && focusTasks.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-xl">
                    <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        {viewMode === 'TRASH' ? <Trash2 className="w-8 h-8 text-slate-700" /> : <CheckCircle2 className="w-8 h-8 text-slate-700" />}
                    </div>
                    <h3 className="text-slate-400 font-medium">
                        {viewMode === 'ACTIVE' && 'Inga uppgifter i listan'}
                        {viewMode === 'COMPLETED' && 'Inga slutförda uppgifter än'}
                        {viewMode === 'TRASH' && 'Papperskorgen är tom'}
                    </h3>
                    {viewMode === 'ACTIVE' && <p className="text-slate-600 text-sm mt-1">Använd "Quick Capture" för att komma igång</p>}
                </div>
            ) : (
                regularTasks.map(task => (
                    <TimelineItem 
                        key={task.id} 
                        task={task} 
                        onToggleComplete={toggleComplete}
                        onDelete={moveToTrash}
                        onUpdate={updateTask}
                        onRestore={restoreFromTrash}
                        onPermanentDelete={permanentDelete}
                        viewMode={viewMode}
                    />
                ))
            )}
            
            {/* End of list indicator */}
            {(regularTasks.length > 0 || focusTasks.length > 0) && (
                 <div className="pl-8 pt-2 pb-10 relative">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-slate-700 to-transparent"></div>
                    <div className="text-xs text-slate-600 italic">Slut på listan</div>
                 </div>
            )}
          </div>
        </div>

        {/* Right Sidebar / Calendar */}
        <div className="lg:col-span-3 space-y-6 order-3">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sticky top-24">
                <h3 className="text-sm font-semibold text-slate-400 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-primary" />
                    KALENDERÖVERSIKT
                </h3>
                <CalendarWidget 
                    tasks={tasks.filter(t => !t.isDeleted && !t.isCompleted)} 
                    onDateSelect={handleDateSelect}
                    selectedDate={selectedDate}
                />
            </div>
        </div>

      </main>
    </div>
  );
}

export default App;