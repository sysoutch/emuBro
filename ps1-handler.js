const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

/**
 * PS1 Memory Card Handler
 * Handles reading, parsing, writing, and formatting PS1 Memory Card (128KB) images.
 */

const BLOCK_SIZE = 8192;
const SECTOR_SIZE = 128;
const HEADER_BLOCK = 0;
const DIR_ENTRIES = 15;
const DATA_BLOCKS_START = 1;

class PS1CardHandler {
    constructor() {
        // Standard PS1 Memory Card Size
        this.CARD_SIZE = 128 * 1024; 
    }

    /**
     * Read a memory card file
     * @param {string} filePath 
     * @returns {Object} { success, data: { format, saves, freeBlocks } }
     */
    async readCard(filePath) {
        try {
            const buffer = await fs.readFile(filePath);
            
            // Check size (allow DexDrive header +128 bytes)
            let offset = 0;
            if (buffer.length === 131200) {
                offset = 128;
            } else if (buffer.length !== 131072) {
                // If not standard size, check if we can still parse it (maybe a raw dump)
                // But for safety, strict check or fallback
            }

            // Create a view on the buffer
            const cardData = buffer.slice(offset, offset + 131072);
            
            // Validation
            const magic = cardData.toString('ascii', 0, 2);
            if (magic !== "MC" && cardData.toString('ascii', 0, 11) !== "Sony PS ---") {
                 // Not a standard header, but might still be valid data.
                 // Many emulators don't enforce the "MC" header.
            }

            const saves = [];
            const usedBlocks = new Set();

            // Iterate Directory Frames (in Block 0)
            // Block 0 consists of 64 sectors.
            // Sector 0-15: Header Frames? No.
            // According to specs:
            // Frame 0-63 (128 bytes each).
            // Frame 0-15: Reserved/Header info.
            // Frame 16-30: Directory Entries (15 entries).
            // Frame 31-63: Broken sector list / Unused / BAT?
            
            // Correction:
            // Block 0 is the first 8KB.
            // It contains the Directory and Block Allocation Table (BAT).
            // The directory entries are usually at sector 1 (0-based) to 15.
            // Wait, let's stick to what main.js was doing which "worked" for listing, 
            // but refine it.
            // main.js used: dirOffset = startOffset + (i * 128) for i=1..15.
            // This maps to Frame 1 to 15 of Block 0.
            // Frame 0 is Header.
            // So Directory is Frame 1..15. Correct.
            
            for (let i = 1; i <= 15; i++) {
                const dirOffset = i * 128;
                const frame = cardData.slice(dirOffset, dirOffset + 128);
                
                // 0x51 = In Use (Start of file), 0x52 = In Use (Middle), 0x53 = In Use (End)
                // 0xA0 = Free
                const state = frame[0];
                
                if (state === 0x51) {
                    const fileSize = frame.readUInt32LE(4);
                    const nextBlock = frame.readUInt16LE(8); // Pointer to next block if linked?
                    // Actually, simple PS1 cards map Directory Slot N to Block N directly 
                    // in simple file systems, but usually we need to check the link.
                    
                    // Note: The "Next Block" field in Directory Entry is meaningful?
                    // Or do we rely on the specific Block Entry?
                    
                    // Actually, for most games:
                    // Directory Slot i maps to Block i.
                    // If file is > 8KB, it uses Link Order.
                    
                    // Extract Title (Shift-JIS/ASCII)
                    // Offset 12 (0xC) to 12+64
                    const titleRaw = frame.slice(12, 76);
                    const title = titleRaw.toString('ascii').replace(/\0/g, '').trim(); // Simplified decoding
                    
                    // Product Code
                    const code = titleRaw.toString('ascii', 0, 12).trim(); // Usually at start? No, product code is in separate field?
                    // Actually, standard is: Title is Shift-JIS.
                    // Product code is generic text.
                    
                    // Get Data
                    // Block N (1..15)
                    const blockIndex = i; // 1..15
                    const blockOffset = blockIndex * 8192;
                    
                    // Basic bounds check
                    if (blockOffset + 8192 > cardData.length) continue;

                    const dataBlock = cardData.slice(blockOffset, blockOffset + 8192);

                    // Extract Icon and Palette from the *first* block of the file
                    let icon = null;
                    if (dataBlock.toString('ascii', 0, 2) === 'SC') {
                        // It has the standard header
                        icon = this.extractIcon(dataBlock);
                    }

                    // Calculate blocks used (size / 8192 rounded up)
                    const blocksUsed = Math.ceil(fileSize / 8192);
                    
                    // Track used blocks for free space calc
                    // (Simplified: assuming contiguous or direct mapping for now)
                    usedBlocks.add(i);

                    saves.push({
                        slot: i,
                        title: title || "Untitled",
                        productCode: code || "", // Placeholder
                        size: fileSize,
                        blocks: blocksUsed,
                        icon: icon,
                        // We store the raw data of the FIRST block for potential preview/move
                        // For full move, we'd need to trace the chain.
                        // For now, we'll store the entire file content if it's single block, 
                        // or just mark it.
                        // Todo: Handle multi-block read.
                        isMultiBlock: blocksUsed > 1
                    });
                }
            }

            return {
                success: true,
                data: {
                    format: "PlayStation 1",
                    saves: saves,
                    freeBlocks: 15 - usedBlocks.size,
                    cardSize: cardData.length,
                    rawPath: filePath // Keep track of where it came from
                }
            };

        } catch (error) {
            console.error("PS1 Handler Read Error:", error);
            return { success: false, message: error.message };
        }
    }

