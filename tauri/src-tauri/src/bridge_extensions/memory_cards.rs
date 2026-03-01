use super::*;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;

const CARD_SIZE: usize = 128 * 1024;
const DEXDRIVE_OFFSET: usize = 128;
const DEXDRIVE_SIZE: usize = CARD_SIZE + DEXDRIVE_OFFSET;
const BLOCK_SIZE: usize = 8192;
const SECTOR_SIZE: usize = 128;
const DIR_ENTRIES: usize = 15;

struct CardView {
    buffer: Vec<u8>,
    offset: usize,
}

impl CardView {
    fn card(&self) -> &[u8] {
        &self.buffer[self.offset..self.offset + CARD_SIZE]
    }

    fn card_mut(&mut self) -> &mut [u8] {
        let start = self.offset;
        let end = start + CARD_SIZE;
        &mut self.buffer[start..end]
    }
}

fn read_u16_le(data: &[u8], offset: usize) -> Option<u16> {
    data.get(offset..offset + 2)
        .and_then(|bytes| bytes.try_into().ok())
        .map(u16::from_le_bytes)
}

fn read_u32_le(data: &[u8], offset: usize) -> Option<u32> {
    data.get(offset..offset + 4)
        .and_then(|bytes| bytes.try_into().ok())
        .map(u32::from_le_bytes)
}

fn read_card_view(path: &Path) -> Result<CardView, String> {
    let buffer = fs::read(path).map_err(|e| e.to_string())?;
    let offset = match buffer.len() {
        CARD_SIZE => 0,
        DEXDRIVE_SIZE => DEXDRIVE_OFFSET,
        _ => {
            return Err("Unsupported memory card size.".to_string());
        }
    };

    Ok(CardView { buffer, offset })
}

fn parse_ps2_card(path: &Path) -> Result<Value, String> {
    let buffer = fs::read(path).map_err(|e| e.to_string())?;
    const MAGIC: &str = "Sony PS2 Memory Card Format ";
    let is_ps2 = buffer
        .get(0..MAGIC.len())
        .map(|bytes| bytes == MAGIC.as_bytes())
        .unwrap_or(false);
    if !is_ps2 {
        return Err("Unsupported memory card format.".to_string());
    }

    let page_size = read_u16_le(&buffer, 0x28).unwrap_or(0);
    let pages_per_block = read_u16_le(&buffer, 0x2A).unwrap_or(0);
    let pages_per_cluster = read_u16_le(&buffer, 0x2C).unwrap_or(0);

    Ok(json!({
        "success": true,
        "data": {
            "format": "PlayStation 2",
            "totalSize": buffer.len(),
            "pageSize": page_size,
            "pagesPerBlock": pages_per_block,
            "pagesPerCluster": pages_per_cluster,
            "message": "PS2 Card identified. Detailed directory parsing coming soon."
        }
    }))
}

fn text_from_ascii(bytes: &[u8]) -> String {
    let mut out = String::from_utf8_lossy(bytes).replace('\0', "");
    out = out.trim().to_string();
    out
}

fn sanitize_ascii_name(input: &str, max_len: usize) -> String {
    let mut out = String::new();
    for ch in input.trim().chars() {
        if ch.is_ascii_graphic() || ch == ' ' {
            out.push(ch);
        } else {
            out.push(' ');
        }
    }
    let normalized = out.split_whitespace().collect::<Vec<&str>>().join(" ");
    if normalized.is_empty() {
        return "Imported Save".to_string();
    }
    normalized.chars().take(max_len).collect::<String>()
}

fn update_frame_checksum(card: &mut [u8], slot: usize) {
    let offset = slot * SECTOR_SIZE;
    if offset + SECTOR_SIZE > card.len() {
        return;
    }
    let mut checksum: u8 = 0;
    for i in 0..127 {
        checksum ^= card[offset + i];
    }
    card[offset + 127] = checksum;
}

fn is_slot_start_in_use(card: &[u8], slot: usize) -> bool {
    let offset = slot * SECTOR_SIZE;
    card.get(offset).copied().unwrap_or(0) == 0x51
}

fn is_slot_free(card: &[u8], slot: usize) -> bool {
    let offset = slot * SECTOR_SIZE;
    match card.get(offset).copied().unwrap_or(0) {
        0xA0 | 0x00 | 0xFF => true,
        _ => false,
    }
}

fn find_first_free_slot(card: &[u8]) -> Option<usize> {
    (1..=DIR_ENTRIES).find(|slot| is_slot_free(card, *slot))
}

