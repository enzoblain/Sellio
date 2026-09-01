const Uuid = @import("../types.zig").Uuid;

pub const Size = struct {
    id: Uuid,
    name: []const u8,
};
