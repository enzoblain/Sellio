const httpz = @import("httpz");

const brands = @import("../db/queries/brands.zig");
const Database = @import("../db/db.zig").Database;

pub fn getAll(
    db: *Database,
    _: *httpz.Request,
    res: *httpz.Response,
) !void {
    const allBrands = try brands.getAll(
        db,
        db.allocator,
    );
    defer db.allocator.free(allBrands);

    res.status = 200;

    try res.json(.{
        .brands = allBrands,
    }, .{});
}

pub fn getById(
    db: *Database,
    req: *httpz.Request,
    res: *httpz.Response,
) !void {
    const id = req.param("id") orelse {
        res.status = 400;
        return;
    };

    const brand = try brands.getById(
        db,
        db.allocator,
        id,
    ) orelse {
        res.status = 404;
        return;
    };

    res.status = 200;

    try res.json(brand, .{});
}
