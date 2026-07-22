import struct
import zlib
import os


def chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_png(path: str, size: int, rgb=(26, 31, 36), accent=(196, 92, 38)) -> None:
    rows = []
    for y in range(size):
        row = bytearray([0])
        for x in range(size):
            margin = size * 0.18
            cx = cy = size / 2
            dx = x - cx
            dy = y - cy
            r = (dx * dx + dy * dy) ** 0.5
            mid = size * 0.27
            if abs(r - mid) < size * 0.045 or (
                abs(dx) < size * 0.05 and margin < y < size - margin and abs(dy) < size * 0.28
            ):
                row += bytes(accent)
            elif (
                margin < x < size - margin
                and margin < y < size - margin
                and (
                    x < margin + size * 0.08
                    or x > size - margin - size * 0.08
                    or y < margin + size * 0.08
                    or y > size - margin - size * 0.08
                )
            ):
                row += bytes(accent)
            else:
                row += bytes(rgb)
        rows.append(bytes(row))
    raw = b"".join(rows)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as handle:
        handle.write(png)


def main() -> None:
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    icons = os.path.join(root, "icons")
    os.makedirs(icons, exist_ok=True)
    path_192 = os.path.join(icons, "icon-192.png")
    path_512 = os.path.join(icons, "icon-512.png")
    write_png(path_192, 192)
    write_png(path_512, 512)
    print("created", os.path.getsize(path_192), os.path.getsize(path_512))


if __name__ == "__main__":
    main()
