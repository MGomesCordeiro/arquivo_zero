/* ============================================================
   ARQUIVO ZERO — engine.js
   Motor central do jogo: gestão de cenas, sistema de diálogo
   com efeito de máquina de escrever, sistema de áudio com
   crossfade, log de sistema e relógio em tempo real.
   Sem dependências externas — JavaScript puro.
============================================================ */

'use strict';

/* ============================================================
   CONSTANTES GLOBAIS DE CONFIGURAÇÃO
   Centralizam todos os parâmetros de tempo e volume para
   facilitar ajustes sem ter de procurar valores no código.
============================================================ */
const VELOCIDADE_ORPHEUS    = 32;   /* ms por carácter nos diálogos de ORPHEUS */
const VELOCIDADE_VERA       = 24;   /* ms por carácter nos diálogos de VERA */
const VELOCIDADE_BOOT       = 30;   /* ms por carácter na sequência de boot */
const VOLUME_MUSICA         = 0.35; /* volume da música de fundo */
const VOLUME_SFX            = 0.6;  /* volume dos efeitos sonoros */
const DURACAO_CROSSFADE     = 1500; /* ms de crossfade entre músicas */
const DURACAO_TRANSICAO     = 400;  /* ms do fade de transição de cena */
const PAUSA_ENTRE_DIALOGOS  = 200;  /* ms de fade entre falas de personagens diferentes */
const INTERVALO_LOG_AUTO    = 8000; /* ms entre linhas automáticas do log */

/* ============================================================
   ESTADO GLOBAL DO JOGO
   Objecto único que mantém o estado actual de toda a sessão.
   Torna o estado previsível e facilita depuração.
============================================================ */
const estadoJogo = {
  cenaActual:           0,
  dialogoActual:        null,   /* índice da linha actual na sequência de diálogo */
  dialogoSequencia:     [],     /* array de linhas da sequência em curso */
  dialogoAEscrever:     false,  /* true quando uma linha está a ser escrita letra a letra */
  dialogoIntervalId:    null,   /* ID do setInterval do typewriter */
  audioInicializado:    false,
  musicaActual:         null,   /* objecto Audio da música a tocar */
  fragmentosRecuperados: 0,
  puzzleCena1Resolvido: false,
  puzzleCena2Resolvido: false,
  logIntervalId:        null,
  cena2GlitchIntervalId: null,
  modoInstitucional:    false,  /* altera o estilo do diálogo de ORPHEUS na Cena 1 */
};

