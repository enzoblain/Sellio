const std = @import("std");
const httpz = @import("httpz");

const helpers = @import("../helpers.zig");
const brands = @import("../db/queries/brands.zig");
const Database = @import("../db/db.zig").Database;

pub fn getNames(
    db: *Database,
    req: *httpz.Request,
    res: *httpz.Response,
) !void {
    const query = try req.query();

    const exact = query.get("exact");

    if (exact) |value| {
        const name = try brands.getExactName(db, db.allocator, value);
        defer if (name) |n| db.allocator.free(n);

        res.status = 200;
        try res.json(.{
            .exists = name != null,
        }, .{});
        return;
    }

    const search = query.get("search") orelse "";
    const offset_str = query.get("offset") orelse "0";
    const limit_str = query.get("limit") orelse "20";

    const offset = std.fmt.parseInt(i64, offset_str, 10) catch 0;
    const limit = std.fmt.parseInt(i64, limit_str, 10) catch 20;

    const brandNames = try brands.getNames(
        db,
        db.allocator,
        search,
        offset,
        limit,
    );
    defer {
        for (brandNames) |name| db.allocator.free(name);
        db.allocator.free(brandNames);
    }

    res.status = 200;

    try res.json(.{
        .names = brandNames,
    }, .{});
}

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
    const id =
        req.param("id") orelse return error.BadRequest;

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
