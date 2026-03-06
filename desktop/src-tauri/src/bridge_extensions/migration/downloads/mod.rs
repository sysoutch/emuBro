use super::*;

mod emulator_rows;
mod installer;
mod url_helpers;

pub(super) fn ensure_http_url(raw: &str) -> String {
    url_helpers::ensure_http_url(raw)
}

pub(super) fn sanitize_path_segment(value: &str, fallback: &str) -> String {
    url_helpers::sanitize_path_segment(value, fallback)
}

pub(super) fn upsert_emulator_row(
    name: &str,
    platform: &str,
    platform_short_name: &str,
    file_path: &str,
    website: &str,
    start_parameters: &str,
    emulator_type: &str,
) -> Result<Value, String> {
    emulator_rows::upsert_emulator_row(
        name,
        platform,
        platform_short_name,
        file_path,
        website,
        start_parameters,
        emulator_type,
    )
}

pub(super) fn get_emulator_download_options(payload: &Value) -> Value {
    installer::get_emulator_download_options(payload)
}

pub(super) fn download_and_install_emulator(payload: &Value) -> Value {
    installer::download_and_install_emulator(payload)
}
