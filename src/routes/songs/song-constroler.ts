import { Request, Response, RequestHandler } from "express";
import { SongService } from "./song-service";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from "../../middlewares/s-3.middlerware";
import { generateSongLyric, uploadSongToPinecone } from "./gpt-service";
import { generateSong } from "./suno-service";
import { customVoice, backgroundUploadMusic, retrieveVocals } from "./aicovergen";
import axios from 'axios';
import axiosRetry from 'axios-retry';
import { getPhonemes } from "./rhubarbLipSync";

const voices = {
    "Dua Lipa": "https://huggingface.co/AI-Wheelz/DUA-LIVE-RVCv2/resolve/main/DUA-LIVE-RVCv2.zip",
    "Lana Del Rey": "https://huggingface.co/AIVER-SE/LanaDelRey/resolve/main/LanaDelRey.zip",
    "Taylor Swift": "https://huggingface.co/itt0lp/taylordebut/resolve/main/taylor.zip"
}

axiosRetry(axios, {
    retries: 3,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: (error) => {
      // Always return true to retry on any error
      return true;
    }
});

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

            //upload song to s3
            const fileKeySong = `${uuidv4()}-suno-api-${songLyric.song_name}.mp3`;
            const song = await axios.get(customedSong, { responseType: 'arraybuffer' });
            console.log("Song downloaded successfully!");
            const uploadFileParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: fileKeySong,   
                content: 'audio/mpeg',
                fileContent: song.data
            };
            const songLocation = await uploadFile(uploadFileParams);
            console.log("Song uploaded to s3 successfully!");   

            //determining the timestamps of the lyrics in the song
            const vocalsUrl = await retrieveVocals(songLocation);
            if(!vocalsUrl){
                return res.status(500).json({ message: 'Failed to seperate lyrics' });
            }
            const phonemes = await getPhonemes({message: songLyric.song_name, audioUrl: vocalsUrl})

            //Uploading the customed song and poster to S3
            backgroundUploadMusic(songLyric, response, songLocation, fileKeySong, this.songService, phonemes.metadata, phonemes.mouthCues);
            res.status(201).json({musicUrl: songLocation, title: response.title, lyric: response.lyric, mouthCues: phonemes.mouthCues});
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
}