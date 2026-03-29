import struct, zlib, os

def make_png(size):
    def crc_chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name+data)&0xffffffff)
    ihdr = struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)
    rows = b''
    for y in range(size):
        rows += b'\x00'
        for x in range(size):
            cx,cy=size/2,size/2
            d=((x-cx)**2+(y-cy)**2)**0.5
            f=max(0,1-d/(size/2*1.3))
            rows+=bytes([int(99+80*f),int(102+60*f),int(241-30*f)])
    png=b'\x89PNG\r\n\x1a\n'+crc_chunk(b'IHDR',ihdr)+crc_chunk(b'IDAT',zlib.compress(rows))+crc_chunk(b'IEND',b'')
    return png

out=r'd:\Youtube-bot-rag\browser-rag-ai\extension\icons'
os.makedirs(out,exist_ok=True)
for s in [16,32,48,128]:
    open(os.path.join(out,f'icon{s}.png'),'wb').write(make_png(s))
    print(f'icon{s}.png done')
