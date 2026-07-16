// Firestore-backed comments hook
// Real-time sync: comments added on any device appear instantly everywhere
import { useState, useEffect } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FirestoreComment {
  id: string;
  author: string;
  text: string;
  timestamp: Timestamp | null;
}

export function useFirestoreComments(projectFolder: string, trackFile: string) {
  const [comments, setComments] = useState<FirestoreComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectFolder || !trackFile) return;

    // Two equality where-clauses — no composite index required in Firestore
    const q = query(
      collection(db, 'comments'),
      where('projectFolder', '==', projectFolder),
      where('trackFile', '==', trackFile)
    );

    // onSnapshot gives real-time updates: any new comment on another device
    // immediately shows here without refresh
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: FirestoreComment[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          author: doc.data().author ?? '',
          text: doc.data().text ?? '',
          timestamp: doc.data().timestamp ?? null,
        }));

        // Sort client-side by timestamp ascending (avoids composite index)
        loaded.sort((a, b) => {
          if (!a.timestamp) return 1;
          if (!b.timestamp) return -1;
          return a.timestamp.seconds - b.timestamp.seconds;
        });

        setComments(loaded);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Firestore comments error:', err);
        setError('Could not load comments. Check your Firebase config.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectFolder, trackFile]);

  const addComment = async (author: string, text: string): Promise<void> => {
    await addDoc(collection(db, 'comments'), {
      projectFolder,
      trackFile,
      author: author.trim(),
      text: text.trim(),
      timestamp: serverTimestamp(),
    });
  };

  return { comments, loading, error, addComment };
}
