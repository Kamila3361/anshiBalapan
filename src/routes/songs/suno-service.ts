import axios from 'axios';

export async function generateSong(lyric: string, song_name: string, tags: string){
    try{
        const response = await axios.post(
            "https://suno-api-anshi-balapan-57ob.vercel.app/api/custom_generate",
            {
              prompt: lyric,
              tags: tags,
              title: song_name,
              make_instrumental: false,
              wait_audio: true
            },
            {
              headers: { "Content-Type": "application/json" }
            }
          );
        const resObj = response.data;
        return resObj[1];
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
          throw new Error(`API request failed: ${error.message}`);
        } else {
          throw new Error(`Unexpected error: ${error.message}`);
        }
    }
}