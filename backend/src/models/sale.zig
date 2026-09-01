const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Garment = @import("garment.zig").Garment;
const Image = @import("image.zig").Image;

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

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
        images: []const Image,
    ) !Sale {
        const id = try helpers.uuidFromPg(
            try reader.next([]const u8),
        );

        const purchase_price = try reader.next(i64);
        const shipping_price = try reader.next(i64);
        const listing_price = try reader.next(i64);
        const sale_price = try reader.next(?i64);

        const status: SaleStatus = @enumFromInt(
            try reader.next(u8),
        );

        const created_at = try reader.next(i64);
        const updated_at = try reader.next(i64);

        const garment = try Garment.getFromRow(
            allocator,
            reader,
            images,
        );

        return .{
            .id = id,
            .garment = garment,
            .purchase_price = purchase_price,
            .shipping_price = shipping_price,
            .listing_price = listing_price,
            .sale_price = sale_price,
            .status = status,
            .created_at = created_at,
            .updated_at = updated_at,
        };
    }
};
