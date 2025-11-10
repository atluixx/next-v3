import { InferenceClient } from "@huggingface/inference";
import axios from "axios";
import "dotenv/config";
const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
export async function getAPODData() {
    const url = `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_KEY}`;
    try {
        const res = await axios.get(url);
        const data = res.data;
        const response = await client.chatCompletion({
            provider: "nscale",
            model: "Qwen/Qwen3-4B-Instruct-2507",
            messages: [
                {
                    role: "user",
                    content: `Translate this text to portuguese: "${data.explanation}" Return only the text without quotes. Example: "Hello, World!" -> Olá, Mundo!`,
                },
            ],
        });
        const explanation = response.choices[0].message.content;
        let buffer = null;
        if (data.media_type === "image") {
            const imgRes = await axios.get(data.url, {
                responseType: "arraybuffer",
            });
            buffer = Buffer.from(imgRes.data);
        }
        const message = `✨ *${data.title}* (${data.date})

${explanation}

🔭 ${data.url}
`;
        return {
            buffer,
            message,
            ...data,
        };
    }
    catch (error) {
        throw new Error(`Erro ao buscar APOD: ${error}`);
    }
}
