"""Rasterize Outside's simple geometric tree mark using only the Python standard library."""
import math
import struct
import zlib
from pathlib import Path

size = 1024
sky = (232, 241, 243)
soft = (212, 225, 210)
moss = (82, 107, 79)
ink = (36, 61, 58)
sun = (217, 182, 109)

def circle(x, y, cx, cy, radius):
    return (x-cx)**2 + (y-cy)**2 <= radius**2

def line(x, y, ax, ay, bx, by, width):
    dx, dy = bx-ax, by-ay
    t = max(0, min(1, ((x-ax)*dx + (y-ay)*dy) / (dx*dx + dy*dy)))
    return (x-ax-t*dx)**2 + (y-ay-t*dy)**2 <= width**2/4

data = bytearray()
for y in range(size):
    data.append(0)
    for x in range(size):
        c = sky
        if circle(x,y,730,270,77): c = sun
        if circle(x,y,490,1240,680): c = soft
        if any(circle(x,y,cx,cy,r) for cx,cy,r in [(440,420,130),(565,430,130),(507,310,125),(425,540,125),(575,545,125)]): c = moss
        if any(line(x,y,*p) for p in [(507,350,507,787,22),(507,498,414,430,17),(507,594,604,499,17)]): c = ink
        data.extend(c)

def chunk(kind, payload):
    return struct.pack('>I', len(payload)) + kind + payload + struct.pack('>I', zlib.crc32(kind+payload))

png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(data)) + chunk(b'IEND',b'')
Path(__file__).resolve().parents[1].joinpath('assets/outside-icon.png').write_bytes(png)
