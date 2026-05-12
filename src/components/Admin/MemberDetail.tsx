import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Activity, Calendar, Utensils, Clock, CheckCircle2, Trash2
} from 'lucide-react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Member, WorkoutPlan, DietPlan, Attendance, Payment } from '../../types';
import { listenToCollection, createDocument, deleteDocument, updateDocument } from '../../services/firebaseService';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, X } from 'lucide-react';

interface MemberDetailProps {
  memberId: string;
  onBack: () => void;
}

export const MemberDetail: React.FC<MemberDetailProps> = ({ memberId, onBack }) => {
  const [member, setMember] = useState<Member | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([]);
  const [diets, setDiets] = useState<DietPlan[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);

  useEffect(() => {
    if (!memberId) return;

    const unsubMember = onSnapshot(doc(db, 'members', memberId), (docSnap) => {
      if (docSnap.exists()) {
        setMember({ id: docSnap.id, ...docSnap.data() } as Member);
      } else {
        setMember(null);
        onBack();
      }
    });

    const unsubWorkout = listenToCollection('workout_plans', (data) => {
      setWorkouts((data as WorkoutPlan[]).filter(p => p.memberId === memberId));
    }, [{ field: 'memberId', operator: '==', value: memberId }]);

    const unsubDiet = listenToCollection('diet_plans', (data) => {
      setDiets((data as DietPlan[]).filter(p => p.memberId === memberId));
    }, [{ field: 'memberId', operator: '==', value: memberId }]);

    const unsubAttendance = listenToCollection('attendance', (data) => {
      setAttendance((data as Attendance[]).filter(a => a.memberId === memberId));
    }, [{ field: 'memberId', operator: '==', value: memberId }]);

    return () => {
      unsubMember(); unsubWorkout(); unsubDiet(); unsubAttendance();
    };
  }, [memberId]);

  const sendReminder = async () => {
    if (!member) return;
    await createDocument('notifications', {
      userId: member.id,
      title: 'Payment Reminder',
      body: `Hi ${member.name}, your membership is expiring soon. Please renew.`,
      type: 'payment',
      createdAt: new Date(),
      read: false
    });
    alert('Reminder sent!');
  };

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      setTimeout(() => setIsConfirmingDelete(false), 3000);
      return;
    }

    console.log('Admin confirmed permanent delete for member:', memberId);
    try {
      await deleteDocument('members', memberId);
      console.log('Member deleted successfully from detail view');
      onBack();
    } catch (err) {
      console.error('Failed to delete member from detail view:', err);
      setIsConfirmingDelete(false);
      alert('Delete failed.');
    }
  };

  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [isWorkoutModalOpen, setIsWorkoutModalOpen] = useState(false);
  const [selectedDietDay, setSelectedDietDay] = useState('Monday');
  const [selectedWorkoutDay, setSelectedWorkoutDay] = useState('Monday');
  const [mealForm, setMealForm] = useState({ time: '08:00 AM', description: '', calories: 300 });
  const [exerciseForm, setExerciseForm] = useState({ name: '', sets: 3, reps: '12', notes: '' });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddWorkout = async () => {
    if (!exerciseForm.name) return;
    const currentWorkout = workouts[0];
    const newEx = { 
      ...exerciseForm, 
      dayOfWeek: selectedWorkoutDay, 
      sets: Number(exerciseForm.sets),
      completed: false 
    };

    if (currentWorkout) {
      await updateDocument('workout_plans', currentWorkout.id!, {
        exercises: [...currentWorkout.exercises, newEx]
      });
    } else {
      await createDocument('workout_plans', {
        memberId,
        assignedBy: 'admin',
        createdAt: new Date(),
        exercises: [newEx]
      });
    }
    setExerciseForm({ name: '', sets: 3, reps: '12', notes: '' });
    setIsWorkoutModalOpen(false);
  };

  const handleAddMeal = async () => {
    if (!mealForm.description) return;
    const currentDiet = diets[0];
    const newMeal = { ...mealForm, dayOfWeek: selectedDietDay, calories: Number(mealForm.calories) };

    if (currentDiet) {
      await updateDocument('diet_plans', currentDiet.id!, {
        meals: [...currentDiet.meals, newMeal]
      });
    } else {
      await createDocument('diet_plans', {
        memberId,
        assignedBy: 'admin',
        createdAt: new Date(),
        meals: [newMeal]
      });
    }
    setMealForm({ time: '08:00 AM', description: '', calories: 300 });
    setIsDietModalOpen(false);
  };

  if (!member) return null;

  const getExpiryDate = (date: any) => {
    if (!date) return new Date();
    if (date.seconds) return new Date(date.seconds * 1000);
    return new Date(date);
  };

  const daysRemaining = Math.ceil((getExpiryDate(member.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black italic tracking-widest">
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8">
            <div className="w-20 h-20 bg-red-600 rounded-[28px] flex items-center justify-center text-3xl font-black italic mb-6">
              {member.name.charAt(0)}
            </div>
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-2">{member.name}</h2>
            <div className="space-y-3 mt-6">
              <InfoRow label="Login" value={member.username} />
              <InfoRow label="Pass" value={member.password} />
              <InfoRow label="Left" value={`${daysRemaining} Days`} highlight={daysRemaining < 7} />
            </div>
            <button onClick={sendReminder} className="w-full mt-8 py-4 bg-red-600/10 text-red-500 hover:bg-red-600/20 rounded-2xl text-[10px] font-black italic tracking-widest uppercase transition-all">
              Send Reminder
            </button>
            <button 
              onClick={handleDelete} 
              className={cn(
                "w-full mt-3 py-4 rounded-2xl text-[10px] font-black italic tracking-widest uppercase transition-all flex items-center justify-center gap-2 border",
                isConfirmingDelete 
                  ? "bg-red-600 border-red-600 text-white animate-pulse" 
                  : "bg-zinc-800 border-zinc-800 text-gray-500 hover:bg-red-600 hover:text-white"
              )}
            >
              <Trash2 size={12} /> {isConfirmingDelete ? 'Click Again to Confirm' : 'Delete Member'}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
           <section className="bg-zinc-900/50 border border-zinc-800 rounded-[40px] p-8">
              <h3 className="text-lg font-black italic uppercase mb-6 flex items-center gap-2"><Activity className="text-red-600" /> Recent Activity</h3>
              <div className="space-y-3">
                {member.lastWeekActivity && member.lastWeekActivity.length > 0 ? (
                  member.lastWeekActivity.map((act, i) => (
                    <div key={i} className="flex justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-900">
                      <span className="font-bold flex items-center gap-2"><CheckCircle2 size={14} className="text-green-500"/> {act.name}</span>
                      <span className="text-[10px] text-gray-500 uppercase font-black italic">{new Date(act.doneAt).toLocaleDateString()}</span>
                    </div>
                  ))
                ) : <p className="text-center text-gray-600 text-xs italic py-8">No workouts logged yet.</p>}
              </div>
           </section>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-zinc-900/50 border border-zinc-800 rounded-[30px] p-6 relative">
                 <div className="flex justify-between items-center mb-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Workout Plan</h4>
                   <button 
                    onClick={() => setIsWorkoutModalOpen(true)}
                    className="p-1 bg-red-600/20 text-red-500 rounded-lg hover:bg-red-600 hover:text-white transition-all"
                   >
                    <Plus size={14} />
                   </button>
                 </div>

                 <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedWorkoutDay(day)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap",
                          selectedWorkoutDay === day 
                            ? "bg-red-600 text-white" 
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                 </div>

                 <div className="space-y-2">
                    {workouts[0]?.exercises
                      .filter(ex => ex.dayOfWeek === selectedWorkoutDay || !ex.dayOfWeek)
                      .map((ex, i, filteredArr) => (
                      <div key={i} className="text-[10px] flex justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-900 group">
                        <div className="flex flex-col">
                          <span className={cn("font-bold truncate max-w-[120px]", ex.completed && "text-green-500 line-through")}>
                            {ex.name}
                          </span>
                          <span className="text-[8px] text-zinc-600 uppercase font-mono">{ex.sets} SETS × {ex.reps} REPS</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {ex.completed && <CheckCircle2 size={12} className="text-green-500" />}
                          <button 
                            onClick={async () => {
                              const exToDelete = filteredArr[i];
                              const newExs = workouts[0].exercises.filter(item => item !== exToDelete);
                              await updateDocument('workout_plans', workouts[0].id!, { exercises: newExs });
                            }}
                            className="text-red-500 p-1 hover:bg-red-500/10 rounded transition-all"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!workouts[0] || workouts[0].exercises.filter(ex => ex.dayOfWeek === selectedWorkoutDay || !ex.dayOfWeek).length === 0) && (
                      <p className="text-[10px] text-zinc-700 italic">No exercises for {selectedWorkoutDay}</p>
                    )}
                 </div>
              </section>

              <section className="bg-zinc-900/50 border border-zinc-800 rounded-[30px] p-6 relative">
                 <div className="flex justify-between items-center mb-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Diet Plan</h4>
                   <button 
                    onClick={() => setIsDietModalOpen(true)}
                    className="p-1 bg-green-600/20 text-green-500 rounded-lg hover:bg-green-600 hover:text-white transition-all"
                   >
                    <Plus size={14} />
                   </button>
                 </div>

                 <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar mb-2">
                    {days.map(day => (
                      <button
                        key={day}
                        onClick={() => setSelectedDietDay(day)}
                        className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase transition-all whitespace-nowrap",
                          selectedDietDay === day 
                            ? "bg-green-600 text-white" 
                            : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                        )}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                 </div>

                 <div className="space-y-2">
                    {diets[0]?.meals
                      .filter(m => m.dayOfWeek === selectedDietDay || !m.dayOfWeek)
                      .map((m, i, filteredArr) => (
                      <div key={i} className="text-[10px] flex justify-between bg-zinc-950 p-2 rounded-lg border border-zinc-900 group">
                        <div className="flex flex-col">
                          <span className="truncate max-w-[100px] font-bold">{m.description}</span>
                          <span className="text-[8px] text-zinc-600 uppercase">{m.dayOfWeek || 'All Days'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 font-mono">{m.time}</span>
                          <button 
                            onClick={async () => {
                              const mealToDelete = filteredArr[i];
                              const newMeals = diets[0].meals.filter(item => item !== mealToDelete);
                              await updateDocument('diet_plans', diets[0].id!, { meals: newMeals });
                            }}
                            className="text-red-500 p-1 hover:bg-red-500/10 rounded transition-all"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!diets[0] || diets[0].meals.filter(m => m.dayOfWeek === selectedDietDay || !m.dayOfWeek).length === 0) && (
                      <p className="text-[10px] text-zinc-700 italic">No meals for {selectedDietDay}</p>
                    )}
                 </div>
              </section>
           </div>
        </div>
      </div>

      {/* Workout Modal */}
      <AnimatePresence>
        {isWorkoutModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-red-500">Assign Exercise ({selectedWorkoutDay})</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Exercise Name</label>
                  <input 
                    type="text" 
                    placeholder="Bench Press"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-red-600 transition-all font-bold"
                    value={exerciseForm.name}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Sets</label>
                    <input 
                      type="number" 
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-red-600 transition-all font-mono"
                      value={exerciseForm.sets}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, sets: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Reps</label>
                    <input 
                      type="text" 
                      placeholder="12"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-red-600 transition-all font-mono"
                      value={exerciseForm.reps}
                      onChange={(e) => setExerciseForm({ ...exerciseForm, reps: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Notes (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="Heavy load"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-red-600 transition-all"
                    value={exerciseForm.notes}
                    onChange={(e) => setExerciseForm({ ...exerciseForm, notes: e.target.value })}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsWorkoutModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-900 text-gray-500 rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddWorkout}
                    className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-red-700 transition-all"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Diet Modal */}
      <AnimatePresence>
        {isDietModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[32px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-green-500">Assign Meal ({selectedDietDay})</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Meal Time</label>
                  <input 
                    type="text" 
                    placeholder="08:00 AM"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-green-600 transition-all font-mono"
                    value={mealForm.time}
                    onChange={(e) => setMealForm({ ...mealForm, time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Description</label>
                  <input 
                    type="text" 
                    placeholder="3 Egg Whites + Oats"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-green-600 transition-all"
                    value={mealForm.description}
                    onChange={(e) => setMealForm({ ...mealForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Est. Calories</label>
                  <input 
                    type="number"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-green-600 transition-all font-mono"
                    value={mealForm.calories}
                    onChange={(e) => setMealForm({ ...mealForm, calories: Number(e.target.value) })}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsDietModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-900 text-gray-500 rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddMeal}
                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-green-700 transition-all"
                  >
                    Save Meal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InfoRow = ({ label, value, highlight }: any) => (
  <div className="flex justify-between border-b border-zinc-800 pb-2 text-[10px] font-bold uppercase tracking-widest">
    <span className="text-gray-500">{label}</span>
    <span className={cn(highlight ? "text-red-500" : "text-white")}>{value}</span>
  </div>
);

const MetricBox = ({ label, value }: any) => (
  <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center">
    <p className="text-[10px] font-black italic">{value}</p>
  </div>
);
