from PIL import Image
import os

def crea_cerchio(img_paths, output_path):
    base = Image.new("RGBA", (512, 512))
    for path in img_paths:
        img = Image.open(path).convert("RGBA").resize((512, 512))
        base = Image.alpha_composite(base, img)
    base.save(output_path)
