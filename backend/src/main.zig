const std = @import("std");
const httpz = @import("httpz");

const Database = @import("db/db.zig").Database;
const router = @import("router.zig");

pub fn main(init: std.process.Init) !void {
    const allocator = init.gpa;

    var db = try Database.init(init.io, allocator);
    defer db.deinit();

    var server = try httpz.Server(*Database).init(init.io, allocator, .{
        .address = .all(2509),
    }, &db);

    defer {
        server.stop();
        server.deinit();
    }

    try router.init(&server);
    try server.listen();
}
