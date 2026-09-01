const std = @import("std");

const queries = @import("queries.zig");
const helpers = @import("../helpers.zig");
const Database = @import("db.zig").Database;
const Sale = @import("../models/sale.zig").Sale;
const Image = @import("../models/image.zig").Image;

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
        var existing_sale: ?*Sale = null;

        const sale_id = try helpers.uuidFromPg(
            try row.get([]const u8, 0),
        );

        for (sales.items) |*sale| {
            if (sale.id == sale_id) {
                existing_sale = sale;
                break;
            }
        }

        if (existing_sale) |sale| {
            if (row.get(?[]const u8, 17) catch null) |_| {
                const old_images = sale.garment.images;

                const new_images = try allocator.alloc(
                    Image,
                    old_images.len + 1,
                );

                @memcpy(
                    new_images[0..old_images.len],
                    old_images,
                );

                new_images[old_images.len] = try Image.getFromRow(
                    allocator,
                    row,
                    17,
                );

                allocator.free(old_images);
                sale.garment.images = new_images;
            }

            continue;
        }

        var images: []Image = &.{};

        if (row.get(?[]const u8, 17) catch null) |_| {
            images = try allocator.alloc(Image, 1);

            images[0] = try Image.getFromRow(
                allocator,
                row,
                17,
            );
        }

        const new_sale = try Sale.getFromRow(
            allocator,
            row,
            images,
        );

        try sales.append(allocator, new_sale);
    }

    return try sales.toOwnedSlice(allocator);
}
