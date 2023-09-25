// Modulos
const {autoUpdater} = require('electron-updater')

autoUpdater.logger = require('electron-log')
autoUpdater.logger.transports.file.level = 'info'

// Verifica por atualizacoes
exports.check = () => {
  // Modulo de autalizacao
  //autoUpdater.checkForUpdatesAndNotify()
  autoUpdater.checkForUpdates()
  // Ao terminar o download se houver novidades sai e instala o programa
  autoUpdater.on('update-downloaded', () => {
    autoUpdater.quitAndInstall(true,true)
  })
}
