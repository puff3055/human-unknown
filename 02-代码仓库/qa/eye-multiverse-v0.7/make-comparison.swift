import AppKit
import Foundation

let sourcePath = "/Users/kongxueli/.codex/generated_images/01a0738b-f23a-7cb3-829d-9f31c611c3c2/exec-630d4f83-81dc-420a-a2b8-0d03e3412e3e.png"
let implementationPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.7/01-initial.png"
let outputPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.7/06-side-by-side.png"

guard let source = NSImage(contentsOfFile: sourcePath),
      let implementation = NSImage(contentsOfFile: implementationPath) else {
  fatalError("Unable to open comparison inputs")
}

let panel = NSSize(width: 1672, height: 941)
let gutter: CGFloat = 28
let labelHeight: CGFloat = 46
let canvasSize = NSSize(width: panel.width * 2 + gutter * 3, height: panel.height + labelHeight + gutter * 2)
let canvas = NSImage(size: canvasSize)
canvas.lockFocus()
NSColor(calibratedWhite: 0.018, alpha: 1).setFill()
NSRect(origin: .zero, size: canvasSize).fill()

let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 15, weight: .regular),
  .foregroundColor: NSColor(calibratedWhite: 0.72, alpha: 1),
  .kern: 2.6
]
NSAttributedString(string: "SOURCE TARGET", attributes: attributes).draw(at: NSPoint(x: gutter, y: panel.height + gutter + 12))
NSAttributedString(string: "IMPLEMENTATION · DESKTOP", attributes: attributes).draw(at: NSPoint(x: panel.width + gutter * 2, y: panel.height + gutter + 12))

source.draw(in: NSRect(x: gutter, y: gutter, width: panel.width, height: panel.height), from: .zero, operation: .sourceOver, fraction: 1)
implementation.draw(in: NSRect(x: panel.width + gutter * 2, y: gutter, width: panel.width, height: panel.height), from: .zero, operation: .sourceOver, fraction: 1)
canvas.unlockFocus()

guard let tiff = canvas.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Unable to encode comparison")
}
try png.write(to: URL(fileURLWithPath: outputPath))

let focusOutputPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.7/07-ui-focus.png"
let focusPanel = NSSize(width: 1120, height: 300)
let focusCanvas = NSImage(size: NSSize(width: focusPanel.width * 2 + gutter * 3, height: focusPanel.height + labelHeight + gutter * 2))
focusCanvas.lockFocus()
NSColor(calibratedWhite: 0.018, alpha: 1).setFill()
NSRect(origin: .zero, size: focusCanvas.size).fill()
NSAttributedString(string: "SOURCE · VOICE ENTRY", attributes: attributes).draw(at: NSPoint(x: gutter, y: focusPanel.height + gutter + 12))
NSAttributedString(string: "IMPLEMENTATION · VOICE ENTRY", attributes: attributes).draw(at: NSPoint(x: focusPanel.width + gutter * 2, y: focusPanel.height + gutter + 12))
source.draw(in: NSRect(x: gutter, y: gutter, width: focusPanel.width, height: focusPanel.height),
            from: NSRect(x: 570, y: 70, width: 1020, height: 300), operation: .sourceOver, fraction: 1)
implementation.draw(in: NSRect(x: focusPanel.width + gutter * 2, y: gutter, width: focusPanel.width, height: focusPanel.height),
                    from: NSRect(x: 400, y: 90, width: 920, height: 250), operation: .sourceOver, fraction: 1)
focusCanvas.unlockFocus()

guard let focusTiff = focusCanvas.tiffRepresentation,
      let focusBitmap = NSBitmapImageRep(data: focusTiff),
      let focusPng = focusBitmap.representation(using: .png, properties: [:]) else {
  fatalError("Unable to encode focus comparison")
}
try focusPng.write(to: URL(fileURLWithPath: focusOutputPath))
