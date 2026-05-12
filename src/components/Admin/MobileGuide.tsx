import React from 'react';
import { Smartphone, Code, FileJson, Layers } from 'lucide-react';

export const MobileGuide: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black italic tracking-tighter mb-4">MOBILE INTEGRATION GUIDE</h2>
        <p className="text-gray-500">How to connect your Flutter apps to this shared backend.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <GuideCard 
          icon={<Smartphone className="text-red-500" />}
          title="Flutter Setup"
          content="Install firebase_core and cloud_firestore. Run 'flutterfire configure' to link your projects using the shared ID below."
        />
        <GuideCard 
          icon={<FileJson className="text-blue-500" />}
          title="Project ID"
          content={window.location.hostname.split('.')[0] || 'your-project-id'}
        />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Layers className="text-purple-500" />
          <h3 className="font-bold">Shared Data Models</h3>
        </div>
        <pre className="bg-black p-6 rounded-2xl text-xs text-gray-400 overflow-x-auto font-mono leading-relaxed">
{`// Example Member Model in Flutter
class Member {
  final String id;
  final String userId;
  final String name;
  final DateTime expiryDate;
  final String status;

  Member({required this.id, required this.userId, ...});

  factory Member.fromFirestore(DocumentSnapshot doc) {
    Map data = doc.data() as Map;
    return Member(
      id: doc.id,
      userId: data['userId'],
      name: data['name'],
      expiryDate: (data['expiryDate'] as Timestamp).toDate(),
      status: data['status'],
    );
  }
}`}
        </pre>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Code className="text-green-500" />
          <h3 className="font-bold">Real-time Stream Integration</h3>
        </div>
        <p className="text-sm text-gray-500">Use Streams in Flutter to listen for real-time updates in both the Admin and Member apps.</p>
        <pre className="bg-black p-6 rounded-2xl text-xs text-gray-400 overflow-x-auto font-mono leading-relaxed">
{`// Listen to membership status
Stream<Member> memberStream(String userId) {
  return FirebaseFirestore.instance
      .collection('members')
      .where('userId', isEqualTo: userId)
      .snapshots()
      .map((snap) => Member.fromFirestore(snap.docs.first));
}`}
        </pre>
      </div>
    </div>
  );
};

const GuideCard = ({ icon, title, content }: { icon: any, title: string, content: string }) => (
  <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl">
    <div className="mb-4">{icon}</div>
    <h4 className="font-bold mb-2">{title}</h4>
    <p className="text-gray-500 text-sm">{content}</p>
  </div>
);
