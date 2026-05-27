/* ============================================================
   ARQUIVO ZERO — puzzles.js
   Lógica completa dos dois puzzles de arrastar e largar:
   - Cena 1: Reconstrução de sequência (Gil Vicente)
   - Cena 2: Atribuição por heterónimo (Pessoa)
   Implementação em JavaScript puro, sem bibliotecas de D&D.
============================================================ */

'use strict';

/* ============================================================
   DADOS DO PUZZLE — CENA 1: GIL VICENTE
   Versos autênticos do Auto da Barca do Inferno (c. 1517)
   que apresentam figuras de autoridade a serem julgadas.
   A ordem correcta narra a chegada e o julgamento do Fidalgo.
============================================================ */
const puzzleGilVicente = {
  fragmentos: [
    {
      id: 'gv1',
      texto: 'Olá, barqueiro! Esperai!\nSou homem de grande estado.',
      ordemCorrecta: 1,
    },
    {
      id: 'gv2',
      texto: 'Vem cá, entra nesta barca!\nSe não, bota-te na vala.',
      ordemCorrecta: 2,
    },
    {
      id: 'gv3',
      texto: 'Eu não entro em tal fragata.\nQue barqueiro tão grosseiro!',
      ordemCorrecta: 3,
    },
    {
      id: 'gv4',
      texto: 'A barca da Glória tarda,\nnem sei se virá cá ter.',
      ordemCorrecta: 4,
    },
    {
      id: 'gv5',
      texto: 'As obras que tu fizeste\nNão merecem outro barco.',
      ordemCorrecta: 5,
    },
    {
      id: 'gv6',
      texto: 'Que poder tendes vós aqui?\nNão sabeis quem sou eu, não?',
      ordemCorrecta: 6,
    },
    {
      id: 'gv7',
      texto: 'Tão pouco como na vida\nSe te pesava o alheio.',
      ordemCorrecta: 7,
    },
  ],
  mensagemErrada_orpheus: 'Configuração inválida. A sequência não corresponde ao padrão narrativo registado.',
  mensagemErrada_vera: 'Quase. Volta a tentar — a ordem importa.',
};

/* ============================================================
   DADOS DO PUZZLE — CENA 2: PESSOA
   Fragmentos autênticos e imitações geradas por ORPHEUS.
   A ausência da etiqueta "fonte" nas imitações é uma pista.
============================================================ */
const puzzlePessoa = {
  colunas: [
    'Alberto Caeiro',
    'Ricardo Reis',
    'Álvaro de Campos',
    'Fernando Pessoa',
    'ORPHEUS — Imitação',
  ],
  fragmentos: [
    /* --- Autênticos --- */
    {
      id: 'p1',
      texto: 'Pensar é estar doente dos olhos.',
      colunaCerta: 'Alberto Caeiro',
      fonte: 'O Guardador de Rebanhos',
    },
    {
      id: 'p2',
      texto: 'É preciso também não ter filosofia nenhuma.\nCom filosofia não há árvores: há ideias apenas.',
      colunaCerta: 'Alberto Caeiro',
      fonte: 'O Guardador de Rebanhos',
    },
    {
      id: 'p3',
      texto: 'Para ser grande, sê inteiro: nada\nTeu exagera ou exclui.',
      colunaCerta: 'Ricardo Reis',
      fonte: 'Odes',
    },
    {
      id: 'p4',
      texto: 'Sábio é o que se contenta com o espectáculo do mundo.',
      colunaCerta: 'Ricardo Reis',
      fonte: 'Odes',
    },
    {
      id: 'p5',
      texto: 'À parte isso, tenho em mim todos os sonhos do mundo.',
      colunaCerta: 'Álvaro de Campos',
      fonte: 'Tabacaria',
    },
    {
      id: 'p6',
      texto: 'Forte espasmo retido dos maquinismos em fúria!\nEm fúria fora e dentro de mim,',
      colunaCerta: 'Álvaro de Campos',
      fonte: 'Ode Triunfal',
    },
    {
      id: 'p7',
      texto: 'O poeta é um fingidor.',
      colunaCerta: 'Fernando Pessoa',
      fonte: 'Autopsicografia',
    },
    {
      id: 'p8',
      texto: 'Eu simplesmente sinto\nCom a imaginação.',
      colunaCerta: 'Fernando Pessoa',
      fonte: 'Isto',
    },
    /* --- Imitações de ORPHEUS --- */
    {
      id: 'p9',
      texto: 'Ver é suficiente. O pensamento é uma interrupção desnecessária da existência.',
      colunaCerta: 'ORPHEUS — Imitação',
      imitacaoDe: 'Alberto Caeiro',
    },
    {
      id: 'p10',
      texto: 'A grandeza pertence aos que aceitam os limites da condição humana sem excesso nem falta.',
      colunaCerta: 'ORPHEUS — Imitação',
      imitacaoDe: 'Ricardo Reis',
    },
    {
      id: 'p11',
      texto: 'Tenho em mim a energia de todas as máquinas e de todos os sonhos possíveis do universo.',
      colunaCerta: 'ORPHEUS — Imitação',
      imitacaoDe: 'Álvaro de Campos',
    },
    {
      id: 'p12',
      texto: 'O poeta finge porque a realidade é insuficiente para a sua sensibilidade.',
      colunaCerta: 'ORPHEUS — Imitação',
      imitacaoDe: 'Fernando Pessoa',
    },
  ],
  mensagemErrada_orpheus: 'Atribuição incorrecta detectada. A classificação não corresponde aos padrões registados.',
  mensagemErrada_vera: 'Há pelo menos um erro. As imitações dele são quase certas — mas só quase.',
};

