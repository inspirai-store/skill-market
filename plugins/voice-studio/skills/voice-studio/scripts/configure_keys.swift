import AppKit
import Foundation
import Darwin

// Keep credentials inside this process and the private project configuration.
umask(0o077)
let app = NSApplication.shared
app.setActivationPolicy(.regular)

let menu = NSMenu()
let editItem = NSMenuItem()
let editMenu = NSMenu(title: "编辑")
editMenu.addItem(withTitle: "粘贴", action: Selector(("paste:")), keyEquivalent: "v")
editMenu.addItem(withTitle: "全选", action: Selector(("selectAll:")), keyEquivalent: "a")
editItem.submenu = editMenu
menu.addItem(editItem)
app.mainMenu = menu

let alert = NSAlert()
alert.messageText = "配置配音服务"
alert.informativeText = ""
alert.addButton(withTitle: "保存")
alert.addButton(withTitle: "取消")

let view = NSView(frame: NSRect(x: 0, y: 0, width: 440, height: 145))
func makeField(_ label: String, y: CGFloat) -> NSSecureTextField {
    let title = NSTextField(labelWithString: label)
    title.frame = NSRect(x: 0, y: y + 34, width: 440, height: 20)
    view.addSubview(title)
    let field = NSSecureTextField(frame: NSRect(x: 0, y: y, width: 440, height: 27))
    field.font = NSFont.systemFont(ofSize: 14)
    view.addSubview(field)
    return field
}
let dashscope = makeField("百炼 API Key", y: 82)
let minimax = makeField("MiniMax API Key", y: 14)
dashscope.nextKeyView = minimax
minimax.nextKeyView = dashscope
alert.accessoryView = view

final class FormDelegate: NSObject, NSTextFieldDelegate {
    let fields: [NSSecureTextField]
    let save: NSButton
    init(fields: [NSSecureTextField], save: NSButton) {
        self.fields = fields
        self.save = save
        super.init()
    }
    func controlTextDidChange(_ notification: Notification) {
        save.isEnabled = fields.allSatisfy {
            !$0.stringValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
    }
}
let form = FormDelegate(fields: [dashscope, minimax], save: alert.buttons[0])
dashscope.delegate = form
minimax.delegate = form
alert.buttons[0].isEnabled = false
app.activate(ignoringOtherApps: true)
alert.window.initialFirstResponder = dashscope

guard alert.runModal() == .alertFirstButtonReturn else {
    print("CANCELLED")
    exit(0)
}

do {
    guard CommandLine.arguments.count == 2 else { throw CocoaError(.fileWriteUnknown) }
    let destination = URL(fileURLWithPath: CommandLine.arguments[1])
    let names = ["DASHSCOPE_API_KEY", "MINIMAX_API_KEY"]
    let values = [dashscope.stringValue, minimax.stringValue].map {
        $0.trimmingCharacters(in: .whitespacesAndNewlines)
    }
    let previous = (try? String(contentsOf: destination, encoding: .utf8)) ?? ""
    var lines = previous.components(separatedBy: .newlines).filter { line in
        !names.contains { line.hasPrefix($0 + "=") || line.hasPrefix("export " + $0 + "=") }
    }
    while lines.last == "" { lines.removeLast() }
    for (name, value) in zip(names, values) {
        let quoted = String(data: try JSONEncoder().encode(value), encoding: .utf8)!
        lines.append(name + "=" + quoted)
    }
    try (lines.joined(separator: "\n") + "\n").write(to: destination, atomically: true, encoding: .utf8)
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: destination.path)
    dashscope.stringValue = ""
    minimax.stringValue = ""
    print("SAVED_DASHSCOPE_AND_MINIMAX")
} catch {
    print("CONFIGURATION_SAVE_FAILED")
    exit(1)
}