fn get_save_block_usage(card: &[u8], slot: usize) -> (u32, usize) {
    let offset = slot * SECTOR_SIZE;
    let file_size = read_u32_le(card, offset + 4).unwrap_or(0);
    let blocks = ((file_size.max(1) as usize) + BLOCK_SIZE - 1) / BLOCK_SIZE;
    (file_size, blocks.max(1))
}

fn pixels_to_value(pixels: &[u8]) -> Value {
    Value::Array(
        pixels
            .iter()
            .map(|b| Value::Number((*b as u64).into()))
            .collect::<Vec<Value>>(),
    )
}

fn extract_icon(block: &[u8]) -> Option<Value> {
    if block.len() < 0x80 + 128 {
        return None;
    }

    let width = 16usize;
    let height = 16usize;

    let icon_flag = block.get(0x02).copied().unwrap_or(0);
    let mut frame_count = (icon_flag & 0x03) as usize;
    if !(1..=3).contains(&frame_count) {
        frame_count = 1;
    }

    let mut palette = Vec::<[u8; 4]>::with_capacity(16);
    for p in 0..16usize {
        let value = read_u16_le(block, 0x60 + (p * 2)).unwrap_or(0);
        let r = ((value & 0x1F) << 3) as u8;
        let g = (((value >> 5) & 0x1F) << 3) as u8;
        let b = (((value >> 10) & 0x1F) << 3) as u8;
        let a = if p == 0 { 0 } else { 255 };
        palette.push([r, g, b, a]);
    }

    let mut frames = Vec::<Value>::new();
    for f in 0..frame_count {
        let frame_offset = 0x80 + (f * 128);
        let Some(bitmap) = block.get(frame_offset..frame_offset + 128) else {
            continue;
        };
        let mut pixels = vec![0u8; width * height * 4];
        for (index, byte) in bitmap.iter().enumerate() {
            let low = (byte & 0x0F) as usize;
            let high = ((byte >> 4) & 0x0F) as usize;

            let low_color = palette.get(low).copied().unwrap_or([0, 0, 0, 0]);
            let high_color = palette.get(high).copied().unwrap_or([0, 0, 0, 0]);

            let low_idx = (index * 2) * 4;
            let high_idx = (index * 2 + 1) * 4;
            if low_idx + 3 < pixels.len() {
                pixels[low_idx] = low_color[0];
                pixels[low_idx + 1] = low_color[1];
                pixels[low_idx + 2] = low_color[2];
                pixels[low_idx + 3] = low_color[3];
            }
            if high_idx + 3 < pixels.len() {
                pixels[high_idx] = high_color[0];
                pixels[high_idx + 1] = high_color[1];
                pixels[high_idx + 2] = high_color[2];
                pixels[high_idx + 3] = high_color[3];
            }
        }

        frames.push(json!({
            "width": width,
            "height": height,
            "pixels": pixels_to_value(&pixels)
        }));
    }

    if frames.is_empty() {
        return None;
    }

    let first_pixels = frames
        .get(0)
        .and_then(|frame| frame.get("pixels"))
        .cloned()
        .unwrap_or_else(|| Value::Array(Vec::new()));

    Some(json!({
        "width": width,
        "height": height,
        "pixels": first_pixels,
        "frames": Value::Array(frames.clone()),
        "frameCount": frames.len(),
        "isAnimated": frames.len() > 1,
        "iconFlag": icon_flag
    }))
}

