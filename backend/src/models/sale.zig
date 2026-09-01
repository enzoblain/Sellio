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
        row: anytype,
        images: []const Image,
    ) !Sale {
        return .{
            .id = try helpers.uuidFromPg(
                try row.get([]const u8, 0),
            ),

            .garment = try Garment.getFromRow(
                allocator,
                row,
                8,
                images,
            ),

            .purchase_price = try row.get(i64, 1),
            .shipping_price = try row.get(i64, 2),
            .listing_price = try row.get(i64, 3),
            .sale_price = try row.get(?i64, 4),

            .status = @enumFromInt(
                try row.get(u8, 5),
            ),

            .created_at = try row.get(i64, 6),
            .updated_at = try row.get(i64, 7),
        };
    }
};
