const { app, BrowserWindow } = require('electron');
const path = require('path');
const serve = require('electron-serve');

const loadURL = serve({ directory: path.join(__dirname, '../dist') });

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        },
        title: "Neuro RAVE",
        autoHideMenuBar: true,
    });

    // Load the local build if in production
    if (app.isPackaged) {
        loadURL(mainWindow);
    } else {
        // In dev, load the dev server or local build
        mainWindow.loadURL('http://localhost:4321');
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', function () {
    if (mainWindow === null) createWindow();
});
