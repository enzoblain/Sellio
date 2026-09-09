const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");

pub const CoverImage = struct {
    id: Uuid,
    path: []const u8,
    mime_type: []const u8,
    size_bytes: i64,
    width: ?i32,
    height: ?i32,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !?CoverImage {
        const id = try reader.next(?[]const u8) orelse return null;

        return .{
            .id = try helpers.uuidFromPg(id),
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
        };
    }
};

pub const Image = struct {
    id: Uuid,
    path: []const u8,
    mime_type: []const u8,
    size_bytes: i64,
    width: ?i32,
    height: ?i32,
    cover_image: bool,

    const JsonImage = struct {
        id: []const u8,
        path: []const u8,
        mime_type: []const u8,
        size_bytes: i64,
        width: ?i32,
        height: ?i32,
        is_cover: bool,
    };

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) ![]Image {
        const json = try reader.next(?[]const u8) orelse {
            return &.{};
        };

        var parsed = try std.json.parseFromSlice(
            []JsonImage,
            allocator,
            json,
            .{},
        );
        defer parsed.deinit();

        const images = try allocator.alloc(
            Image,
            parsed.value.len,
        );
        errdefer allocator.free(images);

        for (parsed.value, 0..) |image, i| {
            images[i] = .{
                .id = try helpers.uuidFromString(image.id),
                .path = try allocator.dupe(u8, image.path),
                .mime_type = try allocator.dupe(u8, image.mime_type),
                .size_bytes = image.size_bytes,
                .width = image.width,
                .height = image.height,
                .cover_image = image.is_cover,
            };
        }

        return images;
    }
};
