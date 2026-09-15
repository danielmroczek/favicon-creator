# Favicon Creator

A simple, browser-based tool for creating custom favicons for your websites. Design beautiful icons with customizable shapes, colors, and positioning without needing graphic design skills.

## Features

- **Interactive Preview**: See your favicon changes in real-time
- **Material Color Palette**: Pick colors from a swatch grid of the Material
  Colors palette (shades 100–900, no free-form hex entry), with white and black
  as neutral extras. A 🎲 button randomizes the background pair within a single
  hue, two shade steps apart; defaults are randomized on load
- **Icon Library**: Instant search through 1000+ Lucide icons with zero loading time
- **Custom SVG Support**: Upload your own SVG files to use as favicons
- **Size & Position Controls**: Adjust the size and position of your icon elements
- **Canonical Output**: Emits favicons that conform to the canonical favicon format
  (see [danielmroczek.github.io/docs/favicon-format.md](https://github.com/danielmroczek/danielmroczek.github.io/blob/main/docs/favicon-format.md))
- **Single Icon Path**: Multi-path icons (including all Lucide icons) are automatically
  flattened into one `<path id="icon">` element, so portfolio generators can handle them
  as a single shape

## Demo

Visit the [live demo](https://danielmroczek.github.io/favicon-creator/) to try it out!

## Usage

1. **Select an Icon**: Choose from the icon grid or upload your own SVG
2. **Customize Colors**: Click a color target (Start / End / Icon), then pick
  a swatch from the Material palette grid
3. **Adjust Positioning**: Use the controls to position and size your icon
4. **Download**: Click the download button to get your favicon files

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with **[Alpine.js](https://alpinejs.dev/)** - Lightweight reactive framework for modern UIs
- **[Pico CSS](https://picocss.com/)** - Minimal CSS framework for clean UI
- **[Lucide Icons](https://lucide.dev/)** - Beautiful, consistent icon library (1000+ icons)
- **[Material Colors](https://github.com/carbon-native/carbon-native)** - Palette vendored at
  `docs/lib/material-colors.js` (shades 100–900 only; IIFE, no runtime fetch)
- **[svgpath](https://github.com/fontello/svgpath)** - Transforms baked into path data (pre-bundled IIFE in `docs/svgpath.min.js`)
- Zero build process - pure JavaScript with Alpine.js for instant development
- Output is the canonical favicon format — validate downloads with the portfolio's
  [`check-favicon.mjs`](https://github.com/danielmroczek/danielmroczek.github.io/blob/main/scripts/check-favicon.mjs)
- Uses SVG for high-quality, scalable favicons that work across all browsers
