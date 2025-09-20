import type { Message } from "@open-wa/wa-automate-types-only";
import type { Command, ExpandedClient } from "@/next";

async function command_handler(m: Message, c: ExpandedClient) {
	if (!m.content?.startsWith(c.prefix)) return;

	const content = m.content.slice(c.prefix.length).trim();

	const parts = content.split(/\s+/);
	const commandName = parts.shift()?.toLowerCase();
	const args = parts;

	if (!commandName) return;

	const cmd = c.commands.get(commandName) as Command | undefined;

	if (!cmd) {
		console.warn(`Unknown command: ${commandName}`);
		return;
	}

	try {
		await c.react(m.id, "⏳");
		await cmd.execute(m, c, args);
		await c.react(m.id, "✅");
	} catch (err) {
		console.error(`Error running command ${commandName}:`, err);
		await c.react(m.id, "⚠️");
	}
}

export default command_handler;
