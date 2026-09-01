const Uuid = @import("../types.zig").Uuid;
const Garment = @import("garment.zig").Garment;

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
    garment: Garment,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    status: SaleStatus,

    created_at: i64,
    updated_at: i64,
};
