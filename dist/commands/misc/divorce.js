const pendingDivorces = [];

export default {
  name: "divorce",
  aliases: ["divorcio", "divorçar", "divorciar"],
  async execute(m, c) {
    const chatId = m.chat?.id ?? "global";
    const senderId = m.sender.id;
    const arg = m.body?.split(" ")[1]?.toLowerCase();
    // Find marriage where user is partner1 or partner2
    const marriage = await c.db.marriage.findFirst({
      where: {
        OR: [{ partner1ID: senderId }, { partner2ID: senderId }],
        status: "MARRIED",
      },
      include: {
        partner1: true,
        partner2: true,
      },
    });
    if (!marriage) {
      await c.sendReplyWithMentions(chatId, `❌ Você não está casado(a) atualmente.`, m.id);
      return;
    }
    const partner = marriage.partner1.id === senderId ? marriage.partner2 : marriage.partner1;
    // Handle confirmation
    if (arg === "confirmar") {
      const pendingIndex = pendingDivorces.findIndex(
        (p) => p.marriageId === marriage.marriage_id && p.requesterId === senderId,
      );
      if (pendingIndex === -1) {
        await c.sendReplyWithMentions(
          chatId,
          `❌ Você não possui um pedido de divórcio pendente para confirmar.`,
          m.id,
        );
        return;
      }
      // Finalize divorce
      await c.db.marriage.update({
        where: { marriage_id: marriage.marriage_id },
        data: {
          status: "DIVORCED",
          divorceRequested: false,
          divorceRequesterID: null,
        },
      });
      pendingDivorces.splice(pendingIndex, 1);
      await c.sendReplyWithMentions(
        chatId,
        `💔 Divórcio confirmado entre ${marriage.partner1.name ?? marriage.partner1.id} e ${marriage.partner2.name ?? marriage.partner2.id}.`,
        m.id,
      );
      return;
    }
    // Otherwise, initiate divorce request
    if (marriage.divorceRequested) {
      await c.sendReplyWithMentions(
        chatId,
        `⚠️ Um pedido de divórcio já está pendente. Aguarde a confirmação do outro parceiro(a).`,
        m.id,
      );
      return;
    }
    // Add to pending divorces
    pendingDivorces.push({
      marriageId: marriage.marriage_id,
      requesterId: senderId,
    });
    await c.sendReplyWithMentions(
      chatId,
      `⚠️ Tem certeza que deseja divorciar-se de ${partner.name ?? partner.id}? Use ".divorciar confirmar" para finalizar.`,
      m.id,
    );
  },
};
