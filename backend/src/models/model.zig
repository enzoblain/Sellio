const std = @import("std");
const Uuid = @import("uuid").Uuid;

const helpers = @import("../helpers.zig");
const Brand = @import("brand.zig").Brand;

pub const Model = struct {
    id: Uuid,
    brand: Brand,
    name: []const u8,

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) !Model {
        return .{
            .id = try helpers.uuidFromPg(
                try reader.next([]const u8),
            ),
            .name = try allocator.dupe(
                u8,
                try reader.next([]const u8),
            ),
            .brand = try Brand.getFromRow(
                allocator,
                reader,
            ),
        };
    }
};

pub const ModelPreview = struct {
    id: Uuid,
    name: []const u8,
    average_purchase_price: ?f64,
    average_sale_price: ?f64,

    const JsonModel = struct {
        id: []const u8,
        name: []const u8,
        average_purchase_price: ?f64,
        average_sale_price: ?f64,
    };

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) ![]ModelPreview {
        const json = try reader.next(?[]const u8) orelse {
            return &.{};
        };

        var parsed = try std.json.parseFromSlice(
            []JsonModel,
            allocator,
            json,
            .{},
        );
        defer parsed.deinit();

        const models = try allocator.alloc(
            ModelPreview,
            parsed.value.len,
        );
        errdefer allocator.free(models);

        for (parsed.value, 0..) |model, i| {
            models[i] = .{
                .id = try helpers.uuidFromString(model.id),
                .name = try allocator.dupe(u8, model.name),
                .average_purchase_price = model.average_purchase_price,
                .average_sale_price = model.average_sale_price,
            };
        }

        return models;
    }
};
