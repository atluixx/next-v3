import { type CanvasRenderingContext2D, createCanvas } from "canvas";

interface RenderFlatMinimalTicTacToeOptions {
	board?: string[][];
}

export async function renderFlatMinimalTicTacToe({
	board = [
		["X", "", "X"],
		["", "O", "O"],
		["O", "", "X"],
	],
}: RenderFlatMinimalTicTacToeOptions = {}): Promise<Buffer> {
	const STYLE = {
		canvas: { width: 600, height: 600 },
		colors: {
			background: "#1F2937",
			background2: "#111827",
			board: "#2B2B31",
			x: "#FFFFFF",
			o: "#3B82F6",
			grid: "#3D3D46",
		},
		cellSize: 120,
		lineWidth: 4,
	};

	const canvas = createCanvas(STYLE.canvas.width, STYLE.canvas.height);
	const ctx: CanvasRenderingContext2D = canvas.getContext("2d");

	// 🔹 Fundo com gradiente
	const gradient = ctx.createLinearGradient(0, 0, 0, STYLE.canvas.height);
	gradient.addColorStop(0, STYLE.colors.background);
	gradient.addColorStop(1, STYLE.colors.background2);
	ctx.fillStyle = gradient;
	ctx.fillRect(0, 0, STYLE.canvas.width, STYLE.canvas.height);

	// 🔹 Tabuleiro
	const boardSize = STYLE.cellSize * 3;
	const boardOffsetX = (STYLE.canvas.width - boardSize) / 2;
	const boardOffsetY = (STYLE.canvas.height - boardSize) / 2;

	// inline rounded rect
	const radius = 12;
	ctx.beginPath();
	ctx.moveTo(boardOffsetX + radius, boardOffsetY);
	ctx.lineTo(boardOffsetX + boardSize - radius, boardOffsetY);
	ctx.arcTo(
		boardOffsetX + boardSize,
		boardOffsetY,
		boardOffsetX + boardSize,
		boardOffsetY + radius,
		radius,
	);
	ctx.lineTo(boardOffsetX + boardSize, boardOffsetY + boardSize - radius);
	ctx.arcTo(
		boardOffsetX + boardSize,
		boardOffsetY + boardSize,
		boardOffsetX + boardSize - radius,
		boardOffsetY + boardSize,
		radius,
	);
	ctx.lineTo(boardOffsetX + radius, boardOffsetY + boardSize);
	ctx.arcTo(
		boardOffsetX,
		boardOffsetY + boardSize,
		boardOffsetX,
		boardOffsetY + boardSize - radius,
		radius,
	);
	ctx.lineTo(boardOffsetX, boardOffsetY + radius);
	ctx.arcTo(
		boardOffsetX,
		boardOffsetY,
		boardOffsetX + radius,
		boardOffsetY,
		radius,
	);
	ctx.closePath();
	ctx.fillStyle = STYLE.colors.board;
	ctx.fill();

	// 🔹 Grade
	ctx.strokeStyle = STYLE.colors.grid;
	ctx.lineWidth = STYLE.lineWidth;
	for (let i = 1; i < 3; i++) {
		ctx.beginPath();
		ctx.moveTo(boardOffsetX, boardOffsetY + i * STYLE.cellSize);
		ctx.lineTo(boardOffsetX + boardSize, boardOffsetY + i * STYLE.cellSize);
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(boardOffsetX + i * STYLE.cellSize, boardOffsetY);
		ctx.lineTo(boardOffsetX + i * STYLE.cellSize, boardOffsetY + boardSize);
		ctx.stroke();
	}

	// 🔹 Números das células
	ctx.font = "bold 36px Arial";
	ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	let cellNumber = 1;
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) {
			const cx = boardOffsetX + col * STYLE.cellSize + STYLE.cellSize / 2;
			const cy = boardOffsetY + row * STYLE.cellSize + STYLE.cellSize / 2;
			ctx.fillText(`${cellNumber}`, cx, cy);
			cellNumber++;
		}
	}

	// 🔹 Peças
	for (let row = 0; row < 3; row++) {
		for (let col = 0; col < 3; col++) {
			const value = board[row][col];
			if (!value) continue;

			const cx = boardOffsetX + col * STYLE.cellSize + STYLE.cellSize / 2;
			const cy = boardOffsetY + row * STYLE.cellSize + STYLE.cellSize / 2;

			if (value === "X") {
				ctx.strokeStyle = STYLE.colors.x;
				ctx.lineWidth = 10;
				ctx.beginPath();
				ctx.moveTo(cx - 30, cy - 30);
				ctx.lineTo(cx + 30, cy + 30);
				ctx.moveTo(cx + 30, cy - 30);
				ctx.lineTo(cx - 30, cy + 30);
				ctx.stroke();
			} else if (value === "O") {
				ctx.strokeStyle = STYLE.colors.o;
				ctx.lineWidth = 10;
				ctx.beginPath();
				ctx.arc(cx, cy, 36, 0, Math.PI * 2);
				ctx.stroke();
			}
		}
	}

	return canvas.toBuffer("image/png");
}
