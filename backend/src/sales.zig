const httpz = @import("httpz");

const Sale = @import("models/sale.zig").Sale;
const Image = @import("models/image.zig").Image;

pub fn getSalesV1(_: *httpz.Request, res: *httpz.Response) !void {
    res.status = 200;

    const sales = [_]Sale{
        .{
            .id = 1,

            .garment = .{
                .id = 2,

                .model = .{
                    .id = 3,
                    .name = "T-Shirt Oversized",

                    .brand = .{
                        .id = 4,
                        .name = "Nike",
                    },
                },

                .size = .{
                    .id = 5,
                    .name = "M",
                },

                .color = .{
                    .id = 6,
                    .name = "Black",
                },

                .images = &[_]Image{
                    .{
                        .id = 7,
                        .path = "/images/tshirt-black-1.jpg",
                        .mime_type = "image/jpeg",
                        .size_bytes = 245000,
                        .width = 1200,
                        .height = 1200,
                        .created_at = 1725000000,
                    },
                },
            },

            .purchase_price = 2500,
            .shipping_price = 500,
            .listing_price = 4990,
            .sale_price = null,
            .status = .listed,
            .created_at = 1725000000,
            .updated_at = 1725000000,
        },
    };

    try res.json(.{
        .sales = sales,
    }, .{});
}
