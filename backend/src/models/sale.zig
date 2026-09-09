const std = @import("std");
const Uuid = @import("uuid").Uuid;
const Row = @import("pg").Row;

const helpers = @import("../helpers.zig");
const GarmentDetail = @import("garment.zig").GarmentDetail;
const GarmentPreview = @import("garment.zig").GarmentPreview;
const Image = @import("image.zig").Image;
const SaleStatus = @import("status.zig").SaleStatus;
const SaleStatusHistory = @import("status.zig").SaleStatusHistory;

pub const SalePreview = struct {
    id: Uuid,
    garment: GarmentPreview,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    status: ?SaleStatus,

    updated_at: i64,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !SalePreview {
        const id = try helpers.uuidFromPg(
            try reader.next([]const u8),
        );

        const purchase_price = try reader.next(i64);
        const shipping_price = try reader.next(i64);
        const listing_price = try reader.next(i64);
        const sale_price = try reader.next(?i64);

        const status = try SaleStatus.getFromRow(reader);
        const updated_at = try reader.next(i64);

        const garment = try GarmentPreview.getFromRow(
            allocator,
            reader,
        );

        return .{
            .id = id,
            .garment = garment,
            .purchase_price = purchase_price,
            .shipping_price = shipping_price,
            .listing_price = listing_price,
            .sale_price = sale_price,
            .status = status,
            .updated_at = updated_at,
        };
    }
};

pub const SaleDetail = struct {
    id: Uuid,
    garment: GarmentDetail,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    statuses: []const SaleStatusHistory,

    created_at: i64,
    updated_at: i64,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !SaleDetail {
        const id = try helpers.uuidFromPg(
            try reader.next([]const u8),
        );

        const purchase_price = try reader.next(i64);
        const shipping_price = try reader.next(i64);
        const listing_price = try reader.next(i64);
        const sale_price = try reader.next(?i64);

        const created_at = try reader.next(i64);
        const updated_at = try reader.next(i64);

        const garment = try GarmentDetail.getFromRow(
            allocator,
            reader,
        );

        const statuses = try SaleStatusHistory.getFromRow(
            allocator,
            reader,
        );

        return .{
            .id = id,
            .garment = garment,
            .purchase_price = purchase_price,
            .shipping_price = shipping_price,
            .listing_price = listing_price,
            .sale_price = sale_price,
            .statuses = statuses,
            .created_at = created_at,
            .updated_at = updated_at,
        };
    }
};

pub const BrandSalePreview = struct {
    id: Uuid,

    purchase_price: i64,
    shipping_price: i64,
    listing_price: i64,
    sale_price: ?i64,

    updated_at: i64,

    const JsonSale = struct {
        id: []const u8,
        purchase_price: i64,
        shipping_price: i64,
        listing_price: i64,
        sale_price: ?i64,
        updated_at: i64,
    };

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) ![]BrandSalePreview {
        const json = try reader.next(?[]const u8) orelse {
            return &.{};
        };

        var parsed = try std.json.parseFromSlice(
            []JsonSale,
            allocator,
            json,
            .{},
        );
        defer parsed.deinit();

        const sales = try allocator.alloc(
            BrandSalePreview,
            parsed.value.len,
        );
        errdefer allocator.free(sales);

        for (parsed.value, 0..) |sale, i| {
            sales[i] = .{
                .id = try helpers.uuidFromString(sale.id),
                .purchase_price = sale.purchase_price,
                .shipping_price = sale.shipping_price,
                .listing_price = sale.listing_price,
                .sale_price = sale.sale_price,
                .updated_at = sale.updated_at,
            };
        }

        return sales;
    }
};
