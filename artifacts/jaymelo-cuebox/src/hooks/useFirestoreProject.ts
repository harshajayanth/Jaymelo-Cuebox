// Real-time subscription to a single project + its tracks from Firestore.
// Any change made in the admin/editor dialog is immediately reflected here.
import { useState, useEffect } from 'react';
import { doc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Project, Track } from '@/types';

export function useFirestoreProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to project metadata doc
    const projectUnsub = onSnapshot(
      doc(db, 'projects', projectId),
      (snap) => {
        if (!snap.exists()) {
          setError('Project not found.');
          setLoading(false);
          return;
        }
        const d = snap.data();
        setProject({
          id: snap.id,
          projectName: d.projectName ?? '',
          username: d.username ?? '',
          password: d.password ?? '',
          folder: d.folder ?? '',
        });
      },
      (err) => {
        console.error('Project listener error:', err);
        setError('Could not load project. Check your Firebase config.');
        setLoading(false);
      }
    );

    // Subscribe to tracks subcollection, ordered by `order` field
    const tracksUnsub = onSnapshot(
      query(collection(db, 'projects', projectId, 'tracks'), orderBy('order', 'asc')),
      (snap) => {
        const loaded: Track[] = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title ?? '',
          file: d.data().file ?? '',
          disabled: d.data().disabled ?? false,
          downloadable: d.data().downloadable ?? false,
          order: d.data().order ?? 0,
        }));
        setTracks(loaded);
        setLoading(false);
      },
      (err) => {
        console.error('Tracks listener error:', err);
        setError('Could not load tracks.');
        setLoading(false);
      }
    );

    return () => {
      projectUnsub();
      tracksUnsub();
    };
  }, [projectId]);

  return { project, tracks, loading, error };
}