    extractIcon(dataBlock) {
        const width = 16;
        const height = 16;

        // Icon display flags are typically 0x11, 0x12, 0x13 for 1..3 frames.
        const iconFlag = Number(dataBlock[0x02] || 0);
        let frameCount = iconFlag & 0x03;
        if (frameCount < 1 || frameCount > 3) frameCount = 1;

        // Palette (16 colors) starts at 0x60 in the save header.
        const palette = [];
        for (let p = 0; p < 16; p++) {
            const colorVal = dataBlock.readUInt16LE(0x60 + (p * 2));
            const r = (colorVal & 0x1F) << 3;
            const g = ((colorVal >> 5) & 0x1F) << 3;
            const b = ((colorVal >> 10) & 0x1F) << 3;
            const a = (p === 0) ? 0 : 255;
            palette.push([r, g, b, a]);
        }

        const decodeFrame = (frameOffset) => {
            const bitmap = dataBlock.slice(frameOffset, frameOffset + 128);
            if (bitmap.length < 128) return null;

            const pixels = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < bitmap.length; i++) {
                const byte = bitmap[i];
                const low = byte & 0x0F;
                const high = (byte >> 4) & 0x0F;

                let col = palette[low];
                let idx = (i * 2) * 4;
                pixels[idx] = col[0];
                pixels[idx + 1] = col[1];
                pixels[idx + 2] = col[2];
                pixels[idx + 3] = col[3];

                col = palette[high];
                idx = (i * 2 + 1) * 4;
                pixels[idx] = col[0];
                pixels[idx + 1] = col[1];
                pixels[idx + 2] = col[2];
                pixels[idx + 3] = col[3];
            }

            return {
                width,
                height,
                pixels: Array.from(pixels)
            };
        };

        const frames = [];
        for (let f = 0; f < frameCount; f++) {
            const decoded = decodeFrame(0x80 + (f * 128));
            if (!decoded) continue;
            frames.push(decoded);
        }

        if (!frames.length) return null;

