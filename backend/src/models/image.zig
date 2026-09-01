const Uuid = @import("../types.zig").Uuid;

pub const Image = struct {
    id: Uuid,
    path: []const u8,
    mime_type: []const u8,
    size_bytes: i64,
    width: ?i32,
    height: ?i32,
    created_at: i64,
};
