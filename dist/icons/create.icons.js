import fs from "fs";

const icons = {
	"sun.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <circle cx="12" cy="12" r="5" fill="#fff"/>
    <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

	"cloud.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#fff"/>
  </svg>`,

	"rain.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#fff"/>
    <path d="M8 21l2-4m4 4l2-4m-8-2l2-4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

	"storm.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#fff"/>
    <path d="M13 11l-4 6h4l-2 4 4-6h-4l2-4z" fill="#fff"/>
  </svg>`,

	"snow.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#fff"/>
    <circle cx="8" cy="18" r="1" fill="white"/>
    <circle cx="12" cy="20" r="1" fill="white"/>
    <circle cx="16" cy="18" r="1" fill="white"/>
    <circle cx="10" cy="16" r="1" fill="white"/>
    <circle cx="14" cy="16" r="1" fill="white"/>
  </svg>`,

	"fog.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
    <path d="M3 15h18M3 18h18M3 21h18" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" fill="#fff" opacity="0.7"/>
  </svg>`,
};

if (!fs.existsSync("./app/icons")) {
	fs.mkdirSync("./app/icons", { recursive: true });
}

Object.entries(icons).forEach(([filename, svg]) => {
	fs.writeFileSync(`./app/icons/${filename}`, svg);
	console.log(`Ícone ${filename} criado com sucesso!`);
});

console.log("Todos os ícones SVG foram criados!");
