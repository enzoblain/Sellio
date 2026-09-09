const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const BrandPreview = @import("../../models/brand.zig").BrandPreview;
const BrandDetail = @import("../../models/brand.zig").BrandDetail;

pub fn getAll(
    db: *Database,
    allocator: std.mem.Allocator,
) ![]BrandPreview {
    var result = try db.pool.query(queries.brandsGetAll, .{});
    defer result.deinit();

    var brands: std.ArrayList(BrandPreview) = .empty;
    errdefer brands.deinit(allocator);

    while (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const brand = try BrandPreview.getFromRow(
            allocator,
            &reader,
        );

        try brands.append(allocator, brand);
    }

    return try brands.toOwnedSlice(allocator);
}

pub fn getById(
    db: *Database,
    allocator: std.mem.Allocator,
    brand_id: []const u8,
) !?BrandDetail {
    var result = try db.pool.query(
        queries.brandsGetById,
        .{brand_id},
    );
    defer result.deinit();

    if (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const brand = try BrandDetail.getFromRow(
            allocator,
            &reader,
        );

        return brand;
    }

    return null;
}
