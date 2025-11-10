import { Akinator, AkinatorAnswer } from "@aqul/akinator-api";

function capitalize(txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function normalizeInput(text) {
  if (!text) return undefined;
  const t = text.trim().toLowerCase();
  if (["sim", "yes", "s"].includes(t)) return AkinatorAnswer.Yes;
  if (["n", "não", "nao", "no"].includes(t)) return AkinatorAnswer.No;
  if (["não sei", "naosei", "idk", "don't know"].includes(t)) return AkinatorAnswer["Don't know"];
  if (["provavelmente", "probably"].includes(t)) return AkinatorAnswer.Probably;
  if (["provavelmente não", "provavelmente nao", "probably not"].includes(t)) return AkinatorAnswer["Probably not"];
  if (["voltar", "back"].includes(t)) return "back";
  if (["sair", "quit", "parar", "exit"].includes(t)) return "quit";
  return undefined;
}

const sessions = new Map();

export default {
  name: "akinator",
  description:
    "Jogue com o Akinator via WhatsApp. Use 'akinator' para iniciar e 'akinator sim|não|...' para responder.",
  async execute(m, c, args) {
    const prefix = c.prefix || "";
    const chatId = m.chat.id;
    const userArg = args?.[0]?.trim();
    const session = sessions.get(chatId);
    const wantsStart = !session || (userArg && ["reset", "start", "novo", "reiniciar"].includes(userArg.toLowerCase()));
    if (wantsStart) {
      const api = new Akinator({ region: "pt", childMode: false });
      await api.start();
      sessions.set(chatId, {
        api,
        history: [],
      });
      await c.reply(
        m.chat.id,
        `🧠 *Akinator iniciado!*\n\n` +
          `❓ *Pergunta:* ${api.question}\n` +
          `📊 *Progresso:* ${api.progress.toFixed(2)}%\n\n` +
          `👉 Responda com:\n` +
          `• \`${prefix}akinator sim\`\n` +
          `• \`${prefix}akinator não\`\n` +
          `• \`${prefix}akinator não sei\`\n` +
          `• \`${prefix}akinator provavelmente\`\n` +
          `• \`${prefix}akinator provavelmente não\`\n\n` +
          `🔙 \`${prefix}akinator voltar\` para desfazer\n❌ \`${prefix}akinator sair\` para encerrar`,
        m.id,
      );
      return;
    }
    if (!session) {
      await c.reply(m.chat.id, `⚠️ Nenhuma sessão ativa.\nEnvie \`${prefix}akinator\` para começar.`, m.id);
      return;
    }
    const { api, history } = session;
    if (api.isWin) {
      await c.reply(m.chat.id, `✅ O jogo já terminou!\nEnvie \`${prefix}akinator\` para começar de novo.`, m.id);
      return;
    }
    if (!userArg) {
      await c.reply(
        m.chat.id,
        `⚡ Você precisa responder!\n\n` +
          `❓ *Pergunta:* ${api.question}\n` +
          `📊 *Progresso:* ${api.progress.toFixed(2)}%`,
        m.id,
      );
      return;
    }
    const normalized = normalizeInput(userArg);
    if (normalized === undefined) {
      await c.reply(
        m.chat.id,
        `🚫 Resposta não reconhecida.\n\nUse:\n` +
          `• \`${prefix}akinator sim\`\n` +
          `• \`${prefix}akinator não\`\n` +
          `• \`${prefix}akinator não sei\`\n` +
          `• \`${prefix}akinator provavelmente\`\n` +
          `• \`${prefix}akinator provavelmente não\`\n\n` +
          `🔙 \`${prefix}akinator voltar\`\n❌ \`${prefix}akinator sair\``,
        m.id,
      );
      return;
    }
    if (normalized === "quit") {
      sessions.delete(chatId);
      await c.reply(m.chat.id, `❌ *Jogo encerrado.*\nEnvie \`${prefix}akinator\` para começar outro.`, m.id);
      return;
    }
    if (normalized === "back") {
      try {
        await api.cancelAnswer();
        history.pop();
        await c.reply(
          m.chat.id,
          `⏪ *Você voltou um passo!*\n\n` +
            `❓ *Pergunta:* ${api.question}\n` +
            `📊 *Progresso:* ${api.progress.toFixed(2)}%`,
          m.id,
        );
      } catch {
        await c.reply(m.chat.id, `⚠️ Não é possível voltar.\n(Já está na primeira pergunta)`, m.id);
      }
      return;
    }
    await api.answer(normalized);
    const enumKey = Object.keys(AkinatorAnswer).find((k) => AkinatorAnswer[k] === normalized);
    if (enumKey) history.push(enumKey);
    if (api.isWin) {
      const caption = `🎯 Eu acho que é: *${api.sugestion_name}*\n` + `📖 ${capitalize(api.sugestion_desc)}`;
      if (api.sugestion_photo) {
        try {
          await c.sendFileFromUrl(chatId, api.sugestion_photo, "guess.jpg", caption, m.id);
        } catch {
          await c.reply(m.chat.id, `${caption}\n🖼️ Foto: ${api.sugestion_photo}`, m.id);
        }
      } else {
        await c.reply(m.chat.id, `${caption}\n(sem imagem disponível)`, m.id);
      }
      return;
    }
    await c.reply(
      m.chat.id,
      `❓ *Pergunta:* ${api.question}\n` +
        `📊 *Progresso:* ${api.progress.toFixed(2)}%\n\n` +
        `👉 Responda com:\n` +
        `• \`${prefix}akinator sim\`\n` +
        `• \`${prefix}akinator não\`\n` +
        `• \`${prefix}akinator não sei\`\n` +
        `• \`${prefix}akinator provavelmente\`\n` +
        `• \`${prefix}akinator provavelmente não\`\n\n` +
        `🔙 \`${prefix}akinator voltar\`  |  ❌ \`${prefix}akinator sair\``,
      m.id,
    );
  },
};
