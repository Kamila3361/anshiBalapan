import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth-middleware';
import { SongController } from './song-constroler';
import { SongService } from './song-service';

const songRouter = Router();

const songService = new SongService();
const songController = new SongController(songService);

songRouter.post("/upload", authMiddleware, songController.uploadSong);
songRouter.get("/allsongs", authMiddleware, songController.getAllSongs);
songRouter.post("/delete/:songId", authMiddleware, songController.deleteSong);
songRouter.post("/update/:songId", authMiddleware, songController.editSong);

export default songRouter;