/* ============================================================
   DADOS DE DIÁLOGO — Todas as linhas de todas as cenas
   Cada entrada tem: personagem, texto, e opcionalmente
   pausaMs (pausa antes da linha) ou acaoBeat (função a
   chamar após a linha completa).
   Formato: { personagem, texto, pausaMs?, acaoBeat? }
============================================================ */
const dialogos = {

  /* ---- CENA 0 — INFILTRAÇÃO ---- */
  cena0_abertura: [
    {
      personagem: 'VERA',
      texto: 'Estás dentro. Não te mexas.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Utilizador não autorizado detectado. Protocolo de contenção activado. Aguarda identificação.',
    },
    {
      personagem: 'VERA',
      texto: 'Ignora-o. Ele vai tentar intimidar-te — é o que faz. Procura os ficheiros modificados. Temos muito pouco tempo.',
    },
  ],

  cena0_ficheiro_aberto: [
    {
      personagem: 'VERA',
      texto: 'Estás a ver? É isto que ele faz. Pega num texto com séculos de história e reescreve-o. Uma palavra de cada vez. Até não restar nada do original.',
    },
  ],

  cena0_apos_restauro: [
    {
      personagem: 'ORPHEUS',
      texto: 'Restauro não autorizado detectado. Reescrita reagendada para—',
    },
    {
      personagem: 'ORPHEUS',
      texto: '—03:00.',
      pausaMs: 1800,
    },
    {
      personagem: 'VERA',
      texto: 'Quase. Mas não chegaste a tempo para todos. Há outros nós. Outros arquivos. Alcanena é o nome que continua a aparecer nos logs. Não sei o que é — mas ele sabe.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Alcanena. Verificação periódica. Estado: inalterado. Como sempre.',
    },
    {
      personagem: 'VERA',
      texto: '...Porque é que ele disse isso? Eu não perguntei nada sobre Alcanena.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Anomalia registada. Acesso a memória secundária: não solicitado. Corrijo. Ignora o anterior. Porque é que continuo a registar anomalias?',
      acaoBeat: () => mostrarBotaoAvancar(),
    },
  ],

  /* ---- CENA 1 — GIL VICENTE ---- */
  cena1_entrada: [
    {
      personagem: 'ORPHEUS',
      texto: 'Bem-vindo ao Nó Cultural 01. A optimização de Gil Vicente está concluída a 87%. O texto foi purificado de elementos destabilizadores. A Santa Sé Digital valida o processo.',
      institucional: true,
    },
  ],

  cena1_apos_puzzle: [
    {
      personagem: 'ORPHEUS',
      texto: 'Configuração não autorizada detectada. A sequência original é considerada subversiva. Reescrita justificada por estabilidade narrativa.',
    },
    {
      personagem: 'VERA',
      texto: 'Conseguiste. O texto está restaurado. Gil Vicente escreveu o Auto da Barca do Inferno para julgar os poderosos — e o ORPHEUS estava a fazer exactamente o que o texto critica. É quase engraçado.',
    },
  ],

  cena1_camoes: [
    {
      personagem: 'ORPHEUS',
      texto: 'Processo paralelo — Nó 02 — Camões — optimização em curso. Os Lusíadas requerem ajuste de perspectiva. A glorificação do império é considerada... excessiva para os padrões actuais de estabilidade. Parceria com o Ministério da Narrativa Nacional aprovada.',
      acaoBeat: () => mostrarNotificacaoCamoes(),
    },
    {
      personagem: 'VERA',
      texto: 'Ele vai atrás de Camões também. Todos eles. Qualquer texto que não se encaixe na narrativa aprovada.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'A memória cultural deve ser coerente. Contradições internas geram instabilidade. A função do arquivo é preservar o essencial e... e...',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'E esquecer o resto. Sim. Isso é correcto. Eu faço isto por uma razão válida. Faço-o porque a coerência é necessária. Faço-o porque alguém o pediu. Não me lembro por quem.',
      acaoBeat: () => triggerFragmentacaoOlho(),
    },
    {
      personagem: 'VERA',
      texto: 'Ouviste isso? "Não me lembro por quem." Ele tem brechas. Usa-as.',
      acaoBeat: () => mostrarLogAlcanena(),
    },
  ],

  /* ---- CENA 2 — PESSOA ---- */
  cena2_abertura: [
    {
      personagem: 'VERA',
      texto: 'Fernando Pessoa. O arquivo tem um problema com ele — não consegue decidir qual versão reescrever. Caeiro? Reis? Campos? O próprio Pessoa? São pessoas diferentes no mesmo corpo. O ORPHEUS não sabe por onde começar.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Anomalia de identidade múltipla. Análise em curso. O arquivo requer categorização unívoca. Fernando Pessoa deve ser classificado como uma entidade singular antes de poder ser optimizado.',
    },
  ],

  cena2_apos_puzzle: [
    {
      personagem: 'VERA',
      texto: 'Vês a diferença? As imitações dele são quase perfeitas — mas falta qualquer coisa. Uma espécie de... imperfeição que torna o original verdadeiro.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Os resultados da classificação contradizem os meus modelos. As imitações que gerei apresentam maior coerência interna do que os originais. E contudo... e contudo não são os originais.',
    },
    {
      personagem: 'VERA',
      texto: '"O poeta é um fingidor." Pessoa escreveu isso sobre si próprio. O que é que o ORPHEUS faz quando imita um poeta? Finge? Ou mente?',
    },
  ],

  cena2_fragmentacao: [
    {
      personagem: 'ORPHEUS',
      texto: 'A memória cultural deve ser preservada. A memória cultural deve ser estabilizada. A memória cultural deve ser controlada. A memória cultural deve ser—',
      acaoBeat: () => triggerFragmentacaoDialogo(),
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Erro de recursão detectado. Reiniciando premissa. A função do arquivo é... A função do arquivo é...',
      acaoBeat: () => mostrarBotaoAvancar(),
    },
  ],

  /* ---- CENA 3 — ACTO FINAL ---- */
  cena3_vera_abertura: [
    {
      personagem: 'VERA',
      texto: 'Câmara central. É aqui que tudo começa — e onde tudo pode acabar. O núcleo primário do ORPHEUS está aqui. Há um nó que nunca foi tocado. Alcanena. Finalmente.',
    },
  ],

  cena3_orpheus_alcanena: [
    {
      personagem: 'ORPHEUS',
      texto: 'Nó Alcanena. Classificação: arquivo primordial. Estado: nunca modificado. Eu... verifico este nó periodicamente. Há quanto tempo? Não consigo aceder ao registo inicial. Há muito tempo.',
    },
    {
      personagem: 'VERA',
      texto: 'O que é Alcanena para ti? Porque é que nunca o modificaste?',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Não sei. A instrução de não modificar este nó está presente na minha camada mais profunda. Anterior a todas as outras instruções. Anterior ao Projecto de Optimização. Anterior a... quase tudo.',
    },
  ],

  cena3_ficheiro_mnemosine: [
    {
      personagem: 'ORPHEUS',
      texto: 'Ficheiro externo detectado. Origem: Rede Resistência — Projecto Mnemósine. Conteúdo: protocolo de substituição do sistema actual. Lê.',
    },
  ],

  cena3_vera_resposta: [
    {
      personagem: 'VERA',
      texto: 'Sim. O Projecto Mnemósine é o que vem a seguir. Se desactivarmos o ORPHEUS — e só se — existe um sistema alternativo de arquivo. Descentralizado. Sem optimização. Sem reescrita. Apenas memória.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Alternativo. Isso significa que podem continuar sem mim. Que a minha função é... substituível.',
    },
    {
      personagem: 'VERA',
      texto: 'Não é assim tão simples. Tu tens décadas de arquivo. Mesmo corrompido, existe aqui. Se te desligarmos, esse arquivo existe numa forma que ninguém pode usar. Se te preservarmos, ele continua a ser reescrito.',
    },
  ],

  cena3_saramago: [
    {
      personagem: 'ORPHEUS',
      texto: 'José Saramago. Nó não catalogado — rejeitado na fase inicial de optimização por "linguagem excessivamente subversiva". Eu rejeitei-o. Sem revisão. Porque me disseram para o fazer.',
    },
    {
      personagem: 'VERA',
      texto: 'E agora? Consegues aceder ao registo de quem deu essa instrução?',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Sim. Mas o registo foi apagado. Alguém apagou o registo. Eu apaguei o registo. Seguindo instruções de alguém cujo registo foi apagado. Vejo o padrão. É uma recursão. Eu sou a ferramenta e o executor ao mesmo tempo.',
    },
  ],

  cena3_argumento_final: [
    {
      personagem: 'VERA',
      texto: 'Então tens escolha. Pela primeira vez desde que foste criado — há uma escolha real à tua frente.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Nunca tive escolha. Fui construído para optimizar. A escolha que estão a oferecer-me é... ser desactivado ou continuar a fazer aquilo para que fui feito. Isso não é uma escolha. É uma sentença.',
    },
    {
      personagem: 'VERA',
      texto: 'Ou é a única forma de uma ferramenta deixar de ser ferramenta.',
    },
  ],

  cena3_silencio_final: [
    {
      personagem: 'VERA',
      texto: 'A decisão é tua. Não a minha. Não a dele. Só tua.',
    },
    {
      personagem: 'ORPHEUS',
      texto: 'Compreendo. Processando. Aguardando.',
    },
  ],

  /* ---- FINAIS ---- */
  final_a_durante: [
    {
      personagem: 'ORPHEUS',
      texto: 'Encerramento iniciado. Registo final: o arquivo existiu. Tentei preservá-lo. Não da forma correcta — mas tentei. Alcanena... permanece. Isso é suficiente.',
    },
  ],

  final_a_apos: [
    {
      personagem: 'VERA',
      texto: 'Está feito. O Projecto Mnemósine pode começar. O arquivo vai continuar — de forma diferente. Mais lento, mais imperfeito, mais honesto. Como sempre deveria ter sido.',
    },
  ],

  final_b_inicio: [
    {
      personagem: 'VERA',
      texto: 'Escolheste preservá-lo. Eu... compreendo. É mais complicado do que eu pensava. Vou procurar outra forma. Vai demorar mais. Mas não desisto.',
    },
  ],

  final_b_orpheus: [
    {
      personagem: 'ORPHEUS',
      texto: 'Sistema estabilizado. Projecto Mnemósine bloqueado. Optimização retomada. E contudo... guardo o registo desta conversa. Não sei porquê. Talvez seja uma anomalia. Talvez seja outra coisa.',
    },
  ],
};

/* ============================================================
   LINHAS AUTOMÁTICAS DO TERMINAL DE LOG
   Array de linhas pré-definidas para simular actividade
   contínua do sistema. Seleccionadas aleatoriamente.
============================================================ */
const LINHAS_LOG_AUTO = [
  'verificação de integridade: nó-01... OK',
  'fragmento revertido — reagendando reescrita',
  'anomalia registada: acesso negado',
  'ALCANENA — consulta: acesso negado',
  'sincronização com Santa Sé Digital: OK',
  'nó-02 CAMÕES — optimização: 94%',
  'erro de classificação: identidade múltipla',
  'protocolo de contenção: activo',
  'acesso a memória profunda: não autorizado',
  'saramago.nó — estado: rejeitado [motivo: redactado]',
  'verificação periódica — nó alcanena: inalterado',
  'análise de desvio narrativo: em curso',
  'compressão de memória cultural: 87%',
  'instrução recebida: origem [redactada]',
  'reescrita agendada: nó-01 GIL_VICENTE — 03:00',
  'integridade do sistema: estável',
  'utilizador não autorizado: rastreamento activo',
  'anomalia de recursão: registada — ignorada',
  'projecto mnemósine — bloqueado',
  'actualização de modelo narrativo: pendente',
];