/* ============================================================
   ESTADO DOS PUZZLES
   Mantém o mapeamento actual de fragmentos para zonas/colunas.
============================================================ */
const estadoPuzzles = {
  /* Cena 1: { idFragmento: numeroZona | null } */
  gilvicente: {},
  /* Cena 2: { idFragmento: nomeColuna | null } */
  pessoa: {},
  /* Contador de tentativas erradas por puzzle (para alternância ORPHEUS/VERA) */
  tentativasErradas: { gilvicente: 0, pessoa: 0 },
};

/* ============================================================
   PUZZLE GIL VICENTE — Inicialização e renderização
============================================================ */

/**
 * Função: iniciarPuzzleGilVicente
 * O que faz: renderiza o puzzle de arrastar e largar da Cena 1
 *            na área designada, com fragmentos em ordem aleatória.
 * Porquê: a ordem aleatória impede memorização e obriga o jogador
 *         a compreender o texto para reordená-lo.
 */
function iniciarPuzzleGilVicente() {
  const area = document.getElementById('cena1-puzzle-area');
  if (!area) return;

  /* Inicializa o estado — nenhum fragmento colocado ainda */
  puzzleGilVicente.fragmentos.forEach(f => {
    estadoPuzzles.gilvicente[f.id] = null;
  });

  /* Embaralha os fragmentos para a coluna de origem */
  const fragmentosBaralhados = [...puzzleGilVicente.fragmentos]
    .sort(() => Math.random() - 0.5);

  const html = `
    <div class="puzzle-gilvicente">
      <!-- Coluna esquerda: fragmentos disponíveis -->
      <div class="puzzle-coluna-origem">
        <div class="puzzle-coluna-titulo">FRAGMENTOS DISPONÍVEIS</div>
        <div class="puzzle-fragmentos-lista" id="gv-origem">
          ${fragmentosBaralhados.map(f => renderizarCartaoGV(f)).join('')}
        </div>
      </div>
      <!-- Coluna direita: zonas de drop numeradas -->
      <div class="puzzle-coluna-destino">
        <div class="puzzle-coluna-titulo">SEQUÊNCIA RESTAURADA</div>
        <div class="puzzle-zonas-lista" id="gv-zonas">
          ${Array.from({ length: 7 }, (_, i) => renderizarZonaGV(i + 1)).join('')}
        </div>
      </div>
    </div>
    <div class="puzzle-footer">
      <button class="btn-submeter" id="btn-submeter-gv" disabled>[ SUBMETER ]</button>
    </div>
  `;

  area.innerHTML = html;

  /* Configura drag and drop */
  configurarDragDropGV();

  /* Configura o botão de submissão */
  document.getElementById('btn-submeter-gv').addEventListener('click', validarPuzzleGV);

  /* Inicia comentários marginais de ORPHEUS */
  if (typeof iniciarComentariosMarginais === 'function') {
    /* Não aplicável à Cena 1, mas deixa-se a chamada para extensibilidade */
  }
}

