const std = @import("std");

pub const SaleStatus = enum(u8) {
    purchased = 0,
    listed = 1,
    to_ship = 2,
    shipped = 3,
    completed = 4,
    returned = 5,
};
