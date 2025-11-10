export default {
    name: "rank",
    description: "Mostra o ranking de mensagens no grupo.",
    async execute(m, c) {
        if (!m.chat.isGroup) {
            await c.reply(m.chat.id, "⚠️ Este comando só funciona em grupos.", m.id);
            return;
        }
        try {
            const groupId = m.chat.id;
            const ranking = await c.db.groupUser.findMany({
                where: { group_id: groupId },
                include: { user: true },
                orderBy: { messages: "desc" },
                take: 10,
            });
            if (ranking.length === 0) {
                await c.reply(m.chat.id, "📭 Ninguém enviou mensagens ainda!", m.id);
                return;
            }
            const leaderboard = ranking
                .map((entry, idx) => `${idx + 1}. *${entry.user.name || entry.user_id}* — ${entry.messages} msgs`)
                .join("\n");
            await c.reply(m.chat.id, `🏆 *Ranking de mensagens*\n\n${leaderboard}`, m.id);
        }
        catch (err) {
            console.error("Error getting ranking:", err);
            await c.reply(m.chat.id, "❌ Erro ao buscar ranking.", m.id);
        }
    },
};
