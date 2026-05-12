import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const createDocument = async (collectionPath: string, data: any, id?: string) => {
  try {
    if (id) {
      const docRef = doc(db, collectionPath, id);
      await setDoc(docRef, { ...data, createdAt: Timestamp.now() });
      return id;
    } else {
      const docRef = await addDoc(collection(db, collectionPath), { ...data, createdAt: Timestamp.now() });
      return docRef.id;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, collectionPath);
  }
};

export const getDocument = async (collectionPath: string, id: string) => {
  try {
    const docRef = doc(db, collectionPath, id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `${collectionPath}/${id}`);
  }
};

export const updateDocument = async (collectionPath: string, id: string, data: any) => {
  try {
    const docRef = doc(db, collectionPath, id);
    await updateDoc(docRef, { ...data, updatedAt: Timestamp.now() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${collectionPath}/${id}`);
  }
};

export const deleteDocument = async (collectionPath: string, id: string) => {
  try {
    const docRef = doc(db, collectionPath, id);
    console.log('Final Firestore delete call to path:', docRef.path);
    await deleteDoc(docRef);
    console.log('deleteDoc promise resolved for path:', docRef.path);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionPath}/${id}`);
  }
};

export const listenToCollection = (collectionPath: string, callback: (data: any[]) => void, filters?: any[]) => {
  let q = query(collection(db, collectionPath));
  if (filters) {
    filters.forEach(f => {
      q = query(q, where(f.field, f.operator, f.value));
    });
  }
  
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(data);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, collectionPath);
  });
};
