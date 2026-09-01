const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");

pub const Color = struct {
    id: Uuid,
    name: []const u8,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !Color {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
        };
    }
};
