import axios from "axios";
import fs from "fs";
import Replicate from "replicate";
import { Lyric } from "./type";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from "../../middlewares/s-3.middlerware";
import { SongService } from "./song-service";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function customVoice(voiceUrl: string, musicUrl: string){ 
  try{
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      {
        input: {
          protect: 0,
          rvc_model: "CUSTOM",
          custom_rvc_model_download_url: voiceUrl,
          index_rate: 0,
          song_input: musicUrl,
          reverb_size: 0.15,
          pitch_change: "no-change",
          rms_mix_rate: 0.25,
          filter_radius: 3,
          output_format: "mp3",
          reverb_damping: 0.7,
          reverb_dryness: 0.8,
          reverb_wetness: 0.2,
          crepe_hop_length: 128,
          pitch_change_all: 0,
          main_vocals_volume_change: 0,
          pitch_detection_algorithm: "rmvpe",
          instrumental_volume_change: 0,
          backup_vocals_volume_change: 0
        }
      }
    );
    return output.toString();
  } catch(err: any){
    throw new Error("Failed to custom voice: " + err.message);
  }
}

export async function backgroundUploadMusic(songLyric: Lyric, response: any, musicUrl: string, songService: SongService) {
  const fileKeyPoster = `${uuidv4()}-poster-${songLyric.song_name}.jpeg`;
  const poster = await axios.get(response.image_url, { responseType: 'arraybuffer'});
  console.log("Poster downloaded successfully!");

  const fileKeySong = `${uuidv4()}-suno-api-${songLyric.song_name}.mp3`;
  const song = await axios.get(musicUrl, { responseType: 'arraybuffer' });
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

  const newSong = await songService.uploadSong(createSongDto);
  console.log("Song uploaded to database successfully!");
}

// export async function downloadFile(url: string, filePath: string) {
//   try {
//     const response = await axios({
//       url: url,
//       method: 'GET',
//       responseType: 'stream'
//     });

//     const writer = fs.createWriteStream(filePath);

//     response.data.pipe(writer);

//     await new Promise((resolve, reject) => {
//       writer.on('finish', resolve);
//       writer.on('error', reject);
//     });

//     console.log('Download Completed');
//   } catch (error) {
//     console.error('Download failed:', error);
//   }
// }

// export async function deleteFile(filePath) {
//   return new Promise((resolve, reject) => {
//     fs.unlink(filePath, (err) => {
//       if (err) {
//         return reject(new Error(`Failed to delete file: ${err.message}`));
//       }
//       console.log('File deleted successfully');
//       resolve('File deleted successfully');
//     });
//   });
// }
