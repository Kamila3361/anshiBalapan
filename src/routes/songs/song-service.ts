import { ISong } from "./models/Songs";
import SongModel from "./models/Songs";
import { CreateSongDto } from "./dtos/CreateSong.dto";

export class SongService {  

    async uploadSong(createSongDto: CreateSongDto){
        const { title, /*voice,*/ lyric, song_location, key_song, poster_location, key_poster, tags, created_at, metadata, mouth_cue } = createSongDto;

        const newSong = new SongModel({
            title: title,
            // voice: voice,
            lyric: lyric,
            song_location: song_location,
            key_song: key_song,
            poster_location: poster_location,
            key_poster: key_poster,
            tags: tags,
            created_at: created_at,
            metadata: metadata,
            mouth_cue: mouth_cue
        });

        await newSong.save();
        return newSong;
    }

    async getAllSongs(): Promise<ISong[]> {
        return await SongModel.find().exec();
    }

    async getSong(songId: string): Promise<ISong | null> {
        return await SongModel.findById(songId).exec();
    }

    async deleteSong(songId: string): Promise<void> {
        await SongModel.findByIdAndDelete(songId).exec();
    }

    async updateSong(songId: any, updateData: Partial<ISong>): Promise<ISong | null> {
        return await SongModel.findByIdAndUpdate(songId, updateData, { new: true }).exec();
    }
}