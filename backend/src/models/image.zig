const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");

pub const Image = struct {
    id: Uuid,
    path: []const u8,
    mime_type: []const u8,
    size_bytes: i64,
    width: ?i32,
    height: ?i32,
    created_at: i64,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        row: anytype,
        index: usize,
    ) !Image {
        return .{
            .id = try helpers.uuidFromPg(
                try row.get([]const u8, index),
            ),
            .path = try allocator.dupe(
                u8,
                try row.get([]const u8, index + 1),
            ),
            .mime_type = try allocator.dupe(
                u8,
                try row.get([]const u8, index + 2),
            ),
            .size_bytes = try row.get(i64, index + 3),
            .width = try row.get(?i32, index + 4),
            .height = try row.get(?i32, index + 5),
            .created_at = try row.get(i64, index + 6),
        };
    }
};
