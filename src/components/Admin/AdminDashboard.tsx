import React, { useState, useEffect } from 'react';
import { 
  Users, 
  ArrowUpRight, 
  Clock, 
  Plus,
  Search,
  Trash2,
  AlertTriangle,
  CreditCard,
  DollarSign,
  History,
  Calendar,
  Check
} from 'lucide-react';
import { User, Member, Payment } from '../../types';
import { listenToCollection, createDocument, deleteDocument } from '../../services/firebaseService';
import { MemberDetail } from './MemberDetail';
import { motion, AnimatePresence } from 'motion/react';
import { AddMemberModal } from './AddMemberModal';
import { cn } from '../../lib/utils';


import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

export const AdminDashboard: React.FC<{ user: User, tab?: string }> = ({ user, tab = 'dash' }) => {
  const getLocalDateString = (date: Date) => {
    // Return YYYY-MM-DD in local time
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(getLocalDateString(new Date()));
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ memberId: '', amount: '' });

  useEffect(() => {
    const unsub = listenToCollection('members', (data) => {
      setMembers(data as Member[]);
    });
    
    const unsubAtt = listenToCollection('attendance', (data) => {
      setAttendance(data);
    });

    return () => {
      unsub();
      unsubAtt();
    };
  }, []);

  const activeMembers = members.filter(m => m.status === 'active').length;
  const expiredMembers = members.filter(m => {
    if (m.status === 'expired') return true;
    if (m.expiryDate) {
      const expiry = new Date(m.expiryDate.seconds * 1000);
      return expiry < new Date();
    }
    return false;
  }).length;

  const expiringSoonCount = members.filter(m => {
    if (!m.expiryDate || m.status !== 'active') return false;
    const expiry = new Date(m.expiryDate.seconds * 1000);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 4;
  }).length;


  useEffect(() => {
    if (tab === 'payments') {
      const unsub = listenToCollection('payments', (data) => {
        setPayments(data as Payment[]);
      });
      return () => unsub();
    }
  }, [tab]);


  const displayMembers = (tab === 'expiring' 
    ? members.filter(m => {
        if (!m.expiryDate || m.status !== 'active') return false;
        const expiry = new Date(m.expiryDate.seconds * 1000);
        const now = new Date();
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 4;
      })
    : tab === 'expired'
    ? members.filter(m => {
        if (m.status === 'expired') return true;
        if (m.expiryDate) {
          const expiry = new Date(m.expiryDate.seconds * 1000);
          return expiry < new Date();
        }
        return false;
      })
    : members).filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));


  const handleRecordPayment = async () => {
    if (!paymentForm.memberId || !paymentForm.amount) {
      alert('Please fill all fields');
      return;
    }
    await createDocument('payments', {
      memberId: paymentForm.memberId,
      amount: Number(paymentForm.amount),
      date: new Date(),
      status: 'paid'
    });
    setPaymentForm({ memberId: '', amount: '' });
    setIsPaymentModalOpen(false);
    alert('Payment recorded successfully');
  };

  if (selectedMemberId) {
    return <MemberDetail memberId={selectedMemberId} onBack={() => setSelectedMemberId(null)} />;
  }

  const createMockMember = async () => {
    const names = ['Alex Johnson', 'Sarah Parker', 'Mike Ross', 'Jessica Pearson'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const mockMember: Partial<Member> = {
      username: `user_${Math.random().toString(36).substr(2, 5)}`,
      password: 'password123',
      name: randomName,
      membershipType: 'Gold Monthly',
      joinDate: new Date(),
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'active',
    };
    const memberId = await createDocument('members', mockMember);
    
    if (memberId) {
      // Add a mock workout
      await createDocument('workout_plans', {
        memberId: memberId,
        assignedBy: 'admin',
        exercises: [
          { name: 'Bench Press', sets: 4, reps: '10-12', notes: 'Keep elbows tucked' },
          { name: 'Squats', sets: 5, reps: '8', notes: 'Go deep' },
          { name: 'Deadlifts', sets: 3, reps: '5', notes: 'Flat back' }
        ]
      });

      // Add a mock diet
      await createDocument('diet_plans', {
        memberId: memberId,
        assignedBy: 'admin',
        meals: [
          { time: '08:00', description: 'Oats & Berries', calories: 450 },
          { time: '13:00', description: 'Chicken & Rice', calories: 650 },
          { time: '19:00', description: 'Salmon & Broccoli', calories: 550 }
        ]
      });
    }
  };

  const handleDeleteMember = async (e: React.MouseEvent, memberId: string) => {
    e.stopPropagation();
    if (!memberId) return;
    
    if (deletingId !== memberId) {
      setDeletingId(memberId);
      // Reset after 3 seconds
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }

    console.log('Confirmed delete for member:', memberId);
    try {
      await deleteDocument('members', memberId);
      setDeletingId(null);
      console.log('Member deleted successfully from Firestore:', memberId);
    } catch (err) {
      console.error('Failed to delete member:', err);
      setDeletingId(null);
      alert('Delete failed.');
    }
  };

  const filteredAttendance = attendance.filter(record => {
    if (!record.timestamp) return false;
    const recordDate = getLocalDateString(new Date(record.timestamp.seconds * 1000));
    return recordDate === selectedAttendanceDate;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {tab === 'dash' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
              title="Total Members" 
              value={members.length.toString()} 
              icon={<Users size={20} className="text-blue-500" />}
            />
            <StatCard 
              title="Active Members" 
              value={activeMembers.toString()} 
              icon={<ArrowUpRight size={20} className="text-green-500" />}
            />
            <StatCard 
              title="Expiring Soon" 
              value={expiringSoonCount.toString()} 
              icon={<Clock size={20} className="text-yellow-500" />}
            />
          </div>
        </>
      )}

      {(tab === 'dash' || tab === 'members' || tab === 'expiring' || tab === 'expired') && (
        <div className={cn(
          "bg-zinc-900/40 border border-zinc-900 rounded-[32px] overflow-hidden",
          tab === 'expired' && "border-red-900/50 bg-red-950/10"
        )}>
          <div className="p-8 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {tab === 'expired' && <AlertTriangle className="text-red-600 animate-pulse" size={24} />}
              <h3 className={cn(
                "text-xl font-bold italic tracking-tighter uppercase",
                tab === 'expired' && "text-red-500"
              )}>
                {tab === 'expiring' ? 'Expiring in 4 Days' : 
                 tab === 'expired' ? 'EXPIRED MEMBERS - URGENT' : 
                 (tab === 'members' ? 'Member Management' : 'Recent Members')}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                <input 
                  type="text" 
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-red-600 transition-colors w-full md:w-64" 
                />
              </div>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-sm font-bold h-10 px-4 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <Plus size={18} /> Add Member
              </button>
            </div>
          </div>
          
          <AddMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-900 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-8 py-4">Member Name</th>
                  <th className="px-8 py-4">Plan Type</th>
                  <th className="px-8 py-4">Date Joined</th>
                  <th className="px-8 py-4">Expiry</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {displayMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-12 text-center text-gray-500 italic">No members found</td>
                  </tr>
                ) : displayMembers.map((member) => (
                  <tr 
                    key={member.id} 
                    className="hover:bg-zinc-900/50 transition-colors group cursor-pointer"
                    onClick={() => setSelectedMemberId(member.id)}
                  >
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                          {member.photoURL ? <img src={member.photoURL} alt="" /> : member.name.charAt(0)}
                        </div>
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-400">{member.membershipType}</td>
                    <td className="px-8 py-4 text-sm text-gray-400">
                      {new Date(member.joinDate?.seconds * 1000 || 0).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4 text-sm text-gray-400">
                      {new Date(member.expiryDate?.seconds * 1000 || 0).toLocaleDateString()}
                    </td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        member.status === 'active' ? "bg-green-600/10 text-green-500" : "bg-red-600/10 text-red-500"
                      )}>
                        {member.status}
                      </span>
                    </td>
                    <td className="px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            await createDocument('attendance', {
                              memberId: member.id,
                              timestamp: new Date(),
                              method: 'manual'
                            });
                            alert(`Checked in ${member.name}`);
                          }}
                          className="px-3 py-1 bg-red-600/10 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
                        >
                          Check In
                        </button>
                        <button 
                          onClick={(e) => handleDeleteMember(e, member.id)}
                          className={cn(
                            "p-2 rounded-xl transition-all shadow-sm",
                            deletingId === member.id 
                              ? "bg-red-600 text-white animate-pulse" 
                              : "bg-zinc-800 text-gray-500 hover:bg-red-600 hover:text-white"
                          )}
                          title={deletingId === member.id ? "Click again to confirm" : "Delete Member"}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'payments' && (
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] overflow-hidden">
          <div className="p-8 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold italic tracking-tighter uppercase">Payment History</h3>
            <div className="flex items-center gap-3">
              <button 
                 onClick={() => setIsPaymentModalOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-sm font-bold h-10 px-4 rounded-xl flex items-center gap-2 transition-colors whitespace-nowrap"
              >
                <DollarSign size={18} /> Record Payment
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-900 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-8 py-4">Transaction ID</th>
                  <th className="px-8 py-4">Member Name</th>
                  <th className="px-8 py-4">Amount</th>
                  <th className="px-8 py-4">Date</th>
                  <th className="px-8 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-gray-500 italic">No payment history found</td>
                  </tr>
                ) : payments.map((payment) => {
                  const member = members.find(m => m.id === payment.memberId);
                  return (
                    <tr key={payment.id} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="px-8 py-4 text-xs font-mono text-gray-500 uppercase">{payment.id?.slice(0, 8)}</td>
                      <td className="px-8 py-4 font-medium">{member?.name || 'Unknown Member'}</td>
                      <td className="px-8 py-4 font-bold text-green-500">${payment.amount}</td>
                      <td className="px-8 py-4 text-sm text-gray-400">
                        {new Date(payment.date?.seconds * 1000 || 0).toLocaleDateString()}
                      </td>
                      <td className="px-8 py-4">
                        <span className="px-2 py-1 rounded-md bg-green-600/10 text-green-500 text-[10px] font-bold uppercase">
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      <AnimatePresence>
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-[32px] p-8 shadow-2xl"
            >
              <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-6 text-green-500">Record Payment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Member</label>
                  <select 
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-green-600 transition-all appearance-none"
                    value={paymentForm.memberId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, memberId: e.target.value })}
                  >
                    <option value="">Select Member</option>
                    {members.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Amount ($)</label>
                  <input 
                    type="number"
                    placeholder="250"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-sm focus:outline-none focus:border-green-600 transition-all font-mono"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="flex-1 py-4 bg-zinc-900 text-gray-500 rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-zinc-800 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleRecordPayment}
                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl text-[10px] font-black italic tracking-widest uppercase hover:bg-green-700 transition-all"
                  >
                    Save Payment
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {tab === 'attendance' && (
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-[32px] overflow-hidden">
          <div className="p-8 border-b border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h3 className="text-xl font-bold italic tracking-tighter uppercase">Attendance Log</h3>
              <div className="px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-800 flex items-center gap-3">
                <Calendar size={14} className="text-red-500" />
                <input 
                  type="date" 
                  value={selectedAttendanceDate}
                  onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase outline-none"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-900">
              Total Check-ins: {filteredAttendance.length}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-zinc-900 text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                  <th className="px-8 py-4">Time</th>
                  <th className="px-8 py-4">Member Name</th>
                  <th className="px-8 py-4">Status</th>
                  <th className="px-8 py-4">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {filteredAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-gray-500 italic">No attendance records for this date</td>
                  </tr>
                ) : filteredAttendance
                    .sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0))
                    .map((record) => {
                      const member = members.find(m => m.id === record.memberId);
                      return (
                        <tr key={record.id} className="hover:bg-zinc-900/50 transition-colors">
                          <td className="px-8 py-4 text-xs font-mono text-gray-400">
                            {record.timestamp ? new Date(record.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex items-center gap-3">
                              <span className="font-medium">{member?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className="px-2 py-1 bg-green-600/10 text-green-500 text-[8px] font-black uppercase rounded-md tracking-tighter">PRESENT</span>
                          </td>
                          <td className="px-8 py-4 text-[10px] font-bold text-gray-500 uppercase tracking-widest">{record.method}</td>
                        </tr>
                      );
                    })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tab === 'scan' && <QRScanner members={members} />}
    </div>
  );
};

const QRScanner = ({ members }: { members: Member[] }) => {
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<Member | null>(null);
  const membersRef = React.useRef(members);
  const lastScanRef = React.useRef<string | null>(null);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    lastScanRef.current = lastScan;
  }, [lastScan]);

  useEffect(() => {
    const html5QrCode = new Html5Qrcode("reader");
    let isMounted = true;
    
    const startScanner = async () => {
      try {
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          async (decodedText) => {
            if (decodedText === lastScanRef.current) return;
            
            const member = membersRef.current.find(m => m.id === decodedText);
            if (member) {
              try {
                await createDocument('attendance', {
                  memberId: decodedText,
                  timestamp: new Date(),
                  method: 'CAMERA'
                });
                
                if (isMounted) {
                  setLastScan(decodedText);
                  setScanResult(member);
                }
                
                // Play success sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
                audio.play().catch(e => console.log("Audio play prevented or interrupted", e));
                
                // Show result for 4 seconds then reset
                setTimeout(() => {
                  if (isMounted) {
                    setLastScan(null);
                    setScanResult(null);
                  }
                }, 4000);
              } catch (err) {
                console.error(err);
              }
            } else {
              if (isMounted) {
                setError("MEMBER NOT FOUND");
                setTimeout(() => { if (isMounted) setError(null); }, 3000);
              }
            }
          },
          () => {} // Ignore scan errors
        );
        
        if (isMounted) {
          setIsScanning(true);
          setError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Camera error:", err);
          setError(err.message || "Could not access camera");
          setIsScanning(false);
        }
      }
    };

    // Small delay to ensure the DOM is ready
    const timeout = setTimeout(startScanner, 100);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      if (html5QrCode.isScanning) {
        html5QrCode.stop().then(() => {
          try { html5QrCode.clear(); } catch (e) {}
        }).catch(err => {
          // If we're unmounting, we don't care about the child node error
          if (!err.message?.includes('removeChild')) {
            console.error("Error stopping scanner", err);
          }
        });
      }
    };
  }, []); // Only run once on mount

  const getExpiryDate = (date: any) => {
    if (!date) return 'N/A';
    const d = date.seconds ? new Date(date.seconds * 1000) : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 text-center shadow-2xl overflow-hidden relative">
        <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">Camera Scanner</h2>
        
        <AnimatePresence>
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 z-20 bg-zinc-950 flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(22,163,74,0.4)]">
                <Check size={40} className="text-white" />
              </div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-green-500 mb-2">Check-in Success</h3>
              <h4 className="text-3xl font-black italic uppercase tracking-tighter mb-4 text-white">{scanResult.name}</h4>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Status</p>
                  <p className={cn(
                    "text-[10px] font-black uppercase",
                    scanResult.status === 'active' ? "text-green-500" : "text-red-500"
                  )}>{scanResult.status}</p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Expires</p>
                  <p className="text-[10px] font-black uppercase text-white font-mono">{getExpiryDate(scanResult.expiryDate)}</p>
                </div>
              </div>
              
              <p className="mt-8 text-[10px] text-zinc-600 italic">Resuming in a moment...</p>
            </motion.div>
          )}
        </AnimatePresence>

        {error ? (
          <div className="bg-red-600/10 border border-red-600/30 p-6 rounded-3xl mb-4">
            <p className="text-red-500 text-xs font-bold uppercase tracking-widest mb-2">Scanner Notification</p>
            <p className="text-zinc-500 text-[10px]">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="relative group">
            <div id="reader" className="bg-black rounded-3xl overflow-hidden border border-zinc-800 aspect-square"></div>
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-3xl">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            <div className="absolute inset-0 border-2 border-red-600/20 rounded-3xl pointer-events-none group-hover:border-red-600/40 transition-all"></div>
          </div>
        )}
        
        <p className="mt-6 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
          {isScanning ? "Position QR code clearly in frame" : "Initializing camera..."}
        </p>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }: any) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-zinc-900/40 border border-zinc-900 p-6 rounded-[32px] backdrop-blur-sm shadow-xl"
  >
    <div className="flex items-center justify-between mb-4">
      <div className="p-3 bg-zinc-950 rounded-2xl border border-zinc-800">
        {icon}
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wider">{title}</p>
      <h2 className="text-3xl font-black italic tracking-tighter">{value}</h2>
    </div>
  </motion.div>
);
