function toBaseStats(value) {
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
    return value;
  }
  return null;
}

export default {
  name: "stats",
  aliases: ["estatisticas", "perfil"],
  async execute(m, c, args) {
    const targetId = args[0] ? await c.FGU({ message: m, chat: m.chat.id, input: args[0] }) : m.sender.id;
    if (!targetId) {
      await c.sendReplyWithMentions(m.chat.id, `❌ Usuário ${args[0]} não encontrado.`, m.id);
      return;
    }
    const user = await c.db.user.findUnique({
      where: { id: targetId },
      include: { stats: true },
    });
    if (!user || !user.stats) {
      await c.sendReplyWithMentions(m.chat.id, "⚠️ Não encontrei estatísticas para este usuário.", m.id);
      return;
    }
    const formatGameStats = (game) => {
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
};
