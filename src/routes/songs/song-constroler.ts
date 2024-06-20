import { Request, Response, RequestHandler } from "express";
import { CreateSongDto } from "./dtos/CreateSong.dto";
import { SongService } from "./song-service";
import { v4 as uuidv4 } from 'uuid';
import { deleteObject, putObject, uploadFile } from "../../middlewares/s-3.middlerware";


export class SongController {
    private songService: SongService;

    constructor(songService: SongService){
        this.songService = songService;
    }

    uploadSong: RequestHandler = async (req:any, res:Response) => {
        try{
            if (!req.files.song.name && !req.files.poster.name) {
                return res.status(400).json({ message: "File is required" });
            }
            
            const fileKeySong = `${uuidv4()}-${req.body.name}`;
            const fileKeyPoster = `${uuidv4()}-${req.body.singer + req.body.name}`;

            const uploadSongParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: fileKeySong,
                file: req.files.song,
                content: 'audio/mpeg'
            };

            const uploadPosterParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: fileKeyPoster,
                file: req.files.poster,
                content: 'image/jpeg'
            };
            
            const songLocation = await uploadFile(uploadSongParams);
            const posterLocation = await uploadFile(uploadPosterParams);

            const createSongDto = {
                name: req.body.name,
                singer: req.body.singer,
                released_date: req.body.released_date,
                duration: req.body.duration,
                song_location: songLocation.Location,
                key_song: fileKeySong,
                poster_location: posterLocation.Location,
                key_poster: fileKeyPoster
            };
    
            const newSong = await this.songService.uploadSong(createSongDto);
    
            res.status(201).json(newSong);
        }
        catch (err) {
            console.log(err);   
          }
    }

    getAllSongs: RequestHandler = async (req:Request, res:Response) => {
        const songs = await this.songService.getAllSongs();
        res.status(200).json(songs);
    }

    deleteSong: RequestHandler = async (req:Request, res:Response) => {
        const { songId } = req.params;
        try{
            const song = await this.songService.getSong(songId);

            if (!song) {
                return res.status(404).json({ message: 'Song not found' });
            }

            const deleteSongParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: song.key_song
            }

            const deletePosterParams = {
                bucketName: process.env.AWS_BUCKET_NAME!,
                key: song.key_poster
            }

            await deleteObject(deleteSongParams);
            await deleteObject(deletePosterParams);

            await this.songService.deleteSong(songId);

            return res.status(200).json({ message: 'Song deleted successfully' });
        } catch (error) {
            console.error(`Failed to delete song with ID ${songId}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }

    editSong: RequestHandler = async (req:any, res:Response) => {
        const { songId } = req.params;
        const updateData = req.body;
        try{
            const existingSong = await this.songService.getSong(songId);

            if (!existingSong) {
                return res.status(404).json({ message: 'Song not found' });
            }

            let newSongLocation = existingSong.song_location;
            let newPosterLocation  = existingSong.poster_location;

            if(req.files && req.files.song){
                const newSongParams = {
                    bucketName: process.env.AWS_BUCKET_NAME!,
                    key: existingSong.key_song,
                    newFile: req.files.song,
                };
                newSongLocation = await putObject(newSongParams);
            }

            if(req.files && req.files.poster){
                const newSongParams = {
                    bucketName: process.env.AWS_BUCKET_NAME!,
                    key: existingSong.key_poster,
                    newFile: req.files.poster,
                };
                newPosterLocation = await putObject(newSongParams);
            }

            updateData.song_location = newSongLocation;
            updateData.poster_location = newPosterLocation;

            const updatedSong = await this.songService.updateSong(songId, updateData);

            return res.status(200).json({ message: 'Song updated successfully', song: updatedSong });
        } catch (error) {
            console.error(`Failed to delete song with ID ${songId}:`, error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    }
}