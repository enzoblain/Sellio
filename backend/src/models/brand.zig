const Uuid = @import("../types.zig").Uuid;

pub const Brand = struct {
    id: Uuid,
    name: []const u8,
};