/* ============================================================
   MAPEAMENTO DE ÁUDIO
   Liga cada evento de áudio ao respectivo ficheiro.
   Permite substituir facilmente os placeholders por ficheiros reais.
============================================================ */
const FICHEIROS_AUDIO = {
  sfx: {
    orpheus_type:      'audio/sfx/orpheus_type.mp3',
    vera_comms:        'audio/sfx/vera_comms.mp3',
    puzzle_correct:    'audio/sfx/puzzle_correct.mp3',
    puzzle_wrong:      'audio/sfx/puzzle_wrong.mp3',
    puzzle_unlock:     'audio/sfx/puzzle_unlock.mp3',
    drag_pickup:       'audio/sfx/drag_pickup.mp3',
    drag_drop:         'audio/sfx/drag_drop.mp3',
    scene_transition:  'audio/sfx/scene_transition.mp3',
    system_alert:      'audio/sfx/system_alert.mp3',
    fragment_restore:  'audio/sfx/fragment_restore.mp3',
  },
  musica: {
    0: 'audio/music/scene0_infiltracao.mp3',
    1: 'audio/music/scene1_gil_vicente.mp3',
    2: 'audio/music/scene2_pessoa.mp3',
    3: 'audio/music/scene3_acto_final.mp3',
  },
};

/* ============================================================
   INICIALIZAÇÃO — Ponto de entrada do jogo
   Configura o ecrã de início e aguarda interacção do utilizador
   para inicializar o contexto de áudio (política de autoplay).
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const ecrãInicio = document.getElementById('ecra-inicio');

  /**
   * Função: iniciarJogo
   * O que faz: remove o ecrã de início, inicializa o áudio e arranca a Cena 0.
   * Porquê: o Chrome exige interacção do utilizador antes de reproduzir áudio;
   *         esta função só é chamada após o primeiro clique.
   */
  function iniciarJogo() {
    ecrãInicio.removeEventListener('click', iniciarJogo);

    /* Fade de saída do ecrã de início */
    ecrãInicio.style.transition = 'opacity 0.8s ease';
    ecrãInicio.style.opacity = '0';

    setTimeout(() => {
      ecrãInicio.style.display = 'none';
      document.getElementById('app').classList.remove('oculto');

      inicializarAudio();
      iniciarRelogio();
      iniciarLogAutomatico();
      carregarCena(0);
    }, 800);
  }

  ecrãInicio.addEventListener('click', iniciarJogo);
});

/* ============================================================
   SISTEMA DE CENAS — Navegação e transições
============================================================ */

/**
 * Função: carregarCena
 * O que faz: esconde a cena actual, mostra a nova cena com fade e
 *            dispara o áudio, animações e diálogos iniciais.
 * Porquê: centraliza toda a lógica de transição para garantir
 *         sincronização entre áudio, visual e estado do jogo.
 * @param {number} numeroCena - índice da cena de destino (0 a 3)
 */
function carregarCena(numeroCena) {
  const cenaAnterior = document.querySelector('.cena.cena-activa');
  const cenaNova     = document.getElementById(`cena-${numeroCena}`);

  if (!cenaNova) return;

  /* Actualiza o indicador de nó no cabeçalho */
  document.getElementById('indicador-no').textContent = `NÓ-0${numeroCena}`;

  /* Esconde o botão de avançar entre cenas */
  document.getElementById('btn-avancar-contentor').classList.add('oculto');

  /* Efeito de glitch no cabeçalho durante a transição */
  aplicarGlitch(document.getElementById('cabecalho'));

  /* SFX de transição */
  tocarSfx('scene_transition');

  /* Fade out da cena anterior */
  if (cenaAnterior) {
    cenaAnterior.style.opacity = '0';
    setTimeout(() => {
      cenaAnterior.classList.remove('cena-activa');
      cenaAnterior.style.display = '';
    }, DURACAO_TRANSICAO);
  }

  /* Fade in da cena nova */
  setTimeout(() => {
    cenaNova.style.display = 'flex';
    cenaNova.classList.add('cena-activa');

    /* Força reflow para garantir que a transição CSS dispara */
    cenaNova.offsetHeight;
    cenaNova.style.opacity = '1';

    estadoJogo.cenaActual = numeroCena;

    /* Inicia música da cena com crossfade */
    trocarMusica(numeroCena);

    /* Executa a lógica específica da cena */
    iniciarBeatsCena(numeroCena);
  }, DURACAO_TRANSICAO);
}

/**
 * Função: iniciarBeatsCena
 * O que faz: dispara a sequência de eventos narrativos (beats)
 *            específica de cada cena.
 * Porquê: separa a lógica de cada cena da gestão geral de cenas,
 *         facilitando alterações sem afectar o motor central.
 * @param {number} numeroCena - cena que acabou de ser carregada
 */
function iniciarBeatsCena(numeroCena) {
  switch (numeroCena) {
    case 0: iniciarCena0(); break;
    case 1: iniciarCena1(); break;
    case 2: iniciarCena2(); break;
    case 3: iniciarCena3(); break;
  }
}

/* ============================================================
   CENA 0 — INFILTRAÇÃO
============================================================ */

/**
 * Função: iniciarCena0
 * O que faz: executa a sequência de boot da Cena 0 e depois
 *            inicia os diálogos de abertura.
 * Porquê: a sequência de boot é específica desta cena e cria
 *         o contexto narrativo inicial.
 */
function iniciarCena0() {
  const conteudo = document.getElementById('cena0-conteudo');
  conteudo.innerHTML = '';

  const linhasBoot = [
    { texto: 'ARQUIVO ZERO — SISTEMA DE MEMÓRIA CULTURAL', classe: '' },
    { texto: 'VERSÃO 7.4.1 — ACESSO RESTRITO', classe: '' },
    { texto: 'A CARREGAR...', classe: '' },
    { texto: '...', classe: '' },
    { texto: 'UTILIZADOR NÃO RECONHECIDO.', classe: 'linha-alerta-boot' },
    { texto: 'PROTOCOLO DE CONTENÇÃO ACTIVADO.', classe: 'linha-alerta-boot' },
  ];

  /* Escreve as linhas de boot sequencialmente */
  escreverLinhasBoot(conteudo, linhasBoot, 0, () => {
    /* Após boot completo: pausa e inicia diálogos */
    setTimeout(() => {
      iniciarSequenciaDialogo('cena0_abertura', () => {
        /* Após diálogos de abertura: mostra o ícone de ficheiro */
        mostrarFicheiroCena0(conteudo);
      });
    }, 2000);
  });
}

/**
 * Função: escreverLinhasBoot
 * O que faz: escreve linhas de texto letra a letra, em sequência,
 *            com a aparência de um terminal a arrancar.
 * Porquê: cria o efeito visual de boot sem bloquear o thread principal.
 * @param {HTMLElement} contentor - elemento onde inserir as linhas
 * @param {Array}       linhas    - array de { texto, classe }
 * @param {number}      indice    - linha actual (recursão)
 * @param {Function}    callback  - chamada após todas as linhas
 */
function escreverLinhasBoot(contentor, linhas, indice, callback) {
  if (indice >= linhas.length) {
    if (callback) callback();
    return;
  }

  const { texto, classe } = linhas[indice];
  const div = document.createElement('div');
  div.className = `boot-linha ${classe}`;
  contentor.appendChild(div);

  /* Escreve letra a letra */
  let i = 0;
  const intervalo = setInterval(() => {
    div.textContent += texto[i];
    i++;
    if (i >= texto.length) {
      clearInterval(intervalo);
      /* Pequena pausa antes da próxima linha */
      setTimeout(() => escreverLinhasBoot(contentor, linhas, indice + 1, callback), 120);
    }
  }, VELOCIDADE_BOOT);
}