/**
 * Função: renderizarCartaoGV
 * O que faz: gera o HTML de um cartão de fragmento arrastável.
 * Porquê: separa a geração de HTML da lógica de drag and drop.
 * @param {Object} fragmento - dados do fragmento
 * @returns {string} HTML do cartão
 */
function renderizarCartaoGV(fragmento) {
  return `
    <div
      class="fragmento-card"
      draggable="true"
      id="card-${fragmento.id}"
      data-id="${fragmento.id}"
      data-origem="lista"
    >${fragmento.texto.replace(/\n/g, '<br>')}</div>
  `;
}

/**
 * Função: renderizarZonaGV
 * O que faz: gera o HTML de uma zona de drop numerada.
 * Porquê: separa a renderização da lógica de validação.
 * @param {number} numero - número da zona (1 a 7)
 * @returns {string} HTML da zona
 */
function renderizarZonaGV(numero) {
  return `
    <div class="zona-drop" id="zona-gv-${numero}" data-zona="${numero}">
      <span class="zona-drop-numero">${numero}.</span>
      <div class="zona-drop-conteudo" id="zona-gv-conteudo-${numero}"></div>
    </div>
  `;
}

/**
 * Função: configurarDragDropGV
 * O que faz: adiciona os event listeners de drag and drop a todos
 *            os cartões e zonas do puzzle Gil Vicente.
 * Porquê: a API de Drag and Drop do HTML5 requer listeners em
 *         tanto os elementos arrastados como os destinos.
 */
