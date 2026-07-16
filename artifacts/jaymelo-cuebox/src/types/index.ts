// All data now lives in Firebase Firestore.
// MP3 files are served from public/tunes/{project.folder}/{track.file}

export interface Track {
  id: string;           // Firestore doc ID (projects/{id}/tracks/{id})
  title: string;
  file: string;         // mp3 filename, e.g. "theme.mp3"
  disabled: boolean;
  downloadable: boolean;
  order: number;        // display order (ascending)
}

export interface Project {
  id: string;           // Firestore doc ID (projects/{id})
  projectName: string;
  username: string;
  password: string;
  folder: string;       // subfolder under public/tunes/, e.g. "last-horizon"
}
