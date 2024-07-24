import fs from 'fs';
import axios from 'axios';
import { execCommand } from "../../utils/files";
import { delay } from './aicovergen';

export interface MouthCue {
  start: number;
  end: number;
  value: string;
}

export interface Metadata {
    soundFile: string;
    duration: number;
}

interface PhonemeData {
  metadata: Metadata;
  mouthCues: MouthCue[];
}

const downloadFile = async (url: string, path: string): Promise<void> => {
  const maxRetries = 5;
  const delayMs = 3000;
  let attempts = 0;

  while (attempts < maxRetries) {
    console.log('Starting downloading the file (lypsync), attempt:', attempts + 1);
    try{
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      return new Promise((resolve, reject) => {
        const fileStream = fs.createWriteStream(path);
        response.data.pipe(fileStream);
        response.data.on('error', reject);
        fileStream.on('finish', resolve);
      });
    } catch (error) {
      console.error('Error during processing:', error);
      attempts++;
      if (attempts < maxRetries) {
        console.log(`Retrying downloading file (lypsync) in ${delayMs / 1000} seconds...`);
        await delay(delayMs);
      } else {
        console.error('Max retries reached. Failing...');
        console.error('Error during processing:', error);
      }
    } 
  }
};

const getPhonemes = async ({ message, audioUrl }: { message: string, audioUrl: string }): Promise<PhonemeData> => {
    const sanitizedMessage = message.replace(/\s+/g, '');
    try {
    const time = new Date().getTime();
    const localWavPath = `/home/kamila/anshiBalapan/back/src/audios/message_${sanitizedMessage}.wav`;
    const localJsonPath = `/home/kamila/anshiBalapan/back/src/audios/message_${sanitizedMessage}.json`;

    // Step 1: Download the file
    console.log(`Downloading audio file from ${audioUrl}`);
    await downloadFile(audioUrl, localWavPath);
    console.log(`Downloaded audio file to ${localWavPath}`);

    // Step 2: Generate phonemes JSON
    console.log(`Starting lip sync for message ${sanitizedMessage}`);
    await execCommand({
      command: `/home/kamila/Rhubarb-Lip-Sync-1.13.0-Linux/rhubarb -f json -o ${localJsonPath} ${localWavPath} -r phonetic`,
    });
    console.log(`Lip sync done in ${new Date().getTime() - time}ms`);

    // Step 5: Read JSON content
    const jsonData: PhonemeData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
    console.log(`Read JSON content: ${JSON.stringify(jsonData)}`);

    // Step 4: Delete the JSON file
    fs.unlinkSync(localJsonPath);
    console.log(`Deleted JSON file: ${localJsonPath}`);

    // Step 5: Delete the WAV file
    fs.unlinkSync(localWavPath);
    console.log(`Deleted WAV file: ${localWavPath}`);

    return jsonData; // Return JSON content as object

  } catch (error) {
    console.error(`Error while getting phonemes for message ${sanitizedMessage}:`, error);
    throw error; // Rethrow the error after logging it
  }
};

export { getPhonemes };
