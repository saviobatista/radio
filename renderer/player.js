
//Variaveis
exports.volume = 1
exports.mudo = false
exports.buffersize = 10
exports.limitsize = 25 // tamanho maximo de audios na memoria
exports.playlist = []
exports.playdata = []
exports.idx = false // false é que ainda não comecou a tocar
exports.idx_musica = []
exports.idx_audio = []
exports.idx_rules = 0
exports.rules = []
exports.data = {}
exports.cachelist = []
exports.preload = null
exports.predata = null
exports.erros = 0
exports.loading = false
//Sequencia
exports.flowplay = []
exports.flowdata = []
exports.flowtitle = null
exports.flowready = 0
exports.flowindex = 0
//Animacao
exports.animacao =  new SiriWave({
  container:document.getElementById('wave'),
  width:752,
  height:100,
  speed:0.02,
  autostart:false
})
window.waveStart = () => {
  this.animacao.start()
}
window.waveStop = () => {
  this.animacao.stop()
}
// Indice para saber qual deve ser
exports.cache_index = -1
// Processa o download item do arquivo a tocar
const {ipcRenderer} = require('electron')
// Gera o cache dos arquivos disponiveis na biblioteca
exports.cache = () => {
	// Verifica se há mais algum item para cache
	if(this.cachelist.length > this.cache_index+1 ) {
		this.cache_index += 1
		// Envia requisição de cache
		//console.log('enviando solicitacao get-cache para '+this.cachelist[idx_anterior+1])
		ipcRenderer.send('get-file','cache', window.url, this.cachelist[this.cache_index])
	} else {
		window.log('Terminou a verificaçao e download de '+this.cachelist.length+' audios para o cache.')
	}
}
// Recebe conclusão do cache atual e informa que esta pronto pro proximo,
// Entao inicia novo pedido de cache
ipcRenderer.on('cache', (e, url, error) => {
	if(error)window.log('ERRO NO CACHE: '+error+'<br>URL: '+url)
	// Atualiza %
	$('#cacheCount').text( parseInt( ((this.cache_index+1)/this.cachelist.length)*100 ) + '%' )
	// Solicita novo cache
	this.cache()
})
// Pega arquivo local para tocar na lista
exports.download = () => {
	//Define os dados do audio
	this.predata = this.getAudioData()
	//console.log('Iniciando download do proximo audio',this.predata)
	$('#infoLoad').html(
		'Carregando item #'+(this.playlist.length+1)+': '+this.predata.nome+
		'<br><small>A rádio vai começar a tocar quando houver pelo menos 10 itens carregados!</small>')
	ipcRenderer.send('get-file', 'playlist', window.url, this.predata.arquivo)
}
// recebe o audio de retorno
ipcRenderer.on('playlist', (e,src,err) => {
	if(err)window.log('set-audio teve erro: '+err+' no arquivo:'+src)
	if(src!==false)this.load(src)
	else this.download()
})
//Define o proximo item a ser Carregado usando data de retorno do ipc
exports.load = (src) => {
	$('#infoLoad').html(
		'Iniciando item #'+(this.playlist.length+1)+': '+this.predata.nome+
		'<br><small>A rádio vai começar a tocar quando houver pelo menos 10 itens carregados!</small>')
  //Define o item a ser carregado
  this.preload = new Audio()
  this.preload.src = src
  this.preload.loop = false
  this.preload.addEventListener('error', (e) => {
	  // Informa erro
	  $('#infoLoad').html(
  		'ERRO FATAL #'+(this.playlist.length+1)+': '+this.predata.nome+
  		'<br><small>Ocorreu um erro ao carregar o audio atual! O proximo deve ser carregado em breve!</small>')
    //Computa carregados
    $('#errorCount').text(parseInt($('#errorCount').text())+1)
    this.erros++
    this.loading = false
    console.log('Erro ao pré-carregar áudio')
    console.log(e);
    this.preload = null
    this.predata = null
	//Se teve mais de 10 erros mata e reinicia
	if(this.erros>10){
		alert('ATENÇÃO!!! JÁ ACONTECERAM PELO MENOS 10 ERROS! FECHE O PROGRAMA E ABRA NOVAMENTE!! SEU COMPUTADOR PODE ESTAR COM PROBLEMAS!!!')
		history.go(0)
	}
    //Se a quantidade de carregados for 10 ou mais e ainda não tiver iniciado, inicia
    if( !this.idx && this.playlist.length >= this.buffersize ) {
      //Oculta carregamento
      $('#wLoad').addClass('is-hidden')
      //Exibe janela wPlayer
      $('#wPlayer').removeClass('is-hidden')
    }
    //carregará o proximo em 3 segundos
    this.download()
    //window.next()
  })
  this.preload.addEventListener('ended', (e) => {
    this.setLabels('Finalizando')
    $('#playedCount').text(parseInt($('#playedCount').text())+1)
    window.waveStop()
    this.erros = 0
    window.next()
  })
  this.preload.addEventListener('play', (e) => {
    //Visual
    this.setLabels('Tocando')
    $('#bPlayPause').find('i').removeClass('fa-play-circle').addClass('fa-pause-circle')
    window.waveStart();
    //Historico
    this.addHistorico('Player',this.playdata[this.idx])
    //Carrega mais um se houver menos de 10 no buffer
    if( !this.loading && this.playlist.length - this.idx < this.buffersize)
      this.download()
  })
  this.preload.addEventListener('pause', (e) => {
    //Visual
    this.setLabels('Parado')
    $('#bPlayPause').find('i').removeClass('fa-pause-circle').addClass('fa-play-circle')
    window.waveStop();
  })
  this.preload.addEventListener('loadeddata', (e) => {
    //Computa carregados
    $('#loadedCount').text(parseInt($('#loadedCount').text())+1)
    //Reseta erros
    this.erros = 0
    //Adiciona o item a lista
    this.playlist.push(this.preload)
    this.playdata.push(this.predata)
    //Reseta os dados de carregamento
    this.preload = null
    this.predata = null
    //Encerra carregamento
    this.loading = false
    //Se a quantidade de carregados for 10 ou mais e ainda não tiver iniciado, inicia
    if( !this.idx && this.playlist.length >= this.buffersize ) {
      //Oculta carregamento
      $('#wLoad').addClass('is-hidden')
      //Exibe janela wPlayer
      $('#wPlayer').removeClass('is-hidden')
      //Inicializa variavel indice
      this.idx = 0
      //Toca o audio
      window.play()
	  //Inicia o cache
	  this.cache()
    }
    //Se houver mais que o LIMITSIZE, remove o primeiro audio da lista
    //##MELHORAR CODIGO
    if( this.playlist.length > this.limitsize ) {
      //this.playlist.shift()
      //this.playdata.shift()
    }
    //Se houverem menos de BUFFERSIZE carregados, carrega o proximo
    if( this.playlist.length - this.idx < this.buffersize)
      this.download()
  })
  this.preload.addEventListener('timeupdate',exports.setProgresso)
}
//Verifica se está tocando
window.isPlaying = () => {
  if(typeof this.playlist[ this.idx ] === null) return true
  else return !this.playlist[ this.idx ].paused
}
//Toca o atual
window.play = () => {
  this.playlist[ this.idx ].play()
}
//Pausa o atual
window.pause = () => {
  this.playlist[ this.idx ].pause()
}
//Toca o próximo
window.next = () => {
  window.pause()
  this.idx = this.playlist.length > this.idx+1 ? this.idx+1 : 0
  window.play()
}
//Toca o anterior
window.prev = () => {
  window.pause()
  this.idx = this.idx == 0 ? this.playlist.length-1 : this.idx-1
  window.play()
}

