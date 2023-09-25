
//Define ID geral da rádio para requisicoes
window.radio_id = false

//URL base do servidor para uso nos audios
window.url = null

//Recupera informacoes de login
exports.loginData = JSON.parse(localStorage.getItem('loginData')) || {servidor:false,usuario:false,senha:false}

//Define informacoes de login
exports.setLoginData = (servidor,usuario,senha) => {
  localStorage.setItem('loginData',JSON.stringify({servidor,usuario,senha}))
  this.loginData = {servidor,usuario,senha}
}

//Valida servidor
exports.logIn = () => {
  //Informacao ao usuario
  $('#wLoad').removeClass('is-hidden')
  $('#infoLoad').text('Conectando ao servidor...')
  //Define endereco do servidor
  window.url = 'http://' + this.loginData.servidor + '/'
  //Consulta servidor remoto
  $.ajax({
    url: 'http://' + this.loginData.servidor + '/rest.php',
    type: 'POST',
    data: { class:'RadioService', method: 'login', usuario:this.loginData.usuario, senha:this.loginData.senha }
  })
  .done(function(response) {
    //Se entrou com sucesso, inicia carregamento dos dados
    if(response.status==='success') {
      $('#infoLoad').text('Acesso liberado... carregando informa&ccedil;&otilde;es...')
      $('#wLogin').addClass('is-hidden')
      $('#wLoad').removeClass('is-hidden')
      window.radio_id = response.data.id
      exports.getData()
      setInterval(exports.ping, 60000)
    //Senão exibe mensagem de erro
    }else{
      $('#wLogin').removeClass('is-hidden')
      $('#wLoad').addClass('is-hidden')
      $('#erroLogin .message-body').text(response.data)
    }
  })
  .fail(function(e) {
    console.log("Erro no login")
    console.log(e)
    $('#wLogin').removeClass('is-hidden')
    $('#erroLogin .message-body').text('Erro no login!')
    $('#erroLogin').hide().removeClass('is-hidden').fadeIn(500)
  })
  .always(function(a,b,c) {
    console.log("Requisição finalizada")
    $('#bEntrar').prop('disabled', false).removeClass('is-loading')
  })

}

// Recupera os dados do Servidor
exports.getData = () => {
  //Se nao tiver id invalida
  //if(!this.id)return
  //Exibe Carregando
  $('#infoLoad').text('Carregando mídia do servidor...')
  $('#wLoad').removeClass('is-hidden').fadeIn(250)
  //Recupera todos os dados da rádio
  $.ajax({
    url: 'http://' + this.loginData.servidor + '/rest.php',
    type: 'POST',
    data: { class:'RadioService', method: 'getData', id:window.radio_id }
  })
  .done(function(response) {
    console.log(response)
    //Se entrou com sucesso, define parametros e inicializa rotina de carregamento continua
    if(response.status==='success') {
      $('#infoLoad').text('M&iacute;dia recebida... gerando lista de reprodu&ccedil;&atilde;o')
      window.setData(response.data)
      window.setRules()
      exports.setChamadas()
      exports.setPreferencias()
    //Senão exibe mensagem de erro
    }else{
      $('#wLoad').addClass('is-hidden')
      $('#wLogin').removeClass('is-hidden')
      $('#erroLogin .message-body').text(response.data)
    }
  })
  .fail(function(e) {
    console.log("Erro no login")
    console.log(e)
    $('#wLoad').addClass('is-hidden')
    $('#wLogin').removeClass('is-hidden')
    $('#erroLogin .message-body').text('Erro no login!')
    $('#erroLogin').hide().removeClass('is-hidden').fadeIn(500)
  })
  .always(function() {
    console.log("Requisição finalizada")
    $('#bEntrar').prop('disabled', false).removeClass('is-loading')
  })
}

