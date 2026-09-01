const Uuid = @import("../types.zig").Uuid;
const Brand = @import("brand.zig").Brand;

pub const Model = struct {
    id: Uuid,
    brand: Brand,
    name: []const u8,
};
