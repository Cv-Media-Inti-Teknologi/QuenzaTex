import { app, Menu, shell, dialog, BrowserWindow, type MenuItemConstructorOptions } from "electron"
import os from "node:os"
import path from "node:path"

const isMac = process.platform === "darwin"
const isDev =
  process.env.QUENZATEX_MODE === "development" || process.env.NODE_ENV === "development"

/** Send a menu action to the renderer to run an existing handler. */
function send(win: BrowserWindow | null, action: string) {
  win?.webContents.send("menu:action", action)
}

function showAbout(win: BrowserWindow | null) {
  dialog.showMessageBox(win!, {
    type: "info",
    title: "About Quenzatex",
    message: "Quenzatex",
    detail:
      `AI-Powered LaTeX Editor\n\n` +
      `Version ${app.getVersion()}\n` +
      `Electron ${process.versions.electron} · Node ${process.versions.node}\n\n` +
      `© ${new Date().getFullYear()} Quenzatex`,
    buttons: ["OK"],
    noLink: true,
  })
}

function reportBug() {
  const repo = "https://github.com/Cv-Media-Inti-Teknologi/QuenzaTex"
  const title = "[Bug] "
  const body = [
    "## Describe the bug",
    "A clear and concise description of what the bug is.",
    "",
    "## Steps to reproduce",
    "1. ",
    "2. ",
    "3. ",
    "",
    "## Expected behavior",
    "",
    "## Screenshots / logs",
    "",
    "---",
    "### Environment",
    `- Quenzatex: v${app.getVersion()}`,
    `- OS: ${process.platform} ${process.arch} (${os.release()})`,
    `- Electron: ${process.versions.electron}`,
    `- Chrome: ${process.versions.chrome}`,
    `- Node: ${process.versions.node}`,
    "",
    `> Tip: attach today's log file from ${path.join(app.getPath("userData"), "logs")}`,
  ].join("\n")

  const url =
    `${repo}/issues/new?` +
    `title=${encodeURIComponent(title)}` +
    `&body=${encodeURIComponent(body)}` +
    `&labels=${encodeURIComponent("bug")}`
  shell.openExternal(url)
}

export function buildAppMenu(mainWindow: BrowserWindow | null) {
  const template: MenuItemConstructorOptions[] = []

  // macOS app menu (must be first)
  if (isMac) {
    template.push({
      label: app.name,
      submenu: [
        { role: "about", label: "About Quenzatex" },
        { type: "separator" },
        {
          label: "Settings…",
          accelerator: "CmdOrCtrl+,",
          click: () => send(mainWindow, "open-settings"),
        },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide", label: "Hide Quenzatex" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit", label: "Quit Quenzatex" },
      ],
    })
  }

  // File
  template.push({
    label: "File",
    submenu: [
      {
        label: "Open Folder…",
        accelerator: "CmdOrCtrl+O",
        click: () => send(mainWindow, "open-project"),
      },
      {
        label: "Save",
        accelerator: "CmdOrCtrl+S",
        click: () => send(mainWindow, "save"),
      },
      { type: "separator" },
      {
        label: "Compile LaTeX",
        accelerator: "CmdOrCtrl+Enter",
        click: () => send(mainWindow, "compile"),
      },
      { type: "separator" },
      ...(!isMac
        ? [
            {
              label: "Settings…",
              accelerator: "CmdOrCtrl+,",
              click: () => send(mainWindow, "open-settings"),
            } as MenuItemConstructorOptions,
            { type: "separator" } as MenuItemConstructorOptions,
          ]
        : []),
      isMac ? { role: "close" } : { role: "quit" },
    ],
  })

  // Edit (native roles so cut/copy/paste/undo work in the editor & inputs)
  template.push({
    label: "Edit",
    submenu: [
      { role: "undo" },
      { role: "redo" },
      { type: "separator" },
      { role: "cut" },
      { role: "copy" },
      { role: "paste" },
      ...(isMac
        ? ([
            { role: "pasteAndMatchStyle" },
            { role: "delete" },
            { role: "selectAll" },
          ] as MenuItemConstructorOptions[])
        : ([
            { role: "delete" },
            { type: "separator" },
            { role: "selectAll" },
          ] as MenuItemConstructorOptions[])),
    ],
  })

  // View
  template.push({
    label: "View",
    submenu: [
      {
        label: "Toggle Explorer",
        accelerator: "CmdOrCtrl+B",
        click: () => send(mainWindow, "toggle-explorer"),
      },
      {
        label: "Toggle AI Panel",
        accelerator: "CmdOrCtrl+J",
        click: () => send(mainWindow, "toggle-ai"),
      },
      { type: "separator" },
      {
        label: "Reset Interface",
        click: () => send(mainWindow, "reset-interface"),
      },
      { type: "separator" },
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
      ...(isDev
        ? ([
            { type: "separator" },
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
          ] as MenuItemConstructorOptions[])
        : []),
    ],
  })

  // Window
  template.push({
    label: "Window",
    submenu: [
      { role: "minimize" },
      { role: "zoom" },
      ...(isMac
        ? ([
            { type: "separator" },
            { role: "front" },
            { type: "separator" },
            { role: "window" },
          ] as MenuItemConstructorOptions[])
        : ([{ role: "close" }] as MenuItemConstructorOptions[])),
    ],
  })

  // Help
  template.push({
    role: "help",
    label: "Help",
    submenu: [
      {
        label: "Keyboard Shortcuts",
        accelerator: "CmdOrCtrl+/",
        click: () => send(mainWindow, "show-shortcuts"),
      },
      { type: "separator" },
      {
        label: "Open Logs Folder",
        click: () => shell.openPath(path.join(app.getPath("userData"), "logs")),
      },
      {
        label: "Report a Bug…",
        click: () => reportBug(),
      },
      ...(!isMac
        ? ([
            { type: "separator" },
            {
              label: "About Quenzatex",
              click: () => showAbout(mainWindow),
            },
          ] as MenuItemConstructorOptions[])
        : []),
    ],
  })

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
