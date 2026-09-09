const Uuid = @import("uuid").Uuid;
const std = @import("std");

pub fn uuidFromPg(bytes: []const u8) !Uuid {
    if (bytes.len != 16) {
        return error.InvalidUuid;
    }

    return std.mem.readInt(u128, bytes[0..16], .big);
}

pub fn uuidFromString(value: []const u8) !Uuid {
    if (value.len != 36) {
        return error.InvalidUuid;
    }

    var bytes: [16]u8 = undefined;
    var byte_index: usize = 0;
    var i: usize = 0;

    while (i < value.len) : (i += 1) {
        if (value[i] == '-') {
            continue;
        }

        if (byte_index >= 16) {
            return error.InvalidUuid;
        }

        const high = std.fmt.charToDigit(value[i], 16) catch {
            return error.InvalidUuid;
        };

        i += 1;

        if (i >= value.len or value[i] == '-') {
            return error.InvalidUuid;
        }

        const low = std.fmt.charToDigit(value[i], 16) catch {
            return error.InvalidUuid;
        };

        bytes[byte_index] = (high << 4) | low;
        byte_index += 1;
    }

    if (byte_index != 16) {
        return error.InvalidUuid;
    }

    return std.mem.readInt(u128, &bytes, .big);
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
