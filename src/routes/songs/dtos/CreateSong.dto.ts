import { Metadata, MouthCue } from "../rhubarbLipSync";

export interface CreateSongDto {
    title: string;
    // voice: string;
    lyric: string;
    song_location: string;
    key_song: string;
    poster_location: string;
    key_poster: string;
    tags: string;
    created_at: string;
    metadata: Metadata;
    mouth_cue: MouthCue[];
}