function configurarDragDropGV() {
  /* Variável que guarda o ID do cartão em arrastamento */
  let cartaoArrastado = null;
  let origemArrastado = null; /* 'lista' ou número de zona */

  /**
   * Função auxiliar: actualizarBotaoSubmeter
   * O que faz: activa o botão de submeter quando todas as 7 zonas estão preenchidas.
   * Porquê: o botão só deve estar activo quando há algo para validar.
   */
  function actualizarBotaoSubmeterGV() {
    const todasPreenchidas = Object.values(estadoPuzzles.gilvicente).every(v => v !== null);
    const botao = document.getElementById('btn-submeter-gv');
    if (!botao) return;
    if (todasPreenchidas) {
      botao.classList.add('activo');
      botao.disabled = false;
      if (typeof tocarSfx === 'function') tocarSfx('puzzle_unlock');
    } else {
      botao.classList.remove('activo');
      botao.disabled = true;
    }
  }

  /**
   * Função auxiliar: colocarCartaoNaZona
   * O que faz: move um cartão para uma zona de drop, deslocando
   *            qualquer cartão já existente de volta à lista de origem.
   * Porquê: permite rearranjar fragmentos livremente durante o puzzle.
   * @param {string} idFragmento  - ID do fragmento a colocar
   * @param {number} numeroZona   - zona de destino
   * @param {string} origemActual - 'lista' ou número da zona de origem
   */
  function colocarCartaoNaZona(idFragmento, numeroZona, origemActual) {
    const zonaConteudo = document.getElementById(`zona-gv-conteudo-${numeroZona}`);
    if (!zonaConteudo) return;

    /* Se a zona já tem um cartão, devolve-o à lista */
    const cardExistente = zonaConteudo.querySelector('.fragmento-card');
    if (cardExistente) {
      const idExistente = cardExistente.dataset.id;
      estadoPuzzles.gilvicente[idExistente] = null;
      document.getElementById('gv-origem').appendChild(cardExistente);
      cardExistente.dataset.origem = 'lista';
    }

    /* Move o cartão arrastado para a zona */
    const card = document.getElementById(`card-${idFragmento}`);
    if (!card) return;

    /* Remove o cartão da zona de origem, se estava numa */
    if (origemActual !== 'lista' && origemActual) {
      const zonaOrigem = document.getElementById(`zona-gv-conteudo-${origemActual}`);
      if (zonaOrigem && zonaOrigem.contains(card)) {
        zonaOrigem.innerHTML = '';
      }
      estadoPuzzles.gilvicente[idFragmento] = null;
    }

    zonaConteudo.appendChild(card);
    card.dataset.origem = String(numeroZona);
    estadoPuzzles.gilvicente[idFragmento] = numeroZona;

    actualizarBotaoSubmeterGV();
  }

  /* --- Listeners nos cartões (arrastáveis) --- */
  function adicionarListenersCartao(card) {
    card.addEventListener('dragstart', (e) => {
      cartaoArrastado  = card.dataset.id;
      origemArrastado  = card.dataset.origem;
      card.classList.add('arrastando');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      if (typeof tocarSfx === 'function') tocarSfx('drag_pickup');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('arrastando');
      cartaoArrastado = null;
      origemArrastado = null;
    });
  }

  /* --- Listeners nas zonas de drop --- */
  function adicionarListenersZona(zona) {
    zona.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      zona.classList.add('zona-activa');
    });

    zona.addEventListener('dragleave', () => {
      zona.classList.remove('zona-activa');
    });

    zona.addEventListener('drop', (e) => {
      e.preventDefault();
      zona.classList.remove('zona-activa');

      const idFragmento = e.dataTransfer.getData('text/plain');
      const numeroZona  = parseInt(zona.dataset.zona, 10);
      const cardOrigem  = origemArrastado;

      if (typeof tocarSfx === 'function') tocarSfx('drag_drop');
      colocarCartaoNaZona(idFragmento, numeroZona, cardOrigem);
    });
  }

  /* --- Listeners na lista de origem (para devolver cartões) --- */
  const listaOrigem = document.getElementById('gv-origem');
  listaOrigem.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  });

  listaOrigem.addEventListener('drop', (e) => {
    e.preventDefault();
    const idFragmento = e.dataTransfer.getData('text/plain');
    const card        = document.getElementById(`card-${idFragmento}`);
    if (!card) return;

    const origemCard = card.dataset.origem;
    if (origemCard !== 'lista' && origemCard) {
      /* Remove da zona e actualiza estado */
      const zonaConteudo = document.getElementById(`zona-gv-conteudo-${origemCard}`);
      if (zonaConteudo) zonaConteudo.innerHTML = '';
      estadoPuzzles.gilvicente[idFragmento] = null;
    }

    card.dataset.origem = 'lista';
    listaOrigem.appendChild(card);
    if (typeof tocarSfx === 'function') tocarSfx('drag_drop');
    actualizarBotaoSubmeterGV();
  });

  /* Aplica listeners a todos os cartões e zonas */
  document.querySelectorAll('#gv-origem .fragmento-card').forEach(adicionarListenersCartao);
  document.querySelectorAll('#gv-zonas .zona-drop').forEach(adicionarListenersZona);

  /* Observer para aplicar listeners a cartões que mudam de posição */
  const observer = new MutationObserver((mutacoes) => {
    mutacoes.forEach((m) => {
      m.addedNodes.forEach((no) => {
        if (no.classList && no.classList.contains('fragmento-card')) {
          adicionarListenersCartao(no);
        }
      });
    });
  });

  observer.observe(document.getElementById('cena1-puzzle-area'), {
    childList: true,
    subtree: true,
  });
}

/**
 * Função: validarPuzzleGV
 * O que faz: verifica se a ordem dos fragmentos nas zonas corresponde
 *            à ordem correcta e despoleta feedback e narrativa.
 * Porquê: é o momento de resolução do puzzle — deve dar feedback
 *         claro e continuar a história se correcto.
 */