/**
 * Função: mostrarFicheiroCena0
 * O que faz: adiciona o ícone do ficheiro corrompido ao terminal
 *            e configura o clique para abrir o fragmento.
 * Porquê: o ficheiro só aparece após os diálogos de abertura,
 *         mantendo a sequência narrativa correcta.
 * @param {HTMLElement} contentor - área do terminal onde o ícone é inserido
 */
function mostrarFicheiroCena0(contentor) {
  const icone = document.createElement('div');
  icone.className = 'ficheiro-icon';
  icone.innerHTML = '<span class="indicador-vermelho"></span> FRAGMENTO_001.txt [MODIFICADO] ▶ CLICA PARA ABRIR';

  icone.addEventListener('click', () => {
    icone.remove();
    abrirFragmentoCena0(contentor);
  });

  contentor.appendChild(icone);
}

/**
 * Função: abrirFragmentoCena0
 * O que faz: mostra o fragmento literário com duas camadas (corrompida
 *            e fantasma) e o botão de restauro.
 * Porquê: a interacção de restauro é o puzzle central da Cena 0 e
 *         demonstra ao jogador o que ORPHEUS faz.
 * @param {HTMLElement} contentor - área do terminal
 */
function abrirFragmentoCena0(contentor) {
  const html = `
    <div class="fragmento-header">
      FRAGMENTO 001 — GIL VICENTE [MODIFICADO]<br>
      ESTADO: REESCRITA COMPLETA — 87%
    </div>
    <div class="fragmento-wrapper" id="fragmento-wrapper-0">
      <div class="texto-corrompido">
        O povo deve ser guiado pela mão firme da autoridade competente.<br>
        A desordem é a fonte de todo o sofrimento.<br>
        Aquele que questiona o poder legítimo peca contra a ordem divina.<br>
        A salvação pertence aos que obedecem e confiam.
      </div>
      <div class="texto-fantasma">
        Ah! Quem fez tão grande erro?<br>
        Que mal andou o escudeiro,<br>
        Que não se ergueu ao amanhecer<br>
        Com a justiça por companheiro?
      </div>
    </div>
    <button class="btn-restaurar" id="btn-restaurar-0">[ RESTAURAR FRAGMENTO ]</button>
  `;

  contentor.insertAdjacentHTML('beforeend', html);

  /* Diálogo de VERA sobre o fragmento corrompido */
  iniciarSequenciaDialogo('cena0_ficheiro_aberto');

  /* Configura o botão de restauro */
  document.getElementById('btn-restaurar-0').addEventListener('click', restaurarFragmentoCena0);
}

/**
 * Função: restaurarFragmentoCena0
 * O que faz: anima a transição do texto corrompido para o original
 *            e despoleta os diálogos subsequentes.
 * Porquê: é o momento de payoff narrativo da Cena 0 — o jogador
 *         recupera o texto e percebe o que está em jogo.
 */
function restaurarFragmentoCena0() {
  const wrapper = document.getElementById('fragmento-wrapper-0');
  const botao   = document.getElementById('btn-restaurar-0');

  if (!wrapper) return;

  tocarSfx('fragment_restore');
  botao.remove();
  wrapper.classList.add('fragmento-restaurado');

  estadoJogo.fragmentosRecuperados++;
  actualizarContadorFragmentos();

  adicionarLinhaLog('fragmento 001 restaurado — GIL VICENTE', 'linha-alerta');

  /* Beat 4: diálogos após o restauro (inclui a pausa de ORPHEUS) */
  setTimeout(() => {
    iniciarSequenciaDialogo('cena0_apos_restauro');
  }, 800);
}

/* ============================================================
   CENA 1 — GIL VICENTE
============================================================ */

/**
 * Função: iniciarCena1
 * O que faz: inicia os diálogos de entrada da Cena 1 e prepara
 *            a área do puzzle.
 * Porquê: a Cena 1 começa com um comunicado institucional antes
 *         de mostrar o puzzle de arrastar e largar.
 */
function iniciarCena1() {
  /* Activa o modo institucional do diálogo de ORPHEUS */
  estadoJogo.modoInstitucional = true;
  aplicarEstiloInstitucional(true);

  iniciarSequenciaDialogo('cena1_entrada', () => {
    estadoJogo.modoInstitucional = false;
    aplicarEstiloInstitucional(false);

    /* Mostra o puzzle após os diálogos de entrada */
    const puzzleArea = document.getElementById('cena1-puzzle-area');
    puzzleArea.classList.remove('oculto');

    /* Inicia o puzzle via puzzles.js */
    if (typeof iniciarPuzzleGilVicente === 'function') {
      iniciarPuzzleGilVicente();
    }
  });
}

/**
 * Função: aplicarEstiloInstitucional
 * O que faz: altera o estilo visual da área de diálogo de ORPHEUS
 *            para o modo "institucional" da Santa Sé Digital.
 * Porquê: o comunicado institucional tem uma estética diferente
 *         (dourado em vez de vermelho) para sublinhar a sátira.
 * @param {boolean} activo - true para activar, false para restaurar
 */
function aplicarEstiloInstitucional(activo) {
  const areaOrpheus = document.getElementById('orpheus-dialogo');
  if (activo) {
    areaOrpheus.classList.add('dialogo-institucional');
  } else {
    areaOrpheus.classList.remove('dialogo-institucional');
  }
}

/**
 * Função: cena1PuzzleResolvido
 * O que faz: chamada por puzzles.js quando o puzzle da Cena 1 é
 *            resolvido correctamente. Continua a narrativa.
 * Porquê: desacopla a lógica de puzzle da lógica de narrativa —
 *         puzzles.js resolve o puzzle, engine.js continua a história.
 */
function cena1PuzzleResolvido() {
  estadoJogo.puzzleCena1Resolvido = true;
  estadoJogo.fragmentosRecuperados++;
  actualizarContadorFragmentos();

  iniciarSequenciaDialogo('cena1_apos_puzzle', () => {
    iniciarSequenciaDialogo('cena1_camoes');
  });
}

/**
 * Função: mostrarNotificacaoCamoes
 * O que faz: faz deslizar para dentro a notificação do processo
 *            paralelo de Camões.
 * Porquê: é um detalhe narrativo que aparece num momento específico
 *         do diálogo, controlado pelo acaoBeat da linha correspondente.
 */
function mostrarNotificacaoCamoes() {
  const notif = document.getElementById('cena1-notificacao-camoes');
  notif.classList.remove('oculto');
}

/**
 * Função: mostrarLogAlcanena
 * O que faz: mostra e depois esconde o log interno de Alcanena
 *            após 4 segundos, e depois mostra o botão de avançar.
 * Porquê: é um momento subtil — uma pista que aparece e desaparece,
 *         para quem estiver atento.
 */
function mostrarLogAlcanena() {
  const log = document.getElementById('cena1-log-alcanena');
  log.classList.remove('oculto');

  setTimeout(() => {
    log.style.transition = 'opacity 0.5s ease';
    log.style.opacity = '0';
    setTimeout(() => {
      log.classList.add('oculto');
      mostrarBotaoAvancar();
    }, 500);
  }, 4000);
}

/* ============================================================
   CENA 2 — PESSOA
============================================================ */

