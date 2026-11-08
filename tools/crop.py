from PIL import Image, ImageDraw
import numpy as np, sys
src = Image.open(sys.argv[1]).convert("RGB")
PAPER = np.array([240, 222, 196], dtype=float)   

def norm(img):
    a = np.asarray(img).astype(float)
    edge = np.concatenate([a[:3].reshape(-1,3), a[-3:].reshape(-1,3), a[:, :3].reshape(-1,3), a[:, -3:].reshape(-1,3)])
    lum = edge.mean(1)
    paper = np.percentile(edge[lum > np.percentile(lum, 40)], 60, axis=0)
    a = np.clip(a / paper * 255, 0, 255)
    a = np.where(a > 238, 255 - (255 - a) * 0.35, a)
    a = np.clip((a - 0) * 1.0, 0, 255)
    return Image.fromarray(a.astype("uint8"))

def save(name, box, fill=None):
    im = norm(src.crop(box))
    if fill:  
        import cv2
        a = np.asarray(im).copy()
        mask = np.zeros(a.shape[:2], np.uint8)
        for (x1, y1, x2, y2) in fill:
            reg = a[y1:y2, x1:x2].mean(2)
            mask[y1:y2, x1:x2] = (reg < reg.mean() - 18).astype(np.uint8) * 255
        mask = cv2.dilate(mask, np.ones((5, 5), np.uint8))
        im = Image.fromarray(cv2.inpaint(a, mask, 5, cv2.INPAINT_TELEA))
    im.save(f"assets/{name}.webp", quality=90, method=6)

cols = [(18,233),(248,473),(487,690),(705,922),(934,1142),(1155,1331),(1345,1518)]
ids  = ["iberico","andaluz","charro","chalan","gaucho","cowboy","llanero"]
for i,(x1,x2) in zip(ids, cols):
    save(f"rider-{i}", (x1, 268, x2, 644))
    save(f"horse-{i}", (x1+20, 793, x2-20, 897))

save("map", (592, 14, 1032, 198), fill=[(366, 22, 440, 84)])
save("compass", (1056, 84, 1138, 180))
save("hat", (458, 130, 584, 178))
save("vignette", (1174, 12, 1516, 200))
save("leaf", (22, 218, 62, 278))

save("ic-clock", (33, 647, 63, 675))
save("ic-hat", (31, 686, 67, 710))
save("ic-horse", (33, 747, 65, 779))
# Pie
for n,b in {"f-saddle":(52,932,134,1006),"f-lasso":(158,932,234,1006),"f-hat":(252,940,338,996),
            "f-lasso2":(1086,932,1152,1008),"f-spur":(1170,936,1264,1000),"f-hat2":(1303,940,1382,996),
            "f-boot":(1396,932,1458,1008)}.items():
    save(n, b)
