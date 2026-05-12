import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Calendar, 
  Dumbbell, 
  Clock, 
  ChevronRight,
  TrendingUp,
  Activity,
  Award
} from 'lucide-react';
import { User, Member, WorkoutPlan, DietPlan, Exercise } from '../../types';
import { listenToCollection, updateDocument, createDocument } from '../../services/firebaseService';
import { db } from '../../lib/firebase';
import { onSnapshot, doc, collection, query, where, orderBy, limit } from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Plus, X, CheckCircle2, User as UserIcon } from 'lucide-react';

export const MemberDashboard: React.FC<{ user: User, tab?: string }> = ({ user, tab = 'dash' }) => {
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [workout, setWorkout] = useState<WorkoutPlan | null>(null);
  const [diet, setDiet] = useState<DietPlan | null>(null);
  const [latestAttendance, setLatestAttendance] = useState<any>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({ name: '', sets: 3, reps: '12' });
  const lastAttId = React.useRef<string | null>(null);
  const isFirstLoad = React.useRef(true);
  const [selectedDay, setSelectedDay] = useState(new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date()));

  useEffect(() => {
    if (!user?.uid) return;

    // Listen to the specific member document
    const unsubMember = onSnapshot(doc(db, 'members', user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setMemberData({ id: docSnap.id, ...docSnap.data() } as Member);
      } else {
        setMemberData(null);
      }
    }, (error) => {
      console.error("Member data listener error:", error);
    });

    // Listen to latest attendance for welcome message
    const attQuery = query(
      collection(db, 'attendance'),
      where('memberId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(1)
    );

    const unsubAtt = onSnapshot(attQuery, (snap) => {
      if (!snap.empty) {
        const d = snap.docs[0];
        const att = d.data();
        const attId = d.id;
        const attTime = att.timestamp?.seconds * 1000 || 0;
        const now = Date.now();

        // On first load, just record the ID and don't trigger welcome
        if (isFirstLoad.current) {
          lastAttId.current = attId;
          isFirstLoad.current = false;
          return;
        }

        // If it's a new ID and within last 30 minutes
        if (attId !== lastAttId.current && (now - attTime < 30 * 60 * 1000)) {
          lastAttId.current = attId;
          setLatestAttendance(att);
          setShowWelcome(true);
          // Return to home page (dash)
          (window as any).setActiveTab?.('dash');
        }
      } else {
        isFirstLoad.current = false;
      }
    });

    return () => {
      unsubMember();
      unsubAtt();
    };
  }, [user.uid]);

  useEffect(() => {
    if (memberData?.id) {
       const unsubWorkout = listenToCollection('workout_plans', (data) => {
        setWorkout((data as WorkoutPlan[]).find(p => p.memberId === memberData.id) || null);
      }, [{ field: 'memberId', operator: '==', value: memberData.id }]);

      const unsubDiet = listenToCollection('diet_plans', (data) => {
        setDiet((data as DietPlan[]).find(p => p.memberId === memberData.id) || null);
      }, [{ field: 'memberId', operator: '==', value: memberData.id }]);

      return () => {
        unsubWorkout();
        unsubDiet();
      };
    }
  }, [memberData?.id]);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleToggleExercise = async (exerciseIdx: number) => {
    if (!workout?.id || !workout.exercises) return;
    
    // Find absolute index if we are filtering by day
    // But actually, it's easier to just map the exercises and update the specific one
    const updatedExercises = workout.exercises.map((ex, idx) => {
      // We need to match the filtered exercise back to the original index
      // Alternatively, we can use a unique ID for exercises, but since we don't have one,
      // we'll find the specific exercise object in the original array.
      if (idx === exerciseIdx) {
        return { 
          ...ex, 
          completed: !ex.completed,
          completedAt: !ex.completed ? new Date().toISOString() : null
        };
      }
      return ex;
    });

    await updateDocument('workout_plans', workout.id, {
      exercises: updatedExercises
    });
  };

  const handleAddMemberExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberData) return;
    
    // Find or create workout plan
    const newEx: Exercise = {
      name: logForm.name,
      sets: Number(logForm.sets),
      reps: logForm.reps,
      dayOfWeek: selectedDay,
      notes: 'Added by member'
    };

    if (workout) {
      await updateDocument('workout_plans', workout.id!, {
        exercises: [...workout.exercises, newEx]
      });
    } else {
      await createDocument('workout_plans', {
        memberId: memberData.id,
        assignedBy: 'member',
        createdAt: new Date(),
        exercises: [newEx]
      });
    }

    setIsLogOpen(false);
    setLogForm({ name: '', sets: 3, reps: '12' });
  };

  if (!memberData) {
    return <NoMembershipView user={user} />;
  }

  const getExpiryDate = (date: any) => {
    if (!date) return new Date();
    if (date.seconds) return new Date(date.seconds * 1000);
    return new Date(date);
  };

  const daysLeft = Math.ceil((getExpiryDate(memberData.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isExpired = memberData.status === 'expired' || getExpiryDate(memberData.expiryDate) < new Date();
  const isExpiringSoon = !isExpired && daysLeft >= 0 && daysLeft <= 4;

  const renderTabContent = () => {
    switch (tab) {
      case 'workout':
        const dayExercises = (workout?.exercises || [])
          .map((ex, originalIdx) => ({ ...ex, originalIdx }))
          .filter(ex => !ex.dayOfWeek || ex.dayOfWeek === selectedDay);
        
        const completedCount = dayExercises.filter(ex => ex.completed).length;
        const progress = dayExercises.length > 0 ? (completedCount / dayExercises.length) * 100 : 0;

        return (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <SectionHeader title="Workout Routine" icon={<Dumbbell className="text-red-600" />} />
              <div className="flex items-center gap-2">
                {dayExercises.some(ex => ex.completed) && (
                  <button 
                    onClick={async () => {
                      if (!workout?.id || !workout.exercises) return;
                      const updated = workout.exercises.map(ex => {
                        if (!ex.dayOfWeek || ex.dayOfWeek === selectedDay) {
                          return { ...ex, completed: false, completedAt: null };
                        }
                        return ex;
                      });
                      await updateDocument('workout_plans', workout.id, { exercises: updated });
                    }}
                    className="bg-zinc-800 text-gray-400 px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:text-white transition-all"
                  >
                    Reset Day
                  </button>
                )}
                <button 
                  onClick={() => setIsLogOpen(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest flex items-center gap-2 hover:bg-red-700 transition-all"
                >
                  <Plus size={14} /> Add Exercise
                </button>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedDay === day ? "bg-red-600 text-white" : "bg-zinc-900 text-gray-500 hover:bg-zinc-800"
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            {dayExercises.length > 0 && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 mb-2">
                <div className="flex justify-between items-center mb-2">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Today's Progress</h4>
                   <span className="text-xs font-black italic text-red-500">{Math.round(progress)}%</span>
                </div>
                <div className="h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                   <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]"
                   />
                </div>
              </div>
            )}

            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
              {dayExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {dayExercises.map((ex, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => handleToggleExercise(ex.originalIdx)}
                      className={cn(
                        "p-6 bg-zinc-950 border rounded-3xl cursor-pointer transition-all active:scale-95 group",
                        ex.completed ? "border-green-600/30" : "border-zinc-900 hover:border-red-600/30"
                      )}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-colors",
                          ex.completed ? "bg-green-600 text-white" : "bg-red-600/10 text-red-500"
                        )}>
                          {ex.completed ? <CheckCircle2 size={16} /> : idx + 1}
                        </div>
                        <div className="text-right">
                          <span className={cn("text-2xl font-black italic", ex.completed && "text-green-500")}>{ex.sets}</span>
                          <span className="text-zinc-600 text-[10px] font-bold uppercase ml-1">Sets</span>
                        </div>
                      </div>
                      <h4 className={cn("text-xl font-bold mb-1 transition-all", ex.completed && "text-zinc-400 line-through")}>{ex.name}</h4>
                      <p className="text-zinc-500 text-xs mb-4">
                        {ex.notes || (ex.dayOfWeek ? `Scheduled for ${ex.dayOfWeek}` : 'Daily Routine')}
                        {ex.completed && ex.completedAt && <span className="block text-[8px] text-green-600">Done at {new Date(ex.completedAt).toLocaleTimeString()}</span>}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-400">{ex.reps} Reps</span>
                        <span className="px-3 py-1 bg-zinc-900 rounded-full text-[10px] font-bold text-zinc-400">Rest: 60s</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center text-zinc-600 italic uppercase font-bold tracking-widest flex flex-col items-center gap-4">
                  <Dumbbell size={40} className="opacity-10" />
                  No Exercises Scheduled for {selectedDay}
                </div>
              )}
            </div>
          </div>
        );
      case 'diet':
        const dayMeals = diet?.meals.filter(m => !m.dayOfWeek || m.dayOfWeek === selectedDay) || [];
        return (
          <div className="space-y-6">
            <SectionHeader title="Nutrition Plan" icon={<Activity className="text-green-500" />} />
            
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                    selectedDay === day ? "bg-green-600 text-white" : "bg-zinc-900 text-gray-500 hover:bg-zinc-800"
                  )}
                >
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-8">
              {dayMeals.length > 0 ? (
                <div className="space-y-4">
                  {dayMeals.map((meal, idx) => (
                    <div key={idx} className="flex items-center justify-between p-5 bg-zinc-950 border border-zinc-900 rounded-2xl group hover:border-green-500/30 transition-all">
                      <div className="flex items-center gap-6">
                        <div className="text-zinc-600 font-mono text-sm">{meal.time}</div>
                        <div>
                          <h4 className="font-bold text-lg">{meal.description}</h4>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">Daily Meal {idx + 1}</p>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl text-xs font-black italic">
                        {meal.calories} KCAL
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-20 text-center text-zinc-600 italic uppercase font-bold tracking-widest flex flex-col items-center gap-4">
                   <Activity size={40} className="opacity-10" />
                   No Nutrition Plan for {selectedDay}
                </div>
              )}
            </div>
          </div>
        );
      case 'myqr':
        return (
          <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
             <div className="bg-white p-12 rounded-[50px] shadow-[0_0_80px_rgba(255,255,255,0.1)] relative">
                <div className="absolute -top-4 -left-4 bg-red-600 text-white px-4 py-2 rounded-xl font-black italic text-[10px] uppercase tracking-widest">Digital ID</div>
                <QRCodeSVG value={memberData.id || ''} size={250} level="H" includeMargin />
             </div>
             <p className="mt-12 text-zinc-500 text-sm font-bold uppercase tracking-[0.3em] italic animate-pulse">Scanning Enabled</p>
             <h2 className="text-2xl font-black italic mt-4 text-white">ACCESS GRANTED</h2>
          </div>
        );
      case 'dash':
      default:
        return (
          <>
            <AnimatePresence>
              {showWelcome && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-green-600 border border-green-500 rounded-[40px] p-8 mb-8 relative shadow-2xl shadow-green-600/20 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-full bg-white/10 blur-[60px] transform skew-x-12" />
                  <button 
                    onClick={() => setShowWelcome(false)}
                    className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                  
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-green-600 shadow-xl">
                      <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white">Welcome Back, {memberData.name}!</h2>
                      <p className="text-white/80 font-bold uppercase text-[10px] tracking-widest mt-1">Check-in Recognized: {latestAttendance && new Date(latestAttendance.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <button 
                        onClick={() => {
                          (window as any).setActiveTab?.('workout');
                          setShowWelcome(false);
                        }}
                        className="mt-4 px-6 py-3 bg-white text-green-600 rounded-xl font-black italic uppercase tracking-widest text-[10px] hover:bg-zinc-100 transition-all flex items-center gap-2"
                      >
                        <Dumbbell size={14} /> Begin Workout Now
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Expiry Alerts */}
            {isExpired && (
              <div className="bg-red-600/10 border border-red-600/50 rounded-[32px] p-6 mb-8 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-600/20">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-red-500">Membership Expired</h3>
                  <p className="text-red-500/80 text-xs font-bold uppercase tracking-widest mt-1">Please contact management to renew your plan and continue training.</p>
                </div>
              </div>
            )}

            {isExpiringSoon && (
              <div className="bg-yellow-600/10 border border-yellow-600/30 rounded-[32px] p-6 mb-8 flex items-center gap-4">
                <div className="w-12 h-12 bg-yellow-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-yellow-600/20">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black italic tracking-tighter uppercase text-yellow-500">Expiring Soon</h3>
                  <p className="text-yellow-500/80 text-xs font-bold uppercase tracking-widest mt-1">Your membership expires in {daysLeft} day{daysLeft !== 1 ? 's' : ''}. Renew now to avoid disruption.</p>
                </div>
              </div>
            )}

            {/* Welcome Banner */}
            <div className="relative overflow-hidden bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 md:p-12">
              <div className="absolute top-0 right-0 w-[400px] h-full bg-red-600/10 blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-red-600/20 text-red-500 rounded-full text-[10px] font-bold uppercase tracking-widest">Premium Member</span>
                    <span className="text-gray-500 text-xs flex items-center gap-1 font-bold">
                      <Clock size={12} className="text-red-500" /> EXPIRY: {new Date(memberData.expiryDate?.seconds * 1000 || 0).toLocaleDateString()}
                    </span>
                  </div>
                  <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter mb-4 uppercase leading-[0.9]">
                    BEAST <span className="text-red-600">MODE</span> <br/> ACTIVATED
                  </h1>
                  <p className="text-gray-400 max-w-sm font-medium leading-relaxed">
                    Focus on your goals. Your high-performance training plan is optimized and ready for deployment.
                  </p>
                  <button 
                    onClick={() => setIsLogOpen(true)}
                    className="mt-8 flex items-center gap-2 bg-red-600 text-white px-8 py-4 rounded-2xl font-black italic tracking-widest uppercase hover:bg-red-700 transition-all shadow-[0_4px_30px_rgba(220,38,38,0.4)] active:scale-95"
                  >
                    <Plus size={18} /> Record Session
                  </button>
                </div>
                
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="p-6 bg-white rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.1)] group relative cursor-pointer"
                  onClick={() => (window as any).setActiveTab?.('myqr')}
                >
                  <div className="absolute -top-3 -right-3 bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center animate-bounce">
                    <Zap size={14} />
                  </div>
                  <QRCodeSVG value={memberData.id || ''} size={150} level="H" includeMargin />
                  <p className="text-black text-center mt-4 font-black italic tracking-widest text-[10px]">SCAN AT ENTRY</p>
                </motion.div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Workout */}
              <div className="space-y-6">
                <SectionHeader title="Today's Routine" icon={<Dumbbell className="text-red-600" />} />
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] p-6 space-y-4">
                  {workout ? (
                    (() => {
                      const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
                      const todayExs = workout.exercises
                        .map((ex, originalIdx) => ({ ...ex, originalIdx }))
                        .filter(ex => !ex.dayOfWeek || ex.dayOfWeek === today);
                      
                      if (todayExs.length === 0) return <div className="p-12 text-center text-gray-600 italic text-sm">Rest day! No exercises assigned for today.</div>;
                      
                      return todayExs.slice(0, 3).map((ex, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleToggleExercise(ex.originalIdx)}
                          className={cn(
                            "flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border cursor-pointer transition-all active:scale-95 group",
                            ex.completed ? "border-green-600/30" : "border-zinc-900 hover:border-red-600/30"
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black italic border transition-colors",
                              ex.completed ? "bg-green-600 border-green-600 text-white" : "bg-zinc-900 border-zinc-800 text-red-600"
                            )}>
                              {ex.completed ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>
                            <div>
                              <h4 className={cn("font-bold text-sm", ex.completed && "text-zinc-500 line-through")}>{ex.name}</h4>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{ex.sets} Sets × {ex.reps}</p>
                            </div>
                          </div>
                          <ChevronRight size={16} className={cn("transition-colors", ex.completed ? "text-green-500" : "text-zinc-800 group-hover:text-red-600")} />
                        </div>
                      ));
                    })()
                  ) : (
                    <div className="p-12 text-center text-gray-600 italic text-sm">No workout assigned yet.</div>
                  )}
                  
                  {workout && (
                    <button 
                      onClick={() => (window as any).setActiveTab?.('workout')}
                      className="w-full py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors"
                    >
                      Enter Workout View
                    </button>
                  )}
                </div>
              </div>

              {/* Activity Feed */}
              <div className="space-y-6">
                <SectionHeader title="Activity Logs" icon={<TrendingUp className="text-blue-500" />} />
                <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] p-6">
                   <div className="space-y-3">
                      {memberData.lastWeekActivity?.map((log, i) => (
                        <div key={i} className="flex justify-between items-center text-xs p-4 bg-black/40 rounded-2xl border border-zinc-900/50">
                           <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                              <span className="font-bold text-zinc-300">{log.name}</span>
                           </div>
                           <div className="flex items-center gap-3">
                              <span className="text-[10px] font-bold text-zinc-600">{log.sets}×{log.reps}</span>
                              <span className="text-zinc-800 font-black italic uppercase text-[8px]">{new Date(log.doneAt).toLocaleDateString()}</span>
                           </div>
                        </div>
                      ))}
                      {(!memberData.lastWeekActivity || memberData.lastWeekActivity.length === 0) && (
                        <div className="py-12 flex flex-col items-center justify-center text-zinc-700">
                           <Activity size={32} className="mb-4 opacity-10" />
                           <p className="text-[10px] uppercase font-black tracking-widest">No sessions recorded</p>
                        </div>
                      )}
                   </div>
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      {renderTabContent()}

      {/* Log Workout Modal */}
      <AnimatePresence>
        {isLogOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsLogOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-zinc-950 border border-zinc-900 p-8 rounded-[40px] w-full max-w-sm shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black italic uppercase">Log Session</h2>
                <button onClick={() => setIsLogOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddMemberExercise} className="space-y-4">
                 <div>
                   <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Exercise Name</label>
                   <input required type="text" value={logForm.name} onChange={e => setLogForm({...logForm, name: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mt-1 text-sm outline-none focus:border-red-600 transition-all font-bold" placeholder="e.g. Bench Press" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Sets</label>
                      <input 
                        required 
                        type="number" 
                        value={isNaN(logForm.sets) ? '' : logForm.sets} 
                        onChange={e => setLogForm({...logForm, sets: parseInt(e.target.value) || 0})} 
                        className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mt-1 text-sm outline-none font-bold" 
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase text-zinc-500 ml-1">Reps</label>
                      <input required type="text" value={logForm.reps} onChange={e => setLogForm({...logForm, reps: e.target.value})} className="w-full bg-zinc-900 border border-zinc-800 p-4 rounded-2xl mt-1 text-sm outline-none font-bold" />
                    </div>
                 </div>
                 <button type="submit" className="w-full py-4 bg-red-600 text-white rounded-2xl font-black italic uppercase tracking-widest mt-4 hover:bg-red-700 transition-all shadow-lg active:scale-95">Record Activity</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionHeader = ({ title, icon }: { title: string, icon: React.ReactNode }) => (
  <div className="flex items-center gap-3">
    {icon}
    <h3 className="text-lg font-black italic uppercase tracking-tighter">{title}</h3>
    <div className="flex-1 h-[1px] bg-zinc-900" />
  </div>
);

const Achievement = ({ icon, title }: { icon: string, title: string }) => (
  <div className="flex-1 bg-zinc-900/40 border border-zinc-900 rounded-3xl p-4 text-center">
    <div className="text-3xl mb-2">{icon}</div>
    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 leading-tight">{title}</p>
  </div>
);

const NoMembershipView = ({ user }: { user: User }) => (
  <div className="h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
     <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-6 border border-zinc-800">
        <Dumbbell className="text-gray-600 w-10 h-10" />
     </div>
     <h2 className="text-2xl font-black italic mb-3">NO ACTIVE MEMBERSHIP</h2>
     <p className="text-gray-500 mb-8">
        It looks like you don't have an active membership. Contact your gym manager to set up your profile and starting training today.
     </p>
     <button className="px-8 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
        Find a Gym
     </button>
  </div>
);
