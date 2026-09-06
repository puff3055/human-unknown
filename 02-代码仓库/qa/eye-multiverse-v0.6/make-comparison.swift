import AppKit
import Foundation

let sourcePath = "/Users/kongxueli/.codex/generated_images/01a0738b-f23a-7cb3-829d-9f31c611c3c2/exec-630d4f83-81dc-420a-a2b8-0d03e3412e3e.png"
let implementationPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.6/13-final-initial.png"
let outputPath = "/Users/kongxueli/Desktop/coding/13-HUMANUNKNOWN/02-代码仓库/qa/eye-multiverse-v0.6/12-side-by-side.png"

guard let source = NSImage(contentsOfFile: sourcePath),
      let implementation = NSImage(contentsOfFile: implementationPath) else {
  fatalError("Unable to open comparison inputs")
}

let canvasSize = NSSize(width: 2048, height: 626)
let imageSize = NSSize(width: 1006, height: 566)
let canvas = NSImage(size: canvasSize)
canvas.lockFocus()
NSColor(calibratedWhite: 0.035, alpha: 1).setFill()
NSRect(origin: .zero, size: canvasSize).fill()

let paragraph = NSMutableParagraphStyle()
paragraph.alignment = .left
let attributes: [NSAttributedString.Key: Any] = [
  .font: NSFont.systemFont(ofSize: 13, weight: .regular),
  .foregroundColor: NSColor(calibratedWhite: 0.72, alpha: 1),
  .kern: 2.2,
  .paragraphStyle: paragraph
]
NSAttributedString(string: "SOURCE TARGET", attributes: attributes).draw(at: NSPoint(x: 18, y: 598))
NSAttributedString(string: "IMPLEMENTATION · DESKTOP", attributes: attributes).draw(at: NSPoint(x: 1042, y: 598))

source.draw(in: NSRect(x: 18, y: 18, width: imageSize.width, height: imageSize.height),
            from: .zero, operation: .sourceOver, fraction: 1)
implementation.draw(in: NSRect(x: 1042, y: 18, width: imageSize.width, height: imageSize.height),
                    from: .zero, operation: .sourceOver, fraction: 1)
canvas.unlockFocus()

guard let tiff = canvas.tiffRepresentation,
      let bitmap = NSBitmapImageRep(data: tiff),
      let png = bitmap.representation(using: .png, properties: [:]) else {
  fatalError("Unable to encode comparison")
}
try png.write(to: URL(fileURLWithPath: outputPath))
