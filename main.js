// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain} = require('electron')
const fs = require('fs')
const path = require('path')
const dataurl = require('dataurl')
const updater = require('./updater')
const http = require('http')
//verifica se está no modo desenvolvedor
let isDev = 'ELECTRON_IS_DEV' in process.env ? parseInt(process.env.ELECTRON_IS_DEV, 10) === 1 : (process.defaultApp || /node_modules[\\/]electron[\\/]/.test(process.execPath));
/*require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  hardResetMethod: 'exit'
});*/

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    center:true,
    width: 800,
    height: 500,
    //backgroundColor: '#F2F6FA',
    opacity: 1,
    resizable:false,
    titleBarStyle:'default',
    title:'Rádio Indoor - versão '+app.getVersion(),
    icon:'icons/64x64.png'
  })

  // and load the index.html of the app.
  mainWindow.loadFile('renderer/main.html')

  // Open the DevTools.
  if(isDev)mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })

}
// IPC Mostra console
ipcMain.on('debug', (e) => {
	mainWindow.webContents.openDevTools()
})
// Controle de download do cache
ipcMain.on('get-file', (e, mode, servidor, arquivo) => {
	// Variaveis do arquivo
	let url = servidor + arquivo
	let local = app.getPath('userData') + '/' + arquivo
	let src = 'file:///' + local
	let dir = app.getPath('userData') + '/' + path.dirname(arquivo)
	// Modo DEV envia URL
	if(isDev)
	{
		e.sender.send(mode, url, false)
		return
	}
	// Cria diretorio recursivamente
	var partes = dir.replace(/\/$/, '').split('/');
	for (var i = 1; i <= partes.length; i++) {
		var segment = partes.slice(0, i).join('/');
		segment.length>0 && !fs.existsSync(segment) ? fs.mkdirSync(segment) : null ;
	}
	// Verifica se existe em disco
	fs.stat(local, (check) => {
		if(check!==null) { // Nao existe no disco, vai baixar
			// Ponteiro para escrever arquivo em disco
			let file = fs.createWriteStream(local).on('error',function(err){
				console.log('erro no file=fs')
				console.log(
					'',
					'ERRO AO RECUPERAR ARQUIVO, WRITE',
					'Modo: '+mode,
					'Arquivo: '+arquivo,
					'URL: '+url,
					'Local: '+local,
					'Diretorio:'+dir,
					'Erro: '+err
				)
				console.log(err)
				e.sender.send(mode, url, err)
			})
			// Requisição de download
			let request = http.get( url , function(response) {
				if(response.statusCode!==200){
					//Retorna erro arquivo inválido
					e.sender.send(mode, false, 'URL INVÁLIDA: '+servidor+arquivo)
				}else{
					response.pipe(file)
					file.on('finish', function() {
						//Fecha o ponteiro de edição do arquivo
						file.close((r) => {
							fs.stat(local, (c) => {
								if(c!==null){
									e.sender.send(mode, url, false)
								} else {
									e.sender.send(mode, local, false)
								}
							})
						})
					})
				}
			}).on('error', function(err) {
				// Erro no download, exclui arquivo local e informa para pegar da url
				fs.stat(local, (check) => {
					if(check==null) {
						fs.unlink(local)
					}
				})
				//e.sender.send(mode, url, err)
				console.log(
					'',
					'ERRO AO RECUPERAR ARQUIVO, REQUEST',
					'Modo: '+mode,
					'Arquivo: '+arquivo,
					'URL: '+url,
					'Local: '+local,
					'Diretorio:'+dir,
					'Erro: '+err
				)
				console.log(err)
				e.sender.send(mode, url, err)
			})
		} else { // Já o arquivo em disco
			console.log('EM CACHE: '+arquivo)
			e.sender.send(mode, src, false)
		}
	})
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  // Cria a janela principal
  createWindow()
  // Verificar atualizacoes a cada 2 horas
  if(!isDev) {
	  setTimeout( updater.check, 10000)
	  setInterval( updater.check, 1 * 60 * 60 * 1000)
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
