import { renderFlatMinimalTicTacToe } from "../../functions/render_ttt.js";
const games = {};
const pendingChallenges = {};
function checkWin(board) {
  const lines = [
    [board[0][0], board[0][1], board[0][2]],
    [board[1][0], board[1][1], board[1][2]],
    [board[2][0], board[2][1], board[2][2]],
    [board[0][0], board[1][0], board[2][0]],
    [board[0][1], board[1][1], board[2][1]],
    [board[0][2], board[1][2], board[2][2]],
    [board[0][0], board[1][1], board[2][2]],
    [board[0][2], board[1][1], board[2][0]],
  ];
  for (const line of lines) {
    if (line.every((c) => c === "X")) return "X";
    if (line.every((c) => c === "O")) return "O";
  }
  const isFull = board.every((row) => row.every((c) => c !== ""));
  if (isFull) return "draw";
  return null;
}
async function updateStats(c, winnerId, players) {
  for (const [id, player] of Object.entries(players)) {
    const isWinner = winnerId === player.id;
    const isDraw = winnerId === "draw";
    const user = await c.db.user.findUnique({
      where: { id },
      include: { stats: true },
    });
    const current = user?.stats?.ttt || {
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      best: 0,
      streak: 0,
      winrate: 0,
    };
    let streak = current.streak;
    if (isWinner) streak += 1;
    if (!isWinner && !isDraw) streak = 0;
    const updated = {
      games: current.games + 1,
      wins: current.wins + (isWinner ? 1 : 0),
      draws: current.draws + (isDraw ? 1 : 0),
      losses: current.losses + (!isWinner && !isDraw ? 1 : 0),
      best: Math.max(current.best, streak),
      streak,
      winrate: ((current.wins + (isWinner ? 1 : 0)) / (current.games + 1)) * 100,
    };
    await c.db.user.update({
      where: { id },
      data: {
        stats: {
          update: {
            ttt: updated, // ✅ cast aqui
          },
        },
      },
    });
  }
}
export default {
  name: "jdv",
  aliases: ["jogodavelha", "ttt"],
  async execute(m, c, args) {
    const gameId = m.chat?.id ?? "global";
    const playerId = m.sender.id;
    const playerName = m.sender.pushname ?? "Jogador";
    const argRaw = args?.[0];
    const arg = argRaw?.toLowerCase();
    if (pendingChallenges[playerId]) {
      const challenge = pendingChallenges[playerId];
      if (arg === "aceitar") {
        const game = {
          board: [
            ["", "", ""],
            ["", "", ""],
            ["", "", ""],
          ],
          players: {
            [challenge.from]: {
              id: challenge.from,
              name: "Jogador X",
              symbol: "X",
            },
            [challenge.to]: { id: challenge.to, name: playerName, symbol: "O" },
          },
          order: [challenge.from, challenge.to],
          current: "X",
          active: true,
        };
        games[challenge.gameId] = game;
        delete pendingChallenges[playerId];
        const buffer = await renderFlatMinimalTicTacToe({ board: game.board });
        const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        await c.sendImage(m.chat.id, dataUrl, "jdv.png", `🎮 Jogo iniciado! É a vez de X`, m.id);
        return;
      }
      if (arg === "recusar") {
        delete pendingChallenges[playerId];
        await c.sendReplyWithMentions(m.chat.id, `❌ Desafio recusado por ${playerName}.`, m.id);
        return;
      }
      await c.sendReplyWithMentions(m.chat.id, "⚠️ Digite `aceitar` ou `recusar` para responder ao desafio.", m.id);
      return;
    }
    if (!games[gameId]) {
      games[gameId] = {
        board: [
          ["", "", ""],
          ["", "", ""],
          ["", "", ""],
        ],
        players: {},
        order: [],
        current: "X",
        active: false,
      };
    }
    const game = games[gameId];
    if (!argRaw) {
      if (Object.keys(game.players).length === 0) {
        game.players[playerId] = {
          id: playerId,
          name: playerName,
          symbol: "X",
        };
        game.order = [playerId];
        game.active = false;
        await c.sendReplyWithMentions(
          m.chat.id,
          `🎮 ${playerName} iniciou uma partida de Jogo da Velha! Se você quiser jogar, digite \`jdv\`.`,
          m.id,
        );
        return;
      }
      if (!game.players[playerId] && Object.keys(game.players).length === 1) {
        game.players[playerId] = {
          id: playerId,
          name: playerName,
          symbol: "O",
        };
        game.order.push(playerId);
        game.active = true;
        const buffer = await renderFlatMinimalTicTacToe({ board: game.board });
        const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
        await c.sendImage(
          m.chat.id,
          dataUrl,
          "jdv.png",
          `🎮 Partida iniciada! É a vez de ${game.players[game.order[0]]} (X)`,
          m.id,
        );
        return;
      }
      if (game.players[playerId]) {
        await c.sendReplyWithMentions(m.chat.id, "⚠️ Você já está nesta partida!", m.id);
        return;
      }
      if (Object.keys(game.players).length >= 2) {
        await c.sendReplyWithMentions(m.chat.id, "⚠️ A partida já tem 2 jogadores.", m.id);
        return;
      }
    }
    if (!Number.isNaN(Number(argRaw))) {
      if (!game.players[playerId]) {
        await c.sendReplyWithMentions(
          m.chat.id,
          "⚠️ Você não está neste jogo. Digite `jdv` para começar ou entrar.",
          m.id,
        );
        return;
      }
      const player = game.players[playerId];
      if (player.symbol !== game.current) {
        await c.sendReplyWithMentions(m.chat.id, `⏳ Não é sua vez. Agora é a vez do jogador ${game.current}.`, m.id);
        return;
      }
      const cell = Number(argRaw);
      if (cell < 1 || cell > 9) {
        await c.sendReplyWithMentions(m.chat.id, "❌ Movimento inválido. Use um número entre 1 e 9.", m.id);
        return;
      }
      const row = Math.floor((cell - 1) / 3);
      const col = (cell - 1) % 3;
      if (game.board[row][col]) {
        await c.sendReplyWithMentions(m.chat.id, "❌ Essa posição já está ocupada.", m.id);
        return;
      }
      game.board[row][col] = player.symbol;
      const result = checkWin(game.board);
      let caption = "";
      if (result) {
        if (result === "draw") {
          caption = "🤝 O jogo terminou em empate!";
          await updateStats(c, "draw", game.players);
        } else {
          const winnerEntry = Object.entries(game.players).find(([, p]) => p.symbol === result);
          if (winnerEntry) {
            const winner = winnerEntry[1];
            caption = `🏆 Vitória do jogador ${winner.name} (${winner.symbol})!`;
            await updateStats(c, winner.id, game.players);
          }
        }
      } else {
        const nextSymbol = game.current === "X" ? "O" : "X";
        const nextPlayerEntry = Object.entries(game.players).find(([, p]) => p.symbol === nextSymbol);
        const nextPlayer = nextPlayerEntry?.[1];
        if (nextPlayer) caption = `♟ Vez de ${nextPlayer.name} (${nextPlayer.symbol})`;
      }
      const buffer = await renderFlatMinimalTicTacToe({ board: game.board });
      const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
      await c.sendImage(m.chat.id, dataUrl, "jdv.png", caption, m.id);
      if (result) delete games[gameId];
      else game.current = game.current === "X" ? "O" : "X";
      return;
    }
    const u = await c.FGU({ message: m, chat: m.chat.id, input: argRaw });
    if (!u) {
      await c.sendReplyWithMentions(m.chat.id, `❌ Usuário ${argRaw} não existe.`, m.id);
      return;
    }
    const user = await c.getContact(u);
    const userId = user?.id;
    if (userId === playerId) {
      await c.sendReplyWithMentions(m.chat.id, "❌ Você não pode se desafiar.", m.id);
      return;
    }
    pendingChallenges[userId] = { from: playerId, to: userId, gameId };
    await c.sendReplyWithMentions(
      m.chat.id,
      `🎮 ${user.pushname ?? "Jogador"} você foi desafiado por ${playerName}!\nDigite \`aceitar\` ou \`recusar\`.`,
      m.id,
    );
  },
};
