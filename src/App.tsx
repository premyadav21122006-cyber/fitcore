import React, { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { getDocument, listenToCollection } from './services/firebaseService';
import { User, UserRole, Member } from './types';
import { Layout } from './components/Layout';
import { AdminDashboard } from './components/Admin/AdminDashboard';
import { MemberDashboard } from './components/Member/MemberDashboard';
import { Landing } from './components/Landing';
import { Loader2 } from 'lucide-react';
import { doc, getDocFromServer, collection, query, where, getDocs } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('dash');
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    (window as any).setActiveTab = setActiveTab;

    // Persist login
    const savedUser = localStorage.getItem('fitcore_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async (username: string, password: string, role: UserRole) => {
    setLoading(true);
    setLoginError(null);
    try {
      if (role === 'admin') {
        if (username === 'Premyadav' && password === 'Premyadav@21122006') {
          const adminUser: User = {
            uid: 'admin_1',
            username: 'Premyadav',
            displayName: 'Prem Yadav (Owner)',
            role: 'admin',
            createdAt: new Date(),
          };
          setUser(adminUser);
          localStorage.setItem('fitcore_user', JSON.stringify(adminUser));
        } else {
          setLoginError('Incorrect details entered. Please check username and password.');
        }
      } else {
        // Member login check in members collection
        const q = query(collection(db, 'members'), where('username', '==', username), where('password', '==', password));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const memberDoc = querySnapshot.docs[0];
          const memberData = memberDoc.data() as Member;
          const memberUser: User = {
            uid: memberDoc.id, // We use the document ID as UID
            username: memberData.username,
            displayName: memberData.name,
            role: 'member',
            createdAt: memberData.joinDate,
          };
          setUser(memberUser);
          localStorage.setItem('fitcore_user', JSON.stringify(memberUser));
        } else {
          setLoginError('Incorrect details entered. Please check username and password.');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoginError('An error occurred during login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('fitcore_user');
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-white">
        <Loader2 className="w-8 h-8 animate-spin text-red-600" />
      </div>
    );
  }

  if (!user) {
    return <Landing onLogin={handleLogin} error={loginError} />;
  }

  const renderContent = () => {
    if (user.role === 'admin') {
      switch (activeTab) {
        case 'guide': return <MobileGuide />;
        case 'members':
        case 'payments':
        case 'expiring':
        case 'expired':
        case 'dash':
        case 'scan':
          return <AdminDashboard user={user} tab={activeTab} />;
        default: return <AdminDashboard user={user} tab="dash" />;
      }
    } else {
      return <MemberDashboard user={user} tab={activeTab} />;
    }
  };

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab}>
      <React.Suspense fallback={<div className="h-full flex items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div>}>
        {renderContent()}
      </React.Suspense>
    </Layout>
  );
}

const MobileGuide = React.lazy(() => import('./components/Admin/MobileGuide').then(m => ({ default: m.MobileGuide })));