//Cria interface de chamadas na wChamadas
exports.setChamadas = () => {
  combos = window.getData('combos')
  $('#tChamadasTitulos,#pChamadasCorpo').empty()
  for(let i in combos){
    let tab = `<a class="button" onclick="$(this).parent().toggleClass('is-active').siblings().removeClass('is-active');$('#aba${i}').siblings().addClass('is-hidden');$('#aba${i}').removeClass('is-hidden')">
                  ${combos[i].nome}
                </a>`
    $('#tChamadasTitulos').append(tab)
    let body = `<div id="aba${i}" class="`
    if(i>0)body+=` is-hidden">`
    else body+=`">`
    combos[i].categorias.forEach((item,index) => {
      if(item.audios.length===0)return
      body += `<div class="select"><select name="combo_${i}_${index}" class="combo_${i}">`
      if(item.audios.length===1)
        body += `<option value="${item.audios[0].arquivo}">${item.audios[0].nome}</option>`
      else
        item.audios.forEach((option,idx_option) => {
          body += `<option value="${option.arquivo}">${option.nome}</option>`
        })
      body += `</select></div>`
    })
    body += `<a onclick="window.playCombo(${i})" class="button"><span class="icon is-small"><i class="fa fa-play-circle-o"></i></span></a></div>`
    $('#pChamadasCorpo').append(body)
  }
  $('#tChamadasTitulos a:first').click()

}
//Cria interface de preferencias
exports.setPreferencias = () => {
	//Define se vai ser possivel editar generos e playlist
	r = window.getData('radio')
	if(r.set_genero!=1&&r.set_playlist!=1)
		$('#bPreferencias').hide()
	if(r.set_genero!=1)
		$('.set-genero').hide()
	if(r.set_playlist!=1)
		$('.set-playlist').hide()

  // Processa generos musicais
  let play = window.getData('play') //Selecionados
  let musicas = window.getData('musicas') //Generos
  for(let i in musicas){
    let classe = play.indexOf(i) > -1 ? ' is-info' : ''
    let template = `<a class="button is-small${classe}" data-id="${musicas[i].id}">${musicas[i].nome}</a>`
    $('#pGeneros').append(template)
  }
  $('#pGeneros a').click((e) => { $(e.currentTarget).toggleClass('is-info') })
  play = null
  musicas = null
  // Processa categorias de áudios
  let usados = []
  let playlist = window.getData('playlist')
  let audios = window.getData('audios')
  playlist.forEach((obj,index) => {
    usados.push(obj.categoria_id)
    let template = `
    <div class="panel-block">
      <label><input type="checkbox" checked="checked" name="categorias[]" value="${obj.categoria_id}"></label>
      <input class="input is-small" type="text" placeholder="&ordm;" value="${obj.ordem}" name="ordem_${obj.categoria_id}">
      tocar
      <input class="input is-small" type="text" placeholder="1" value="${obj.qtd}" name="qtd_${obj.categoria_id}">
      <input class="input is-small" type="text" value="${audios[obj.categoria_id].nome}" disabled="true">
      a&nbsp;cada
      <input class="input is-small" type="text" placeholder="1" value="${obj.intervalo}" name="intervalo_${obj.categoria_id}">
      m&uacute;sicas
    </div>`
    $('#pCategorias').append(template)
  })
  for(let i in audios){
    if(usados.indexOf(i)==-1){
    let obj = audios[i]
    let template = `
    <div class="panel-block">
      <label><input type="checkbox" name="categorias[]" value="${obj.id}"></label>
      <input class="input is-small" type="text" placeholder="&ordm;" name="ordem_${obj.id}">
      tocar
      <input class="input is-small" type="text" placeholder="1" name="qtd_${obj.id}">
      <input class="input is-small" type="text" value="${audios[i].nome}" disabled="true">
      a&nbsp;cada
      <input class="input is-small" type="text" placeholder="1" name="intervalo_${obj.id}">
      m&uacute;sicas
    </div>`
    $('#pCategorias').append(template)
    obj = null
    }
  }
  audios = null
}

exports.ping = () => {
  $.ajax({
    url: 'http://' + this.loginData.servidor + '/rest.php',
    type: 'POST',
    data: { class:'RadioService', method: 'ping', id:window.radio_id },
    timeout: 45000
  })
  .done(function(response) {
    if(response.status==='success') {
      if(response.data.cmd==='remote') {
        window.playRemoto(response.data)
      }else if (response.data.cmd==='reload') {
        exports.getData()
      }
    } else {
      //alert(response.data)
      console.log(response.data)
    }
  })
  .fail(function() {
    console.log("error")
  })
  .always(function() {
    console.log("complete")
  });
}