fn read_ps1_card(path: &Path) -> Result<Value, String> {
    let view = read_card_view(path)?;
    let card = view.card();

    let mut saves = Vec::<Value>::new();
    let mut used_slots = HashSet::<usize>::new();

    for slot in 1..=DIR_ENTRIES {
        let dir_offset = slot * SECTOR_SIZE;
        let state = card.get(dir_offset).copied().unwrap_or(0);
        if state != 0x51 {
            continue;
        }

        let file_size = read_u32_le(card, dir_offset + 4).unwrap_or(0);
        let blocks_used = ((file_size as usize) + BLOCK_SIZE - 1) / BLOCK_SIZE;
        let blocks_used = blocks_used.max(1);

        let title_raw = card
            .get(dir_offset + 12..dir_offset + 76)
            .unwrap_or(&[]);
        let title = {
            let parsed = text_from_ascii(title_raw);
            if parsed.is_empty() {
                "Untitled".to_string()
            } else {
                parsed
            }
        };
        let product_code = text_from_ascii(title_raw.get(0..12).unwrap_or(&[]));

        let block_offset = slot * BLOCK_SIZE;
        if block_offset + BLOCK_SIZE > card.len() {
            continue;
        }

        let data_block = &card[block_offset..block_offset + BLOCK_SIZE];
        let icon = if data_block.get(0..2) == Some(b"SC".as_slice()) {
            extract_icon(data_block)
        } else {
            None
        };

        used_slots.insert(slot);
        saves.push(json!({
            "slot": slot,
            "title": title,
            "productCode": product_code,
            "size": file_size,
            "blocks": blocks_used,
            "icon": icon,
            "isMultiBlock": blocks_used > 1
        }));
    }

    Ok(json!({
        "success": true,
        "data": {
            "format": "PlayStation 1",
            "saves": Value::Array(saves),
            "freeBlocks": (DIR_ENTRIES.saturating_sub(used_slots.len())) as i64,
            "cardSize": CARD_SIZE,
            "rawPath": path.to_string_lossy().to_string()
        }
    }))
}

fn read_memory_card(path: &Path) -> Result<Value, String> {
    match read_ps1_card(path) {
        Ok(value) => Ok(value),
        Err(_) => parse_ps2_card(path),
    }
}

fn build_single_block_dir_entry(name: &str, file_size: u32) -> [u8; SECTOR_SIZE] {
    let mut entry = [0u8; SECTOR_SIZE];
    entry[0] = 0x51;
    let size = file_size.max(BLOCK_SIZE as u32);
    entry[4..8].copy_from_slice(&size.to_le_bytes());
    entry[8..10].copy_from_slice(&0xFFFFu16.to_le_bytes());
    let safe_name = sanitize_ascii_name(name, 64);
    let bytes = safe_name.as_bytes();
    let len = bytes.len().min(64);
    entry[12..12 + len].copy_from_slice(&bytes[..len]);
    entry
}

fn delete_save(path: &Path, slot: usize) -> Result<Value, String> {
    if !(1..=DIR_ENTRIES).contains(&slot) {
        return Ok(json!({ "success": false, "message": "Slot out of range." }));
    }

    let mut view = read_card_view(path)?;
    let card = view.card_mut();
    let dir_offset = slot * SECTOR_SIZE;
    if card.get(dir_offset).copied().unwrap_or(0) != 0x51 {
        return Ok(json!({ "success": false, "message": "Slot is not the start of a file." }));
    }

    let deleted_entry = card[dir_offset..dir_offset + SECTOR_SIZE].to_vec();
    let deleted_title = text_from_ascii(&deleted_entry[12..76]);

    card[dir_offset] = 0xA0;
    update_frame_checksum(card, slot);

    fs::write(path, &view.buffer).map_err(|e| e.to_string())?;

    Ok(json!({
        "success": true,
        "deletedEntry": BASE64_STANDARD.encode(deleted_entry),
        "deletedTitle": if deleted_title.is_empty() { "Deleted Save".to_string() } else { deleted_title },
        "slot": slot
    }))
}

fn rename_save(path: &Path, slot: usize, new_name: &str) -> Result<Value, String> {
    if !(1..=DIR_ENTRIES).contains(&slot) {
        return Ok(json!({ "success": false, "message": "Slot out of range." }));
    }

    let mut view = read_card_view(path)?;
    let card = view.card_mut();
    let dir_offset = slot * SECTOR_SIZE;
    if card.get(dir_offset).copied().unwrap_or(0) != 0x51 {
        return Ok(json!({ "success": false, "message": "Slot is empty or invalid." }));
    }

    let safe = sanitize_ascii_name(new_name, 64);
    let bytes = safe.as_bytes();
    card[dir_offset + 12..dir_offset + 76].fill(0);
    let len = bytes.len().min(64);
    card[dir_offset + 12..dir_offset + 12 + len].copy_from_slice(&bytes[..len]);
    update_frame_checksum(card, slot);

    fs::write(path, &view.buffer).map_err(|e| e.to_string())?;
    Ok(json!({ "success": true }))
}

