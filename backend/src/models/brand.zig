const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");

pub const Brand = struct {
    id: Uuid,
    name: []const u8,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        row: anytype,
        index: usize,
    ) !Brand {
        return .{
            .id = try helpers.uuidFromPg(
                try row.get([]const u8, index),
            ),
            .name = try allocator.dupe(
                u8,
                try row.get([]const u8, index + 1),
            ),
        };
    }
};
