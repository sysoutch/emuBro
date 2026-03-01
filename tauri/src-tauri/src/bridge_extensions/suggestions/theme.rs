use super::*;

pub(super) fn color_for_mood(mood: &str) -> &'static str {
    match mood.trim().to_lowercase().as_str() {
        "calm" => "#3da9fc",
        "neon" => "#ff2d95",
        "retro" => "#f4b400",
        "dark" => "#8b5cf6",
        "aggressive" => "#ef4444",
        _ => "#66ccff",
    }
}

fn clamp_u8(value: i32) -> u8 {
    value.clamp(0, 255) as u8
}

fn hex_to_rgb(hex: &str) -> (u8, u8, u8) {
    let clean = hex.trim().trim_start_matches('#');
    if clean.len() != 6 {
        return (102, 204, 255);
    }
    let r = u8::from_str_radix(&clean[0..2], 16).unwrap_or(102);
    let g = u8::from_str_radix(&clean[2..4], 16).unwrap_or(204);
    let b = u8::from_str_radix(&clean[4..6], 16).unwrap_or(255);
    (r, g, b)
}

fn rgb_to_hex(r: u8, g: u8, b: u8) -> String {
    format!("#{:02x}{:02x}{:02x}", r, g, b)
}

pub(super) fn mix(hex: &str, delta: i32) -> String {
    let (r, g, b) = hex_to_rgb(hex);
    rgb_to_hex(
        clamp_u8(r as i32 + delta),
        clamp_u8(g as i32 + delta),
        clamp_u8(b as i32 + delta),
    )
}
