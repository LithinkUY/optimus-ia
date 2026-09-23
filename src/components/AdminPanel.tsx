import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Shield, Users, Edit3, Save, X } from 'lucide-react';

export const AdminPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCredits, setEditCredits] = useState<number>(0);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error) {
      console.error(error);
    } else {
      setUsers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const saveCredits = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ credits: editCredits }).eq('id', id);
    if (!error) {
      setUsers(users.map(u => u.id === id ? { ...u, credits: editCredits } : u));
      setEditingId(null);
    } else {
      alert('Error guardando: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4 z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <Shield className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Panel de Administrador</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition-all"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center py-10 text-slate-500">Cargando usuarios...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-sm">
                  <th className="pb-3 font-medium">Email</th>
                  <th className="pb-3 font-medium">Rol</th>
                  <th className="pb-3 font-medium">Créditos</th>
                  <th className="pb-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-all">
                    <td className="py-4 text-white text-sm">{u.email}</td>
                    <td className="py-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-slate-800 text-slate-300'}`}>{u.role}</span>
                    </td>
                    <td className="py-4 text-cyan-400 font-bold">
                      {editingId === u.id ? (
                        <input type="number" value={editCredits} onChange={(e) => setEditCredits(Number(e.target.value))} className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white focus:border-cyan-500 outline-none" />
                      ) : (
                        u.credits
                      )}
                    </td>
                    <td className="py-4 text-right">
                      {editingId === u.id ? (
                        <button onClick={() => saveCredits(u.id)} className="p-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all"><Save className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => { setEditingId(u.id); setEditCredits(u.credits || 0); }} className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg hover:bg-cyan-500/20 transition-all"><Edit3 className="w-4 h-4" /></button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
