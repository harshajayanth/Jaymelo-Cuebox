export interface Comment {
  author: string;
  text: string;
}

export interface Track {
  title: string;
  file: string;          // mp3 filename inside public/tunes/{folder}/
  disabled: boolean;
  downloadable: boolean;
  comments: Comment[];
}

export interface Project {
  projectName: string;
  username: string;
  password: string;
  folder: string;        // subfolder under public/tunes/
  tracks: Track[];
}
