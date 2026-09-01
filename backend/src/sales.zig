const Uuid = @import("uuid").Uuid;
const httpz = @import("httpz");

pub const SaleStatus = enum(u8) {
    purchased = 0,
    listed = 1,
    to_ship = 2,
    shipped = 3,
    completed = 4,
    returned = 5,
};

pub const Sale = struct {
    id: Uuid,
    garment_id: Uuid,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    status: SaleStatus,

    created_at: i64,
    updated_at: i64,
};

pub fn getSalesV1(_: *httpz.Request, res: *httpz.Response) !void {
    res.status = 200;

    try res.json(.{
        .sales = [_]struct {
            id: []const u8,
            garment_id: []const u8,
            purchase_price: i64,
            shipping_price: i64,
            listing_price: i64,
            sale_price: ?i64,
            status: []const u8,
        }{
            .{
                .id = "550e8400-e29b-41d4-a716-446655440000",
                .garment_id = "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
                .purchase_price = 2500,
                .shipping_price = 500,
                .listing_price = 4990,
                .sale_price = null,
                .status = "listed",
            },
            .{
                .id = "7c9e6679-7425-40de-944b-e07fc1f90ae7",
                .garment_id = "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
                .purchase_price = 3000,
                .shipping_price = 600,
                .listing_price = 5990,
                .sale_price = 5990,
                .status = "completed",
            },
        },
    }, .{});
}