        return {
            width,
            height,
            pixels: frames[0].pixels, // Backward-compatible first frame
            frames,
            frameCount: frames.length,
            isAnimated: frames.length > 1,
            iconFlag
        };
    }

    async readCardBuffer(filePath) {
        const buffer = await fs.readFile(filePath);
        let offset = 0;
        if (buffer.length === 131200) {
            offset = 128;
        } else if (buffer.length !== 131072) {
            return { success: false, message: "Unsupported memory card size." };
        }
        const cardData = buffer.slice(offset, offset + 131072);
        return { success: true, buffer, cardData, offset };
    }

    isSlotStartInUse(cardData, slot) {
        const state = Number(cardData[slot * SECTOR_SIZE] || 0);
        return state === 0x51;
    }

    isSlotFree(cardData, slot) {
        const state = Number(cardData[slot * SECTOR_SIZE] || 0);
        return state === 0xA0 || state === 0x00 || state === 0xFF;
    }

    findFirstFreeSlot(cardData) {
        for (let slot = 1; slot <= DIR_ENTRIES; slot++) {
            if (this.isSlotFree(cardData, slot)) return slot;
        }
        return 0;
    }

    getSaveBlockUsage(cardData, slot) {
        const dirOffset = slot * SECTOR_SIZE;
        const fileSize = Number(cardData.readUInt32LE(dirOffset + 4) || 0);
        const blocksUsed = Math.max(1, Math.ceil(fileSize / BLOCK_SIZE));
        return { fileSize, blocksUsed };
    }

    sanitizeAsciiName(input, maxLength = 64) {
        const raw = String(input || "").trim();
        if (!raw) return "Imported Save";
        const ascii = raw.replace(/[^\x20-\x7E]+/g, " ").replace(/\s+/g, " ").trim();
        if (!ascii) return "Imported Save";
        return ascii.slice(0, maxLength);
    }

    buildDirectoryEntryForSingleBlock(name, fileSize = BLOCK_SIZE) {
        const entry = Buffer.alloc(SECTOR_SIZE);
        entry[0] = 0x51; // start of used file
        entry.writeUInt32LE(Math.max(1, Number(fileSize || BLOCK_SIZE)), 4);
        entry.writeUInt16LE(0xFFFF, 8); // no next block
        const safeName = this.sanitizeAsciiName(name, 64);
        entry.fill(0, 12, 76);
        entry.write(safeName, 12, 64, "ascii");
        return entry;
    }

    /**
     * Delete a save from the card
     * @param {string} filePath 
     * @param {number} slot Index 1-15
     */
    async deleteSave(filePath, slot) {
        try {
            const cardView = await this.readCardBuffer(filePath);
            if (!cardView.success) return { success: false, message: cardView.message };
            const { buffer, cardData } = cardView;

            // 1. Mark Directory Frame as Free (0xA0)
            const dirOffset = slot * 128;
            
            // Check if it's actually in use
            if (cardData[dirOffset] !== 0x51) {
                return { success: false, message: "Slot is not the start of a file." };
            }
            const deletedEntry = Buffer.from(cardData.slice(dirOffset, dirOffset + SECTOR_SIZE));
            const deletedTitle = deletedEntry.slice(12, 76).toString("ascii").replace(/\0/g, "").trim();

            // Mark as 0xA0 (Free)
            cardData[dirOffset] = 0xA0;
            
            // Clear the rest of the entry? Or just the status byte?
            // Standard practice: Set status to 0xA0, optionally clear file size.
            // Also need to update the XOR checksum of the frame (last byte).
            this.updateFrameChecksum(cardData, slot);

            // 2. Clear Data Block(s)?
            // Technically not required for "Delete", just marking directory as free is enough.
            // But checking for linked blocks would be good.
            
            // 3. Write back
            // If offset > 0, we need to respect it.
            await fs.writeFile(filePath, buffer);
            return {
                success: true,
                deletedEntry: deletedEntry.toString("base64"),
                deletedTitle: deletedTitle || "Deleted Save",
                slot: Number(slot)
            };

        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    updateFrameChecksum(cardData, slot) {
        const dirOffset = slot * 128;
        let checksum = 0;
        for (let i = 0; i < 127; i++) {
            checksum ^= cardData[dirOffset + i];
        }
        cardData[dirOffset + 127] = checksum;
    }

    /**
     * Rename a save file
     * @param {string} filePath 
     * @param {number} slot Index 1-15
     * @param {string} newName 
     */
    async renameSave(filePath, slot, newName) {
        try {
            const cardView = await this.readCardBuffer(filePath);
            if (!cardView.success) return { success: false, message: cardView.message };
            const { buffer, cardData } = cardView;

            const dirOffset = slot * 128;
            if (cardData[dirOffset] !== 0x51) {
                return { success: false, message: "Slot is empty or invalid." };
            }

            // Encode Name (Shift-JIS or ASCII)
            // For simplicity, we write ASCII. PS1 supports Shift-JIS.
            // Clear existing name area (64 bytes at offset 12)
            const nameAreaStart = dirOffset + 12;
            cardData.fill(0, nameAreaStart, nameAreaStart + 64);
            
            // Write new name
            cardData.write(newName, nameAreaStart, 64, 'ascii');
            
            // Update checksum
            this.updateFrameChecksum(cardData, slot);
            
            await fs.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Format the memory card (Clear all saves)
     * @param {string} filePath 
     */
    async formatCard(filePath) {
        try {
            // Create a standard blank PS1 memory card image
            const buffer = Buffer.alloc(131072); // 128KB
            
            // 1. Header (Block 0, Frame 0)
            buffer.write("MC", 0, "ascii");
            buffer[127] = 0x0E; // Checksum for empty header? 
            // Actually, we should probably just use a template or minimally valid header.
            // "MC" + 125 bytes of 0 + checksum.
            
            // However, it's safer to just clear the directory frames (1-15).
            // Retain the header of the existing card if possible?
            // Or overwrite with a known blank template?
            
            // Let's try to "Quick Format" (Clear Directory).
            const existingBuffer = await fs.readFile(filePath);
            let offset = (existingBuffer.length === 131200) ? 128 : 0;
            
            // Copy existing buffer to preserve header info if valid
            existingBuffer.copy(buffer, 0, offset, offset + 131072);
            
            // Clear Directory Frames 1-15 (Offset 128 to 128*16)
            for (let i = 1; i <= 15; i++) {
                const dirOffset = i * 128;
                // Set to 0xA0 (Free)
                buffer[dirOffset] = 0xA0;
                // Clear the rest
                buffer.fill(0, dirOffset + 1, dirOffset + 128);
                // Update Checksum
                let checksum = 0;
                for (let b = 0; b < 127; b++) checksum ^= buffer[dirOffset + b];
                buffer[dirOffset + 127] = checksum;
            }
            
            // We should also clear the Broken Sector list and BAT?
            // For now, clearing directory is effectively formatting for most readers.
            
            // Write back
            if (offset > 0) {
                // Handle DexDrive header
                const finalBuffer = Buffer.alloc(131200);
                existingBuffer.copy(finalBuffer, 0, 0, 128); // Copy header
                buffer.copy(finalBuffer, 128); // Copy data
                await fs.writeFile(filePath, finalBuffer);
            } else {
                await fs.writeFile(filePath, buffer);
            }
            
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async undeleteSave(filePath, slot, deletedEntryBase64) {
        try {
            const entryBuffer = Buffer.from(String(deletedEntryBase64 || ""), "base64");
            if (entryBuffer.length !== SECTOR_SIZE) {
                return { success: false, message: "Invalid deleted-save payload." };
            }

            const cardView = await this.readCardBuffer(filePath);
            if (!cardView.success) return { success: false, message: cardView.message };
            const { buffer, cardData } = cardView;

            const dirOffset = Number(slot) * SECTOR_SIZE;
            if (!this.isSlotFree(cardData, Number(slot))) {
                return { success: false, message: "Target slot is no longer free." };
            }

            entryBuffer.copy(cardData, dirOffset);
            if (cardData[dirOffset] !== 0x51) cardData[dirOffset] = 0x51;
            this.updateFrameChecksum(cardData, Number(slot));
            await fs.writeFile(filePath, buffer);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async createEmptyCard(filePath) {
        try {
            const targetPath = String(filePath || "").trim();
            if (!targetPath) return { success: false, message: "Missing target path." };
            await fs.mkdir(path.dirname(targetPath), { recursive: true });

            const buffer = Buffer.alloc(131072);
            buffer.write("MC", 0, "ascii");

            for (let slot = 1; slot <= DIR_ENTRIES; slot++) {
                const dirOffset = slot * SECTOR_SIZE;
                buffer[dirOffset] = 0xA0;
                buffer.fill(0, dirOffset + 1, dirOffset + SECTOR_SIZE);
                this.updateFrameChecksum(buffer, slot);
            }

            await fs.writeFile(targetPath, buffer);
            return { success: true, filePath: targetPath };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async copySaveToCard(sourcePath, sourceSlot, targetPath) {
        try {
            const sourceView = await this.readCardBuffer(sourcePath);
            if (!sourceView.success) return { success: false, message: sourceView.message };
            const targetView = await this.readCardBuffer(targetPath);
            if (!targetView.success) return { success: false, message: targetView.message };

            const sourceCard = sourceView.cardData;
            const targetCard = targetView.cardData;
            const srcSlot = Number(sourceSlot);

            if (!this.isSlotStartInUse(sourceCard, srcSlot)) {
                return { success: false, message: "Source slot is empty or invalid." };
            }

            const usage = this.getSaveBlockUsage(sourceCard, srcSlot);
            if (usage.blocksUsed !== 1) {
                return { success: false, message: "Only single-block PS1 saves are supported for copy right now." };
            }

            const targetSlot = this.findFirstFreeSlot(targetCard);
            if (!targetSlot) {
                return { success: false, message: "No free slot available on target card." };
            }

            const sourceDirOffset = srcSlot * SECTOR_SIZE;
            const sourceBlockOffset = srcSlot * BLOCK_SIZE;
            const targetDirOffset = targetSlot * SECTOR_SIZE;
            const targetBlockOffset = targetSlot * BLOCK_SIZE;

            sourceCard.copy(targetCard, targetBlockOffset, sourceBlockOffset, sourceBlockOffset + BLOCK_SIZE);
            sourceCard.copy(targetCard, targetDirOffset, sourceDirOffset, sourceDirOffset + SECTOR_SIZE);
            targetCard[targetDirOffset] = 0x51;
            this.updateFrameChecksum(targetCard, targetSlot);

            await fs.writeFile(targetPath, targetView.buffer);
            return { success: true, targetSlot };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async exportSave(filePath, slot, outputPath) {
        try {
            const sourceView = await this.readCardBuffer(filePath);
            if (!sourceView.success) return { success: false, message: sourceView.message };
            const cardData = sourceView.cardData;
            const srcSlot = Number(slot);

            if (!this.isSlotStartInUse(cardData, srcSlot)) {
                return { success: false, message: "Source slot is empty or invalid." };
            }

            const usage = this.getSaveBlockUsage(cardData, srcSlot);
            if (usage.blocksUsed !== 1) {
                return { success: false, message: "Only single-block PS1 saves can be exported right now." };
            }

            const outPath = String(outputPath || "").trim();
            if (!outPath) return { success: false, message: "Missing output path." };
            await fs.mkdir(path.dirname(outPath), { recursive: true });

            const outBuffer = Buffer.alloc(SECTOR_SIZE + BLOCK_SIZE);
            const dirOffset = srcSlot * SECTOR_SIZE;
            const blockOffset = srcSlot * BLOCK_SIZE;
            cardData.copy(outBuffer, 0, dirOffset, dirOffset + SECTOR_SIZE);
            cardData.copy(outBuffer, SECTOR_SIZE, blockOffset, blockOffset + BLOCK_SIZE);
            await fs.writeFile(outPath, outBuffer);
            return { success: true, outputPath: outPath };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async importSave(filePath, importFilePath) {
        try {
            const cardView = await this.readCardBuffer(filePath);
            if (!cardView.success) return { success: false, message: cardView.message };
            const { cardData, buffer } = cardView;

            const importPath = String(importFilePath || "").trim();
            if (!importPath) return { success: false, message: "Missing import file path." };
            const importBuffer = await fs.readFile(importPath);

            let dirEntry = null;
            let saveBlock = null;

            if (importBuffer.length >= (SECTOR_SIZE + BLOCK_SIZE)) {
                dirEntry = Buffer.from(importBuffer.slice(0, SECTOR_SIZE));
                saveBlock = Buffer.from(importBuffer.slice(SECTOR_SIZE, SECTOR_SIZE + BLOCK_SIZE));
            } else if (importBuffer.length >= BLOCK_SIZE) {
                saveBlock = Buffer.from(importBuffer.slice(0, BLOCK_SIZE));
            } else {
                return { success: false, message: "Import file is too small." };
            }

            if (!dirEntry) {
                const nameFromFile = path.basename(importPath, path.extname(importPath));
                dirEntry = this.buildDirectoryEntryForSingleBlock(nameFromFile, BLOCK_SIZE);
            }

            const fileSize = Number(dirEntry.readUInt32LE(4) || BLOCK_SIZE);
            const blocksUsed = Math.max(1, Math.ceil(fileSize / BLOCK_SIZE));
            if (blocksUsed !== 1) {
                return { success: false, message: "Only single-block PS1 saves can be imported right now." };
            }

            const targetSlot = this.findFirstFreeSlot(cardData);
            if (!targetSlot) return { success: false, message: "No free slot available on this card." };

            const targetDirOffset = targetSlot * SECTOR_SIZE;
            const targetBlockOffset = targetSlot * BLOCK_SIZE;

            saveBlock.copy(cardData, targetBlockOffset, 0, BLOCK_SIZE);
            dirEntry.copy(cardData, targetDirOffset, 0, SECTOR_SIZE);
            cardData[targetDirOffset] = 0x51;
            if (Number(cardData.readUInt32LE(targetDirOffset + 4) || 0) <= 0) {
                cardData.writeUInt32LE(BLOCK_SIZE, targetDirOffset + 4);
            }
            this.updateFrameChecksum(cardData, targetSlot);

            await fs.writeFile(filePath, buffer);
            return { success: true, targetSlot };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}

module.exports = new PS1CardHandler();
