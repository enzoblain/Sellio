const Uuid = @import("uuid").Uuid;
const std = @import("std");

pub fn uuidFromPg(bytes: []const u8) !Uuid {
    if (bytes.len != 16) {
        return error.InvalidUuid;
    }

    return std.mem.readInt(u128, bytes[0..16], .big);
}

pub fn nextIndex(index: *usize) usize {
    const current = index.*;
    index.* += 1;
    return current;
}

pub fn RowReader(comptime Row: type) type {
    return struct {
        row: Row,
        index: usize = 0,

        const Self = @This();

        pub fn next(self: *Self, comptime T: type) !T {
            const value = try self.row.get(T, self.index);
            self.index += 1;
            return value;
        }

        pub fn position(self: *const Self) usize {
            return self.index;
        }
    };
}

pub fn findBy(
    comptime T: type,
    comptime Arg: type,
    items: []T,
    predicate: fn (*T, Arg) bool,
    arg: Arg,
) ?*T {
    for (items) |*item| {
        if (predicate(item, arg)) {
            return item;
        }
    }

    return null;
}
