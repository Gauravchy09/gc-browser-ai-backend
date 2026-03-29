import os
import zipfile
import shutil

EXTENSION_DIR = "extension"
OUTPUT_FILENAME = "GC_Assistant.zip"

def create_extension_zip():
    print(f"📦 Packaging Chrome Extension from '{EXTENSION_DIR}'...")
    
    if not os.path.exists(EXTENSION_DIR):
        print(f"❌ Error: Directory '{EXTENSION_DIR}' not found!")
        return

    # Delete existing zip if it exists
    if os.path.exists(OUTPUT_FILENAME):
        os.remove(OUTPUT_FILENAME)
        print(f"♻️  Removed old {OUTPUT_FILENAME}")

    with zipfile.ZipFile(OUTPUT_FILENAME, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(EXTENSION_DIR):
            # Ignore hidden files or git folders
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'):
                    continue
                    
                file_path = os.path.join(root, file)
                # Ensure the zip structure starts INSIDE the extension folder
                # so when Chrome loads it, manifest.json is at the root.
                arcname = os.path.relpath(file_path, EXTENSION_DIR)
                zipf.write(file_path, arcname)
                print(f"  ➜ Added {arcname}")

    print(f"\n✅ Successfully created: {OUTPUT_FILENAME}")
    print("🚀 You can now send this file to anyone. They just open 'chrome://extensions', turn on Developer Mode, and drag this ZIP into the browser!")

if __name__ == "__main__":
    create_extension_zip()
