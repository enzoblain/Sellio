const Uuid = @import("uuid").Uuid;
const std = @import("std");

pub fn uuidFromPg(bytes: []const u8) !Uuid {
    if (bytes.len != 16) {
        return error.InvalidUuid;
    }

    return std.mem.readInt(u128, bytes[0..16], .big);
}