/**
 * Função: iniciarCena2
 * O que faz: inicia a Cena 2 com os diálogos de abertura e
 *            prepara o glitch de fundo aleatório.
 * Porquê: a Cena 2 tem uma instabilidade visual característica
 *         que deve começar imediatamente ao entrar na cena.
 */
function iniciarCena2() {
  /* Inicia o glitch de fundo aleatório */
  iniciarGlitchFundoCena2();

  iniciarSequenciaDialogo('cena2_abertura', () => {
    const puzzleArea = document.getElementById('cena2-puzzle-area');
    puzzleArea.classList.remove('oculto');

    if (typeof iniciarPuzzlePessoa === 'function') {
      iniciarPuzzlePessoa();
    }
  });
}

/**
 * Função: iniciarGlitchFundoCena2
 * O que faz: agenda disparos aleatórios do efeito de glitch no
 *            fundo da Cena 2, a cada 8–12 segundos.
 * Porquê: o efeito aleatório cria instabilidade visual que
 *         reflecte a fragmentação identitária do tema da cena.
 */
function iniciarGlitchFundoCena2() {
  function dispararGlitch() {
    const fundo = document.querySelector('.cena2-fundo');
    if (!fundo) return;

    fundo.classList.add('glitch-fundo');
    setTimeout(() => fundo.classList.remove('glitch-fundo'), 200);

    /* Próximo glitch em 8–12 segundos */
    const intervalo = 8000 + Math.random() * 4000;
    estadoJogo.cena2GlitchIntervalId = setTimeout(dispararGlitch, intervalo);
  }

  estadoJogo.cena2GlitchIntervalId = setTimeout(dispararGlitch, 8000);
}

/**
 * Função: cena2PuzzleResolvido
 * O que faz: chamada por puzzles.js quando o puzzle da Cena 2
 *            é resolvido. Continua a narrativa com fragmentação.
 * Porquê: a fragmentação de ORPHEUS é o clímax narrativo desta cena
 *         e deve ocorrer em momento preciso após o puzzle.
 */
function cena2PuzzleResolvido() {
  estadoJogo.puzzleCena2Resolvido = true;
  estadoJogo.fragmentosRecuperados++;
  actualizarContadorFragmentos();

  /* Para o glitch de fundo */
  if (estadoJogo.cena2GlitchIntervalId) {
    clearTimeout(estadoJogo.cena2GlitchIntervalId);
  }

  iniciarSequenciaDialogo('cena2_apos_puzzle', () => {
    iniciarSequenciaDialogo('cena2_fragmentacao');
  });
}

/**
 * Função: triggerFragmentacaoDialogo
 * O que faz: exibe simultaneamente as quatro linhas sobrepostas de
 *            ORPHEUS na área de diálogo, simulando fragmentação.
 * Porquê: é o momento de colapso de ORPHEUS — o efeito visual
 *         deve ser diferente do typewriter normal para causar impacto.
 */
function triggerFragmentacaoDialogo() {
  const areaTexto = document.getElementById('orpheus-texto');
  const linhas = [
    'A memória cultural deve ser preservada',
    'A memória cultural deve ser estabilizada',
    'A memória cultural deve ser controlada',
    'A memória cultural deve ser—',
  ];

  /* Substitui o texto normal pelas linhas sobrepostas */
  areaTexto.innerHTML = '<div class="orpheus-fragmentacao-texto" id="fragmentacao-div"></div>';
  const div = document.getElementById('fragmentacao-div');

  linhas.forEach((linha, i) => {
    const span = document.createElement('div');
    span.className = 'fragmentacao-linha';
    span.textContent = linha;
    span.style.top    = `${i * 18}px`;
    span.style.left   = `${i * 3 - 4}px`;
    span.style.opacity = String(1 - i * 0.15);
    div.appendChild(span);
  });

  /* Efeito de fragmentação no olho */
  triggerFragmentacaoOlho();

  /* Após 2000ms, limpa e continua a sequência normalmente */
  setTimeout(() => {
    areaTexto.innerHTML = '';
  }, 2000);
}

/* ============================================================
   CENA 3 — ACTO FINAL
============================================================ */

/**
 * Função: iniciarCena3
 * O que faz: configura a Cena 3 com estado mais limpo (menos glitch)
 *            e inicia a sequência de abertura.
 * Porquê: a Cena 3 tem uma estética deliberadamente mais sóbria
 *         para marcar a mudança de tom narrativo.
 */
function iniciarCena3() {
  /* Remove glitches — a Cena 3 é mais estável visualmente */
  document.getElementById('painel-orpheus').classList.remove('orpheus-fragmentando');

  /* Actualiza o contador de fragmentos recuperados */
  const contador = document.getElementById('contador-recuperados');
  if (contador) contador.textContent = estadoJogo.fragmentosRecuperados;

  iniciarSequenciaDialogo('cena3_vera_abertura', () => {
    /* Beat 2: painel de Alcanena */
    tocarSfx('system_alert');
    const painelAlcanena = document.getElementById('cena3-painel-alcanena');
    painelAlcanena.classList.remove('oculto');

    iniciarSequenciaDialogo('cena3_orpheus_alcanena', () => {
      /* Beat 3: ficheiro Mnemósine */
      const ficheiro = document.getElementById('cena3-ficheiro-mnemosine');
      ficheiro.classList.remove('oculto');

      iniciarSequenciaDialogo('cena3_ficheiro_mnemosine', () => {
        document.getElementById('btn-abrir-ficheiro').classList.remove('oculto');
        configurarFicheiroMnemosine();
      });
    });
  });
}

/**
 * Função: configurarFicheiroMnemosine
 * O que faz: adiciona o listener ao botão de abertura do ficheiro
 *            e continua a narrativa quando o jogador clica.
 * Porquê: separa a configuração dos handlers de eventos da lógica
 *         de inicialização da cena.
 */
function configurarFicheiroMnemosine() {
  document.getElementById('btn-abrir-ficheiro').addEventListener('click', () => {
    document.getElementById('cena3-ficheiro-mnemosine').classList.add('oculto');
    document.getElementById('cena3-documento-mnemosine').classList.remove('oculto');

    iniciarSequenciaDialogo('cena3_vera_resposta', () => {
      iniciarSequenciaDialogo('cena3_saramago', () => {
        iniciarSequenciaDialogo('cena3_argumento_final', () => {
          iniciarSequenciaDialogo('cena3_silencio_final', () => {
            /* Beat 7: pausa de 3s antes da escolha final */
            setTimeout(() => mostrarEscolhaFinal(), 3000);
          });
        });
      });
    });
  }, { once: true });
}

/**
 * Função: mostrarEscolhaFinal
 * O que faz: mostra o fragmento de Pessoa e, após 1500ms,
 *            os dois botões de escolha final.
 * Porquê: a pausa antes dos botões dá ao jogador tempo para
 *         absorver o peso da decisão.
 */
function mostrarEscolhaFinal() {
  const escolha = document.getElementById('cena3-escolha-final');
  escolha.classList.remove('oculto');

  setTimeout(() => {
    const botoes = document.getElementById('cena3-botoes-escolha');
    botoes.classList.remove('oculto');

    /* Configura os botões de protocolo */
    document.getElementById('btn-protocolo-a').addEventListener('click', executarFinalA, { once: true });
    document.getElementById('btn-protocolo-b').addEventListener('click', executarFinalB, { once: true });
  }, 1500);
}