//Projeta a estrutura da lista de reproducao de acordo com as preferencias
window.setRules = () => {
  //Zera generos para somente os que houverem musicas
  let generos = []
  this.data.play.forEach((item,index) => {
    if( this.data.musicas[item].musicas.length>0 ) generos.push(item)
  })
  this.data.play = generos
  //Se nao houver generos selecionados, dá erro
  if( this.data.play.length===0 ){
    alert(	"Nenhum gênero musical com músicas está disponível!!!<br>"+
			"Selecione pelo menos um genero musical!")
	$('.set-genero').show()
	$('#bPreferencias').trigger('click')
  }
  //Redefine o indice
  this.idx_rules = 0
  //Define o intervalo maximo da playlist
  let max_list = 0
  this.data.playlist.forEach((item,index) => {
    if(typeof this.data.audios[ item.categoria_id ] !== 'undefined' &&
      this.data.audios[ item.categoria_id ].audios.length>0 &&
      item.intervalo>max_list
    ) max_list = item.intervalo
  })
  //Define o maximo divisor comum para gerar a lista de musicas e audios intercalados
  let qtd = this.mmc(max_list , this.data.play.length)
  //Gera regras conforme a estrutura
  for(let i=0;i<qtd;i++) {
    //Redefine o indices conforme tipo de conteudo
    this.idx_musica[ this.data.play[i%this.data.play.length] ] = 0 //indice do genero é zerado
    //Adiciona regra de reproducao
    this.rules.push({ tipo:'M', genero:this.data.play[i%this.data.play.length] })
    this.data.playlist.forEach((item,index) => {
	console.log(i,item.intervalo,i%item.intervalo)
      //considerado apenas se houver pelo menos um audio na categoria atual
      if(
		i === 0 ||
        typeof this.data.audios[ item.categoria_id ] == 'undefined' ||
        this.data.audios[ item.categoria_id ].audios.length===0 ||
        i%item.intervalo !== 0
      ) return
      //indice da categoria é zerado
      this.idx_audio[ item.categoria_id ] = 0
      //Repetidor pela quantidade no playlist
      for(let c=0;c<item.qtd;c++) {
        this.rules.push({ tipo:'A', categoria:item.categoria_id })
      }
    })
  }
  //Carrega o proximo
  $('#infoLoad').text('Prefer&ecirc;ncias processadas... carregando primeiro item da lista...')
  //this.load()//Carrega o proximo para tocar
  //Lança o download do proximo item
  this.download()
}
//Dados do proximo item a ser tocado
exports.getAudioData = () => {
  //Pelo indice atual
  let rule = this.rules[ this.idx_rules % this.rules.length ]
  //Aumenta o iterador de regras
  this.idx_rules++
  //Recupera conforme o tipo
  if( rule.tipo === 'M' ) {
    let index = this.idx_musica[ rule.genero ] % this.data.musicas[ rule.genero ].musicas.length
    let obj = this.data.musicas[ rule.genero ].musicas[ index ]
    obj.tipo = 'Música'
    obj.grupo = this.data.musicas[ rule.genero ].nome
    //aumenta iterador
    this.idx_musica[ rule.genero ]++
    //Retorna dados para carregamento
    return obj
  } else if ( rule.tipo === 'A' ) {
    let index = this.idx_audio[ rule.categoria ] % this.data.audios[ rule.categoria ].audios.length
    let obj = this.data.audios[ rule.categoria ].audios[ index ]
    obj.tipo = 'Áudio'
    obj.grupo = this.data.audios[ rule.categoria ].nome
    //aumenta iterador
    this.idx_audio[ rule.categoria ]++
    //Retorna dados para carregamento
    return obj
  } else {
    console.log('Erro no tipo de regra, abortando!')
    console.log(rule)
  }
}

