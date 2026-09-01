const httpz = @import("httpz");
const sales = @import("sales.zig");

pub fn init(server: *httpz.Server(void)) !void {
    var router = try server.router(.{});
    router.get("/health", health, .{});

    var v1 = router.group("/api/v1", .{});
    try init_v1(&v1);
}

fn health(_: *httpz.Request, res: *httpz.Response) !void {
    res.status = 200;
    try res.json(.{ .status = "ok" }, .{});
}

pub fn init_v1(group: anytype) !void {
    group.get("/sales", sales.getSalesV1, .{});
}
