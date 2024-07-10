import { Request, Response, RequestHandler } from "express";
import { SongService } from "./song-service";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from "../../middlewares/s-3.middlerware";
import { generateSongLyric, uploadSongToPinecone } from "./gpt-service";
import { generateSong } from "./suno-service";
import { customVoice } from "./aicovergen";
import axios from 'axios';
import { backgroundUploadMusic } from "./aicovergen";

const voices = {
    "Dua Lipa": "https://huggingface.co/AI-Wheelz/DUA-LIVE-RVCv2/resolve/main/DUA-LIVE-RVCv2.zip",
    "Lana Del Rey": "https://huggingface.co/AIVER-SE/LanaDelRey/resolve/main/LanaDelRey.zip",
    "Taylor Swift": "https://huggingface.co/itt0lp/taylordebut/resolve/main/taylor.zip"
}

export class SongController {
    private songService: SongService;

    constructor(songService: SongService){
        this.songService = songService;
    }

    generateMusic: RequestHandler = async (req:Request, res:Response) => {
        const { prompt, voice } = req.body;
        
        if (!prompt) {
            return res.status(400).json({ message: 'Prompt and voice is required' });
        }
        try{
            console.log("starts");
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
            const response = await generateSong(songLyric.song_lyric.slice(0, 3000), songLyric.song_name.slice(0, 80), songLyric.tags.slice(0, 120));
            if (!response) {
                return res.status(500).json({ message: 'Failed to generate song' });
            }

            console.log(`Song generated successfully! url: ${response.audio_url}`);

            let customedSong = response.audio_url;
            //if voice is not selected, return the song without customing the voice
            if(voice){
                //Customing voice of the music
                const voiceUrl = voices[voice];
                console.log("Downloading voice model...");
                customedSong = await customVoice(voiceUrl, response.audio_url);
                if (!customedSong) {
                    return res.status(500).json({ message: 'Failed to generate song' });
                }
                console.log(`Song voice customed successfully url: ${customedSong}`);
            }

            //Uploading the customed song and poster to S3
            backgroundUploadMusic(songLyric, response, customedSong, this.songService);
            res.status(201).json({musicUrl: customedSong, title: response.title, lyric: response.lyric});
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