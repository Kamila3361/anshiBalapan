import axios from "axios";
import fs from "fs";
import Replicate from "replicate";
import { Lyric } from "./type";
import { v4 as uuidv4 } from 'uuid';
import { uploadFile } from "../../middlewares/s-3.middlerware";
import { SongService } from "./song-service";
import wav from "wav-decoder";
import { Metadata, MouthCue } from "./rhubarbLipSync";
import { getPhonemes } from "./rhubarbLipSync";


const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

interface Output{
  bass: string;
  drums: string;
  other: string;
  piano: string;
  guitar: string;
  vocals: string;
}

export function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


export async function customVoice(voiceUrl: string, musicUrl: string){ 
  const maxRetries = 5;
  const delayMs = 2000;
  let attempts = 0;

  while (attempts < maxRetries) {
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
    } catch (error) {
      console.error('Error during voice cloning:', error);
      attempts++;
      if (attempts < maxRetries) {
        console.log(`Retrying voice cloning in ${delayMs / 1000} seconds...`);
        await delay(delayMs);
      } else {
        console.error('Max retries reached. Failing...');
        console.error('Error during vioce cloning:', error);
      }
    }
  }
}

export async function retrieveVocals(audioUrl: string) {
  const maxRetries = 5;
  const delayMs = 2000;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      console.log('Starting processing vocal separation, attempt:', attempts + 1);
      const output = await replicate.run(
        "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953",
        {
          input: {
            stem: "vocals",
            audio: audioUrl,
            shifts: 1,
            float32: true,
            overlap: 0.25,
            clip_mode: "rescale",
            model_name: "htdemucs",
            mp3_bitrate: 320,
            output_format: "wav"
          }
        }
      ) as Output;

      console.log('Found vocals URL:', output.vocals);
      return output.vocals as string;
    } catch (error) {
      console.error('Error during processing:', error);
      attempts++;
      if (attempts < maxRetries) {
        console.log(`Retrying vocal separation in ${delayMs / 1000} seconds...`);
        await delay(delayMs);
      } else {
        console.error('Max retries reached. Failing...');
        console.error('Error during processing:', error);
      }
    }
  }
}
// export async function findTimeStamp(vocalUrl: string): Promise<timestamp[] | undefined> {
//   // Define the maximum allowed gap in seconds
//   const maxGapSeconds = 3; // Adjust this value as needed
//   const maxRetries = 3;
//   const delayMs = 2000;
//   let attempts = 0;

//   while (attempts < maxRetries) {
//     try {
//       console.log('Starting processing timestamp, attempt:', attempts + 1);
//       // Download the WAV file
//       const response = await axios.get(vocalUrl, { responseType: 'arraybuffer' });
//       const buffer = response.data;
//       console.log('Downloaded vocal audio successfully! (timestamp)');

//       const audioData = await wav.decode(buffer);
//       const sampleRate = audioData.sampleRate;
//       const channelData = audioData.channelData[0]; // Use the first channel for mono

//       // Identify segments where amplitude is more than threshold
//       const threshold = 0.1;
//       const aboveThresholdIndices = channelData
//         .map((value: number, index: number) => (value > threshold ? index : -1))
//         .filter((index: number) => index !== -1);

//       // Convert the maximum gap in seconds to samples
//       const maxGapSamples = maxGapSeconds * sampleRate;

//       // Find segments of contiguous indices
//       const segments: number[][] = [];
//       if (aboveThresholdIndices.length > 0) {
//         let tempSegment = [aboveThresholdIndices[0]];
//         for (let i = 1; i < aboveThresholdIndices.length; i++) {
//           if (aboveThresholdIndices[i] <= aboveThresholdIndices[i - 1] + maxGapSamples) {
//             tempSegment.push(aboveThresholdIndices[i]);
//           } else {
//             segments.push(tempSegment);
//             tempSegment = [aboveThresholdIndices[i]];
//           }
//         }
//         segments.push(tempSegment);
//       }

//       // Convert segments to time in seconds
//       const segmentsInSeconds = segments.map(segment => ({
//         start: segment[0] / sampleRate,
//         end: segment[segment.length - 1] / sampleRate
//       }));

//       console.log('Found segments:', segmentsInSeconds);

//       return segmentsInSeconds as timestamp[];
//     } catch (error) {
//       console.error('Error during processing:', error);
//       attempts++;
//       if (attempts < maxRetries) {
//         console.log(`Retrying vocal separation in ${delayMs / 1000} seconds...`);
//         await delay(delayMs);
//       } else {
//         console.error('Max retries reached. Failing...');
//         console.error('Error during processing:', error);
//       }
//     }
//   }
// }

export async function backgroundUploadMusic(songLyric: Lyric, response: any, songService: SongService, customedSong: string) {
  try {
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
        throw new Error('Failed to seperate lyrics');
    }
    const phonemes = await getPhonemes({message: songLyric.song_name, audioUrl: vocalsUrl})

    const fileKeyPoster = `${uuidv4()}-poster-${songLyric.song_name}.jpeg`;
    const poster = await axios.get(response.image_url, { responseType: 'arraybuffer'});
    console.log("Poster downloaded successfully!");

    const uploadPosterParams = {
      bucketName: process.env.AWS_BUCKET_NAME!,
      key: fileKeyPoster,   
      content: 'image/jpeg',
      fileContent: poster.data
    };

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
      created_at: response.created_at,
      metadata: phonemes.metadata,
      mouth_cue: phonemes.mouthCues
    }

    const newSong = await songService.uploadSong(createSongDto);
    console.log("Song uploaded to database successfully!");
    return newSong;
  } catch (error) {
    console.error('Error during background function:', error);
  }
}

