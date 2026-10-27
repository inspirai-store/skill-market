"""Desktop UI. No secrets are sent to stdout, stderr, or the clipboard."""
from __future__ import annotations

import os
import queue
import signal
import subprocess
import threading
import time

from .model import InputError, describe_destination, validate_secret

_APP = None


def app():
    global _APP
    if os.name != "nt" and __import__("sys").platform != "darwin" and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        raise InputError("desktop_unavailable")
    try:
        from PySide6.QtWidgets import QApplication
        _APP = QApplication.instance() or QApplication(["secure-input"])
        _APP.setApplicationName("安全输入")
        return _APP
    except ImportError:
        raise InputError("dependencies_missing") from None


def desktop_preflight():
    # A missing display/plugin can abort Qt in native code. Probe before handling
    # credentials, so the parent can return a structured failure instead.
    if os.name != "nt" and __import__("sys").platform != "darwin" and not (os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")):
        raise InputError("desktop_unavailable")
    try:
        from PySide6.QtWidgets import QApplication
        if QApplication.instance() is not None:
            return
        done = subprocess.run([__import__("sys").executable, "-c", "from PySide6.QtWidgets import QApplication; a=QApplication(['secure-input']); a.processEvents()"],
                              stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=15)
        if done.returncode:
            raise InputError("desktop_unavailable")
    except InputError:
        raise
    except ImportError:
        raise InputError("dependencies_missing") from None
    except Exception:
        raise InputError("desktop_unavailable") from None


def exec_dialog(dialog):
    """Keep SIGINT responsive while Qt owns the native modal event loop."""
    from PySide6.QtCore import QTimer
    previous = signal.getsignal(signal.SIGINT)
    timer = QTimer(dialog)
    timer.timeout.connect(lambda: None)
    timer.start(100)
    signal.signal(signal.SIGINT, lambda *_: dialog.reject())
    try:
        return dialog.exec()
    finally:
        timer.stop()
        signal.signal(signal.SIGINT, previous)


ERRORS = {
    "vault_unavailable": "系统凭据库不可用",
    "invalid_vault_record": "已保存凭据无法读取",
    "invalid_secret": "请输入有效的单行凭据",
    "dotenv_interpolation_unsupported": "此凭据包含 ${…}，请改用进程环境变量或 JSON",
    "config_write_failed": "配置文件写入失败",
    "duplicate_dotenv_binding": "目标字段在 .env 中重复出现",
    "invalid_config_json": "目标 JSON 文件无法解析",
}


class DesktopUI:
    def __init__(self):
        desktop_preflight()
        self.recipient_origins = []
        app()

    def notice(self, code):
        from PySide6.QtWidgets import QMessageBox
        box = QMessageBox()
        box.setWindowTitle("安全输入")
        box.setIcon(QMessageBox.Icon.Warning)
        box.setText(ERRORS.get(code, "操作未完成：" + code))
        exec_dialog(box)

    def fallback(self):
        from PySide6.QtWidgets import QMessageBox
        box = QMessageBox()
        box.setWindowTitle("安全输入")
        box.setText("系统凭据库不可用")
        once = box.addButton("仅本次", QMessageBox.ButtonRole.AcceptRole)
        box.addButton("取消", QMessageBox.ButtonRole.RejectRole)
        exec_dialog(box)
        return box.clickedButton() == once

    def confirm_origin(self, top_origin, frame_origin):
        from PySide6.QtWidgets import QMessageBox
        box = QMessageBox()
        box.setWindowTitle("确认接收网站")
        box.setText("页面：" + top_origin + "\n输入框：" + frame_origin)
        accept = box.addButton("允许本次填写", QMessageBox.ButtonRole.AcceptRole)
        box.addButton("取消", QMessageBox.ButtonRole.RejectRole)
        exec_dialog(box)
        return box.clickedButton() == accept

    def capture(self, request, existing, policies, vault_available):
        from PySide6.QtCore import Qt
        from PySide6.QtWidgets import (QComboBox, QDialog, QDialogButtonBox, QFormLayout,
                                       QLabel, QLineEdit, QVBoxLayout, QWidget, QScrollArea, QFrame)
        dialog = QDialog()
        dialog.setObjectName("secure-input-dialog")
        dialog.setWindowTitle("安全输入")
        dialog.setMinimumWidth(560)
        layout = QVBoxLayout(dialog)
        form = QFormLayout()
        purpose_label = QLabel(request.purpose)
        purpose_label.setTextFormat(Qt.TextFormat.PlainText)
        purpose_label.setWordWrap(True)
        purpose_label.setMinimumHeight(max(24, purpose_label.heightForWidth(400)))
        form.addRow("用途", purpose_label)
        title, destination = describe_destination(request.destination)
        if request.destination["type"] == "browser" and self.recipient_origins:
            destination = "\n".join(top if top == frame else top + " → " + frame for top, frame in self.recipient_origins)
        target = QLabel(destination)
        target.setTextFormat(Qt.TextFormat.PlainText)
        target.setWordWrap(True)
        target.setMinimumHeight(max(26, target.heightForWidth(400) + 8))
        form.addRow(title, target)
        edits, combos = {}, {}
        for f in request.fields:
            edit = QLineEdit()
            edit.setObjectName("secret-" + f.name)
            edit.setEchoMode(QLineEdit.EchoMode.Password)
            edit.setMaxLength(16384)
            edit.setContextMenuPolicy(Qt.ContextMenuPolicy.NoContextMenu)
            edit.setInputMethodHints(Qt.InputMethodHint.ImhHiddenText | Qt.InputMethodHint.ImhNoPredictiveText | Qt.InputMethodHint.ImhSensitiveData)
            if f.name in existing and not request.refresh:
                edit.setPlaceholderText("已保存，留空复用")
            form.addRow(f.label, edit)
            combo = QComboBox()
            combo.setObjectName("storage-" + f.name)
            combo.addItem("仅本次", "session")
            if f.kind != "otp" and vault_available:
                combo.addItem("系统凭据库", "system")
            combo.setCurrentIndex(max(0, combo.findData(policies[f.name])))
            form.addRow("保存", combo)
            edits[f.name], combos[f.name] = edit, combo
        if len(request.fields) > 4:
            body = QWidget()
            body.setLayout(form)
            scroll = QScrollArea()
            scroll.setWidgetResizable(True)
            scroll.setFrameShape(QFrame.Shape.NoFrame)
            scroll.setWidget(body)
            scroll.setMinimumHeight(380)
            layout.addWidget(scroll)
            dialog.setMaximumHeight(int(app().primaryScreen().availableGeometry().height() * 0.85))
        else:
            layout.addLayout(form)
        error_label = QLabel()
        error_label.setObjectName("input-error")
        layout.addWidget(error_label)
        buttons = QDialogButtonBox(QDialogButtonBox.StandardButton.Cancel | QDialogButtonBox.StandardButton.Ok)
        buttons.button(QDialogButtonBox.StandardButton.Cancel).setText("取消")
        action = {"process": "运行", "dotenv": "写入", "json": "写入", "browser": "填写"}[request.destination["type"]]
        buttons.button(QDialogButtonBox.StandardButton.Ok).setText(action)
        layout.addWidget(buttons)
        result = None

        def accept():
            nonlocal result
            values = {}
            try:
                for f in request.fields:
                    value = edits[f.name].text()
                    if not value and f.name in existing and not request.refresh:
                        value = existing[f.name]["value"]
                    validate_secret(value)
                    values[f.name] = value
            except InputError:
                error_label.setText(ERRORS["invalid_secret"])
                return
            result = (values, {f.name: combos[f.name].currentData() for f in request.fields})
            dialog.accept()

        buttons.accepted.connect(accept)
        buttons.rejected.connect(dialog.reject)
        exec_dialog(dialog)
        for edit in edits.values():
            edit.clear()
        dialog.deleteLater()
        app().processEvents()
        return result

    def run_process(self, destination, values):
        return run_process(destination, values)


def kill_process(process):
    if process.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                           stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=10)
        else:
            os.killpg(process.pid, signal.SIGTERM)
            try:
                process.wait(timeout=2)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
    except (OSError, subprocess.SubprocessError):
        try:
            process.kill()
        except OSError:
            pass


