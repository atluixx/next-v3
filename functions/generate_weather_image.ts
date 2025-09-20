import path from "node:path";
import axios from "axios";
import {
	type CanvasRenderingContext2D,
	createCanvas,
	type Image,
	loadImage,
	registerFont,
} from "canvas";
import "dotenv/config";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 900;

registerFont(path.resolve("./fonts/Shippori.ttf"), {
	family: "Shippori Antique Regular",
});
const iconCache = new Map<string, Image>();

async function getIcon(name: string) {
	if (!iconCache.has(name)) {
		const img = await loadImage(path.resolve("./icons", name));
		iconCache.set(name, img);
		return img;
	}
	const cached = iconCache.get(name);
	if (!cached) throw new Error(`Icon not found: ${name}`);
	return cached;
}

function roundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.lineTo(x + w - r, y);
	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
	ctx.lineTo(x + w, y + h - r);
	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
	ctx.lineTo(x + r, y + h);
	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
	ctx.lineTo(x, y + r);
	ctx.quadraticCurveTo(x, y, x + r, y);
	ctx.closePath();
}

function getWeatherInfo(code: number, isDay: boolean) {
	const icons: Record<number, string> = {
		0: "sun.svg",
		1: "sun.svg",
		2: "cloud.svg",
		3: "cloud.svg",
		45: "fog.svg",
		48: "fog.svg",
		51: "rain.svg",
		53: "rain.svg",
		55: "rain.svg",
		56: "snow.svg",
		57: "snow.svg",
		61: "rain.svg",
		63: "rain.svg",
		65: "rain.svg",
		66: "snow.svg",
		67: "snow.svg",
		71: "snow.svg",
		73: "snow.svg",
		75: "snow.svg",
		77: "snow.svg",
		80: "rain.svg",
		81: "rain.svg",
		82: "storm.svg",
		85: "snow.svg",
		86: "snow.svg",
		95: "storm.svg",
		96: "storm.svg",
		99: "storm.svg",
	};
	const descs: Record<number, string> = {
		0: "Céu limpo",
		1: "Principalmente limpo",
		2: "Parcialmente nublado",
		3: "Nublado",
		45: "Nevoeiro",
		48: "Nevoeiro depositante",
		51: "Garoa leve",
		53: "Garoa moderada",
		55: "Garoa densa",
		56: "Garoa congelante leve",
		57: "Garoa congelante densa",
		61: "Chuva leve",
		63: "Chuva moderada",
		65: "Chuva forte",
		66: "Chuva congelante leve",
		67: "Chuva congelante forte",
		71: "Neve leve",
		73: "Neve moderada",
		75: "Neve forte",
		77: "Grãos de neve",
		80: "Pancadas leves",
		81: "Pancadas moderadas",
		82: "Pancadas violentas",
		85: "Pancadas de neve leve",
		86: "Pancadas de neve forte",
		95: "Trovoada leve/moderada",
		96: "Trovoada com granizo leve",
		99: "Trovoada com granizo forte",
	};
	const icon =
		!isDay && (code === 0 || code === 1)
			? "moon.svg"
			: icons[code] || "sun.svg";
	const description = descs[code] || "Desconhecido";
	return { icon, description };
}

function fitText(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
	initialSize = 48,
	minSize = 18,
	font = "Shippori Antique Regular",
) {
	let size = initialSize;
	while (size > minSize) {
		ctx.font = `${size}px ${font}`;
		if (ctx.measureText(text).width <= maxWidth) break;
		size--;
	}
	return size;
}

function wrapText(
	ctx: CanvasRenderingContext2D,
	text: string,
	maxWidth: number,
	fontSize: number,
) {
	ctx.font = `${fontSize}px Shippori Antique Regular`;
	const words = text.split(" "),
		lines: string[] = [];
	let cur = "";
	for (const w of words) {
		const test = cur ? `${cur} ${w}` : w;
		if (ctx.measureText(test).width <= maxWidth) cur = test;
		else {
			if (cur) lines.push(cur);
			cur = w;
		}
	}
	if (cur) lines.push(cur);
	return lines;
}

interface ForecastItem {
	hour: string;
	temp: string;
	desc: string;
}

