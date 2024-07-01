import { Request, Response, RequestHandler } from "express";
import { SongService } from "./song-service";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from "../../middlewares/s-3.middlerware";
import { generateSongLyric, uploadSongToPinecone } from "./gpt-service";
import { generateSong } from "./suno-service";
import { customVoice } from "./aicovergen";
import axios from 'axios';

export class SongController {
    private songService: SongService;

    constructor(songService: SongService){
        this.songService = songService;
    }

    generateMusic: RequestHandler = async (req:Request, res:Response) => {
        const { prompt } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt and voice is required' });
        }
        try{
            //Generating song lyric with GPT-4
            const songLyric = await generateSongLyric(prompt);
            if (!songLyric) {
                return res.status(500).json({ message: 'Failed to generate song' });
            }
            if(songLyric.song_lyric == ""){
                return res.status(400).json({ message: 'Unrelevant prompt' });
            }

            console.log(songLyric);

            //Generating song with Suno API
            const response = await generateSong(songLyric.song_lyric, songLyric.song_name, songLyric.tags);
            if (!response) {
                return res.status(500).json({ message: 'Failed to generate song' });
            }

            console.log(`Song generated successfully! url: ${response.audio_url}`);

            //Customing voice of the music
            const voiceUrl = "https://huggingface.co/AIVER-SE/LanaDelRey/resolve/main/LanaDelRey.zip";
            console.log("Downloading voice model...");
            const customedSong = await customVoice(voiceUrl, response.audio_url, "male-to-female");
            if (!customedSong) {
                return res.status(500).json({ message: 'Failed to generate song' });
            }

            console.log(`Song voice customed successfully url: ${customedSong}`);

            //Uploading the customed song and poster to S3
            const fileKeyPoster = `${uuidv4()}-poster-${songLyric.song_name}.jpeg`;
            const poster = await axios.get(response.image_url, { responseType: 'arraybuffer'});
            console.log("Poster downloaded successfully!");

            const fileKeySong = `${uuidv4()}-suno-api-${songLyric.song_name}.mp3`;
            const song = await axios.get(customedSong, { responseType: 'arraybuffer' });
            console.log("Song downloaded successfully!");

            const uploadPosterParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: fileKeyPoster,   
                content: 'image/jpeg',
                fileContent: poster.data
            };

            const uploadFileParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: fileKeySong,   
                content: 'audio/mpeg',
                fileContent: song.data
            };

            const songLocation = await uploadFile(uploadFileParams);
            const posterLocation = await uploadFile(uploadPosterParams);

            console.log("Song uploaded to s3 successfully!");

            //Saving song in the database
            const createSongDto = {
                title: response.title,
                // voice: voice,
                lyric: response.lyric,
                song_location: songLocation, 
                key_song: fileKeySong,
                poster_location: posterLocation,
                key_poster: fileKeyPoster,
                tags: response.tags,
                created_at: response.created_at
            }

            const newSong = await this.songService.uploadSong(createSongDto);
    
            res.status(201).json(newSong);
        } catch (error) {
            console.error('Failed to generate song:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    uploadSongToPinecone: RequestHandler = async (req:Request, res:Response) => {
        const {song_name, song_lyric} = req.body;
        const tags = "";
        try{
            const name = await uploadSongToPinecone({song_name, song_lyric, tags});

            return res.status(200).json({song_name: name, message: 'Song uploaded to Pinecone successfully' });
        } catch (error) {
            console.error(`Failed to upload song to Pinecone:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    getAllSongs: RequestHandler = async (req:Request, res:Response) => {
        const songs = await this.songService.getAllSongs();
        res.status(200).json(songs);
    }

    // deleteSong: RequestHandler = async (req:Request, res:Response) => {
    //     const { songId } = req.params;
    //     try{
    //         const song = await this.songService.getSong(songId);

    //         if (!song) {
    //             return res.status(404).json({ message: 'Song not found' });
    //         }

    //         const deleteSongParams = {
    //             bucketName: process.env.AWS_BUCKET_NAME!,
    //             key: song.key_song
    //         }

    //         const deletePosterParams = {
    //             bucketName: process.env.AWS_BUCKET_NAME!,
    //             key: song.key_poster
    //         }

    //         await deleteObject(deleteSongParams);
    //         await deleteObject(deletePosterParams);

    //         await this.songService.deleteSong(songId);

    //         return res.status(200).json({ message: 'Song deleted successfully' });
    //     } catch (error) {
    //         console.error(`Failed to delete song with ID ${songId}:`, error);
    //         return res.status(500).json({ message: 'Internal server error' });
    //     }
    // }

    // editSong: RequestHandler = async (req:any, res:Response) => {
    //     const { songId } = req.params;
    //     const updateData = req.body;
    //     try{
    //         const existingSong = await this.songService.getSong(songId);

    //         if (!existingSong) {
    //             return res.status(404).json({ message: 'Song not found' });
    //         }

    //         let newSongLocation = existingSong.song_location;
    //         let newPosterLocation  = existingSong.poster_location;

    //         if(req.files && req.files.song){
    //             const newSongParams = {
    //                 bucketName: process.env.AWS_BUCKET_NAME!,
    //                 key: existingSong.key_song,
    //                 newFile: req.files.song,
    //             };
    //             newSongLocation = await putObject(newSongParams);
    //         }

    //         if(req.files && req.files.poster){
    //             const newSongParams = {
    //                 bucketName: process.env.AWS_BUCKET_NAME!,
    //                 key: existingSong.key_poster,
    //                 newFile: req.files.poster,
    //             };
    //             newPosterLocation = await putObject(newSongParams);
    //         }

    //         updateData.song_location = newSongLocation;
    //         updateData.poster_location = newPosterLocation;

    //         const updatedSong = await this.songService.updateSong(songId, updateData);

    //         return res.status(200).json({ message: 'Song updated successfully', song: updatedSong });
    //     } catch (error) {
    //         console.error(`Failed to delete song with ID ${songId}:`, error);
    //         return res.status(500).json({ message: 'Internal server error' });
    //     }
    // }
}