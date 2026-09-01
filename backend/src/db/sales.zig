const std = @import("std");

const helpers = @import("../helpers.zig");
const Database = @import("db.zig").Database;
const Sale = @import("../models/sale.zig").Sale;
const Image = @import("../models/image.zig").Image;

pub fn getAll(
    db: *Database,
    allocator: std.mem.Allocator,
) ![]Sale {
    const query =
        \\SELECT
        \\    s.id,
        \\    s.purchase_price,
        \\    s.shipping_price,
        \\    s.listing_price,
        \\    s.sale_price,
        \\    s.status,
        \\    EXTRACT(EPOCH FROM s.created_at)::bigint,
        \\    EXTRACT(EPOCH FROM s.updated_at)::bigint,
        \\
        \\    g.id,
        \\
        \\    m.id,
        \\    m.name,
        \\
        \\    b.id,
        \\    b.name,
        \\
        \\    sz.id,
        \\    sz.name,
        \\
        \\    c.id,
        \\    c.name,
        \\
        \\    i.id,
        \\    i.path,
        \\    i.mime_type,
        \\    i.size_bytes,
        \\    i.width,
        \\    i.height,
        \\    EXTRACT(EPOCH FROM i.created_at)::bigint
        \\
        \\FROM sales s
        \\JOIN garments g ON g.id = s.garment_id
        \\JOIN models m ON m.id = g.model_id
        \\JOIN brands b ON b.id = m.brand_id
        \\JOIN sizes sz ON sz.id = g.size_id
        \\JOIN colors c ON c.id = g.color_id
        \\LEFT JOIN images i ON i.garment_id = g.id
        \\
        \\ORDER BY s.created_at DESC, i.created_at ASC
    ;

    var result = try db.pool.query(query, .{});
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
