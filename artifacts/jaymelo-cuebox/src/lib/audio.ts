import type { Project, Track } from '@/types';

function readSession() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem('cuebox_session');
    if (!raw) return null;
    return JSON.parse(raw) as { projectId?: string };
  } catch {
    return null;
  }
}

export function getActiveSessionProjectId() {
  return readSession()?.projectId ?? null;
}

export function isAuthorizedSession(projectId?: string | null) {
  const sessionProjectId = getActiveSessionProjectId();
  if (!sessionProjectId) return false;
  if (projectId && sessionProjectId !== projectId) return false;
  return true;
}

export function setCueboxSessionCookie(projectId: string) {
  if (typeof window === 'undefined') return;
  const value = encodeURIComponent(JSON.stringify({ projectId }));
  document.cookie = `cuebox_session=${value}; path=/; max-age=3600; SameSite=Lax`;
}

export function clearCueboxSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('cuebox_session');
  localStorage.removeItem('cuebox_confidentiality_accepted');
  document.cookie = 'cuebox_session=; path=/; max-age=0; SameSite=Lax';
}

export function redirectToLogin() {
  clearCueboxSession();
  if (typeof window !== 'undefined') {
    window.location.assign('/');
  }
}

export function getTrackAssetCandidates(track: Pick<Track, 'file'>, project?: Pick<Project, 'folder' | 'id'> | null) {
  const encodedFile = encodeURIComponent(track.file);
  const sharedPath = `/tunes/${encodedFile}`;
  const legacyPath = project?.folder ? `/tunes/${encodeURIComponent(project.folder)}/${encodedFile}` : null;
  return [sharedPath, ...(legacyPath ? [legacyPath] : [])];
}

export async function fetchTrackAsset(
  track: Pick<Track, 'file'>,
  project?: Pick<Project, 'folder' | 'id'> | null,
  init: RequestInit = {},
) {
  if (!isAuthorizedSession(project?.id)) {
    redirectToLogin();
    throw new Error('Unauthorized track access');
  }

  const candidates = getTrackAssetCandidates(track, project);
  const headers = new Headers(init.headers || {});
  headers.set('X-Cuebox-Session', getActiveSessionProjectId() ?? '');

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { ...init, headers, credentials: 'include' });
      if (response.ok) {
        return { response, url: candidate };
      }
      if (response.status !== 404) {
        return { response, url: candidate };
      }
    } catch {
      // Try the next candidate if the current one is unavailable.
    }
  }

  return null;
}

export async function createSecureAudioSource(
  track: Pick<Track, 'file'>,
  project?: Pick<Project, 'folder' | 'id'> | null,
  onProgress?: (progress: number | null) => void,
) {
  const asset = await fetchTrackAsset(track, project, { method: 'GET' });
  if (!asset?.response) {
    throw new Error('Audio not available');
  }

  const contentLength = Number(asset.response.headers.get('content-length'));
  const total = Number.isFinite(contentLength) && contentLength > 0 ? contentLength : null;
  const reader = asset.response.body?.getReader();

  if (!reader) {
    const blob = await asset.response.blob();
    onProgress?.(100);
    return URL.createObjectURL(blob);
  }

  const chunks: ArrayBuffer[] = [];
  let received = 0;
  onProgress?.(total ? 0 : null);

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value.slice().buffer as ArrayBuffer);
    received += value.byteLength;
    onProgress?.(total ? Math.min(99, Math.round((received / total) * 100)) : null);
  }

  const blob = new Blob(chunks, {
    type: asset.response.headers.get('content-type') || 'audio/mpeg',
  });
  onProgress?.(100);
  return URL.createObjectURL(blob);
}
