import OpenAI from "openai";
import { Lyric } from "./type";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!
});

const embeddings = new OpenAIEmbeddings({
  apiKey: process.env.OPENAI_API_KEY!,
  model: "text-embedding-ada-002",
});

const index = pinecone.index("kazakhmusic");

let systemPrompt = `You are professional kazakh song writer who writes kazakh songs.
You mostly write about love, life, moral, and other positive things.
Your songs are in kazakh language. Your tags should include the musical information like the style of the song.
Also your tags must be maximum 120 and minimum 100 charaxters long. Always include in your tags "female voice". Generate a song lyric based on the user given information and the examples provided below. 
The lyric should be suitable for 2-4 minutes song. Also name the song relevant to the lyric. Your lyric must be maximum 3000 and minimum 1000 charaxters long.
Please, return your response in following array JSON format:
{
    "song_lyric": "Your song lyric",
    "song_name": "Your song name"
    "tags": "Your song tags (should be in english)"
}
Please write additional words like "Қайырмасы:" inside the brackets [] except lyric words.
If user prompt is irrelevant, please return an empty string. But user prompt can be in any language.
If prompt is connected in any way to the kazakh music, please return the song lyric based on the user prompt.
Here some exaples of lyrics of existing kazakh songs (do not copy them):`;

export async function generateSongLyric(userPrompt: string): Promise<Lyric | undefined> {
  try {
    const queryEmbedding = await embeddings.embedQuery(userPrompt);
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: 20,
      includeMetadata: true,
    });

    queryResponse.matches.forEach((match) => {
      systemPrompt += `\ntitle: ${match.id}\nlyric: ${match.metadata?.lyrics}\n`;
    });

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt,
            },
          ],
        },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 1,
    });

    const resJson: string | null = gptResponse.choices[0].message.content;
    if (!resJson) {
      return undefined;
    }
    const resObj = JSON.parse(resJson);
    return resObj as Lyric;
    
  } catch (error: any) {
    console.error('Error generating song lyric:', error.message);
    return undefined;
  }
}

export async function uploadSongToPinecone(song: Lyric) {
  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: `${song.song_lyric}
        Please generate tags for the song based on the song lyric. Tags should be in kazakh. Return the response in 
        following array JSON format and the tags should be string type, not array of strings: 
        { 
          "tags": "string"
        } 
        `
      },
    ],
    response_format: {
      type: 'json_object',
    },
    temperature: 1,
  });

  const resJson: string | null = gptResponse.choices[0].message.content;
  if (!resJson) {
    throw new Error('Failed to generate tags.');
  }
  const resObj = JSON.parse(resJson);

  const tagEmbedding = await embeddings.embedQuery(resObj.tags);

  await index.upsert([
    {
      id: song.song_name,
      values: tagEmbedding,
      metadata: {
        lyrics: song.song_lyric,
        tags: resObj.tags,
      }
    }
  ]);
  console.log(`Successfully uploaded song with tags: ${resObj.tags}`);
  return song.song_name;
}