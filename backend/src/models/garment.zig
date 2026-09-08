const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Model = @import("model.zig").Model;
const Size = @import("size.zig").Size;
const Color = @import("color.zig").Color;
const Image = @import("image.zig").Image;

pub const GarmentPreview = struct {
    id: Uuid,

    model: Model,
    size: Size,
    color: Color,

    cover_image: ?Image,

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

            .cover_image = try Image.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};

// pub const Garment = struct {
//     id: Uuid,
//
//     model: Model,
//     size: Size,
//     color: Color,
//
//     images: []const Image,
//
//     pub fn getFromRow(
//         allocator: std.mem.Allocator,
//         reader: anytype,
//         images: []const Image,
//     ) !Garment {
//         return .{
//             .id = try helpers.uuidFromPg(
//                 try reader.next([]const u8),
//             ),
//
//             .model = try Model.getFromRow(
//                 allocator,
//                 reader,
//             ),
//
//             .size = try Size.getFromRow(
//                 allocator,
//                 reader,
//             ),
//
//             .color = try Color.getFromRow(
//                 allocator,
//                 reader,
//             ),
//
//             .images = images,
//         };
//     }
//
//     pub fn addImage(
//         self: *Garment,
//         allocator: std.mem.Allocator,
//         image: Image,
//     ) !void {
//         const old_images = self.images;
//         const new_images = try allocator.alloc(
//             Image,
//             old_images.len + 1,
//         );
//         errdefer allocator.free(new_images);
//
//         @memcpy(
//             new_images[0..old_images.len],
//             old_images,
//         );
//
//         new_images[old_images.len] = image;
//
//         allocator.free(old_images);
//         self.images = new_images;
//     }
// };
