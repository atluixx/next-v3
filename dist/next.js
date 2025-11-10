import { create } from "@open-wa/wa-automate";
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import m_handler from "./events/message_create.js";
const prisma = new PrismaClient();
async function setProperties(c) {
  c.AC = async (g, s) => {
    try {
      const admins = await c.getGroupAdmins(g);
      return admins.includes(s);
    } catch {
      return false;
    }
  };
  c.MC = (s) => {
    return s in c.admins;
  };
  c.FGU = async ({ input, chat, message }) => {
    chat ||= message.chat.id;
    const participants = message.chat.groupMetadata?.participants || [];
    const contacts = await Promise.all(
      participants.map(async (p) => {
        const contact = await c.getContact(p.contact?.id ?? p.id);
        return { ...contact, id: p.contact?.id ?? p.id };
      }),
    );
    if (!input && message.quotedMsg) {
      const quotedUserId =
        message.quotedMsg.author ??
        participants.find((p) => p.id?._serialized?.includes(message.quotedMsg?.author ?? ""))?.id ??
        null;
      return contacts.find((c) => c.id === quotedUserId)?.id || null;
    }
    if (!input) return null;
    const cleanInput = input.toLowerCase().replace("@", "").replace(/\s+/g, "");
    let mode;
    if (/^\d+$/.test(cleanInput)) mode = "number";
    else if (input.includes("@c.us")) mode = "id";
    else if (input.includes("@")) mode = "tag";
    else mode = "name";
    const strategies = {
      number: () => contacts.filter((c) => c.id.replace("@c.us", "").includes(cleanInput)),
      id: () => contacts.filter((c) => c.id === input),
      tag: () => contacts.filter((c) => c.id.replace("@c.us", "") === cleanInput),
      name: () =>
        contacts.filter((c) => {
          const name = (c.pushname || c.formattedName || c.name || "").toLowerCase().replace(/\s+/g, "");
          return name.includes(cleanInput);
        }),
    };
    const users = strategies[mode]?.() || [];
    if (users.length > 0) return users[0].id;
    for (const fn of Object.values(strategies)) {
      const result = fn()[0];
      if (result) return result.id;
    }
    return null;
  };
  c.prefix = ".";
  c.db = prisma;
  c.commands = new Map();
  c.admins = ["393884018743@c.us"];
  c.LC = async () => {
    const commandsPath = path.resolve("./commands");
    const getFilesRecursively = async (dir) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (entry) => {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) {
            return getFilesRecursively(res);
          } else if (entry.isFile() && res.endsWith(".ts")) {
            return res;
          }
          return [];
        }),
      );
      return files.flat();
    };
    const commandFiles = await getFilesRecursively(commandsPath);
    console.log("🔄 Loading commands:", commandFiles);
    for (const file of commandFiles) {
      try {
        const module = await import(`file://${file}?update=${Date.now()}`);
        if (!module?.default || !module?.default?.name) {
          console.warn(`⚠️ Skipped: ${file} (no default export or no name)`);
          continue;
        }
        const command = module.default;
        if (command.aliases) {
          for (const alias of command.aliases) {
            c.commands.set(alias, command);
          }
        }
        c.commands.set(command.name, command);
        console.log(`✅ Loaded command: ${command.name} (${file})`);
      } catch (err) {
        console.error(`❌ Failed to load ${file}:`, err);
      }
    }
  };
}
let client;
async function setup(c) {
  client = c;
  await setProperties(client);
  await client.LC();
  client.onMessage((m) => m_handler(m, client));
  console.log(process.env.NEXT_TEXT);
}
prisma
  .$connect()
  .then(() => {
    create({
      headless: true,
      useChrome: true,
      authTimeout: 0,
      executablePath: "/usr/bin/google-chrome",
      chromiumArgs: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
      sessionId: "next-v3",
    }).then((c) => setup(c));
  })
  .catch(() => null);
process.on("SIGINT", () => {
  console.log(">> Caught interrupt signal (CTRL + C). Cleaning up...");
  setTimeout(() => {
    console.clear();
    process.exit(0);
  }, 2000);
});
