import type { Message } from "@open-wa/wa-automate-types-only";
import type { ExpandedClient } from "@/next";
import command_handler from "./command_handler";
import media_to_sticker from "@/functions/media_to_sticker";

async function m_handler(m: Message, c: ExpandedClient) {
  try {
    const senderName = m.sender.pushname || m.sender.shortName || m.sender.formattedName;

    const user = await c.db.user.upsert({
      where: { id: m.sender.id },
      update: {
        name: senderName,
      },
      create: {
        id: m.sender.id,
        name: senderName,
        config: { create: {} },
        stats: {
          create: {
            ttt: {
              games: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              best: 0,
              streak: 0,
              winrate: 0.0,
            },
            hangman: {
              games: 0,
              wins: 0,
              draws: 0,
              losses: 0,
              best: 0,
              streak: 0,
              winrate: 0.0,
            },
          },
        },
      },
    });

    if (m.chat.isGroup && m.chat.id) {
      let memberCount = 0;
      try {
        const groupMetadata = await c.getGroupMembers(m.chat.id);
        memberCount = groupMetadata.length;
      } catch (err) {
        console.warn(`⚠️ Could not fetch members for group ${m.chat.id}:`, err);
      }

      const group = await c.db.group.upsert({
        where: { group_id: m.chat.id },
        update: {
          name: m.chat.name || "Unknown",
          last_activity: new Date(),
          members: memberCount,
        },
        create: {
          group_id: m.chat.id,
          name: m.chat.name || "Unknown",
          last_activity: new Date(),
          members: memberCount,
        },
      });

      await c.db.groupUser.upsert({
        where: {
          user_id_group_id: {
            user_id: user.id,
            group_id: group.group_id,
          },
        },
        update: { messages: { increment: 1 } },
        create: {
          user_id: user.id,
          group_id: group.group_id,
          messages: 1,
        },
      });

      let fire = `${c.prefix}fig`;

      if (!m.isMedia) {
        console.log({
          time: new Date().toLocaleTimeString(),
          from: m.sender.pushname,
          isGroup: m.chat.isGroup,
          chatName: m.chat.name,
          content: m.content?.trim(),
        });
      } else if (m.isMedia && m.caption.includes(fire)) {
        await media_to_sticker(m, c);
      }

      if (m.content?.trim().startsWith(c.prefix)) {
        await command_handler(m, c);
      }
    }
  } catch (err) {
    console.error("❌ Error in m_handler:", err);
  }
}

export default m_handler;
