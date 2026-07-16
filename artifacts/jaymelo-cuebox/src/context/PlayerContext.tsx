import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Track, Project } from '@/types';

interface PlayerContextState {
  currentTrack: Track | null;
  currentProject: Project | null;
  allTracks: Track[];
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  play: (track: Track, project: Project) => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  playNext: () => void;
  playPrev: () => void;
  /** Call this whenever Firestore delivers a fresh tracks list */
  updateTracks: (tracks: Track[]) => void;
}

const PlayerContext = createContext<PlayerContextState | undefined>(undefined);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [allTracks, setAllTracks] = useState<Track[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  const [volume, _setVolume] = useState(() => {
    const saved = localStorage.getItem('cuebox_volume');
    return saved ? parseFloat(saved) : 1;
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stateRef = useRef({ currentTrack, currentProject, allTracks });

  useEffect(() => {
    stateRef.current = { currentTrack, currentProject, allTracks };
  }, [currentTrack, currentProject, allTracks]);

  const updateTracks = (tracks: Track[]) => {
    setAllTracks(tracks);

    if (currentTrack && !tracks.some((t) => t.file === currentTrack.file)) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setCurrentTrack(null);
      setCurrentProject(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    
    audio.addEventListener('contextmenu', (e) => e.preventDefault());
    
    return () => {
      audio.pause();
      audio.src = '';
    };
  }, []);

  const playNext = () => {
    const { currentTrack: track, currentProject: project, allTracks: tracklist } = stateRef.current;
    if (!track || !project || tracklist.length === 0) return;
    const idx = tracklist.findIndex(t => t.file === track.file);
    if (idx >= 0 && idx < tracklist.length - 1) {
      let nextTrack = tracklist[idx + 1];
      let offset = 1;
      while (nextTrack && nextTrack.disabled) {
        offset++;
        nextTrack = tracklist[idx + offset];
      }
      if (nextTrack && !nextTrack.disabled) {
        play(nextTrack, project);
      }
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    // Add event listeners for metadata loaded
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
    };
  }, []); // bind once, playNext uses ref inside

  const playPrev = () => {
    const { currentTrack: track, currentProject: project, allTracks: tracklist } = stateRef.current;
    if (!track || !project || tracklist.length === 0) return;
    const idx = tracklist.findIndex(t => t.file === track.file);

    if (audioRef.current && audioRef.current.currentTime > 3) {
      // If playing for more than 3 seconds, restart the current track
      audioRef.current.currentTime = 0;
      return;
    }

    if (idx > 0) {
      let prevTrack = tracklist[idx - 1];
      let offset = 1;
      while (prevTrack && prevTrack.disabled && idx - offset >= 0) {
        offset++;
        prevTrack = tracklist[idx - offset];
      }
      if (prevTrack && !prevTrack.disabled) {
        play(prevTrack, project);
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    }
  };

  const play = async (track: Track, project: Project) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (track.disabled) return;

    if (currentTrack?.file !== track.file || currentProject?.folder !== project.folder) {
      setCurrentTrack(track);
      setCurrentProject(project);

      const url = `/tunes/${project.folder}/${encodeURIComponent(track.file)}`;
      audio.src = url;
      audio.load();
    }

    audio.play().catch((e) => console.error('Playback error', e));
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else if (currentTrack && currentProject) {
      play(currentTrack, currentProject);
    }
  };

  const seekRelative = (seconds: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(audio.currentTime + seconds, audio.duration || 0));
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const setVolume = (vol: number) => {
    _setVolume(vol);
    localStorage.setItem('cuebox_volume', vol.toString());
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const togglePlayRef = useRef(togglePlay);
  const seekRelativeRef = useRef(seekRelative);
  useEffect(() => {
    togglePlayRef.current = togglePlay;
    seekRelativeRef.current = seekRelative;
  }, [togglePlay, seekRelative]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        (document.activeElement as HTMLElement)?.isContentEditable
      ) return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayRef.current();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        seekRelativeRef.current(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        seekRelativeRef.current(10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentTrack,
        currentProject,
        allTracks,
        isPlaying,
        currentTime,
        duration,
        volume,
        play,
        pause,
        togglePlay,
        seekTo,
        setVolume,
        playNext,
        playPrev,
        updateTracks,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (context === undefined) {
    throw new Error('usePlayer must be used within a PlayerProvider');
  }
  return context;
}