def run_process(destination, values):
    from PySide6.QtCore import QTimer
    from PySide6.QtWidgets import QDialog, QLabel, QPlainTextEdit, QPushButton, QVBoxLayout
    app()
    child_env = os.environ.copy()
    for env_name, field in destination["bindings"].items():
        child_env[env_name] = values[field]
    flags = {"start_new_session": True} if os.name != "nt" else {"creationflags": subprocess.CREATE_NEW_PROCESS_GROUP}
    try:
        process = subprocess.Popen([destination["executable"], *destination["args"]], cwd=destination["cwd"],
                                   env=child_env, shell=False, stdin=subprocess.DEVNULL,
                                   stdout=subprocess.PIPE, stderr=subprocess.STDOUT, **flags)
    except Exception:
        raise InputError("process_start_failed") from None
    child_env.clear()
    chunks = queue.Queue(maxsize=64)
    stop = threading.Event()

    def read():
        try:
            while not stop.is_set():
                data = os.read(process.stdout.fileno(), 4096)
                if not data:
                    break
                while not stop.is_set():
                    try:
                        chunks.put(data, timeout=0.1)
                        break
                    except queue.Full:
                        pass
        except (OSError, ValueError):
            pass

    reader = threading.Thread(target=read, daemon=True)
    reader.start()
    dialog = QDialog()
    dialog.setObjectName("process-output-dialog")
    dialog.setWindowTitle("运行结果")
    dialog.resize(760, 440)
    layout = QVBoxLayout(dialog)
    status = QLabel("运行中")
    layout.addWidget(status)
    output = QPlainTextEdit()
    output.setReadOnly(True)
    output.setMaximumBlockCount(1000)
    layout.addWidget(output)
    button = QPushButton("停止")
    layout.addWidget(button)
    start = time.monotonic()
    timed_out = False

    def tick():
        nonlocal timed_out
        for _ in range(64):
            try:
                data = chunks.get_nowait()
            except queue.Empty:
                break
            cursor = output.textCursor()
            cursor.movePosition(cursor.MoveOperation.End)
            cursor.insertText(data.decode("utf-8", errors="replace"))
            output.setTextCursor(cursor)
        code = process.poll()
        if code is None and time.monotonic() - start >= destination["timeout_seconds"]:
            timed_out = True
            kill_process(process)
            code = process.poll()
        if code is not None:
            status.setText("已结束 · 退出码 " + str(code))
            button.setText("关闭")

    timer = QTimer(dialog)
    timer.timeout.connect(tick)
    timer.start(50)
    button.clicked.connect(dialog.accept)
    try:
        exec_dialog(dialog)
    finally:
        timer.stop()
        running = process.poll() is None
        kill_process(process)
        process.wait(timeout=10)
        stop.set()
        process.stdout.close()
        reader.join(timeout=1)
        output.clear()
        dialog.deleteLater()
        app().processEvents()
    if timed_out:
        raise InputError("process_timeout")
    if running:
        raise InputError("cancelled")
    return process.returncode
