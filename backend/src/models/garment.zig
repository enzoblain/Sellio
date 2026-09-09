const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Model = @import("model.zig").Model;
const Size = @import("size.zig").Size;
const Color = @import("color.zig").Color;
const CoverImage = @import("image.zig").CoverImage;
const Image = @import("image.zig").Image;

pub const GarmentPreview = struct {
    id: Uuid,

    model: Model,
    size: Size,
    color: Color,

    cover_image: ?CoverImage,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !GarmentPreview {
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

            .cover_image = try CoverImage.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};

pub const GarmentDetail = struct {
    id: Uuid,

    model: Model,
    size: Size,
    color: Color,

    images: []const Image,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !GarmentDetail {
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

            .images = try Image.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};