function validarPuzzleGV() {
  const fragmentos = puzzleGilVicente.fragmentos;
  let todoCorrect = true;
  const resultados = {}; /* id -> correcto ou não */

  /* Verifica cada fragmento */
  fragmentos.forEach(f => {
    const zonaActual   = estadoPuzzles.gilvicente[f.id];
    const correcto     = zonaActual === f.ordemCorrecta;
    resultados[f.id]   = correcto;
    if (!correcto) todoCorrect = false;
  });

  if (todoCorrect) {
    /* Correcto! */
    if (typeof tocarSfx === 'function') tocarSfx('puzzle_correct');

    /* Brilho verde em todos os cartões */
    fragmentos.forEach(f => {
      const card = document.getElementById(`card-${f.id}`);
      if (card) {
        card.classList.add('correcto');
        card.setAttribute('draggable', 'false');
      }
    });

    /* Desactiva o botão */
    const botao = document.getElementById('btn-submeter-gv');
    if (botao) {
      botao.disabled = true;
      botao.textContent = '[ SEQUÊNCIA RESTAURADA ✓ ]';
    }

    /* Continua a narrativa */
    setTimeout(() => {
      if (typeof cena1PuzzleResolvido === 'function') cena1PuzzleResolvido();
    }, 800);

  } else {
    /* Errado */
    if (typeof tocarSfx === 'function') tocarSfx('puzzle_wrong');
    if (typeof aplicarGlitch === 'function') {
      aplicarGlitch(document.getElementById('btn-submeter-gv'));
    }

    /* Destaca cartões incorrectos */
    fragmentos.forEach(f => {
      const card = document.getElementById(`card-${f.id}`);
      if (card && !resultados[f.id]) {
        card.classList.add('errado');
        setTimeout(() => card.classList.remove('errado'), 600);
      }
    });

    /* Alterna entre ORPHEUS e VERA para o feedback de erro */
    const tentativas = estadoPuzzles.tentativasErradas.gilvicente;
    estadoPuzzles.tentativasErradas.gilvicente++;

    const sequenciaErro = tentativas % 2 === 0
      ? [{ personagem: 'ORPHEUS', texto: puzzleGilVicente.mensagemErrada_orpheus }]
      : [{ personagem: 'VERA',    texto: puzzleGilVicente.mensagemErrada_vera    }];

    if (typeof iniciarSequenciaDialogo === 'function') {
      /* Injeta temporariamente a sequência de erro */
      const chaveTemp = '_erro_gv_temp';
      dialogos[chaveTemp] = sequenciaErro;
      iniciarSequenciaDialogo(chaveTemp);
    }
  }
}

/* ============================================================
   PUZZLE PESSOA — Inicialização e renderização
============================================================ */

/**
 * Função: iniciarPuzzlePessoa
 * O que faz: renderiza o puzzle de atribuição da Cena 2 com 12
 *            cartões em grelha e 5 colunas de destino.
 * Porquê: o formato de grelha permite comparar vários fragmentos
 *         ao mesmo tempo, necessário para identificar as imitações.
 */
function iniciarPuzzlePessoa() {
  const area = document.getElementById('cena2-puzzle-area');
  if (!area) return;

  /* Inicializa estado */
  puzzlePessoa.fragmentos.forEach(f => {
    estadoPuzzles.pessoa[f.id] = null;
  });

  /* Embaralha os fragmentos */
  const fragmentosBaralhados = [...puzzlePessoa.fragmentos].sort(() => Math.random() - 0.5);

  /* Gera as colunas */
  const colunas = puzzlePessoa.colunas.map(nome => {
    const isOrpheus = nome.includes('ORPHEUS');
    return `
      <div class="coluna-atribuicao ${isOrpheus ? 'coluna-orpheus' : ''}">
        <div class="coluna-header ${isOrpheus ? 'coluna-header-orpheus' : 'coluna-header-normal'}">
          ${nome}
        </div>
        <div
          class="coluna-zona-drop"
          id="coluna-zona-${slugify(nome)}"
          data-coluna="${nome}"
        ></div>
      </div>
    `;
  }).join('');

  const html = `
    <div class="puzzle-pessoa">
      <!-- Grelha de fragmentos disponíveis -->
      <div class="puzzle-fragmentos-grid" id="pessoa-origem">
        ${fragmentosBaralhados.map(f => renderizarCartaoPessoa(f)).join('')}
      </div>
      <!-- Colunas de atribuição -->
      <div class="puzzle-colunas-atribuicao" id="pessoa-colunas">
        ${colunas}
      </div>
    </div>
    <div class="puzzle-footer">
      <button class="btn-submeter" id="btn-submeter-pessoa" disabled>[ SUBMETER ]</button>
    </div>
  `;

  area.innerHTML = html;

  /* Configura drag and drop */
  configurarDragDropPessoa();

  document.getElementById('btn-submeter-pessoa').addEventListener('click', validarPuzzlePessoa);

  /* Inicia comentários marginais de ORPHEUS no log */
  if (typeof iniciarComentariosMarginais === 'function') {
    iniciarComentariosMarginais();
  }
}

