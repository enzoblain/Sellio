const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const SalePreview = @import("../../models/sale.zig").SalePreview;
const SaleDetail = @import("../../models/sale.zig").SaleDetail;
const Uuid = @import("../../types.zig").Uuid;

pub fn getAll(
    db: *Database,
    allocator: std.mem.Allocator,
) ![]SalePreview {
    var result = try db.pool.query(queries.salesGetAll, .{});
    defer result.deinit();

    var sales: std.ArrayList(SalePreview) = .empty;
    errdefer sales.deinit(allocator);

    while (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const sale = try SalePreview.getFromRow(
            allocator,
            &reader,
        );

        try sales.append(allocator, sale);
    }

    return try sales.toOwnedSlice(allocator);
}

pub fn getById(
    db: *Database,
    allocator: std.mem.Allocator,
    sale_id: []const u8,
) !?SaleDetail {
    var result = try db.pool.query(
        queries.salesGetById,
        .{sale_id},
    );
    defer result.deinit();

    if (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const sale = try SaleDetail.getFromRow(
            allocator,
            &reader,
        );

        return sale;
    }

    return null;
}
