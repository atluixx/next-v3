import type { Message } from "@open-wa/wa-automate-types-only";
import type { ExpandedClient } from "@/next";
import { createCanvas, loadImage } from "canvas";
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const media_to_sticker = async (m: Message, c: ExpandedClient) => {
  try {
    // Check if message has media
    if (!m.mimetype || (!m.mimetype.startsWith("image/") && !m.mimetype.startsWith("video/"))) {
      return c.reply(m.chatId, "Please send an image or video to convert to sticker.", m.id);
    }

    // Download the media
    const mediaBuffer = await c.decryptMedia(m);
    const tempInputPath = path.join(__dirname, `temp_input_${Date.now()}${getFileExtension(m.mimetype)}`);
    const outputPath = path.join(__dirname, `sticker_${Date.now()}.webp`);

    // Save downloaded media to temp file
    fs.writeFileSync(tempInputPath, mediaBuffer);

    try {
      // Process based on media type
      if (m.mimetype.startsWith("image/")) {
        await processImageSticker(tempInputPath, outputPath);
      } else if (m.mimetype.startsWith("video/")) {
        await processVideoSticker(tempInputPath, outputPath);
      }

      // Check file size and compress further if needed
      await ensureFileSizeUnder1MB(outputPath);

      // Send as sticker
      await c.sendImageAsSticker(m.chatId, outputPath, {
        author: "η",
        pack: "Next",
      });

      // Cleanup temp files
      fs.unlinkSync(tempInputPath);
      fs.unlinkSync(outputPath);
    } catch (processError) {
      // Cleanup on error
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      throw processError;
    }
  } catch (error) {
    console.error("Error creating sticker:", error);
    await c.reply(m.chatId, "❌ Failed to create sticker. Please try again with a different image/video.", m.id);
  }
};

// Helper function to get file extension
function getFileExtension(mimetype: string): string {
  const extensions: { [key: string]: string } = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/avi": ".avi",
    "video/mov": ".mov",
  };
  return extensions[mimetype] || ".bin";
}

// Process image to sticker
async function processImageSticker(inputPath: string, outputPath: string): Promise<void> {
  const image = sharp(inputPath);
  const metadata = await image.metadata();

  // Calculate dimensions for 1:1 aspect ratio
  const size = Math.min(metadata.width || 512, metadata.height || 512);
  const left = Math.floor(((metadata.width || 512) - size) / 2);
  const top = Math.floor(((metadata.height || 512) - size) / 2);

  // Process image: crop to square and resize to 512x512
  await image
    .extract({ left, top, width: size, height: size })
    .resize(512, 512, { fit: "cover" })
    .webp({ quality: 80, effort: 6 })
    .toFile(outputPath);
}

// Process video to sticker (animated sticker)
async function processVideoSticker(inputPath: string, outputPath: string): Promise<void> {
  // Use ffmpeg to convert video to webp sticker
  const ffmpegCommand = [
    "ffmpeg",
    "-i",
    inputPath,
    "-vf",
    "scale=512:512:force_original_aspect_ratio=disable:flags=lanczos,crop=512:512:exact=1",
    "-c:v",
    "libwebp",
    "-loop",
    "0",
    "-qscale",
    "75",
    "-preset",
    "default",
    "-an", // remove audio
    "-y", // overwrite output file
    outputPath,
  ].join(" ");

  try {
    await execAsync(ffmpegCommand);
  } catch (error) {
    // If ffmpeg fails, try using sharp for GIFs
    if (inputPath.endsWith(".gif")) {
      await sharp(inputPath, { animated: true })
        .resize(512, 512, { fit: "cover" })
        .webp({ quality: 75, effort: 6 })
        .toFile(outputPath);
    } else {
      throw new Error("FFmpeg is required for video stickers. Please install ffmpeg.");
    }
  }
}

// Ensure file size is under 1MB
async function ensureFileSizeUnder1MB(filePath: string): Promise<void> {
  let stats = fs.statSync(filePath);
  let quality = 80;

  while (stats.size > 1000000 && quality > 10) {
    quality -= 10;

    const tempPath = filePath + ".temp";

    if (filePath.endsWith(".webp")) {
      await sharp(filePath).webp({ quality, effort: 6 }).toFile(tempPath);
    } else {
      await sharp(filePath).resize(512, 512, { fit: "cover" }).webp({ quality, effort: 6 }).toFile(tempPath);
    }

    fs.renameSync(tempPath, filePath);
    stats = fs.statSync(filePath);
  }

  // If still too large, reduce dimensions
  if (stats.size > 1000000) {
    let dimensions = 512;

    while (stats.size > 1000000 && dimensions > 100) {
      dimensions -= 50;

      const tempPath = filePath + ".temp";
      await sharp(filePath)
        .resize(dimensions, dimensions, { fit: "cover" })
        .webp({ quality: 50, effort: 6 })
        .toFile(tempPath);

      fs.renameSync(tempPath, filePath);
      stats = fs.statSync(filePath);
    }
  }
}

export default media_to_sticker;
