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
        row: anytype,
        index: usize,
    ) !Model {
        return .{
            .id = try helpers.uuidFromPg(
                try row.get([]const u8, index),
            ),
            .name = try allocator.dupe(
                u8,
                try row.get([]const u8, index + 1),
            ),
            .brand = try Brand.getFromRow(
                allocator,
                row,
                index + 2,
            ),
        };
    }
};
