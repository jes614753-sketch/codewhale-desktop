"""
OCR script for CodeWhale Desktop.
Usage: python ocr.py <image_path> [--lang eng+chi_sim]
Reads an image and outputs recognized text.
Uses pytesseract (Tesseract OCR) for fast, lightweight OCR.
"""
import sys
import os

# Tesseract path on Windows
TESSERACT_PATH = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def main():
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path> [--lang eng+chi_sim]")
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)

    # Parse language
    lang = 'eng+chi_sim'  # default: English + Chinese
    if '--lang' in sys.argv:
        idx = sys.argv.index('--lang')
        if idx + 1 < len(sys.argv):
            lang = sys.argv[idx + 1]

    print(f"[*] OCR: {image_path}")
    print(f"[*] Language: {lang}")
    print()

    try:
        import pytesseract
        from PIL import Image

        # Set Tesseract path
        if os.path.exists(TESSERACT_PATH):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

        img = Image.open(image_path)

        # Get image info
        w, h = img.size
        print(f"[*] Image size: {w}x{h}")
        print()

        # OCR
        text = pytesseract.image_to_string(img, lang=lang)

        if text.strip():
            print(text.strip())
            print()
            print(f"[*] Done. {len(text)} characters recognized.")
        else:
            print("[No text detected in image]")

    except ImportError as e:
        print(f"Error: Missing dependency: {e}")
        print("Install with: pip install pytesseract Pillow")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()
