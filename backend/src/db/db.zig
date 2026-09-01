const std = @import("std");
const pg = @import("pg");

pub const Database = struct {
    pool: *pg.Pool,

    pub fn init(allocator: std.mem.Allocator) !Database {
        const pool = try pg.Pool.init(allocator, .{
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
        };
    }

    pub fn deinit(self: *Database) void {
        self.pool.deinit();
    }
};
