const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const ModelPreview = @import("model.zig").ModelPreview;
const BrandSalePreview = @import("sale.zig").BrandSalePreview;

pub const BrandPreview = struct {
    id: Uuid,
    name: []const u8,
    average_purchase_price: ?f64,
    average_sale_price: ?f64,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !BrandPreview {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .average_purchase_price = try reader.next(?f64),
            .average_sale_price = try reader.next(?f64),
        };
    }
};

pub const BrandDetail = struct {
    id: Uuid,
    name: []const u8,
    average_purchase_price: ?f64,
    average_sale_price: ?f64,
    models: []ModelPreview,
    sales: []BrandSalePreview,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !BrandDetail {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .average_purchase_price = try reader.next(?f64),
            .average_sale_price = try reader.next(?f64),
            .models = try ModelPreview.getFromRow(
                allocator,
                reader,
            ),
            .sales = try BrandSalePreview.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};

pub const BrandInfo = struct {
    id: Uuid,
    name: []const u8,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !BrandInfo {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
        };
    }
};
