import AppKit
import Foundation

enum Command: String {
  case types, html, rtf, image, files
}

let args = CommandLine.arguments
guard args.count > 1, let cmd = Command(rawValue: args[1]) else {
  print(#"{"error": "Usage: clipboard-bridge <types|html|rtf|image|files>"}"#)
  exit(1)
}

let pb = NSPasteboard.general

switch cmd {
case .types:
  let types = pb.types?.map { $0.rawValue } ?? []
  let json = try! JSONSerialization.data(withJSONObject: types)
  print(String(data: json, encoding: .utf8)!)

case .html:
  if let html = pb.string(forType: .html) {
    print(html)
  }

case .rtf:
  if let rtf = pb.data(forType: .rtf) {
    print(rtf.base64EncodedString())
  }

case .image:
  if let tiff = pb.data(forType: .tiff) {
    let bitmap = NSBitmapImageRep(data: tiff)!
    let png = bitmap.representation(using: .png, properties: [:])!
    print(png.base64EncodedString())
  }

case .files:
  if let urls = pb.readObjects(forClasses: [NSURL.self]) as? [URL] {
    let paths = urls.map { $0.path }
    let json = try! JSONSerialization.data(withJSONObject: paths)
    print(String(data: json, encoding: .utf8)!)
  }
}
