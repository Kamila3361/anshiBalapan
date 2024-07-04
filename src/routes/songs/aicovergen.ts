import axios from "axios";
import fs from "fs";
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function customVoice(voiceUrl: string, musicUrl: string){ 
  try{
    const output = await replicate.run(
      "zsxkib/realistic-voice-cloning:0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
      {
        input: {
          protect: 0.33,
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
