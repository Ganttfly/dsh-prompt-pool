// Crop a region out of a WebP/PNG screenshot into a PNG using the profile's sharp.
const sharp = require('C:\\Users\\robinshen\\.dsh\\profiles\\desktop\\node_modules\\sharp');

const [, , input, output, left, top, width, height, scale] = process.argv;

sharp(input)
  .metadata()
  .then((meta) => {
    const l = Number(left);
    const t = Number(top);
    const w = Number(width);
    const h = Number(height);
    const s = Number(scale || 1);
    const box = {
      left: Math.max(0, Math.min(l, meta.width - 1)),
      top: Math.max(0, Math.min(t, meta.height - 1)),
      width: Math.min(w, meta.width - l),
      height: Math.min(h, meta.height - t),
    };
    console.log('source', meta.width + 'x' + meta.height, 'crop', JSON.stringify(box));
    return sharp(input).extract(box).resize({ width: box.width * s, kernel: 'nearest' }).png().toFile(output);
  })
  .then(() => console.log('written', output))
  .catch((error) => {
    console.error('failed', error.message);
    process.exitCode = 1;
  });
