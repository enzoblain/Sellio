const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const Sale = @import("../../models/sale.zig").Sale;
const Image = @import("../../models/image.zig").Image;

pub fn getAll(
    db: *Database,
    allocator: std.mem.Allocator,
) ![]Sale {
    var result = try db.pool.query(queries.salesGetAll, .{});
    defer result.deinit();

    var sales: std.ArrayList(Sale) = .empty;
    errdefer {
        sales.deinit(allocator);
    }

    while (try result.next()) |row| {
        try Sale.parseAndAppend(allocator, &sales, row);
    }

    return try sales.toOwnedSlice(allocator);
}
