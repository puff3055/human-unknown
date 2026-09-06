import AppKit
import Foundation

let sourcePath = "/Users/kongxueli/.codex/generated_images/01a0738b-f23a-7cb3-829d-9f31c611c3c2/exec-85295f66-2efc-4c86-9f6a-286c2183fa34.png"
let implementationPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.8/01-initial.png"
let outputPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.8/06-side-by-side.png"

guard let source = NSImage(contentsOfFile: sourcePath),
      let implementation = NSImage(contentsOfFile: implementationPath) else {
  fatalError("Unable to open comparison inputs")
}

let panel = NSSize(width: 1672, height: 941)
let gutter: CGFloat = 28
let labelHeight: CGFloat = 46
let canvasSize = NSSize(width: panel.width * 2 + gutter * 3, height: panel.height + labelHeight + gutter * 2)
guard let bitmap = NSBitmapImageRep(
  bitmapDataPlanes: nil,
  pixelsWide: Int(canvasSize.width),
  pixelsHigh: Int(canvasSize.height),
  bitsPerSample: 8,
  samplesPerPixel: 4,
  hasAlpha: true,
  isPlanar: false,
  colorSpaceName: .deviceRGB,
  bytesPerRow: 0,
  bitsPerPixel: 0
), let context = NSGraphicsContext(bitmapImageRep: bitmap) else {
  fatalError("Unable to create comparison canvas")
}

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = context
NSColor(calibratedWhite: 0.018, alpha: 1).setFill()
NSRect(origin: .zero, size: canvasSize).fill()

let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 15, weight: .regular),
  .foregroundColor: NSColor(calibratedWhite: 0.72, alpha: 1),
  .kern: 2.6,
]
NSAttributedString(string: "SOURCE TARGET", attributes: attributes).draw(at: NSPoint(x: gutter, y: panel.height + gutter + 12))
NSAttributedString(string: "IMPLEMENTATION · DESKTOP", attributes: attributes).draw(at: NSPoint(x: panel.width + gutter * 2, y: panel.height + gutter + 12))

source.draw(in: NSRect(x: gutter, y: gutter, width: panel.width, height: panel.height), from: .zero, operation: .sourceOver, fraction: 1)
implementation.draw(in: NSRect(x: panel.width + gutter * 2, y: gutter, width: panel.width, height: panel.height), from: .zero, operation: .sourceOver, fraction: 1)
context.flushGraphics()
NSGraphicsContext.restoreGraphicsState()

guard let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Unable to encode comparison")
}
try png.write(to: URL(fileURLWithPath: outputPath))
