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
        reader: anytype,
        images: []const Image,
    ) !Garment {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),

            .model = try Model.getFromRow(
                allocator,
                reader,
            ),

            .size = try Size.getFromRow(
                allocator,
                reader,
            ),

            .color = try Color.getFromRow(
                allocator,
                reader,
            ),

            .images = images,
        };
    }
};