fn format_card(path: &Path) -> Result<Value, String> {
    let mut raw = fs::read(path).map_err(|e| e.to_string())?;
    let offset = match raw.len() {
        CARD_SIZE => 0,
        DEXDRIVE_SIZE => DEXDRIVE_OFFSET,
        _ => return Ok(json!({ "success": false, "message": "Unsupported memory card size." })),
    };

    let mut card = raw[offset..offset + CARD_SIZE].to_vec();
    for slot in 1..=DIR_ENTRIES {
        let dir_offset = slot * SECTOR_SIZE;
        card[dir_offset] = 0xA0;
        card[dir_offset + 1..dir_offset + SECTOR_SIZE].fill(0);
        update_frame_checksum(&mut card, slot);
    }

    if offset > 0 {
        raw[offset..offset + CARD_SIZE].copy_from_slice(&card);
        fs::write(path, raw).map_err(|e| e.to_string())?;
    } else {
        fs::write(path, card).map_err(|e| e.to_string())?;
    }

    Ok(json!({ "success": true }))
}

fn create_empty_card(path: &Path) -> Result<Value, String> {
    if let Some(parent) = path.parent() {
        ensure_directory(parent)?;
    }

    let mut card = vec![0u8; CARD_SIZE];
    card[0] = b'M';
    card[1] = b'C';
    for slot in 1..=DIR_ENTRIES {
        let dir_offset = slot * SECTOR_SIZE;
        card[dir_offset] = 0xA0;
        card[dir_offset + 1..dir_offset + SECTOR_SIZE].fill(0);
        update_frame_checksum(&mut card, slot);
    }

    fs::write(path, card).map_err(|e| e.to_string())?;
    Ok(json!({
        "success": true,
        "filePath": path.to_string_lossy().to_string()
    }))
}

fn copy_save_to_card(source_path: &Path, source_slot: usize, target_path: &Path) -> Result<Value, String> {
    if !(1..=DIR_ENTRIES).contains(&source_slot) {
        return Ok(json!({ "success": false, "message": "Source slot out of range." }));
    }

    let source = read_card_view(source_path)?;
    let mut target = read_card_view(target_path)?;
    let source_card = source.card();
    let target_card = target.card_mut();

    if !is_slot_start_in_use(source_card, source_slot) {
        return Ok(json!({ "success": false, "message": "Source slot is empty or invalid." }));
    }

    let (_, blocks_used) = get_save_block_usage(source_card, source_slot);
    if blocks_used != 1 {
        return Ok(json!({
            "success": false,
            "message": "Only single-block PS1 saves are supported for copy right now."
        }));
    }

    let Some(target_slot) = find_first_free_slot(target_card) else {
        return Ok(json!({ "success": false, "message": "No free slot available on target card." }));
    };

    let source_dir_offset = source_slot * SECTOR_SIZE;
    let source_block_offset = source_slot * BLOCK_SIZE;
    let target_dir_offset = target_slot * SECTOR_SIZE;
    let target_block_offset = target_slot * BLOCK_SIZE;

    target_card[target_block_offset..target_block_offset + BLOCK_SIZE]
        .copy_from_slice(&source_card[source_block_offset..source_block_offset + BLOCK_SIZE]);
    target_card[target_dir_offset..target_dir_offset + SECTOR_SIZE]
        .copy_from_slice(&source_card[source_dir_offset..source_dir_offset + SECTOR_SIZE]);
    target_card[target_dir_offset] = 0x51;
    update_frame_checksum(target_card, target_slot);

    fs::write(target_path, &target.buffer).map_err(|e| e.to_string())?;
    Ok(json!({ "success": true, "targetSlot": target_slot }))
}

fn export_save(path: &Path, slot: usize, output_path: &Path) -> Result<Value, String> {
    if !(1..=DIR_ENTRIES).contains(&slot) {
        return Ok(json!({ "success": false, "message": "Slot out of range." }));
    }

    let source = read_card_view(path)?;
    let card = source.card();

    if !is_slot_start_in_use(card, slot) {
        return Ok(json!({ "success": false, "message": "Source slot is empty or invalid." }));
    }

    let (_, blocks_used) = get_save_block_usage(card, slot);
    if blocks_used != 1 {
        return Ok(json!({
            "success": false,
            "message": "Only single-block PS1 saves can be exported right now."
        }));
    }

    if let Some(parent) = output_path.parent() {
        ensure_directory(parent)?;
    }

    let mut out = vec![0u8; SECTOR_SIZE + BLOCK_SIZE];
    let dir_offset = slot * SECTOR_SIZE;
    let block_offset = slot * BLOCK_SIZE;
    out[0..SECTOR_SIZE].copy_from_slice(&card[dir_offset..dir_offset + SECTOR_SIZE]);
    out[SECTOR_SIZE..SECTOR_SIZE + BLOCK_SIZE]
        .copy_from_slice(&card[block_offset..block_offset + BLOCK_SIZE]);

    fs::write(output_path, out).map_err(|e| e.to_string())?;
    Ok(json!({
        "success": true,
        "outputPath": output_path.to_string_lossy().to_string()
    }))
}

