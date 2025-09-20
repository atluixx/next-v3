import type { Message } from "@open-wa/wa-automate";
import type { Command, ExpandedClient } from "@/next";

interface BaseStats {
	games: number;
	wins: number;
	draws: number;
	losses: number;
	best: number;
	streak: number;
	winrate: number;
}

function toBaseStats(value: unknown): BaseStats | null {
	if (
		value &&
		typeof value === "object" &&
		"games" in value &&
		"wins" in value &&
		"draws" in value &&
		"losses" in value &&
		"best" in value &&
		"streak" in value &&
		"winrate" in value
	) {
		return value as BaseStats;
	}
	return null;
}

export default {
	name: "stats",
	aliases: ["estatisticas", "perfil"],
	async execute(m: Message, c: ExpandedClient, args: string[]) {
		const targetId = args[0]
			? await c.FGU({ message: m, chat: m.chat.id, input: args[0] })
			: m.sender.id;

		if (!targetId) {
			await c.sendReplyWithMentions(
				m.chat.id,
				`❌ Usuário ${args[0]} não encontrado.`,
				m.id,
			);
			return;
		}

		const user = await c.db.user.findUnique({
			where: { id: targetId },
			include: { stats: true },
		});

		if (!user || !user.stats) {
			await c.sendReplyWithMentions(
				m.chat.id,
				"⚠️ Não encontrei estatísticas para este usuário.",
				m.id,
			);
			return;
		}

		const formatGameStats = (game: BaseStats | null) => {
			if (!game) return "Nenhuma partida registrada ainda.";
			return [
				`🎮 Jogos: ${game.games}`,
				`🏆 Vitórias: ${game.wins}`,
				`🤝 Empates: ${game.draws}`,
				`❌ Derrotas: ${game.losses}`,
				`🔥 Melhor sequência: ${game.best}`,
				`📈 Sequência atual: ${game.streak}`,
				`🎯 Taxa de vitória: ${game.winrate.toFixed(2)}%`,
			].join("\n");
		};

		const reply = `
👤 Perfil de ${user.name ?? "Jogador"}
⭐ Premium: ${user.premium ? "Sim" : "Não"}
🔑 Função: ${user.role ?? "USER"}
📅 Criado em: ${user.created.toLocaleDateString("pt-BR")}

📊 Estatísticas gerais:

--- 🟦 Jogo da Velha ---
${formatGameStats(toBaseStats(user.stats.ttt))}

--- 🟨 Forca ---
${formatGameStats(toBaseStats(user.stats.hangman))}
    `.trim();

		await c.sendReplyWithMentions(m.chat.id, reply, m.id);
	},
} as Command;
