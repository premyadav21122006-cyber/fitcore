import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Dumbbell, ShieldCheck, Zap, TrendingUp, User, Lock, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';

 interface LandingProps {
  onLogin: (username: string, password: string, role: UserRole) => void;
  error?: string | null;
}

export const Landing: React.FC<LandingProps> = ({ onLogin, error }) => {
  const [role, setRole] = useState<UserRole>('member');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password, role);
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-hidden">
      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-12">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/20 rounded-full blur-[120px] -z-10" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center w-full max-w-md"
        >
          <div className="flex items-center justify-center mb-6 gap-2">
            <Dumbbell className="w-10 h-10 text-red-600" />
            <h1 className="text-5xl font-black italic tracking-tighter uppercase">
              FIT<span className="text-red-600">CORE</span>
            </h1>
          </div>
          
          <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[40px] backdrop-blur-md shadow-2xl">
            <div className="flex bg-black p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setRole('member')}
                className={`flex-1 py-3 text-xs font-black italic tracking-widest uppercase transition-all rounded-xl ${role === 'member' ? 'bg-red-600 text-white' : 'text-gray-500 hover:text-white'}`}
              >
                Member
              </button>
              <button 
                onClick={() => setRole('admin')}
                className={`flex-1 py-3 text-xs font-black italic tracking-widest uppercase transition-all rounded-xl ${role === 'admin' ? 'bg-white text-black' : 'text-gray-500 hover:text-white'}`}
              >
                Owner
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-xs font-bold leading-relaxed mb-4 text-left"
                >
                  {error}
                </motion.div>
              )}
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input 
                  required
                  type="text" 
                  placeholder="Username"
                  className="w-full bg-black border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-red-600 transition-all font-medium text-white"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                <input 
                  required
                  type="password" 
                  placeholder="Password"
                  className="w-full bg-black border border-zinc-900 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-red-600 transition-all font-medium text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                className={`w-full h-16 rounded-2xl font-black italic tracking-widest uppercase flex items-center justify-center gap-2 transition-all transform active:scale-95 mt-6 ${role === 'admin' ? 'bg-white text-black hover:bg-gray-200' : 'bg-red-600 text-white hover:bg-red-700 shadow-[0_0_20px_rgba(220,38,38,0.3)]'}`}
              >
                Login to FitCore
                <ArrowRight size={20} />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 backdrop-blur-sm"
  >
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2">{title}</h3>
    <p className="text-gray-500 text-sm">{description}</p>
  </motion.div>
);
