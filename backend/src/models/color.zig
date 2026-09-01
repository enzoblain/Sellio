const Uuid = @import("../types.zig").Uuid;

pub const Color = struct {
    id: Uuid,
    name: []const u8,
};
