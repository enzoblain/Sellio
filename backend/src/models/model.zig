const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Brand = @import("brand.zig").Brand;

pub const Model = struct {
    id: Uuid,
    brand: Brand,
    name: []const u8,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !Model {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .brand = try Brand.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};
