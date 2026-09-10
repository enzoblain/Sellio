const httpz = @import("httpz");

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
