const httpz = @import("httpz");
const std = @import("std");

const sale = @import("../db/queries/sales.zig");
const Database = @import("../db/db.zig").Database;
const Sale = @import("../models/sale.zig").Sale;
const Image = @import("../models/image.zig").Image;

pub fn getAll(
    db: *Database,
    req: *httpz.Request,
    res: *httpz.Response,
) !void {
    _ = req;

    const sales = try sale.getAll(db, db.allocator);
    defer db.allocator.free(sales);

    res.status = 200;

    try res.json(.{
        .sales = sales,
    }, .{});
}
