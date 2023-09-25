// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.


// Modules
const {ipcRenderer} = require('electron')
const {dialog} = require('electron').remote
const player = require('./player.js')
const radio = require('./radio.js')
const updateOnlineStatus = () => {
  $('#networkStatus').text(navigator.onLine?'ONline':'OFFline')
  if(navigator.onLine)
    $('#networkStatus').removeClass('is-danger').addClass('is-primary')
  else
    $('#networkStatus').removeClass('is-primary').addClass('is-danger')
}
const throwError = (message) => {
  $('#wError').removeClass('is-hidden')
  $('#infoError').html(message)
}
window.log = (data) => {
	console.log(data)
	if(typeof data == 'object'){
		info = JSON.stringify(data)
	}else if(typeof data == 'array'){
		info = data.toString()
	}else{
		info = data
	}
	d = new Date()
	data = d.getHours()+':'+d.getMinutes()+':'+d.getSeconds()
	$('#debug').append(`
		<tr>
			<td>${data}</td>
			<td>${info}</td>
		</tr>
	`)
}
// Detecta situacao da conexao com a internet
window.addEventListener('online',  updateOnlineStatus)
window.addEventListener('offline',  updateOnlineStatus)

// Ao carregar
$(document).ready(() => {
  // Verifica conexao com a internet
  updateOnlineStatus()
  // Se existir usuario e senha realiza login e carrega dados
  if(radio.loginData.servidor)
    radio.logIn()
  // Caso contrario mostra login
  else{
    $('#wLogin').removeClass('is-hidden')
    $('#wLoad').addClass('is-hidden')
  }
  // Set atualiza conteúdo a cada hora
  //setInterval(radio.getData,3600000)
})

// Click do botao entrar realiza logIn
$('#bEntrar').click(() => {
  // Disable login button
  $('#bEntrar').prop('disabled', true).addClass('is-loading')
  // Set new login info
  radio.setLoginData($('#inputServidor').val(),$('#inputUsuario').val(),$('#inputSenha').val())
  // Realiza logIn
  radio.logIn()
})

// Click do botao play/pause
$('#bPlayPause').click(() => {
  if(window.isPlaying()) window.pause()
  else window.play()
})
// Click botao anterior
$('#bPrev').click(() => { window.prev() })
// Click botao proximo
$('#bNext').click(() => { window.next() })
// Volume +
$('#bVolUp').click(() =>{ window.volUp() })
// Volume -
$('#bVolDown').click(() =>{ window.volDown() })
// Volume On/Off
$('#bVolOnOff').click(() =>{ window.volOnOff() })
// Botao debug
$('#bDebug').click(() =>{
	window.openDevTools()
})
// Janela Chamadas
$('.modal-button').click((e) => { document.getElementById(e.currentTarget.dataset.target).className = 'modal is-active' })
$('.modal-close,.modal-background').click((e) => { $(e.currentTarget).parent().removeClass('is-active') })
// Sair
$('#bSair').click((e) => {
  dialog.showMessageBox({
    type:'question',
    buttons:['Sim','Não'],
    title:'Confirme sua saída',
    message:'Tem certeza que deseja sair? O aplicativo será reiniciado e voltará para a tela de acesso.'
  },(response,checkboxChecked) => {
    if(response===0) {
      radio.setLoginData(false,false,false)
      window.location.reload()
    }
  })
})
// Atualizar
$('#bRefresh').click((e) => { radio.getData() })
// Salvar Preferencias
$('#bSetPreferencias').click((e) => {
  $('#bSetPreferencias').addClass('is-loading')
  let data = $('#pCategorias').serializeArray()
  $('#pGeneros a.is-info').each((idx,obj)=>{ data.push({name:'generos[]',value:$(obj).data('id') }) })
  data.push({name:'class',value:'RadioService'})
  data.push({name:'method',value:'postSettings'})
  data.push({name:'id',value:window.radio_id})
  $.ajax({
    url: 'http://' + radio.loginData.servidor + '/rest.php',
    type: 'POST',
    data: $.param(data)
  })
  .done(function(response) {
    console.log(response)
  })
  .fail(function() {
  })
  .always(function() {
    $('#bSetPreferencias').removeClass('is-loading')
    $('#wPreferencias .modal-close').click()
    window.location.reload()
  });

})
