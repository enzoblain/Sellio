const Uuid = @import("../types.zig").Uuid;
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
};
