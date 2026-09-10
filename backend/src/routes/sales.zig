const httpz = @import("httpz");
const std = @import("std");

const helpers = @import("../helpers.zig");
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

pub fn getById(
    db: *Database,
    req: *httpz.Request,
    res: *httpz.Response,
) !void {
    const id =
        req.param("id") orelse return error.BadRequest;

    const sale = try sales.getById(
        db,
        db.allocator,
        id,
    ) orelse {
        res.status = 404;
        return;
    };

    res.status = 200;

    try res.json(sale, .{});
}