fn import_save(path: &Path, import_path: &Path) -> Result<Value, String> {
    let mut target = read_card_view(path)?;
    let card = target.card_mut();

    let import_buffer = fs::read(import_path).map_err(|e| e.to_string())?;
    let (dir_entry, save_block) = if import_buffer.len() >= SECTOR_SIZE + BLOCK_SIZE {
        (
            import_buffer[0..SECTOR_SIZE].to_vec(),
            import_buffer[SECTOR_SIZE..SECTOR_SIZE + BLOCK_SIZE].to_vec(),
        )
    } else if import_buffer.len() >= BLOCK_SIZE {
        let name = import_path
            .file_stem()
            .and_then(|v| v.to_str())
            .unwrap_or("Imported Save");
        (
            build_single_block_dir_entry(name, BLOCK_SIZE as u32).to_vec(),
            import_buffer[0..BLOCK_SIZE].to_vec(),
        )
    } else {
        return Ok(json!({ "success": false, "message": "Import file is too small." }));
    };

    let file_size = read_u32_le(&dir_entry, 4).unwrap_or(BLOCK_SIZE as u32);
    let blocks = ((file_size.max(1) as usize) + BLOCK_SIZE - 1) / BLOCK_SIZE;
    if blocks != 1 {
        return Ok(json!({
            "success": false,
            "message": "Only single-block PS1 saves can be imported right now."
        }));
    }

    let Some(target_slot) = find_first_free_slot(card) else {
        return Ok(json!({ "success": false, "message": "No free slot available on this card." }));
    };

    let dir_offset = target_slot * SECTOR_SIZE;
    let block_offset = target_slot * BLOCK_SIZE;

    card[block_offset..block_offset + BLOCK_SIZE].copy_from_slice(&save_block);
    card[dir_offset..dir_offset + SECTOR_SIZE].copy_from_slice(&dir_entry);
    card[dir_offset] = 0x51;
    if read_u32_le(card, dir_offset + 4).unwrap_or(0) == 0 {
        card[dir_offset + 4..dir_offset + 8].copy_from_slice(&(BLOCK_SIZE as u32).to_le_bytes());
    }
    update_frame_checksum(card, target_slot);

    fs::write(path, &target.buffer).map_err(|e| e.to_string())?;
    Ok(json!({ "success": true, "targetSlot": target_slot }))
}

fn undelete_save(path: &Path, slot: usize, deleted_entry_base64: &str) -> Result<Value, String> {
    if !(1..=DIR_ENTRIES).contains(&slot) {
        return Ok(json!({ "success": false, "message": "Slot out of range." }));
    }

    let decoded = BASE64_STANDARD
        .decode(deleted_entry_base64.trim())
        .map_err(|e| e.to_string())?;
    if decoded.len() != SECTOR_SIZE {
        return Ok(json!({ "success": false, "message": "Invalid deleted-save payload." }));
    }

    let mut view = read_card_view(path)?;
    let card = view.card_mut();
    if !is_slot_free(card, slot) {
        return Ok(json!({ "success": false, "message": "Target slot is no longer free." }));
    }

    let offset = slot * SECTOR_SIZE;
    card[offset..offset + SECTOR_SIZE].copy_from_slice(&decoded);
    if card[offset] != 0x51 {
        card[offset] = 0x51;
    }
    update_frame_checksum(card, slot);

    fs::write(path, &view.buffer).map_err(|e| e.to_string())?;
    Ok(json!({ "success": true }))
}

