export type UserRole = 'admin' | 'trainer' | 'member';

export interface User {
  uid: string; // Used as username for member login
  username: string;
  displayName: string;
  role: UserRole;
  password?: string;
  createdAt: any;
}

export interface Member {
  id: string; // The physical member ID
  username: string; // The login username set by admin
  password: string; // The password set by admin
  name: string;
  age: number;
  weight: number;
  height: number;
  membershipType: string;
  joinDate: any;
  expiryDate: any;
  status: 'active' | 'expired' | 'inactive';
  lastWeekActivity?: any[]; // Array of exercises done
}

export interface Attendance {
  id?: string;
  memberId: string;
  timestamp: any;
  method: 'QR' | 'manual' | 'CAMERA';
}

export interface Payment {
  id?: string;
  memberId: string;
  amount: number;
  date: any;
  status: 'paid' | 'pending' | 'failed';
}

export interface Exercise {
  name: string;
  sets: number;
  reps: string;
  dayOfWeek?: string; // e.g. 'Monday', 'Tuesday', etc.
  notes?: string;
  completed?: boolean;
  completedAt?: any;
}

export interface WorkoutPlan {
  id?: string;
  memberId: string;
  assignedBy: string;
  createdAt: any;
  exercises: Exercise[];
}

export interface Meal {
  time: string;
  description: string;
  calories: number;
  dayOfWeek?: string; // Optional: if diet varies by day
}

export interface DietPlan {
  id?: string;
  memberId: string;
  assignedBy: string;
  createdAt: any;
  meals: Meal[];
}

export interface Notification {
  id?: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  createdAt: any;
  read: boolean;
}
