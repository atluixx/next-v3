import { VM } from "vm2";
export default {
    name: "eval",
    description: "Safely execute code with m, c, args using a sandbox",
    async execute(m, c, args) {
        if (!args.length)
            return c.reply(m.chat.id, "Please provide code to evaluate.", m.id);
        const code = args.join(" ");
        try {
            const vm = new VM({
                timeout: 3000,
                sandbox: { m, c, args },
            });
            const result = await vm.run(`(async () => { ${code} })()`);
            await c.reply(m.chat.id, `✅ Result:\n${typeof result === "string" ? result : JSON.stringify(result, null, 2)}`, m.id);
        }
        catch (err) {
            await c.reply(m.chat.id, `❌ Error:\n${err instanceof Error ? err.message : String(err)}`, m.id);
        }
    },
};