fn browse_memory_cards(root_hint: &str) -> Value {
    let search_root = if root_hint.trim().is_empty() {
        user_home_dir().unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")))
    } else if cfg!(target_os = "windows")
        && root_hint.trim().len() == 2
        && root_hint.trim().ends_with(':')
    {
        PathBuf::from(format!("{}\\", root_hint.trim()))
    } else {
        PathBuf::from(root_hint.trim())
    };

    if !search_root.exists() || !search_root.is_dir() {
        return json!({ "success": false, "message": "Search root folder not found." });
    }

    let mut cards = Vec::<Value>::new();
    let extensions = HashSet::<&'static str>::from(["mcr", "mcd", "gme", "ps2", "max", "psu"]);

    let walker = WalkDir::new(&search_root)
        .follow_links(false)
        .into_iter()
        .filter_entry(|entry| {
            if entry.depth() == 0 {
                return true;
            }
            if !entry.file_type().is_dir() {
                return true;
            }
            let name = entry.file_name().to_string_lossy();
            !(name.starts_with('$') || name.starts_with('.'))
        });

    for row in walker {
        let Ok(entry) = row else {
            continue;
        };
        if !entry.file_type().is_file() {
            continue;
        }
        let ext = entry
            .path()
            .extension()
            .and_then(|v| v.to_str())
            .unwrap_or("")
            .to_lowercase();
        if !extensions.contains(ext.as_str()) {
            continue;
        }

        let meta = match entry.metadata() {
            Ok(v) => v,
            Err(_) => continue,
        };
        let modified = meta
            .modified()
            .ok()
            .and_then(|v| v.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        cards.push(json!({
            "name": entry.file_name().to_string_lossy().to_string(),
            "path": entry.path().to_string_lossy().to_string(),
            "size": meta.len(),
            "modified": modified
        }));
    }

    cards.sort_by(|a, b| {
        let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
        a_name.cmp(&b_name)
    });

    json!({
        "success": true,
        "cards": Value::Array(cards)
    })
}

pub(crate) fn handle(channel: &str, args: &[Value]) -> Option<Result<Value, String>> {
    let result = match channel {
        "read-memory-card" => {
            let file_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() {
                Ok(json!({ "success": false, "message": "Missing memory card path." }))
            } else {
                match read_memory_card(Path::new(&file_path)) {
                    Ok(value) => Ok(value),
                    Err(message) => Ok(json!({ "success": false, "message": message })),
                }
            }
        }
        "delete-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let slot = payload.get("slot").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            if file_path.is_empty() || slot == 0 {
                return Some(Ok(json!({ "success": false, "message": "Missing delete-save payload." })));
            }
            delete_save(Path::new(&file_path), slot)
        }
        "rename-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let slot = payload.get("slot").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let new_name = payload
                .get("newName")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() || slot == 0 {
                return Some(Ok(json!({ "success": false, "message": "Missing rename-save payload." })));
            }
            rename_save(Path::new(&file_path), slot, &new_name)
        }
        "format-card" => {
            let file_path = args
                .get(0)
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing card path." })));
            }
            format_card(Path::new(&file_path))
        }
        "memory-card:create-empty" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = if payload.is_string() {
                payload.as_str().unwrap_or("").trim().to_string()
            } else {
                payload
                    .get("filePath")
                    .and_then(|v| v.as_str())
                    .unwrap_or("")
                    .trim()
                    .to_string()
            };
            if file_path.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing target path." })));
            }
            create_empty_card(Path::new(&file_path))
        }
        "copy-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let source_path = payload
                .get("sourcePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let source_slot = payload
                .get("sourceSlot")
                .and_then(|v| v.as_u64())
                .unwrap_or(0) as usize;
            let target_path = payload
                .get("targetPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if source_path.is_empty() || source_slot == 0 || target_path.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing source/slot/target for copy-save." })));
            }
            copy_save_to_card(
                Path::new(&source_path),
                source_slot,
                Path::new(&target_path),
            )
        }
        "export-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let slot = payload.get("slot").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let output_path = payload
                .get("outputPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() || slot == 0 || output_path.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing file/slot/output for export-save." })));
            }
            export_save(Path::new(&file_path), slot, Path::new(&output_path))
        }
        "import-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let import_path = payload
                .get("importPath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() || import_path.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing target card/import file for import-save." })));
            }
            import_save(Path::new(&file_path), Path::new(&import_path))
        }
        "undelete-save" => {
            let payload = args.get(0).cloned().unwrap_or_else(|| json!({}));
            let file_path = payload
                .get("filePath")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            let slot = payload.get("slot").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
            let deleted_entry = payload
                .get("deletedEntry")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .trim()
                .to_string();
            if file_path.is_empty() || slot == 0 || deleted_entry.is_empty() {
                return Some(Ok(json!({ "success": false, "message": "Missing undelete payload." })));
            }
            undelete_save(Path::new(&file_path), slot, &deleted_entry)
        }
        "browse-memory-cards" => {
            let selected_root = args.get(0).and_then(|v| v.as_str()).unwrap_or("");
            Ok(browse_memory_cards(selected_root))
        }
        _ => return None,
    };

    Some(result)
}
