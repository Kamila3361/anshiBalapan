import { ISong } from "./models/Songs";
import SongModel from "./models/Songs";
import { CreateSongDto } from "./dtos/CreateSong.dto";

export class SongService {  

    async uploadSong(createSongDto: CreateSongDto){
        const {name, singer, released_date, duration, song_location, key_song, poster_location, key_poster} = createSongDto;

        const newSong = new SongModel({
            name: name,
            singer: singer,
            released_date: released_date,
            duration: duration,
            song_location: song_location,
            key_song: key_song,
            poster_location: poster_location,
            key_poster: key_poster
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

    async updateSong(songId: string, updateData: Partial<ISong>): Promise<ISong | null> {
        return await SongModel.findByIdAndUpdate(songId, updateData, { new: true }).exec();
    }
}