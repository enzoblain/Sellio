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
        reader: anytype,
    ) !Image {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .path = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .mime_type = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .size_bytes = try reader.next(i64),
            .width = try reader.next(?i32),
            .height = try reader.next(?i32),
            .created_at = try reader.next(i64),
        };
    }
};
