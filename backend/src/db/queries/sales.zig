const std = @import("std");

const queries = @import("../queries.zig");
const helpers = @import("../../helpers.zig");
const Database = @import("../db.zig").Database;
const Sale = @import("../../models/sale.zig").Sale;
const Image = @import("../../models/image.zig").Image;

// Sale + Garment + Model + Brand + Size + Color = 17 columns
const row_sale_length: usize = 17;

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
        const sale_id_raw = try row.get([]const u8, 0);
        const sale_id = try helpers.uuidFromPg(sale_id_raw);

        var existing_sale: ?*Sale = null;

        for (sales.items) |*sale| {
            if (sale.id == sale_id) {
                existing_sale = sale;
                break;
            }
        }

        if (existing_sale) |sale| {
            var reader = helpers.RowReader(@TypeOf(row)){
                .row = row,
                .index = row_sale_length,
            };

            _ = row.get(?[]const u8, row_sale_length) catch null orelse continue;

            const image = try Image.getFromRow(allocator, &reader);
            try sale.garment.addImage(allocator, image);

            continue;
        }

        var reader = helpers.RowReader(@TypeOf(row)){
            .row = row,
        };

        const new_sale = try Sale.getFromRow(
            allocator,
            &reader,
            &.{},
        );

        var images: []Image = &.{};

        if (row.get(?[]const u8, reader.index) catch null) |_| {
            images = try allocator.alloc(Image, 1);

            images[0] = try Image.getFromRow(
                allocator,
                &reader,
            );
        }

        var sale = new_sale;
        sale.garment.images = images;

        try sales.append(allocator, sale);
    }

    return try sales.toOwnedSlice(allocator);
}