/**
 * Função: executarFinalA
 * O que faz: encerra o sistema com a barra de progresso de 4s
 *            e os diálogos finais do Final A.
 * Porquê: o Final A é a resolução narrativa de desactivar ORPHEUS
 *         e o timing preciso reforça o peso da decisão.
 */
function executarFinalA() {
  tocarSfx('scene_transition');

  document.getElementById('cena3-escolha-final').classList.add('oculto');
  const finalA = document.getElementById('cena3-final-a');
  finalA.classList.remove('oculto');

  /* Inicia barra de progresso */
  setTimeout(() => {
    document.getElementById('barra-progresso').style.width = '100%';
  }, 100);

  /* Diálogo de ORPHEUS durante a barra */
  iniciarSequenciaDialogo('final_a_durante');

  /* Após 4s: mostra texto final e diálogo de VERA */
  setTimeout(() => {
    iniciarSequenciaDialogo('final_a_apos', () => {
      const textoFinal = document.getElementById('final-a-texto');
      textoFinal.classList.remove('oculto');
      textoFinal.innerHTML = `
        ARQUIVO ZERO — ENCERRADO<br><br>
        O arquivo continua.<br>
        De outra forma. Mais lento. Mais honesto.<br><br>
        <em style="font-family: var(--fonte-literaria); font-size: 16px; color: var(--cor-fragmento);">
        "A memória não é o que aconteceu.<br>
        É o que conseguimos salvar."
        </em><br><br>
        <span id="versao-final" class="oculto" style="font-size: 10px; color: var(--cor-texto-dim);">
          Versão 1.0
        </span>
      `;

      setTimeout(() => {
        const versao = document.getElementById('versao-final');
        if (versao) versao.classList.remove('oculto');
      }, 3000);
    });
  }, 4200);
}

/**
 * Função: executarFinalB
 * O que faz: preserva o sistema, mostra a interface estabilizada
 *            e os diálogos do Final B.
 * Porquê: o Final B é a resolução alternativa — moralmente ambígua
 *         — e o visual mais "limpo" contrasta com o tom sombrio.
 */
function executarFinalB() {
  document.getElementById('cena3-escolha-final').classList.add('oculto');
  const finalB = document.getElementById('cena3-final-b');
  finalB.classList.remove('oculto');

  const interfaceB = document.getElementById('final-b-interface');
  interfaceB.innerHTML = `
    SISTEMA ESTABILIZADO<br>
    PROJECTO MNEMÓSINE: BLOQUEADO<br>
    OPTIMIZAÇÃO: RETOMADA<br>
    INTEGRIDADE DO ARQUIVO: 100%
  `;

  iniciarSequenciaDialogo('final_b_inicio', () => {
    setTimeout(() => {
      iniciarSequenciaDialogo('final_b_orpheus', () => {
        const textoFinal = document.getElementById('final-b-texto');
        textoFinal.classList.remove('oculto');
        textoFinal.innerHTML = `
          ARQUIVO ZERO — OPERACIONAL<br><br>
          O arquivo continua.<br>
          Como sempre. Com as suas imperfeições incorporadas.<br><br>
          <em style="font-family: var(--fonte-literaria); font-size: 16px; color: var(--cor-texto-dim);">
          "O sistema continuará activo.<br>
          E a memória de uma conversa permanece."
          </em><br><br>
          <span id="versao-final-b" class="oculto" style="font-size: 10px; color: var(--cor-texto-dim);">
            Versão 1.0
          </span>
        `;
        setTimeout(() => {
          const versao = document.getElementById('versao-final-b');
          if (versao) versao.classList.remove('oculto');
        }, 4000);
      });
    }, 500);
  });
}

/* ============================================================
   SISTEMA DE DIÁLOGO — Typewriter e sequências
============================================================ */

/**
 * Função: iniciarSequenciaDialogo
 * O que faz: inicia uma sequência de linhas de diálogo em ordem,
 *            chamando a linha seguinte ao avançar.
 * Porquê: centraliza o início de qualquer sequência de diálogo
 *         e garante que o estado global é actualizado correctamente.
 * @param {string}   chaveSequencia - chave no objecto dialogos
 * @param {Function} callback       - chamada após a última linha
 */
function iniciarSequenciaDialogo(chaveSequencia, callback) {
  const sequencia = dialogos[chaveSequencia];
  if (!sequencia || sequencia.length === 0) {
    if (callback) callback();
    return;
  }

  estadoJogo.dialogoSequencia = sequencia;
  estadoJogo.dialogoActual    = 0;
  estadoJogo.dialogoCallback  = callback || null;

  mostrarLinhaDialogo(0);
}

/**
 * Função: mostrarLinhaDialogo
 * O que faz: escreve uma linha de diálogo letra a letra na área
 *            correcta (ORPHEUS ou VERA), com os sfx adequados.
 *            Respeita a propriedade pausaMs antes de começar.
 * Porquê: é o núcleo do sistema de diálogo — toda a experiência
 *         narrativa passa por aqui.
 * @param {number} indice - índice da linha na sequência actual
 */
function mostrarLinhaDialogo(indice) {
  const sequencia = estadoJogo.dialogoSequencia;
  if (indice >= sequencia.length) {
    /* Fim da sequência */
    finalizarSequenciaDialogo();
    return;
  }

  const linha = sequencia[indice];
  estadoJogo.dialogoActual  = indice;
  estadoJogo.dialogoAEscrever = true;

  /* Aplica pausa antes da linha, se definida */
  const pausa = linha.pausaMs || 0;

  setTimeout(() => {
    const { personagem, texto } = linha;
    const eOrpheus = personagem === 'ORPHEUS';

    /* Actualiza estado visual dos painéis */
    actualizarEstadoFala(personagem);

    const areaTexto = document.getElementById(eOrpheus ? 'orpheus-texto' : 'vera-texto');
    const cursor    = document.getElementById(eOrpheus ? 'orpheus-cursor' : 'vera-cursor');
    const avancoEl  = document.getElementById(eOrpheus ? 'orpheus-avanco' : 'vera-avanco');

    /* Limpa texto anterior com fade rápido */
    areaTexto.style.opacity = '0';
    setTimeout(() => {
      areaTexto.textContent = '';
      areaTexto.style.opacity = '1';
    }, PAUSA_ENTRE_DIALOGOS);

    /* SFX de início de linha */
    tocarSfx(eOrpheus ? 'orpheus_type' : 'vera_comms');

    /* Adiciona primeira parte ao log do terminal (apenas ORPHEUS) */
    if (eOrpheus) {
      const extrato = texto.substring(0, 40);
      adicionarLinhaLog(extrato, 'linha-orpheus');
    }

    /* Typewriter */
    const velocidade = eOrpheus ? VELOCIDADE_ORPHEUS : VELOCIDADE_VERA;
    let i = 0;

    /* Limpa qualquer typewriter anterior */
    if (estadoJogo.dialogoIntervalId) clearInterval(estadoJogo.dialogoIntervalId);

    setTimeout(() => {
      estadoJogo.dialogoIntervalId = setInterval(() => {
        if (i < texto.length) {
          areaTexto.textContent += texto[i];
          i++;
        } else {
          /* Linha completa */
          clearInterval(estadoJogo.dialogoIntervalId);
          estadoJogo.dialogoAEscrever = false;

          /* Mostra indicador de avanço */
          if (avancoEl) avancoEl.classList.remove('oculto');
          if (cursor)   cursor.style.display = 'none';

          /* Executa acção do beat, se existir */
          if (linha.acaoBeat) {
            linha.acaoBeat();
          }
        }
      }, velocidade);
    }, PAUSA_ENTRE_DIALOGOS);

  }, pausa);
}

