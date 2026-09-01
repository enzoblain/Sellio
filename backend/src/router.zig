const httpz = @import("httpz");

const sales = @import("routes/sales.zig");
const Database = @import("db/db.zig").Database;

pub fn init(server: *httpz.Server(*Database)) !void {
    var router = try server.router(.{});
    router.get("/health", health, .{});

    var v1 = router.group("/api/v1", .{});
    try init_v1(&v1);
}

fn health(_: *Database, _: *httpz.Request, res: *httpz.Response) !void {
    res.status = 200;
    try res.json(.{ .status = "ok" }, .{});
}

pub fn init_v1(group: anytype) !void {
    group.get("/sales", sales.getAll, .{});
}