export async function generateWeatherImage(location: string): Promise<Buffer> {
	// --- Geo ---
	const geoRes = await axios.get(
		`https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(location)}&key=${process.env.GEO_KEY}`,
	);
	const geo = geoRes.data.results[0],
		comp = geo.components;
	const city =
		comp.city ||
		comp.town ||
		comp.village ||
		comp._normalized_city ||
		comp.municipality ||
		comp.county ||
		comp.state ||
		comp.suburb ||
		location;
	const country = comp.country || "",
		lat = geo.geometry.lat,
		lon = geo.geometry.lng,
		timezone = geo.annotations.timezone.name;

	// --- Weather ---
	const wRes = await axios.get(
		`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day&timezone=auto&forecast_hours=5`,
	);
	const w = wRes.data,
		temp = Math.round(w.current_weather.temperature),
		code = w.hourly.weather_code[0],
		isDay = w.hourly.is_day[0],
		{ description } = getWeatherInfo(code, isDay);
	const sensation = Math.round(w.hourly.apparent_temperature[0]),
		wind = `${Math.round(w.hourly.wind_speed_10m[0])} km/h`,
		humidity = `${Math.round(w.hourly.relative_humidity_2m[0])}%`;
	const forecast: ForecastItem[] = w.hourly.time
		.slice(0, 5)
		.map((t: string, i: number) => {
			const hr = new Date(t).getHours();
			const { description: desc } = getWeatherInfo(
				w.hourly.weather_code[i],
				w.hourly.is_day[i],
			);
			return {
				hour: `${hr % 12 || 12} ${hr >= 12 ? "PM" : "AM"}`,
				temp: `${Math.round(w.hourly.temperature_2m[i])}°`,
				desc,
			};
		});

	// --- Local time/date ---
	const dateStr = new Date().toLocaleDateString("pt-BR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: timezone,
	});
	const timeStr = new Date().toLocaleTimeString("pt-BR", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: true,
		timeZone: timezone,
	});

	// --- Canvas ---
	const canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT),
		ctx = canvas.getContext("2d");

	// --- Background image (blurred) ---
	try {
		const imgUrl = `https://source.unsplash.com/1080x900/?${encodeURIComponent(city)}`;
		const bg = await loadImage(imgUrl);
		ctx.drawImage(bg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
		ctx.fillStyle = "rgba(0,0,0,0.4)";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	} catch (_e) {
		ctx.fillStyle = "#29306C";
		ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
	}

	// --- City ---
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.fillStyle = "#fff";
	const cityFont = fitText(ctx, city, 400);
	ctx.font = `${cityFont}px "Shippori Antique Regular"`;
	ctx.fillText(`${city},`, 40, 40);
	ctx.fillText(country, 40, 40 + cityFont + 6);

	// --- Local time top-right ---
	ctx.textAlign = "right";
	ctx.font = '24px "Shippori Antique Regular"';
	ctx.fillText(dateStr, CANVAS_WIDTH - 40, 40);
	ctx.fillText(timeStr, CANVAS_WIDTH - 40, 70);

	// --- Temperature & icon centered ---
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "bold 180px Inter";
	ctx.fillText(`${temp}°`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 90);
	ctx.font = '72px "Shippori Antique Regular"';
	const iconImg = await getIcon(getWeatherInfo(code, isDay).icon);
	const iconSize = 80;
	ctx.drawImage(
		iconImg,
		CANVAS_WIDTH / 2 - iconSize / 2,
		CANVAS_HEIGHT / 2 - 10,
		iconSize,
		iconSize,
	);
	ctx.fillText(description, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);

	// --- Sensation, wind, humidity ---
	ctx.font = '24px "Shippori Antique Regular"';
	ctx.fillText(
		`Sensação de ${sensation}°`,
		CANVAS_WIDTH / 2,
		CANVAS_HEIGHT / 2 + 160,
	);
	ctx.textAlign = "left";
	ctx.font = "600 22px Inter";
	ctx.fillText(`VENTO: ${wind}`, 10, CANVAS_HEIGHT / 2 - 100);
	ctx.fillText(`UMIDADE: ${humidity}`, 10, CANVAS_HEIGHT / 2 - 70);

	// --- Forecast boxes ---
	const startX =
		(CANVAS_WIDTH - (forecast.length * 150 + (forecast.length - 1) * 16)) / 2;
	forecast.forEach((f, i) => {
		const x = startX + i * 166,
			y = CANVAS_HEIGHT - 220;
		ctx.fillStyle = "#fff";
		roundRect(ctx, x, y, 150, 160, 12);
		ctx.fill();
		ctx.fillStyle = "#000";
		ctx.textAlign = "center";
		ctx.font = "600 18px Inter";
		ctx.fillText(f.hour, x + 75, y + 14);
		ctx.font = "600 36px Inter";
		ctx.fillText(f.temp, x + 75, y + 40);
		ctx.font = "300 18px Inter";
		wrapText(ctx, f.desc, 130, 18).forEach((line, idx) => {
			ctx.fillText(line, x + 75, y + 80 + idx * 22);
		});
	});

	return canvas.toBuffer();
}
