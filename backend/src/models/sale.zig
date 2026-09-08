const std = @import("std");
const Uuid = @import("uuid").Uuid;
const Row = @import("pg").Row;

const helpers = @import("../helpers.zig");
const Garment = @import("garment.zig").Garment;
const Image = @import("image.zig").Image;
const SaleStatus = @import("status.zig").SaleStatus;

// Sale + Garment + Model + Brand + Size + Color = 17 columns
const row_sale_length: usize = 17;

pub const Sale = struct {
    id: Uuid,
    garment: Garment,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    status: ?SaleStatus,

    created_at: i64,
    updated_at: i64,

    pub fn hasId(self: *Sale, id: Uuid) bool {
        return self.id == id;
    }

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

        const status_value = try reader.next(?i16);
        const status: ?SaleStatus = if (status_value) |value|
            @enumFromInt(value)
        else
            null;

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

    pub fn parseAndAppend(
        allocator: std.mem.Allocator,
        sales: *std.ArrayList(Sale),
        row: Row,
    ) !void {
        const sale_id_raw = try row.get([]const u8, 0);
        const sale_id = try helpers.uuidFromPg(sale_id_raw);

        const existing_sale = helpers.findBy(
            Sale,
            Uuid,
            sales.items,
            Sale.hasId,
            sale_id,
        );

        if (existing_sale) |sale| {
            var reader = helpers.RowReader(@TypeOf(row)){
                .row = row,
                .index = row_sale_length,
            };

            if (try Image.getFromRow(allocator, &reader)) |image| {
                try sale.garment.addImage(allocator, image);
            }

            return;
        }

        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const new_sale = try Sale.getFromRow(
            allocator,
            &reader,
            &.{},
        );

        var sale = new_sale;

        if (try Image.getFromRow(allocator, &reader)) |image| {
            var images = try allocator.alloc(Image, 1);
            images[0] = image;
            sale.garment.images = images;
        } else {
            sale.garment.images = &.{};
        }

        try sales.append(allocator, sale);
    }
};
