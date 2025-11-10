const pendingProposals = [];
export default {
    name: "marry",
    aliases: ["casar", "proposta"],
    async execute(m, c, args) {
        const chatId = m.chat?.id ?? "global";
        const senderId = m.sender.id;
        if (!args[0]) {
            await c.sendReplyWithMentions(chatId, `❌ Você precisa informar um argumento ou usuário.`, m.id);
            return;
        }
        const command = args[0].toLowerCase();
        // Handle accept/refuse
        if (command === "aceitar" || command === "recusar") {
            // Find a pending proposal where the current user is the target
            const proposalIndex = pendingProposals.findIndex((p) => p.targetId === senderId);
            if (proposalIndex === -1) {
                await c.sendReplyWithMentions(chatId, `❌ Você não tem nenhuma proposta pendente.`, m.id);
                return;
            }
            const proposal = pendingProposals[proposalIndex];
            const [senderUser, targetUser] = await Promise.all([
                c.db.user.findUnique({ where: { id: proposal.senderId } }),
                c.db.user.findUnique({ where: { id: proposal.targetId } }),
            ]);
            if (!senderUser || !targetUser) {
                await c.sendReplyWithMentions(chatId, `❌ Usuário(s) não encontrado(s) no banco de dados.`, m.id);
                pendingProposals.splice(proposalIndex, 1);
                return;
            }
            if (command === "aceitar") {
                // Create marriage
                await c.db.marriage.create({
                    data: {
                        partner1ID: senderUser.id,
                        partner2ID: targetUser.id,
                        status: "MARRIED",
                        since: new Date(),
                    },
                });
                await c.sendReplyWithMentions(chatId, `💍 ${targetUser.name ?? "Alguém"} aceitou a proposta de casamento de ${senderUser.name ?? "Alguém"}!`, m.id);
            }
            else {
                await c.sendReplyWithMentions(chatId, `❌ ${targetUser.name ?? "Alguém"} recusou a proposta de casamento de ${senderUser.name ?? "Alguém"}.`, m.id);
            }
            // Remove proposal
            pendingProposals.splice(proposalIndex, 1);
            return;
        }
        // Otherwise, it's a new proposal
        const mentionedId = await c.FGU({
            input: args[0],
            message: m,
            chat: chatId,
        });
        if (!mentionedId) {
            await c.sendReplyWithMentions(chatId, `❌ Usuário não encontrado.`, m.id);
            return;
        }
        if (mentionedId === senderId) {
            await c.sendReplyWithMentions(chatId, `❌ Você não pode se casar consigo mesmo(a).`, m.id);
            return;
        }
        // Check existing marriages
        const [senderUser, targetUser] = await Promise.all([
            c.db.user.findUnique({ where: { id: senderId } }),
            c.db.user.findUnique({ where: { id: mentionedId } }),
        ]);
        if (!senderUser || !targetUser) {
            await c.sendReplyWithMentions(chatId, `❌ Usuário(s) não encontrado(s) no banco de dados.`, m.id);
            return;
        }
        const existingMarriage = await c.db.marriage.findFirst({
            where: {
                OR: [
                    { partner1ID: senderUser.id, status: "MARRIED" },
                    { partner2ID: senderUser.id, status: "MARRIED" },
                    { partner1ID: targetUser.id, status: "MARRIED" },
                    { partner2ID: targetUser.id, status: "MARRIED" },
                ],
            },
        });
        if (existingMarriage) {
            await c.sendReplyWithMentions(chatId, `❌ Um dos usuários já está casado.`, m.id);
            return;
        }
        // Add proposal
        pendingProposals.push({ senderId: senderUser.id, targetId: targetUser.id });
        await c.sendReplyWithMentions(chatId, `💌 Proposta enviada para ${targetUser.name ?? "Alguém"}! Ele deve responder com "${c.prefix}proposta aceitar" ou "${c.prefix}proposta recusar".`, m.id);
    },
};
