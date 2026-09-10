const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const ModelListItem = @import("../../models/model.zig").ModelListItem;
const ModelDetail = @import("../../models/model.zig").ModelDetail;

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

pub fn getById(
    db: *Database,
    allocator: std.mem.Allocator,
    model_id: []const u8,
) !?ModelDetail {
    var result = try db.pool.query(
        queries.modelsGetById,
        .{model_id},
    );
    defer result.deinit();

    if (try result.next()) |row| {
        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const model = try ModelDetail.getFromRow(
            allocator,
            &reader,
        );

        return model;
    }

    return null;
}
