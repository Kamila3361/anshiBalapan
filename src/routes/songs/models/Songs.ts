import mongoose, { Document, Schema } from "mongoose";

export interface ISong extends Document{
    title: string;
    // voice: string;
    lyric: string;
    song_location: string;
    key_song: string;
    poster_location: string;
    key_poster: string;
    tags: string;
    created_at: string;
}

const SongSchema: Schema = new Schema({
    title: { type: String, required: true },
    // voice: { type: String, required: true },
    lyric: { type: String, required: true },
    song_location: { type: String, required: true },
    key_song: { type: String, required: true },
    poster_location: { type: String, required: true },
    key_poster: { type: String, required: true },
    tags: { type: String, required: true },
    created_at: { type: String, required: true}
});

export default mongoose.model<ISong>('Song', SongSchema);
