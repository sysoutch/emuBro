const fs = require('fs').promises;
const fsSync = require('fs');

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
        // Palette at 0x60
        const palette = [];
        for (let p = 0; p < 16; p++) {
            const colorVal = dataBlock.readUInt16LE(0x60 + (p * 2));
            // 15-bit color (R5 G5 B5)
            // Bit 15 is STP (Transparency/Semi-transparency) usually. 
            // If STP=1 and RGB=0 -> Transparent?
            // Simplified:
            const r = (colorVal & 0x1F) << 3;
            const g = ((colorVal >> 5) & 0x1F) << 3;
            const b = ((colorVal >> 10) & 0x1F) << 3;
            const a = (p === 0) ? 0 : 255; // Index 0 is usually background/transparent
            palette.push([r, g, b, a]);
        }

        // Bitmap at 0x80 (128 bytes)
        // 16x16 pixels, 4 bits per pixel = 256 pixels * 0.5 bytes = 128 bytes
        const bitmap = dataBlock.slice(0x80, 0x80 + 128);
        
        // Decode to RGBA buffer
        const width = 16;
        const height = 16;
        const pixels = new Uint8ClampedArray(width * height * 4);

        for (let i = 0; i < bitmap.length; i++) {
            const byte = bitmap[i];
            const low = byte & 0x0F;
            const high = (byte >> 4) & 0x0F;

            // Pixel 2*i
            let col = palette[low];
            let idx = (i * 2) * 4;
            pixels[idx] = col[0];
            pixels[idx+1] = col[1];
            pixels[idx+2] = col[2];
            pixels[idx+3] = col[3];

            // Pixel 2*i + 1
            col = palette[high];
            idx = (i * 2 + 1) * 4;
            pixels[idx] = col[0];
            pixels[idx+1] = col[1];
            pixels[idx+2] = col[2];
            pixels[idx+3] = col[3];
        }

        return {
            width, 
            height, 
            pixels: Array.from(pixels) // Convert to array for JSON serialization
        };
    }

    /**
     * Delete a save from the card
     * @param {string} filePath 
     * @param {number} slot Index 1-15
     */
    async deleteSave(filePath, slot) {
        try {
            const buffer = await fs.readFile(filePath);
            let offset = (buffer.length === 131200) ? 128 : 0;
            const cardData = buffer.slice(offset, offset + 131072);

            // 1. Mark Directory Frame as Free (0xA0)
            const dirOffset = slot * 128;
            
            // Check if it's actually in use
            if (cardData[dirOffset] !== 0x51) {
                return { success: false, message: "Slot is not the start of a file." };
            }

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
            if (offset > 0) {
                // Copy modified slice back to original buffer
                cardData.copy(buffer, offset);
            }
            
            await fs.writeFile(filePath, buffer);
            return { success: true };

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
            const buffer = await fs.readFile(filePath);
            let offset = (buffer.length === 131200) ? 128 : 0;
            const cardData = buffer.slice(offset, offset + 131072);

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
}

module.exports = new PS1CardHandler();
