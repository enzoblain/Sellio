const std = @import("std");
const pg = @import("pg");

pub const Database = struct {
    pool: *pg.Pool,
    allocator: std.mem.Allocator,

    pub fn init(
        io: std.Io,
        allocator: std.mem.Allocator,
    ) !Database {
        const pool = try pg.Pool.init(io, allocator, .{
            .connect = .{
                .host = "db",
                .port = 5432,
            },
            .auth = .{
                .username = "sellio",
                .password = "sellio",
                .database = "sellio",
            },
            .size = 5,
        });

        return .{
            .pool = pool,
            .allocator = allocator,
        };
    }

    pub fn deinit(self: *Database) void {
        self.pool.deinit();
    }
};
