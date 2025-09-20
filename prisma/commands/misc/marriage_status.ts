import type { Message } from "@open-wa/wa-automate";
import { DateTime } from "luxon";
import type { Command, ExpandedClient } from "@/next";

export default {
	name: "marriage",
	aliases: ["casamento"],
	async execute(m: Message, c: ExpandedClient) {
		const chatId = m.chat?.id ?? "global";
		const userId = m.sender.id;

		const marriage = await c.db.marriage.findFirst({
			where: {
				OR: [
					{ partner1ID: userId, status: "MARRIED" },
					{ partner2ID: userId, status: "MARRIED" },
				],
			},
			include: {
				partner1: true,
				partner2: true,
			},
		});

		if (!marriage || !marriage.since) {
			await c.sendReplyWithMentions(
				chatId,
				`❌ Você não está casado(a) no momento.`,
				m.id,
			);
			return;
		}

		const partner =
			marriage.partner1.id === userId ? marriage.partner2 : marriage.partner1;

		const marriedSince = DateTime.fromJSDate(marriage.since, {
			zone: "America/Sao_Paulo",
		}).toLocaleString(DateTime.DATETIME_MED);

		// Calculate duration
		const now = DateTime.now().setZone("America/Sao_Paulo");
		const since = DateTime.fromJSDate(marriage.since).setZone(
			"America/Sao_Paulo",
		);
		const duration = now.diff(since, ["years", "months", "days"]).toObject();
		const durationText = `${Math.floor(duration.years ?? 0)} anos, ${Math.floor(
			duration.months ?? 0,
		)} meses e ${Math.floor(duration.days ?? 0)} dias`;

		let divorceStatus = "";
		if (marriage.divorceRequested) {
			if (marriage.divorceRequesterID === userId) {
				divorceStatus =
					"⚠️ Você solicitou o divórcio. Aguarde a resposta do parceiro(a).";
			} else {
				divorceStatus = "⚠️ Seu parceiro(a) solicitou o divórcio.";
			}
		}

		const message = `💖 Casado(a) com: *${partner.name ?? partner.id}*\n📅 Desde: ${marriedSince} (${durationText})\n${divorceStatus}`;
		await c.sendReplyWithMentions(chatId, message, m.id);
	},
} as Command;