/**
 * Função: renderizarCartaoPessoa
 * O que faz: gera o HTML de um cartão de fragmento para o puzzle Pessoa.
 * Porquê: os cartões de Pessoa têm uma estrutura diferente dos de GV
 *         (incluem a etiqueta de fonte, que é uma pista para as imitações).
 * @param {Object} fragmento - dados do fragmento
 * @returns {string} HTML do cartão
 */
function renderizarCartaoPessoa(fragmento) {
  const fonteHtml = fragmento.fonte
    ? `<div class="fragmento-fonte-pessoa">— ${fragmento.fonte}</div>`
    : '';

  return `
    <div
      class="fragmento-card-pessoa"
      draggable="true"
      id="card-${fragmento.id}"
      data-id="${fragmento.id}"
      data-origem="grid"
    >
      <div class="fragmento-texto-pessoa">${fragmento.texto.replace(/\n/g, '<br>')}</div>
      ${fonteHtml}
    </div>
  `;
}

/**
 * Função: slugify
 * O que faz: converte uma string em slug utilizável como ID HTML.
 * Porquê: os nomes das colunas têm espaços e caracteres especiais
 *         que não são válidos em atributos id.
 * @param {string} str - string a converter
 * @returns {string} slug sem espaços nem caracteres especiais
 */
function slugify(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .replace(/-+/g, '-');
}

/**
 * Função: configurarDragDropPessoa
 * O que faz: configura todos os event listeners de drag and drop
 *            para o puzzle de atribuição da Cena 2.
 * Porquê: o puzzle Pessoa tem múltiplos cartões por coluna, o que
 *         requer uma lógica de estado diferente do puzzle GV.
 */
function configurarDragDropPessoa() {
  let cartaoArrastado = null;
  let origemArrastada = null; /* 'grid' ou slug da coluna */

  /**
   * Função auxiliar: actualizarBotaoSubmeterPessoa
   * O que faz: activa o botão quando todos os 12 fragmentos estão colocados.
   * Porquê: o botão só deve estar activo quando há algo para validar.
   */
  function actualizarBotaoSubmeterPessoa() {
    const todosColocados = Object.values(estadoPuzzles.pessoa).every(v => v !== null);
    const botao = document.getElementById('btn-submeter-pessoa');
    if (!botao) return;
    if (todosColocados) {
      botao.classList.add('activo');
      botao.disabled = false;
      if (typeof tocarSfx === 'function') tocarSfx('puzzle_unlock');
    } else {
      botao.classList.remove('activo');
      botao.disabled = true;
    }
  }

  /**
   * Função auxiliar: adicionarListenersCartaoPessoa
   * O que faz: adiciona drag listeners a um cartão do puzzle Pessoa.
   * Porquê: os listeners precisam de ser re-aplicados a cartões que
   *         mudam de posição.
   * @param {HTMLElement} card - cartão a configurar
   */
  function adicionarListenersCartaoPessoa(card) {
    card.addEventListener('dragstart', (e) => {
      cartaoArrastado = card.dataset.id;
      origemArrastada = card.dataset.origem;
      card.classList.add('arrastando');
      e.dataTransfer.setData('text/plain', card.dataset.id);
      e.dataTransfer.effectAllowed = 'move';
      if (typeof tocarSfx === 'function') tocarSfx('drag_pickup');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('arrastando');
      cartaoArrastado = null;
      origemArrastada = null;
    });
  }

  /**
   * Função auxiliar: adicionarListenersColuna
   * O que faz: configura uma coluna de destino para aceitar drops.
   * Porquê: cada coluna pode receber múltiplos cartões.
   * @param {HTMLElement} zona - zona de drop da coluna
   */
  function adicionarListenersColuna(zona) {
    zona.addEventListener('dragover', (e) => {
      e.preventDefault();
      zona.classList.add('zona-activa');
    });

    zona.addEventListener('dragleave', () => {
      zona.classList.remove('zona-activa');
    });

    zona.addEventListener('drop', (e) => {
      e.preventDefault();
      zona.classList.remove('zona-activa');

      const idFragmento   = e.dataTransfer.getData('text/plain');
      const nomeColuna    = zona.dataset.coluna;
      const card          = document.getElementById(`card-${idFragmento}`);
      if (!card) return;

      const origemCard = card.dataset.origem;

      /* Actualiza o estado: remove da origem anterior */
      if (origemCard !== 'grid') {
        estadoPuzzles.pessoa[idFragmento] = null;
      }

      /* Coloca na nova coluna */
      zona.appendChild(card);
      card.dataset.origem = slugify(nomeColuna);
      estadoPuzzles.pessoa[idFragmento] = nomeColuna;

      if (typeof tocarSfx === 'function') tocarSfx('drag_drop');
      actualizarBotaoSubmeterPessoa();
    });
  }

  /* Configura a grelha de origem para devolver cartões */
  const grelhaOrigem = document.getElementById('pessoa-origem');
  grelhaOrigem.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  grelhaOrigem.addEventListener('drop', (e) => {
    e.preventDefault();
    const idFragmento = e.dataTransfer.getData('text/plain');
    const card        = document.getElementById(`card-${idFragmento}`);
    if (!card) return;

    estadoPuzzles.pessoa[idFragmento] = null;
    card.dataset.origem = 'grid';
    grelhaOrigem.appendChild(card);
    if (typeof tocarSfx === 'function') tocarSfx('drag_drop');
    actualizarBotaoSubmeterPessoa();
  });

  /* Aplica listeners a todos os cartões e zonas */
  document.querySelectorAll('#pessoa-origem .fragmento-card-pessoa').forEach(adicionarListenersCartaoPessoa);
  document.querySelectorAll('.coluna-zona-drop').forEach(adicionarListenersColuna);

  /* Observer para novos cartões (que se movem) */
  const observer = new MutationObserver((mutacoes) => {
    mutacoes.forEach((m) => {
      m.addedNodes.forEach((no) => {
        if (no.classList && no.classList.contains('fragmento-card-pessoa')) {
          adicionarListenersCartaoPessoa(no);
        }
      });
    });
  });

  observer.observe(document.getElementById('cena2-puzzle-area'), {
    childList: true,
    subtree: true,
  });
}

