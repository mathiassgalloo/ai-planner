import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { X, UserPlus, Trash2, Shield, ShieldCheck, Edit2, Check, Eye, EyeOff } from 'lucide-react';

interface AdminPanelProps {
  users: User[];
  onAddUser: (username: string, password: string) => void;
  onRemoveUser: (id: string) => void;
  onUpdateUser: (id: string, username: string, password: string) => void;
  onClose: () => void;
  currentUser: User;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ users, onAddUser, onRemoveUser, onUpdateUser, onClose, currentUser }) => {
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Editing state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Password Visibility State
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newUsername.trim() && newPassword.trim()) {
      onAddUser(newUsername.trim(), newPassword.trim());
      setNewUsername('');
      setNewPassword('');
    }
  };

  const startEditing = (user: User) => {
      setEditingUserId(user.id);
      setEditUsername(user.username);
      setEditPassword(user.password);
  };

  const cancelEditing = () => {
      setEditingUserId(null);
      setEditUsername('');
      setEditPassword('');
  };

  const saveUser = (id: string) => {
      if(editUsername.trim() && editPassword.trim()) {
          onUpdateUser(id, editUsername.trim(), editPassword.trim());
          setEditingUserId(null);
      }
  };

  const togglePasswordVisibility = (userId: string) => {
      setVisiblePasswords(prev => ({
          ...prev,
          [userId]: !prev[userId]
      }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95">
        
        <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3>Admin Panel - Hantera Användare</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          
          {/* Add User Form */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 mb-8">
            <h4 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Lägg till ny användare
            </h4>
            <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-4">
              <input 
                type="text" 
                placeholder="Användarnamn" 
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <input 
                type="text" 
                placeholder="Lösenord/Kod" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <button 
                type="submit"
                disabled={!newUsername || !newPassword}
                className="bg-primary hover:bg-primary-hover disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Lägg till
              </button>
            </form>
          </div>

          {/* User List */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2 flex justify-between">
                <span>Användare</span>
                <span className="mr-24">Lösenord</span>
            </h4>
            <div className="space-y-2">
              {users.map(user => {
                const isEditing = editingUserId === user.id;
                const isPasswordVisible = visiblePasswords[user.id];

                return (
                    <div key={user.id} className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-lg">
                    <div className="flex items-center gap-3 flex-1">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.role === UserRole.ADMIN ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}>
                        {user.role === UserRole.ADMIN ? <Shield className="w-4 h-4" /> : <span className="font-bold text-xs">{user.username.charAt(0)}</span>}
                        </div>
                        
                        {isEditing ? (
                             <div className="flex items-center gap-2 w-full pr-4">
                                <input 
                                    type="text" 
                                    value={editUsername}
                                    onChange={(e) => setEditUsername(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-32 focus:outline-none focus:border-primary"
                                />
                                <input 
                                    type="text" 
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-24 focus:outline-none focus:border-primary"
                                />
                             </div>
                        ) : (
                            <div className="flex-1 grid grid-cols-2 gap-4">
                                <div>
                                    <div className="font-medium text-white text-sm">{user.username}</div>
                                    <div className="text-xs text-slate-500">
                                        {user.role === UserRole.ADMIN ? 'Ägare / Admin' : 'Användare'}
                                        {user.id === currentUser.id && ' (Du)'}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-sm text-slate-400 font-mono w-20">
                                        {isPasswordVisible ? user.password : '••••••••'}
                                    </div>
                                    <button 
                                        onClick={() => togglePasswordVisibility(user.id)}
                                        className="p-1 text-slate-600 hover:text-slate-300 transition-colors"
                                    >
                                        {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <>
                                <button 
                                    onClick={() => saveUser(user.id)}
                                    className="p-2 hover:bg-emerald-900/20 text-emerald-500 hover:text-emerald-400 rounded-md transition-colors"
                                    title="Spara"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={cancelEditing}
                                    className="p-2 hover:bg-slate-800 text-slate-500 hover:text-white rounded-md transition-colors"
                                    title="Avbryt"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </>
                        ) : (
                            <button 
                                onClick={() => startEditing(user)}
                                className="p-2 hover:bg-slate-800 text-slate-500 hover:text-primary rounded-md transition-colors"
                                title="Redigera användare"
                            >
                                <Edit2 className="w-4 h-4" />
                            </button>
                        )}

                        {user.id !== currentUser.id && !isEditing && (
                            <button 
                            onClick={() => {
                                if (confirm(`Är du säker på att du vill ta bort användaren "${user.username}"? All deras data försvinner.`)) {
                                onRemoveUser(user.id);
                                }
                            }}
                            className="p-2 hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-md transition-colors"
                            title="Ta bort användare"
                            >
                            <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AdminPanel;