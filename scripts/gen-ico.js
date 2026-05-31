const path = require('path')
const fs = require('fs')

async function main() {
  const pngToIco = (await import('png-to-ico')).default
  const pngPath = path.join(__dirname, '..', 'resources', 'icon.png')
  const icoPath = path.join(__dirname, '..', 'resources', 'icon.ico')

  if (!fs.existsSync(pngPath)) {
    console.error('icon.png not found, run gen-icon.js first')
    process.exit(1)
  }

  const buf = await pngToIco(pngPath)
  fs.writeFileSync(icoPath, buf)
  console.log('Icon saved to resources/icon.ico')
}

main().catch(console.error)
