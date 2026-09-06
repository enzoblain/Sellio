const httpz = @import("httpz");
const std = @import("std");

const sales = @import("../db/queries/sales.zig");
const Database = @import("../db/db.zig").Database;
const Sale = @import("../models/sale.zig").Sale;
const Image = @import("../models/image.zig").Image;

pub fn getAll(
    db: *Database,
    _: *httpz.Request,
    res: *httpz.Response,
) !void {
    const allSales = try sales.getAll(db, db.allocator);
    defer db.allocator.free(allSales);

    res.status = 200;

    try res.json(.{
        .sales = allSales,
    }, .{});
}