/**
 * Função: validarPuzzlePessoa
 * O que faz: verifica se cada fragmento está na coluna correcta
 *            e dá feedback visual e narrativo.
 * Porquê: o puzzle de Pessoa é mais difícil que o de GV — a
 *         validação deve ser precisa mas o feedback claro.
 */
function validarPuzzlePessoa() {
  const fragmentos = puzzlePessoa.fragmentos;
  let todosCorrectos = true;

  if (typeof pararComentariosMarginais === 'function') {
    pararComentariosMarginais();
  }

  fragmentos.forEach(f => {
    const colunaActual = estadoPuzzles.pessoa[f.id];
    const correcto     = colunaActual === f.colunaCerta;
    const card         = document.getElementById(`card-${f.id}`);

    if (correcto) {
      if (card) card.classList.add('correcto');
    } else {
      todosCorrectos = false;
      if (card) {
        card.classList.add('errado');
        setTimeout(() => card.classList.remove('errado'), 600);
      }
    }
  });

  if (todosCorrectos) {
    if (typeof tocarSfx === 'function') tocarSfx('puzzle_correct');

    const botao = document.getElementById('btn-submeter-pessoa');
    if (botao) {
      botao.disabled = true;
      botao.textContent = '[ ATRIBUIÇÃO CORRECTA ✓ ]';
    }

    setTimeout(() => {
      if (typeof cena2PuzzleResolvido === 'function') cena2PuzzleResolvido();
    }, 800);

  } else {
    if (typeof tocarSfx === 'function') tocarSfx('puzzle_wrong');
    if (typeof aplicarGlitch === 'function') {
      aplicarGlitch(document.getElementById('btn-submeter-pessoa'));
    }

    const tentativas = estadoPuzzles.tentativasErradas.pessoa;
    estadoPuzzles.tentativasErradas.pessoa++;

    const sequenciaErro = tentativas % 2 === 0
      ? [{ personagem: 'ORPHEUS', texto: puzzlePessoa.mensagemErrada_orpheus }]
      : [{ personagem: 'VERA',    texto: puzzlePessoa.mensagemErrada_vera    }];

    if (typeof iniciarSequenciaDialogo === 'function') {
      const chaveTemp = '_erro_pessoa_temp';
      dialogos[chaveTemp] = sequenciaErro;
      iniciarSequenciaDialogo(chaveTemp);
    }

    /* Reactiva os comentários marginais */
    if (typeof iniciarComentariosMarginais === 'function') {
      iniciarComentariosMarginais();
    }
  }
}
