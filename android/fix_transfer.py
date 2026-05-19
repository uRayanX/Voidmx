import re
with open("src/api/tidal.ts", "r") as f:
    text = f.read()

import_stmt = "import { FileTransfer } from '@capacitor/file-transfer';\nimport { Filesystem, Directory } from '@capacitor/filesystem';\n"
if "import { FileTransfer" not in text:
    text = text.replace("import { Filesystem, Directory } from '@capacitor/filesystem';", import_stmt)

old_logic = """  try {
    const download = await Filesystem.downloadFile({
      url,
      path: fileName,
      directory: Directory.Cache,
    });
    
    if (download.path) {
      const { uri } = await Filesystem.getUri({
        directory: Directory.Cache,
        path: fileName
      });
      return Capacitor.convertFileSrc(uri);
    }
  }"""

new_logic = """  try {
    const { uri } = await Filesystem.getUri({
      directory: Directory.Cache,
      path: fileName
    });
    
    await FileTransfer.downloadFile({
      url,
      path: uri
    });
    
    return Capacitor.convertFileSrc(uri);
  }"""

text = text.replace(old_logic, new_logic)

with open("src/api/tidal.ts", "w") as f:
    f.write(text)
    print("Filesystem transfer streaming patch complete!")
