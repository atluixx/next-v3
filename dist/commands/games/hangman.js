import fs from "node:fs";
import { InferenceClient } from "@huggingface/inference";
import { generateCanvas } from "../../functions/render_hangman.js";
const games = {};
const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);
async function fetchWordHintDescription() {
  try {
    const response = await client.chatCompletion({
      provider: "nscale",
      model: "Qwen/Qwen3-4B-Instruct-2507",
      messages: [
        {
          role: "user",
          content: `Gere uma palavra em português para o jogo da Forca. Para cada palavra, forneça os seguintes itens:
1. A palavra exata
2. Uma dica clara, objetiva e confiável que descreva a palavra de forma sucinta, sem entregar a resposta
3. Uma descrição detalhada, completa e rica em contexto, com no máximo 50 palavras

Separe os três itens usando essa barra (|) como delimitador. Retorne apenas texto, sem aspas, marcadores ou explicações adicionais.
Evite gerar essas palavras: ${fs
            .readFileSync("./persistence/hangman.txt", "utf-8")
            .split("\n")
            .filter(Boolean)
            .join(", ")}

Exemplo:
Abacaxi | Fruta tropical com casca espinhosa e polpa doce e suculenta | O abacaxi é uma fruta típica de regiões tropicais, conhecida por sua polpa suculenta e sabor doce e levemente ácido. É amplamente utilizado em sucos, sobremesas, pratos salgados, conservas e até em coquetéis.`,
        },
      ],
    });
    const text = response?.choices[0].message.content || "";
    const parts = text.split("|").map((p) => p.trim());
    return {
      word: parts[0] || "palavra",
      hint: parts[1] || "Aqui vai uma dica precisa sobre a palavra",
      description: parts[2] || "Descrição detalhada não disponível",
    };
  } catch (err) {
    console.error("Error fetching word:", err);
    return {
      word: "palavra",
      hint: "Aqui vai uma dica precisa sobre a palavra",
      description: "Descrição detalhada não disponível",
    };
  }
}
async function updateStats(c, playerId, won) {
  const user = await c.db.user.findUnique({
    where: { id: playerId },
    include: { stats: true },
  });
  if (!user || !user.stats_id || !user.stats) return;
  const current = user.stats.hangman || {
    games: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    best: 0,
    streak: 0,
    winrate: 0,
  };
  const streak = won ? current.streak + 1 : 0;
  const updated = {
    games: current.games + 1,
    wins: current.wins + (won ? 1 : 0),
    draws: current.draws,
    losses: current.losses + (!won ? 1 : 0),
    best: Math.max(current.best, streak),
    streak,
    winrate: ((current.wins + (won ? 1 : 0)) / (current.games + 1)) * 100,
  };
  await c.db.stats.update({
    where: { stats_id: user.stats_id },
    data: {
      hangman: updated,
    },
  });
}
export default {
  name: "hangman",
  aliases: ["forca"],
  async execute(m, c, args) {
    const chatId = m.chat?.id ?? "global";
    const playerId = m.sender.id;
    const playerName = m.sender.pushname ?? "Jogador";
    let game = games[chatId];
    if (!game) {
      const { word, hint, description } = await fetchWordHintDescription();
      games[chatId] = {
        word,
        hint,
        description,
        guessedLetters: [],
        wrongGuesses: [],
        maxWrongGuesses: 6,
        player: { id: playerId, name: playerName },
        active: true,
      };
      game = games[chatId];
      const { buffer } = await generateCanvas({
        word,
        guessedLetters: [],
        wrongGuesses: [],
        maxWrongGuesses: 6,
      });
      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      await c.sendImage(
        chatId,
        dataUrl,
        "hangman.png",
        `🕹️ Novo jogo da Forca iniciado!\n✏️ Use ".forca <letra>" para adivinhar.`,
        m.id,
      );
      return;
    }
    if (args[0]?.toLowerCase() === "finalizar" && game.player.id === playerId) {
      await c.sendReplyWithMentions(chatId, `⚠️ Jogo finalizado com sucesso!.`, m.id);
      delete games[chatId];
      return;
    }
    if (args[0]?.toLowerCase() === "dica") {
      const { buffer } = await generateCanvas({
        word: game.word,
        guessedLetters: game.guessedLetters,
        wrongGuesses: game.wrongGuesses,
        maxWrongGuesses: game.maxWrongGuesses,
        hint: game.hint,
      });
      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      await c.sendImage(chatId, dataUrl, "hangman.png", `💡 Dica: ${game.hint}`, m.id);
      return;
    }
    if (game.player.id !== playerId) {
      await c.sendReplyWithMentions(chatId, `⚠️ Apenas ${game.player.name} pode jogar esta rodada.`, m.id);
      return;
    }
    if (!args[0]) {
      await c.sendReplyWithMentions(chatId, `❌ Envie uma letra ou a palavra inteira.`, m.id);
      return;
    }
    // Normalize input
    const guessRaw = args[0].toLowerCase();
    const guess = guessRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const normalizedWord = game.word
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    // Validate single letter guess
    if (guess.length === 1 && !/^[a-z]$/.test(guess)) {
      await c.sendReplyWithMentions(chatId, `❌ Envie apenas uma letra válida.`, m.id);
      return;
    }
    // Validate full-word guess
    if (guess.length > 1 && (!/^[a-z]+$/.test(guess) || guess.length !== normalizedWord.length)) {
      await c.sendReplyWithMentions(
        chatId,
        `❌ A palavra completa deve conter apenas letras e ter o tamanho correto.`,
        m.id,
      );
      return;
    }
    let fullGuessWrong = false;
    if (guess.length === 1) {
      if (!game.guessedLetters.includes(guess) && !game.wrongGuesses.includes(guess)) {
        if (normalizedWord.includes(guess)) game.guessedLetters.push(guess);
        else game.wrongGuesses.push(guess);
      }
    } else if (guess.length === normalizedWord.length) {
      if (guess === normalizedWord) {
        game.guessedLetters = Array.from(new Set(game.word.split("")));
      } else {
        game.wrongGuesses.push("*");
        fullGuessWrong = true;
      }
    }
    game.wrongGuesses = Array.from(new Set(game.wrongGuesses));
    const normalizedGuessedLetters = game.guessedLetters.map((l) => l.toLowerCase());
    const allGuessed = Array.from(new Set(normalizedWord.split(""))).every((l) => normalizedGuessedLetters.includes(l));
    const gameOver = allGuessed || game.wrongGuesses.length >= game.maxWrongGuesses;
    const { buffer } = await generateCanvas({
      word: game.word,
      guessedLetters: game.guessedLetters,
      wrongGuesses: game.wrongGuesses,
      maxWrongGuesses: game.maxWrongGuesses,
      fullGuess: fullGuessWrong ? guess : undefined,
    });
    const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
    let message = "";
    if (allGuessed) {
      message = `🏆 Parabéns, você ganhou!\n🎯 Palavra: *${game.word}*\n📖 Descrição: *${game.description}*`;
      await updateStats(c, playerId, true);
    } else if (game.wrongGuesses.length >= game.maxWrongGuesses) {
      message = `💀 Que pena, você perdeu!\n🎯 Palavra: *${game.word}*\n📖 Descrição: *${game.description}*`;
      await updateStats(c, playerId, false);
    }
    await c.sendImage(chatId, dataUrl, "hangman.png", message, m.id);
    if (gameOver) delete games[chatId];
    const previousWords = fs.readFileSync("./persistence/hangman.txt", "utf-8").split("\n").filter(Boolean);
    previousWords.push(game.word);
    fs.writeFileSync("./persistence/hangman.txt", previousWords.join("\n"));
  },
};
