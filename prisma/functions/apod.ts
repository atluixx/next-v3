import { InferenceClient } from "@huggingface/inference";
import axios from "axios";
import "dotenv/config";

interface APODResponse {
	date: string;
	explanation: string;
	hdurl?: string;
	media_type: "image" | "video";
	service_version: string;
	title: string;
	url: string;
}

interface APODResult extends APODResponse {
	buffer: Buffer | null;
	message: string;
}

const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

export async function getAPODData(): Promise<APODResult> {
	const url = `https://api.nasa.gov/planetary/apod?api_key=${process.env.NASA_KEY}`;

	try {
		const res = await axios.get<APODResponse>(url);
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

		let buffer: Buffer | null = null;
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
	} catch (error: unknown) {
		throw new Error(`Erro ao buscar APOD: ${error}`);
	}
}
