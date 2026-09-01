const std = @import("std");
const httpz = @import("httpz");
const router = @import("router.zig");

pub fn main(init: std.process.Init) !void {
    const allocator = init.gpa;

    var server = try httpz.Server(void).init(init.io, allocator, .{
        .address = .all(2509),
    }, {});
    defer {
        server.stop();
        server.deinit();
    }

    try router.init(&server);
    try server.listen();
}
