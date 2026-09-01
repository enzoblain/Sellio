const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Model = @import("model.zig").Model;
const Size = @import("size.zig").Size;
const Color = @import("color.zig").Color;
const Image = @import("image.zig").Image;

pub const Garment = struct {
    id: Uuid,

    model: Model,
    size: Size,
    color: Color,

    images: []const Image,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        row: anytype,
        index: usize,
        images: []const Image,
    ) !Garment {
        return .{
            .id = try helpers.uuidFromPg(
                try row.get([]const u8, index),
            ),

            .model = try Model.getFromRow(
                allocator,
                row,
                index + 1,
            ),

            // Model occupies 2 columns.
            // Brand occupies 2 columns.
            // Therefore, Size starts at index + 5.
            .size = try Size.getFromRow(
                allocator,
                row,
                index + 5,
            ),

            .color = try Color.getFromRow(
                allocator,
                row,
                index + 7,
            ),

            .images = images,
        };
    }
};
