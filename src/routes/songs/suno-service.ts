import axios from 'axios';

// const sunoapis = {
//   "api1": "https://api1.sunoapi.software",
//   "api2": "https://api2.sunoapi.software",
//   "api3": "https://api3.sunoapi.software",
//   "api4": "https://api4.sunoapi.software",
//   "api5": "https://api5.sunoapi.software",
// }

const sunoapis = ["https://api1.sunoapi.software", "https://api2.sunoapi.software", "https://api3.sunoapi.software", "https://api4.sunoapi.software", "https://api5.sunoapi.software"];

export async function generateSong(lyric: string, song_name: string, tags: string){
  const api = await chooseApi();
    try{
        const response = await axios.post(
            sunoapis[api] + '/api/custom_generate',
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
        return resObj[0];
    } catch (error: any) {
        if (axios.isAxiosError(error)) {
          throw new Error(`API request failed: ${error.message}`);
        } else {
          throw new Error(`Unexpected error: ${error.message}`);
        }
    }
}

async function chooseApi() {
  let credits = 0;
  let api = 0;
  do{
    const res = await axios.get(sunoapis[api] + '/api/get_limit');
    credits = Number(res.data.credits_left);
    console.log("API credits left: " + credits + " for " + sunoapis[api]);
    api = api + 1;
  } while (api < 5 && credits <= 0);
  console.log("API chosen: " + sunoapis[api]);
  if(api === 5 && credits === 0){
    throw new Error("No API credits left");
  }
  return api;
}