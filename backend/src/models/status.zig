const std = @import("std");
const Uuid = @import("../types.zig").Uuid;
const helpers = @import("../helpers.zig");

pub const SaleStatus = enum(u8) {
    purchased = 0,
    listed = 1,
    to_ship = 2,
    shipped = 3,
    completed = 4,
    returned = 5,

    pub fn getFromRow(
        reader: anytype,
    ) !?SaleStatus {
        const status = try reader.next(?i16) orelse return null;
        return @enumFromInt(status);
    }
};

pub const SaleStatusHistory = struct {
    id: Uuid,
    status_before: ?SaleStatus,
    status_after: SaleStatus,
    created_at: i64,

    const JsonStatus = struct {
        id: []const u8,
        status_before: ?SaleStatus,
        status_after: SaleStatus,
        created_at: i64,
    };

    pub fn getFromRow(
        allocator: std.mem.Allocator,
        reader: anytype,
    ) ![]SaleStatusHistory {
        const json = try reader.next(?[]const u8) orelse {
            return &.{};
        };

        var parsed = try std.json.parseFromSlice(
            []JsonStatus,
            allocator,
            json,
            .{},
        );
        defer parsed.deinit();

        const statuses = try allocator.alloc(
            SaleStatusHistory,
            parsed.value.len,
        );
        errdefer allocator.free(statuses);

        for (parsed.value, 0..) |status, i| {
            statuses[i] = .{
                .id = try helpers.uuidFromString(status.id),
                .status_before = status.status_before,
                .status_after = status.status_after,
                .created_at = status.created_at,
            };
        }

        return statuses;
    }
};
