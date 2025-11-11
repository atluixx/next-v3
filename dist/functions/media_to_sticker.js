import { decryptMedia } from "@open-wa/wa-automate";

// Prevent concurrent processing per user
const usersProcessingGif = new Map();

function canProcessGif(userId) {
  return !usersProcessingGif.has(userId);
}

function markProcessingStart(userId) {
  usersProcessingGif.set(userId, true);
}

function markProcessingEnd(userId) {
  usersProcessingGif.delete(userId);
}

// Create GIF/video sticker
async function createGifSticker(message, client) {
  const userId = message.sender.id;

  if (!canProcessGif(userId)) {
    console.debug(`⚠️ User ${userId} is already processing a GIF, skipping.`);
    await client.reply(
      message.from,
      "⏳ You are already processing a GIF sticker. Please wait for it to finish before sending another.",
      message.id,
    );
    return;
  }

  console.debug("🎞️ Starting GIF/video sticker creation for:", userId);
  markProcessingStart(userId);

  try {
    const pack = "η";
    const author = "Next";

    const buffer = await decryptMedia(message);
    console.debug("✅ Media decrypted successfully for sticker creation.");

    const fpsList = [30, 24, 20, 18, 15, 12, 10];
    let success = false;

    for (const fps of fpsList) {
      if (success) break;

      const processOptions = {
        fps,
        startTime: "00:00:00.0",
        endTime: "00:00:10.0",
        loop: 0,
        square: 240,
      };

      const stickerMetadata = { author, pack };

      try {
        await client.sendMp4AsSticker(message.from, buffer, processOptions, stickerMetadata);
        console.debug(`✅ Sticker created successfully using ${fps} FPS for user ${userId}`);
        success = true;
      } catch (err) {
        console.warn(`⚠️ Failed to create GIF sticker at ${fps} FPS for ${userId}:`, err.message || err);
      }
    }

    if (!success) {
      console.error(`❌ Failed to create GIF sticker after all attempts for ${userId}`);
      await client.reply(
        message.from,
        "⚠️ Could not create the GIF sticker. Try using a shorter or smaller video.",
        message.id,
      );
    }
  } catch (err) {
    console.error(`💥 Critical error while processing GIF sticker for ${userId}:`, err);
    await client.reply(message.from, "❌ An unexpected error occurred while processing your media.", message.id);
  } finally {
    markProcessingEnd(userId);
    console.debug(`🔚 Finished GIF/video sticker processing for ${userId}.`);
  }
}

// Create image sticker
async function createImageSticker(message, client) {
  const userId = message.sender.id;
  console.debug("🖼️ Creating image sticker for:", userId);

  if (!message.mimetype || !message.mimetype.startsWith("image/")) {
    console.debug(`⚠️ Not an image (mimetype: ${message.mimetype}), ignoring.`);
    return;
  }

  try {
    const pack = "η";
    const author = "Next";
    const useStretch = true;

    let buffer = await decryptMedia(message);

    if (useStretch) {
      console.debug("🧩 Normalizing image to square canvas...");
      const { loadImage, createCanvas } = await import("canvas");
      const img = await loadImage(buffer);
      const max = Math.max(img.width, img.height);
      const canvas = createCanvas(max, max);
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, max, max);
      ctx.drawImage(img, (max - img.width) / 2, (max - img.height) / 2);

      buffer = canvas.toBuffer("image/jpeg");
    }

    await client.sendImageAsSticker(message.from, buffer, { author, pack, keepScale: true });
    console.debug(`✅ Image sticker sent successfully to ${userId}`);
  } catch (err) {
    console.error("❌ Error processing image sticker:", err);
    await client.reply(message.from, "❌ Failed to create sticker from image.", message.id);
  }
}

// Main media handler
async function media_to_sticker(message, client) {
  const mimetype = message.mimetype || "";
  const type = message.type || "";
  const duration = Number(message.duration) || 0;

  // WhatsApp “GIFs” are actually MP4s with short duration and isGif=true
  const isVideo = type === "video" || mimetype.startsWith("video/");
  const isShortVideo = isVideo && duration <= 10;
  const isGifLike =
    message.isGif === true || // core flag for GIFs
    Boolean(message.gifPlayback) || // legacy support
    isShortVideo;

  const isImage = mimetype.startsWith("image/") && !isVideo && !isGifLike;

  console.debug(
    `📦 Media detected → type=${type}, mimetype=${mimetype}, duration=${duration}s, isGif=${message.isGif}, gifPlayback=${message.gifPlayback}`,
  );

  if (isVideo || isGifLike) {
    if (isVideo && duration > 10) {
      await client.reply(
        message.from,
        "⚠️ WhatsApp stickers must be under 10 seconds. Please trim your video.",
        message.id,
      );
      return;
    }
    await createGifSticker(message, client);
  } else if (isImage) {
    await createImageSticker(message, client);
  } else {
    console.debug(`⚠️ Unsupported media type: ${type} (${mimetype})`);
  }
}

export default media_to_sticker;
