import React, { useState } from 'react';
import { X, User, Calendar, Award, Hash, ArrowRight, Loader2, Lock } from 'lucide-react';
import { Member } from '../../types';
import { createDocument } from '../../services/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    membershipType: 'Monthly Standard',
    age: 25,
    weight: 70,
    height: 175,
    joinDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newMember: Partial<Member> = {
        username: formData.username,
        password: formData.password,
        name: formData.name,
        age: formData.age,
        weight: formData.weight,
        height: formData.height,
        membershipType: formData.membershipType,
        joinDate: new Date(formData.joinDate),
        expiryDate: new Date(formData.expiryDate),
        status: 'active',
        lastWeekActivity: []
      };

      const memberId = await createDocument('members', newMember);
      
      if (memberId) {
        // Auto-assign basic starter plans
        await createDocument('workout_plans', {
          memberId,
          assignedBy: 'admin',
          exercises: [{ name: 'Warmup', sets: 1, reps: '10 min', notes: 'Light cardio' }]
        });
      }
      
      onClose();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-900 rounded-[32px] overflow-hidden shadow-2xl h-[90vh] overflow-y-auto"
          >
            <div className="p-8 border-b border-zinc-900 flex items-center justify-between sticky top-0 bg-zinc-950 z-10">
              <div>
                <h2 className="text-2xl font-black italic tracking-tighter uppercase">Add New Member</h2>
                <p className="text-gray-500 text-xs mt-1">Register a new athlete and set their credentials.</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-zinc-900 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {/* Full Name - Full Width */}
                <div className="space-y-2 col-span-full">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <User size={12} className="text-red-500" />
                    Athlete Full Name
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Johnathan Smith"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-700"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                {/* Credentials Group */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Hash size={12} className="text-blue-500" />
                    Username
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="unique_handle"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 transition-all font-bold placeholder:text-zinc-700 font-mono"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Lock size={12} className="text-yellow-500" />
                    Security Key
                  </label>
                  <input 
                    required
                    type="text" 
                    placeholder="••••••••"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 transition-all font-bold placeholder:text-zinc-700"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>

                {/* Membership Group */}
                <div className="space-y-2 col-span-full">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Award size={12} className="text-purple-500" />
                    Subscription Tier
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['Monthly Standard', 'Quarterly Pro', 'Yearly Beast'].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setFormData({ ...formData, membershipType: tier })}
                        className={cn(
                          "py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                          formData.membershipType === tier 
                            ? "bg-red-600 border-red-600 text-white shadow-lg shadow-red-600/20" 
                            : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                        )}
                      >
                        {tier.split(' ')[1]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dates Group */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Calendar size={12} className="text-green-500" />
                    Start Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 transition-all font-bold"
                    value={formData.joinDate}
                    onChange={(e) => setFormData({ ...formData, joinDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                    <Calendar size={12} className="text-orange-500" />
                    Renewal Date
                  </label>
                  <input 
                    type="date" 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-red-600 transition-all font-bold text-red-500"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                {/* Metrics Group */}
                <div className="space-y-4 col-span-full pt-4 border-t border-zinc-900">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Physical Profile</label>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Age</span>
                      <input 
                        type="number" 
                        placeholder="YRS"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-sm focus:outline-none focus:border-red-600 transition-all font-bold text-center"
                        value={isNaN(formData.age) ? '' : formData.age}
                        onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Weight</span>
                      <input 
                        type="number" 
                        placeholder="KG"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-sm focus:outline-none focus:border-red-600 transition-all font-bold text-center"
                        value={isNaN(formData.weight) ? '' : formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase ml-1">Height</span>
                      <input 
                        type="number" 
                        placeholder="CM"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-4 px-4 text-sm focus:outline-none focus:border-red-600 transition-all font-bold text-center"
                        value={isNaN(formData.height) ? '' : formData.height}
                        onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 h-16 rounded-2xl text-white font-black italic tracking-widest uppercase flex items-center justify-center gap-3 transition-all shadow-[0_4px_20px_rgba(220,38,38,0.3)] active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <>
                      Register Athlete
                      <ArrowRight size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