//Define dados do PLAYER
window.setData = (data) => {
	// Define dados da rádio
	this.data = data
	// Gera lista de cache para download
	// AUDIOS
    for(let i in this.data['audios']){
      this.data['audios'][i].audios.forEach((audio,subindex) => {
        this.cachelist.push(audio.arquivo)
      })
    }
	// COMBOS
    for(let i in this.data['combos']){
    	this.data['combos'][i].categorias.forEach((categoria,index) => {
      		categoria.audios.forEach((audio,subindex) => {
				this.cachelist.push(audio.arquivo)
			})
		})
    }
	// MUSICAS
	for(let i in this.data['musicas']){
      this.data['musicas'][i].musicas.forEach((audio,subindex) => {
        this.cachelist.push(audio.arquivo)
      })
    }
	// Inicializa geração do cache
	//console.log('Lista de cache para download:',this.cachelist)
	//this.cache(-1)
}
//Recupera dados do PLAYER
window.getData = (tipo) => {
  return this.data[tipo]
}
window.getAudioById = (id) => {
  let result = false
  let categoria = window.getData('audios')
  for(let i in categoria){
    let test = categoria[i].audios.forEach((audio,subindex) => {
      if( audio.id==id ) {
        result = audio
      }
    })
  }
  return result
}

//Minimo multiplo comum entre generos distintos e playlist
exports.mmc = (num1, num2) => {
  num1 = num1 === 0 ? 1 : num1
  num2 = num2 === 0 ? 1 : num2
    let resto, a, b

    a = num1
    b = num2

    do {
        resto = a % b

        a = b
        b = resto

    } while (resto != 0)

    return (num1 * num2) / a;
}
// horario
exports.getHorario = () => {
  let date = new Date()
  let r
  r  = ( date.getHours() < 10 ? '0' : '' ) + date.getHours() + ':'
  r += ( date.getMinutes() < 10 ? '0' : '' ) + date.getMinutes() + ':'
  r += ( date.getSeconds() < 10 ? '0' : '' ) + date.getSeconds()
  return r
}
// Gera label para exibição e registro
exports.setLabels = (oper) => {
  $('#lGlobal').text(oper+': '+this.playdata[this.idx].nome)
  $('#lSubGlobal').text(this.playdata[this.idx].tipo+': '+this.playdata[this.idx].grupo)
}
// Define o rotulo do
exports.setProgresso = (e) => {
  var currentTime = this.playlist[this.idx].currentTime | 0;

  var duration = this.playlist[this.idx].duration | 0;

  var minutes = "0" + Math.floor(duration / 60);
  var seconds = "0" + (duration - minutes * 60);
  var dur = minutes.substr(-2) + ":" + seconds.substr(-2);


  var minutes = "0" + Math.floor(currentTime / 60);
  var seconds = "0" + (currentTime - minutes * 60);
  var cur = minutes.substr(-2) + ":" + seconds.substr(-2);

  $('#lTime').text(cur+'/'+dur)
}
// Volume
exports.setVolume = (amount) => {
  this.volume = amount.toFixed(1)
  $('#lVolume').text((this.volume*100)+'%')
  this.playlist.forEach((item,index) => {
    item.volume = this.volume
  })
}
// Volume +
window.volUp = () => {
  if(this.volume<1) this.setVolume(parseFloat(this.volume)+0.1)
}
// Volume -
window.volDown = () => {
  if(this.volume>0) this.setVolume(parseFloat(this.volume)-0.1)
}
// Volume On/Off
window.volOnOff = () => {
  this.mudo = !this.mudo
  this.playlist.forEach((item,index) => { item.muted = this.mudo })
  $('#bVolOnOff').toggleClass('fa-volume-up').toggleClass('fa-volume-off');
}
// loadFlow (carrega a sequencia de audios para tocar)
exports.loadFlow = () => {

}
// playFlow (toca uma sequencia de audios baseados em uma lista)
exports.playFlow = (title,data) => {
  this.flowplay = []
  this.flowdata = data
  this.flowtitle = title
  this.flowready = 0
  this.flowindex = 0
  this.flowdata.forEach((src,index) => {
    let audio = new Audio()
    audio.src = window.url + src
    audio.loop = false
    audio.autoplay = false
    audio.addEventListener('loadeddata',() => {
      this.flowready++
      if(this.flowready===this.flowplay.length){
        //Pausa a lista principal
        window.pause()
        //Toca os combos
        this.addHistorico('Sistema',this.flowtitle)
        this.flowplay[this.flowindex].play()
      }
    })
    audio.addEventListener('ended',() => {
      if(this.flowindex+1>=this.flowready){
        //Destroy os combos
        this.flowplay = []
        this.flowdata = []
        this.flowready = 0
        this.flowindex = 0
        this.flowtitle = ''
        //Volta a lista
        window.play()
      }else{
        //toca o proximo combo
        this.flowindex++
        this.flowplay[this.flowindex].play()
      }
    })
    audio.addEventListener('error',() => {
      //Erro nao toca nenhum e volta a tocar normal
      this.flowplay = []
      this.flowdata = []
      this.flowready = 0
      this.flowindex = 0
      this.flowtitle = ''
      window.play()
    })
    this.flowplay.push(audio)
  })
}
// Combinação
window.playCombo = (id) => {
  let data = []
  let title = ''
  $('.combo_'+id).each((index,obj) => {
    data.push(obj.value)
    title += obj.options[obj.selectedIndex].text + ' '
  })
  this.playFlow(title,data)
}
// Controle Remoto
window.playRemoto = (data) => {
  if(data.tipo==='H'){//Hora Certa
    this.playHoracerta()
  }else if(data.tipo==='A'){//Áudio avulso
    let audio = window.getAudioById(data.arquivo)
    this.playFlow('Controle Remoto: '+audio.nome,[audio.src])
  }else if(data.tipo==='C'){//Chamada
    this.playFlow('Controle Remoto: '+window.getData('combos')[data.id].nome,data.arquivo)
  }
}
// Adiciona item à playlist
exports.addHistorico = (tipo,data) => {
    $('#historico').prepend(`
    <tr>
      <td>${this.getHorario()}</td>
      <td>${tipo}</td>
      <td>${data.tipo}</td>
      <td>${data.grupo}</td>
      <td>${data.nome}</td>
    </tr>`)
}

//Controle de versão
ipcRenderer.on('version', (e, atual, max) => {
	
})
