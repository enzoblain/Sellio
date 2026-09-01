FROM debian:bookworm-slim AS builder

RUN apt-get update && \
    apt-get install -y \
        curl \
        xz-utils \
        ca-certificates \
        build-essential && \
    rm -rf /var/lib/apt/lists/*

ARG TARGETARCH

RUN if [ "$TARGETARCH" = "amd64" ]; then \
        ZIG_ARCH="x86_64"; \
    elif [ "$TARGETARCH" = "arm64" ]; then \
        ZIG_ARCH="aarch64"; \
    else \
        echo "Unsupported architecture: $TARGETARCH" && exit 1; \
    fi && \
    curl -fsSL "https://ziglang.org/download/0.16.0/zig-${ZIG_ARCH}-linux-0.16.0.tar.xz" \
        -o /tmp/zig.tar.xz && \
    tar -xf /tmp/zig.tar.xz -C /opt && \
    rm /tmp/zig.tar.xz && \
    ln -s /opt/zig-${ZIG_ARCH}-linux-0.16.0/zig /usr/local/bin/zig

WORKDIR /app

COPY build.zig build.zig.zon ./
COPY src ./src
COPY zig-pkg ./zig-pkg

RUN zig version
RUN zig build -Doptimize=ReleaseSafe


FROM debian:bookworm-slim

WORKDIR /app

COPY --from=builder /app/zig-out/bin/Sellio /app/Sellio

EXPOSE 2509

CMD ["/app/Sellio"]
