"""
Generate simple PNG icons for the Chrome extension using only stdlib.
Creates pixel-art style icons at 16, 32, 48, 128px.
"""

import struct
import zlib
import os

def create_png(size, r, g, b):
    """Create a simple solid-color PNG."""
    def chunk(name, data):
        c = struct.pack('>I', len(data)) + name + data
        c += struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
        return c
    
    header = b'\x89PNG\r\n\x1a\n'
    
    # IHDR
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    
    # IDAT - pixel data (simple gradient-like)
    raw_data = b''
    for y in range(size):
        raw_data += b'\x00'  # filter type
        for x in range(size):
            # Create a simple radial gradient look
            cx, cy = size / 2, size / 2
            dist = ((x - cx)**2 + (y - cy)**2) ** 0.5
            max_dist = (size / 2) * 1.2
            factor = max(0, 1 - dist / max_dist)
            
            pr = int(r * factor + 13 * (1 - factor))
            pg = int(g * factor + 11 * (1 - factor))
            pb = int(b * factor + 23 * (1 - factor))
            
            raw_data += bytes([
                min(255, max(0, pr)),
                min(255, max(0, pg)),
                min(255, max(0, pb))
            ])
    
    compressed = zlib.compress(raw_data)
    
    png = header
    png += chunk(b'IHDR', ihdr)
    png += chunk(b'IDAT', compressed)
    png += chunk(b'IEND', b'')
    return png

icons_dir = os.path.join(os.path.dirname(__file__), 'extension', 'icons')
os.makedirs(icons_dir, exist_ok=True)

# Purple/indigo color: #6366f1 = (99, 102, 241)
for size in [16, 32, 48, 128]:
    data = create_png(size, 99, 102, 241)
    path = os.path.join(icons_dir, f'icon{size}.png')
    with open(path, 'wb') as f:
        f.write(data)
    print(f"Created {path}")

print("All icons created!")
