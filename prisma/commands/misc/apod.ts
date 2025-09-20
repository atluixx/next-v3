import type { Message } from "@open-wa/wa-automate";
import type { Command, ExpandedClient } from "@/next.js";
import { getAPODData } from "../../functions/apod.ts";

export default {
	name: "apod",
	description: "Obtém a Imagem Astronômica do Dia da NASA.",
	execute: async (m: Message, c: ExpandedClient) => {
		try {
			const { buffer, message, media_type, url } = await getAPODData();

			if (media_type === "image" && buffer) {
				const base64Image = `data:image/png;base64,${buffer.toString("base64")}`;

				await c.sendImage(m.chatId, base64Image, "apod.png", message, m.id);
			} else {
				await c.reply(m.chatId, `${message}\n\n🎥 ${url}`, m.id);
			}
		} catch (error) {
			console.error("NASA command failed:", error);
			await c.reply(m.chatId, "❌ Erro ao buscar a imagem da NASA.", m.id);
		}
	},
} as Command;
