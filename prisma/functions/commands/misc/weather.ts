import type { Message } from "@open-wa/wa-automate";
import type { Command, ExpandedClient } from "@/next.js";
import { generateWeatherImage } from "../../functions/generate_weather_image.ts";

export default {
	name: "weather",
	aliases: ["clima"],
	description: "Obtém informações sobre o clima atual.",
	execute: async (m: Message, c: ExpandedClient, args: string[]) => {
		try {
			const city = args.join(" ");
			console.log(city);
			const image = await generateWeatherImage(city.toLowerCase());
			const base64Image = `data:image/png;base64,${image.toString("base64")}`;

			await c.sendImage(m.chatId, base64Image, "weather.png", "", m.id);
		} catch (error) {
			console.error("Weather command failed:", error);
		}
	},
} as Command;
