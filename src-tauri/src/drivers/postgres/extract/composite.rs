use serde_json::{Map, Value as JsonValue};
use tokio_postgres::types::{Field, Kind};

use super::common::split_at_value_len;

#[inline]
pub fn extract_or_null(fields: &Vec<Field>, buf: &mut &[u8]) -> JsonValue {
    if buf.len() == 0 {
        // receiving an empty buffer is an error but it indicates a null value
        // log::error!("received empty buffer");
        return JsonValue::Null;
    };

    let mut map = serde_json::Map::with_capacity(fields.len());
    // ignore the error and return only the successfully extracted elements
    // and fill the map with nulls for any remaining fields
    extract_or_fill_nulls_into(fields, buf, &mut map);
    JsonValue::Object(map)
}

fn extract_or_fill_nulls_into(
    fields: &Vec<Field>,
    buf: &mut &[u8],
    map: &mut Map<String, JsonValue>,
) {
    // skip the composite length we already have fields
    if let Err(_) = super::common::advance_buf(buf, 4) {
        fill_nulls(fields, map);
        return;
    };

    let mut field;
    for i in 0..fields.len() {
        field = &fields[i];

        // skip the field type OID
        if let Err(_) = super::common::advance_buf(buf, 4) {
            fill_nulls(fields, map);
            return;
        }

        match try_extract_field(field, buf) {
            Ok(value) => {
                map.insert(field.name().to_string(), value);
            }
            Err(_) => {
                map.insert(field.name().to_string(), JsonValue::Null);

                if i + 1 < fields.len() {
                    // insert the reset of the fields with null values
                    fill_nulls(&fields[i + 1..], map);
                    return;
                }
            }
        }
    }
}

#[inline(always)]
fn fill_nulls(fields: &[Field], map: &mut Map<String, JsonValue>) {
    fields.iter().for_each(|f| {
        map.insert(f.name().to_string(), JsonValue::Null);
    });
}

#[inline]
/// the idea of returning a `Result` is to stop extracting further if error occurs
/// because it is most likely to fail anyway
fn try_extract_field(field: &Field, buf: &mut &[u8]) -> Result<JsonValue, ()> {
    let mut value_buf = split_at_value_len(buf)?;

    let ty = field.type_();

    Ok(match ty.kind() {
        Kind::Simple => super::simple::extract_or_null(ty, value_buf),
        Kind::Enum(_variants) => super::r#enum::extract_or_null(value_buf),
        Kind::Array(of) => super::array::extract_or_null(of, &mut value_buf),
        Kind::Domain(ty) => super::simple::extract_or_null(ty, value_buf),
        Kind::Composite(fields) => extract_or_null(fields, buf),
        _ => JsonValue::Null,
    })
}