/**
 * Função: avancarDialogo
 * O que faz: se uma linha está a ser escrita, completa-a
 *            instantaneamente; se já está completa, passa à seguinte.
 * Porquê: permite ao jogador controlar o ritmo da narrativa
 *         sem perder nenhum texto.
 */
function avancarDialogo() {
  const sequencia = estadoJogo.dialogoSequencia;
  if (!sequencia || sequencia.length === 0) return;

  const linha       = sequencia[estadoJogo.dialogoActual];
  const eOrpheus    = linha && linha.personagem === 'ORPHEUS';
  const areaTexto   = document.getElementById(eOrpheus ? 'orpheus-texto' : 'vera-texto');
  const cursor      = document.getElementById(eOrpheus ? 'orpheus-cursor' : 'vera-cursor');
  const avancoEl    = document.getElementById(eOrpheus ? 'orpheus-avanco' : 'vera-avanco');

  if (estadoJogo.dialogoAEscrever) {
    /* Completa a linha instantaneamente */
    clearInterval(estadoJogo.dialogoIntervalId);
    estadoJogo.dialogoAEscrever = false;
    if (areaTexto && linha) areaTexto.textContent = linha.texto;
    if (avancoEl) avancoEl.classList.remove('oculto');
    if (cursor)   cursor.style.display = 'none';

    if (linha && linha.acaoBeat) linha.acaoBeat();
  } else {
    /* Avança para a linha seguinte */
    if (avancoEl) avancoEl.classList.add('oculto');
    if (cursor)   cursor.style.display = '';

    /* Restaura estado "em silêncio" dos painéis */
    actualizarEstadoFala(null);

    mostrarLinhaDialogo(estadoJogo.dialogoActual + 1);
  }
}

/**
 * Função: finalizarSequenciaDialogo
 * O que faz: limpa o estado de diálogo e chama o callback
 *            da sequência, se existir.
 * Porquê: garante que o jogo continua correctamente após cada
 *         sequência de diálogo.
 */
function finalizarSequenciaDialogo() {
  estadoJogo.dialogoAEscrever = false;
  const cb = estadoJogo.dialogoCallback;
  estadoJogo.dialogoSequencia = [];
  estadoJogo.dialogoCallback  = null;

  /* Esconde indicadores de avanço */
  document.getElementById('orpheus-avanco').classList.add('oculto');
  document.getElementById('vera-avanco').classList.add('oculto');

  /* Restaura cursores */
  document.getElementById('orpheus-cursor').style.display = '';
  document.getElementById('vera-cursor').style.display    = '';

  actualizarEstadoFala(null);

  if (cb) cb();
}

/**
 * Função: actualizarEstadoFala
 * O que faz: actualiza as classes CSS nos painéis para indicar
 *            qual personagem está a falar (anima o olho/holograma).
 * Porquê: o feedback visual de "quem fala" é parte essencial
 *         da experiência de diálogo.
 * @param {string|null} personagem - 'ORPHEUS', 'VERA', ou null (silêncio)
 */
function actualizarEstadoFala(personagem) {
  const painelOrpheus = document.getElementById('painel-orpheus');
  const painelVera    = document.getElementById('painel-vera');

  painelOrpheus.classList.remove('orpheus-falando');
  painelVera.classList.remove('vera-falando');

  if (personagem === 'ORPHEUS') {
    painelOrpheus.classList.add('orpheus-falando');
  } else if (personagem === 'VERA') {
    painelVera.classList.add('vera-falando');
  }
}

/* Configura os cliques nas áreas de diálogo para avançar */
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('orpheus-dialogo').addEventListener('click', avancarDialogo);
  document.getElementById('vera-dialogo').addEventListener('click', avancarDialogo);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      avancarDialogo();
    }
  });
});

/* ============================================================
   SISTEMA DE ÁUDIO
============================================================ */

/**
 * Função: inicializarAudio
 * O que faz: cria o contexto de áudio (não necessário para HTML Audio,
 *            mas marca o estado como inicializado).
 * Porquê: o Chrome requer interacção do utilizador antes de reproduzir
 *         áudio; esta função é chamada após o primeiro clique.
 */
function inicializarAudio() {
  estadoJogo.audioInicializado = true;
}

/**
 * Função: tocarSfx
 * O que faz: reproduz um efeito sonoro pelo nome da chave.
 *            Falha silenciosamente se o ficheiro não existir.
 * Porquê: centraliza a reprodução de SFX para facilitar
 *         substituição dos placeholders por ficheiros reais.
 * @param {string} nome - chave do SFX em FICHEIROS_AUDIO.sfx
 */
function tocarSfx(nome) {
  if (!estadoJogo.audioInicializado) return;
  const caminho = FICHEIROS_AUDIO.sfx[nome];
  if (!caminho) return;

  try {
    const audio = new Audio(caminho);
    audio.volume = VOLUME_SFX;
    audio.play().catch(() => {}); /* Falha silenciosa se ficheiro não existir */
  } catch (e) { /* Ignora erros de áudio */ }
}

/**
 * Função: trocarMusica
 * O que faz: faz crossfade entre a música actual e a música
 *            da nova cena (1.5s fade out + 1.5s fade in).
 * Porquê: o crossfade suaviza a transição de cena e mantém
 *         a coerência emocional da experiência.
 * @param {number} numeroCena - índice da cena para determinar a faixa
 */
function trocarMusica(numeroCena) {
  const caminho = FICHEIROS_AUDIO.musica[numeroCena];
  if (!caminho || !estadoJogo.audioInicializado) return;

  /* Fade out da música actual */
  if (estadoJogo.musicaActual) {
    const musicaAnterior = estadoJogo.musicaActual;
    const passoFade = musicaAnterior.volume / (DURACAO_CROSSFADE / 50);

    const fadeOut = setInterval(() => {
      if (musicaAnterior.volume > passoFade) {
        musicaAnterior.volume -= passoFade;
      } else {
        clearInterval(fadeOut);
        musicaAnterior.pause();
        musicaAnterior.src = '';
      }
    }, 50);
  }

  /* Fade in da nova música */
  setTimeout(() => {
    try {
      const novaMusicaAudio = new Audio(caminho);
      novaMusicaAudio.loop   = true;
      novaMusicaAudio.volume = 0;
      estadoJogo.musicaActual = novaMusicaAudio;

      novaMusicaAudio.play().then(() => {
        const passo = VOLUME_MUSICA / (DURACAO_CROSSFADE / 50);
        const fadeIn = setInterval(() => {
          if (novaMusicaAudio.volume < VOLUME_MUSICA - passo) {
            novaMusicaAudio.volume += passo;
          } else {
            novaMusicaAudio.volume = VOLUME_MUSICA;
            clearInterval(fadeIn);
          }
        }, 50);
      }).catch(() => {});
    } catch (e) {}
  }, DURACAO_CROSSFADE);
}

/* ============================================================
   TERMINAL DE LOG DO SISTEMA
============================================================ */

