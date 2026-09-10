const httpz = @import("httpz");

const helpers = @import("../helpers.zig");
const models = @import("../db/queries/models.zig");
const Database = @import("../db/db.zig").Database;

pub fn getAll(
    db: *Database,
    _: *httpz.Request,
    res: *httpz.Response,
) !void {
    const allModels = try models.getAll(
        db,
        db.allocator,
    );
    defer db.allocator.free(allModels);

    res.status = 200;

    try res.json(.{
        .models = allModels,
    }, .{});
}

pub fn getById(
    db: *Database,
    req: *httpz.Request,
    res: *httpz.Response,
) !void {
    const id =
        req.param("id") orelse return error.BadRequest;

    const model = try models.getById(
        db,
        db.allocator,
        id,
    ) orelse {
        res.status = 404;
        return;
    };

    res.status = 200;

    try res.json(model, .{});
}
