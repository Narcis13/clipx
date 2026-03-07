import AppKit
import Foundation

enum Command: String {
  case types, html, rtf, image, files, source
}

let args = CommandLine.arguments
guard args.count > 1, let cmd = Command(rawValue: args[1]) else {
  print(#"{"error": "Usage: clipboard-bridge <types|html|rtf|image|files|source>"}"#)
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

case .source:
  var result: [String: Any] = [:]

  // Frontmost application via NSWorkspace
  if let app = NSWorkspace.shared.frontmostApplication {
    result["app"] = app.localizedName ?? ""
    result["bundleId"] = app.bundleIdentifier ?? ""
    result["pid"] = app.processIdentifier
  }

  // Source URL from pasteboard types (browsers embed the page URL)
  let urlTypes = [
    "org.chromium.source-url",   // Chrome, Edge, Brave, etc.
    "public.url",                // Safari, generic
    "com.apple.safari.url",      // Safari-specific
  ]
  for type in urlTypes {
    if let url = pb.string(forType: NSPasteboard.PasteboardType(rawValue: type)) {
      result["url"] = url
      result["urlType"] = type
      break
    }
  }

  let json = try! JSONSerialization.data(withJSONObject: result)
  print(String(data: json, encoding: .utf8)!)
}
