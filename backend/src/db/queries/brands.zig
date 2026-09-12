const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const BrandPreview = @import("../../models/brand.zig").BrandPreview;
const BrandDetail = @import("../../models/brand.zig").BrandDetail;

pub fn getNames(
    db: *Database,
    allocator: std.mem.Allocator,
    search: []const u8,
    offset: i64,
    limit: i64,
) ![][]const u8 {
    var result = try db.pool.query(queries.brandsGetNames, .{ search, offset, limit });
    defer result.deinit();

    var names: std.ArrayList([]const u8) = .empty;
    errdefer names.deinit(allocator);

    while (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const raw_name = try reader.next([]const u8);
        const name = try allocator.dupe(u8, raw_name);

        try names.append(allocator, name);
    }

    return try names.toOwnedSlice(allocator);
}

pub fn getExactName(
    db: *Database,
    allocator: std.mem.Allocator,
    name: []const u8,
) !?[]const u8 {
    var result = try db.pool.query(queries.brandsGetExactName, .{name});
    defer result.deinit();

    const row = try result.next() orelse return null;

    var reader = helpers.RowReader(@TypeOf(row)){
        .row = row,
    };

    const raw_name = try reader.next([]const u8);
    const found_name = try allocator.dupe(u8, raw_name);

    return found_name;
}

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
