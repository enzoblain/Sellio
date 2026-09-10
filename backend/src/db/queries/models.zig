const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const ModelListItem = @import("../../models/model.zig").ModelListItem;

pub fn getAll(
    db: *Database,
    allocator: std.mem.Allocator,
) ![]ModelListItem {
    var result = try db.pool.query(queries.modelsGetAll, .{});
    defer result.deinit();

    var models: std.ArrayList(ModelListItem) = .empty;
    errdefer models.deinit(allocator);

    while (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const model = try ModelListItem.getFromRow(
            allocator,
            &reader,
        );

        try models.append(allocator, model);
    }

    return try models.toOwnedSlice(allocator);
}
