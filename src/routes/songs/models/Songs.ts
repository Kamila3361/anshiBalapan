import mongoose, { Document, Schema } from "mongoose";

export interface ISong extends Document{
    name: string;
    singer: string;
    released_date: string;
    duration: string;
    song_location: string;
    key_song: string;
    poster_location: string;
    key_poster: string;
}

const SongSchema: Schema = new Schema({
    name: {type: String},
    singer: {type: String},
    released_date: {type: String},
    duration :{type: String},
    song_location: {type: String},
    key_song: {type: String},
    poster_location: {type: String},
    key_poster: {type: String} 
});

export default mongoose.model<ISong>('Song', SongSchema);