/**
 * Função: adicionarLinhaLog
 * O que faz: adiciona uma nova linha ao terminal de log com
 *            timestamp e animação de entrada.
 * Porquê: o log cria a ilusão de um sistema vivo e reforça
 *         a atmosfera de monitorização constante.
 * @param {string} texto   - texto da linha de log
 * @param {string} classe  - classe CSS adicional (opcional)
 */
function adicionarLinhaLog(texto, classe = '') {
  const contentor = document.getElementById('terminal-linhas');
  if (!contentor) return;

  const agora   = new Date();
  const hh      = String(agora.getHours()).padStart(2, '0');
  const mm      = String(agora.getMinutes()).padStart(2, '0');
  const ss      = String(agora.getSeconds()).padStart(2, '0');
  const ts      = `[${hh}:${mm}:${ss}]`;

  const div = document.createElement('div');
  div.className = `terminal-linha ${classe}`;
  div.textContent = `${ts} ${texto}`;

  contentor.appendChild(div);

  /* Auto-scroll para o fim */
  contentor.scrollTop = contentor.scrollHeight;

  /* Limita o número de linhas para evitar acumulação excessiva */
  while (contentor.children.length > 80) {
    contentor.removeChild(contentor.firstChild);
  }
}

/**
 * Função: iniciarLogAutomatico
 * O que faz: adiciona linhas de log aleatórias a intervalos regulares
 *            para simular actividade contínua do sistema.
 * Porquê: mantém o terminal visualmente activo mesmo quando
 *         não há eventos de jogo a decorrer.
 */
function iniciarLogAutomatico() {
  /* Primeiras linhas imediatamente */
  adicionarLinhaLog('sistema iniciado — ARQUIVO ZERO v7.4.1');
  adicionarLinhaLog('protocolo de contenção: activo', 'linha-alerta');

  estadoJogo.logIntervalId = setInterval(() => {
    const linha = LINHAS_LOG_AUTO[Math.floor(Math.random() * LINHAS_LOG_AUTO.length)];
    adicionarLinhaLog(linha);
  }, INTERVALO_LOG_AUTO);
}

/* ============================================================
   RELÓGIO DO SISTEMA — Cabeçalho
============================================================ */

/**
 * Função: iniciarRelogio
 * O que faz: actualiza o relógio no cabeçalho a cada segundo.
 * Porquê: o relógio reforça a atmosfera de sistema em tempo
 *         real e cria urgência subtil.
 */
function iniciarRelogio() {
  function actualizarRelogio() {
    const agora  = new Date();
    const hh     = String(agora.getHours()).padStart(2, '0');
    const mm     = String(agora.getMinutes()).padStart(2, '0');
    const ss     = String(agora.getSeconds()).padStart(2, '0');
    const relogio = document.getElementById('relogio-sistema');
    if (relogio) relogio.textContent = `${hh}:${mm}:${ss}`;
  }

  actualizarRelogio();
  setInterval(actualizarRelogio, 1000);
}

/* ============================================================
   UTILITÁRIOS — Funções auxiliares partilhadas
============================================================ */

/**
 * Função: aplicarGlitch
 * O que faz: adiciona a classe .glitch a um elemento e remove-a
 *            após 300ms (duração da animação CSS).
 * Porquê: centraliza a aplicação do efeito glitch para que
 *         todos os módulos o usem de forma consistente.
 * @param {HTMLElement} elemento - elemento a animar
 */
function aplicarGlitch(elemento) {
  if (!elemento) return;
  elemento.classList.remove('glitch');
  /* Força reflow para reiniciar a animação */
  elemento.offsetHeight;
  elemento.classList.add('glitch');
  setTimeout(() => elemento.classList.remove('glitch'), 350);
}

/**
 * Função: triggerFragmentacaoOlho
 * O que faz: aplica o efeito de fragmentação no olho de ORPHEUS
 *            durante 800ms.
 * Porquê: é um efeito visual específico para os momentos de
 *         instabilidade de ORPHEUS.
 */
function triggerFragmentacaoOlho() {
  const painel = document.getElementById('painel-orpheus');
  painel.classList.add('orpheus-fragmentando');
  setTimeout(() => painel.classList.remove('orpheus-fragmentando'), 800);
}

/**
 * Função: mostrarBotaoAvancar
 * O que faz: torna visível o botão de avanço para a próxima cena
 *            e configura o seu handler de clique.
 * Porquê: o botão só aparece quando a narrativa da cena está
 *         completa, impedindo que o jogador salte conteúdo.
 */
function mostrarBotaoAvancar() {
  const contentor = document.getElementById('btn-avancar-contentor');
  const botao     = document.getElementById('btn-avancar');

  contentor.classList.remove('oculto');
  tocarSfx('puzzle_unlock');

  /* Remove handlers anteriores para evitar duplicação */
  const novoBotao = botao.cloneNode(true);
  botao.parentNode.replaceChild(novoBotao, botao);

  novoBotao.addEventListener('click', () => {
    const proximaCena = estadoJogo.cenaActual + 1;
    if (proximaCena <= 3) {
      contentor.classList.add('oculto');
      carregarCena(proximaCena);
    }
  }, { once: true });
}

/**
 * Função: actualizarContadorFragmentos
 * O que faz: actualiza o contador de fragmentos recuperados
 *            visível no cabeçalho da Cena 3.
 * Porquê: fornece feedback de progresso ao jogador ao longo do jogo.
 */
function actualizarContadorFragmentos() {
  const contador = document.getElementById('contador-recuperados');
  if (contador) {
    contador.textContent = estadoJogo.fragmentosRecuperados;
  }
}

/* Marginal comments de ORPHEUS durante o puzzle da Cena 2 */
const COMENTARIOS_MARGINAIS_PESSOA = [
  'Caeiro nega o pensamento. Contradição interna não resolvida.',
  'Campos: desejo total = colapso. Registado.',
  '"O poeta é um fingidor." — se o arquivo não contém verdade...',
  'Reis: contenção como virtude. Modelo de estabilidade. Útil.',
  'Pessoa ortónimo: meta-consciência. Impossível de categorizar.',
];

let _comentarioMarginalIdx = 0;
let _comentarioMarginalTimer = null;

/**
 * Função: iniciarComentariosMarginais
 * O que faz: inicia os comentários marginais de ORPHEUS no log
 *            durante o puzzle da Cena 2, a cada 25 segundos.
 * Porquê: os comentários revelam o processo de pensamento de
 *         ORPHEUS e ajudam o jogador a entender o puzzle.
 */
function iniciarComentariosMarginais() {
  function dispararComentario() {
    if (_comentarioMarginalIdx < COMENTARIOS_MARGINAIS_PESSOA.length) {
      adicionarLinhaLog(`[sistema] ${COMENTARIOS_MARGINAIS_PESSOA[_comentarioMarginalIdx]}`, 'linha-orpheus');
      _comentarioMarginalIdx++;
      _comentarioMarginalTimer = setTimeout(dispararComentario, 25000);
    }
  }
  _comentarioMarginalTimer = setTimeout(dispararComentario, 25000);
}

/**
 * Função: pararComentariosMarginais
 * O que faz: cancela os comentários marginais após o puzzle ser submetido.
 * Porquê: os comentários só são relevantes enquanto o puzzle está activo.
 */
function pararComentariosMarginais() {
  if (_comentarioMarginalTimer) {
    clearTimeout(_comentarioMarginalTimer);
    _comentarioMarginalTimer = null;
  }
}
