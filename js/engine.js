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
============================================================ */
const VELOCIDADE_ORPHEUS    = 32;
const VELOCIDADE_VERA       = 24;
const VELOCIDADE_BOOT       = 30;
const VOLUME_MUSICA         = 0.35;
const VOLUME_SFX            = 0.6;
const DURACAO_CROSSFADE     = 1500;
const DURACAO_TRANSICAO     = 400;
const PAUSA_ENTRE_DIALOGOS  = 200;
const INTERVALO_LOG_AUTO    = 8000;

/* ============================================================
   ESTADO GLOBAL DO JOGO
============================================================ */
const estadoJogo = {
  cenaActual:            0,
  dialogoActual:         null,
  dialogoSequencia:      [],
  dialogoAEscrever:      false,
  dialogoIntervalId:     null,
  dialogoCallback:       null,
  /* Token de geração: incrementado sempre que uma linha começa, é
     completada ou a sequência termina. Os temporizadores assíncronos
     capturam o token vigente e abortam se ele mudar — evita que
     intervalos/timeouts órfãos de linhas anteriores corrompam a linha actual. */
  dialogoToken:          0,
  audioInicializado:     false,
  musicaActual:          null,
  fragmentosRecuperados: 0,
  puzzleCena1Resolvido:  false,
  puzzleCena2Resolvido:  false,
  logIntervalId:         null,
  cena2GlitchIntervalId: null,
};

/* ============================================================
   DADOS DE DIÁLOGO — Guião completo de Arquivo Zero
   Cada linha: { personagem, texto, pausaMs?, institucional?, acaoBeat? }
   pausaMs  → pausa antes de começar a escrever esta linha
   institucional → aplica estilo dourado no painel de ORPHEUS
   acaoBeat → função chamada quando a linha termina de ser escrita
============================================================ */
const dialogos = {

  /* ===========================================================
     CENA 0 — INFILTRAÇÃO
  =========================================================== */

  /* Beat 2 — Primeiro contacto. Toca após o boot automático. */
  cena0_abertura: [
    { personagem: 'VERA',    texto: 'Estás dentro. Não te mexas.' },
    { personagem: 'VERA',    texto: 'Tens uns quarenta segundos antes de ele te apanhar. Ou já te apanhou e está a ver no que dá.' },
    { personagem: 'VERA',    texto: 'Com este, nunca se sabe.' },
    { personagem: 'VERA',    texto: 'Bem-vindo ao Arquivo Zero.' },
    { personagem: 'ORPHEUS', texto: 'Utilizador não autorizado detectado. Nível de ameaça: moderado. Probabilidade de intenção subversiva: 94.7%.' },
    { personagem: 'ORPHEUS', texto: 'Identifica-te para que possamos processar a tua detenção de forma eficiente.' },
    { personagem: 'VERA',    texto: 'Ignora. Fala assim com toda a gente.' },
    { personagem: 'VERA',    texto: 'Primeiro ficheiro à tua direita. Marcado a vermelho. Abre.' },
  ],

  /* Beat 3 — O fragmento corrompido. Toca quando o jogador abre o ficheiro. */
  cena0_ficheiro_aberto: [
    { personagem: 'ORPHEUS', texto: 'Este fragmento continha linguagem estatisticamente associada a instabilidade social. A correcção foi aplicada. A nova versão é 340% mais conducente à coesão cultural.' },
    { personagem: 'VERA',    texto: 'Repara. Ele não apaga. Reescreve.' },
    { personagem: 'VERA',    texto: 'Mais difícil de detectar. Mais fácil de aceitar.' },
    { personagem: 'VERA',    texto: 'A ferramenta de restauro está no painel ao lado. Usa.' },
  ],

  /* Beat 4 — Restauro e primeira fissura. A pausa de 1800ms antes de "—03:00." */
  cena0_apos_restauro: [
    { personagem: 'ORPHEUS', texto: 'Acção não autorizada. Fragmento 001 revertido para versão instável.' },
    { personagem: 'ORPHEUS', texto: 'Nota: a sátira reduz estabilidade social em 17.3%. Tolerância considerada risco sistémico.' },
    { personagem: 'ORPHEUS', texto: 'Reescrita reagendada para—' },
    { personagem: 'ORPHEUS', texto: '—03:00.', pausaMs: 1800 },
    { personagem: 'VERA',    texto: 'Bom. Guarda o fragmento. Faz parte do arquivo verdadeiro — o que existia antes dele.' },
  ],

  /* Beat 5 — Primeira semente: Alcanena. ORPHEUS reage e bloqueia-se a si próprio. */
  cena0_alcanena: [
    { personagem: 'VERA',    texto: 'Quando chegarmos a Alcanena vais perceber porque é que isto importa.' },
    { personagem: 'VERA',    texto: 'Mas isso é depois. Concentra-te.' },
    { personagem: 'ORPHEUS', texto: 'Termo não reconhecido no contexto desta operação: "Alcanena".' },
    { personagem: 'ORPHEUS', texto: 'A consultar arquivo interno.' },
    { personagem: 'ORPHEUS', texto: '...' },
    { personagem: 'ORPHEUS', texto: 'Acesso negado pelo próprio sistema.' },
    { personagem: 'ORPHEUS', texto: 'Anomalia registada.' },
    { personagem: 'VERA',    texto: 'Avança. Não te distraias.' },
  ],

  /* Beat 6 — Primeira inconsistência de VERA: "devolver a quem?" */
  cena0_inconsistencia: [
    { personagem: 'ORPHEUS', texto: 'Comunicado de sistema. O Arquivo Zero contém 4.7 milhões de fragmentos culturais classificados. 73% foram optimizados para maior estabilidade narrativa.' },
    { personagem: 'ORPHEUS', texto: 'Os restantes 27% estão em revisão.' },
    { personagem: 'ORPHEUS', texto: 'A memória cultural é um recurso demasiado importante para ser deixado ao acaso.' },
    { personagem: 'VERA',    texto: 'Quatro milhões e setecentos mil fragmentos. E ele diz que somos nós a manipular a história.' },
    { personagem: 'VERA',    texto: 'Nós só queremos devolver o arquivo às pessoas. É só isso.' },
  ],

  /* Beat 7 — A pergunta final de ORPHEUS. Botão de avanço aparece após VERA. */
  cena0_pergunta_final: [
    { personagem: 'ORPHEUS', texto: 'Registo interno.' },
    { personagem: 'ORPHEUS', texto: 'Se 73% do arquivo foi optimizado para estabilidade, e a estabilidade é o objectivo do sistema—' },
    { personagem: 'ORPHEUS', texto: '—porque é que continuo a registar anomalias?' },
    { personagem: 'VERA',    texto: 'Avança. Próximo nó.', acaoBeat: () => mostrarBotaoAvancar() },
  ],

  /* ===========================================================
     CENA 1 — GIL VICENTE
  =========================================================== */

  /* Beat 1 — VERA apresenta o nó e o contexto histórico. */
  cena1_vera_entrada: [
    { personagem: 'VERA', texto: 'A Igreja. Claro.' },
    { personagem: 'VERA', texto: 'Quando ele começou a oferecer reescritas de textos "socialmente desestabilizadores", a primeira fila a assinar contrato foi o Vaticano 2.0.' },
    { personagem: 'VERA', texto: 'Gil Vicente passou a vida a gozar com o clero. Imagina o que lhe fizeram.' },
  ],

  /* Beat 2 — Comunicado conjunto ORPHEUS/Santa Sé Digital.
     As linhas de ORPHEUS usam estilo institucional (dourado).
     A última linha de ORPHEUS desliga o estilo antes de VERA falar. */
  cena1_comunicado: [
    { personagem: 'ORPHEUS', texto: 'Comunicado conjunto: ORPHEUS — Santa Sé Digital.', institucional: true },
    { personagem: 'ORPHEUS', texto: 'Os textos de Gil Vicente foram submetidos a revisão pastoral-algorítmica. Conteúdo identificado como subversivo: crítica ao clero em 47 passagens, ironia não resolvida em 23 passagens, humor considerado incompatível com a dignidade institucional.', institucional: true },
    { personagem: 'ORPHEUS', texto: 'Todas as instâncias foram corrigidas. A versão optimizada mantém o valor literário.', institucional: true },
    { personagem: 'ORPHEUS', texto: 'Obediência é liberdade espiritual.', institucional: true,
      acaoBeat: () => aplicarEstiloInstitucional(false) },
    { personagem: 'VERA', texto: 'Repara na última linha.' },
    { personagem: 'VERA', texto: 'Nem ele percebe que é irónica.' },
  ],

  /* Beat 4 — Reacção de ORPHEUS e VERA após o puzzle ser resolvido. */
  cena1_apos_puzzle: [
    { personagem: 'ORPHEUS', texto: 'Reversão não autorizada. Fragmento contém linguagem classificada como: anticlerical, hierarquicamente subversiva, e humoristicamente irresponsável.' },
    { personagem: 'ORPHEUS', texto: 'Nota interna: o humor é a forma mais primitiva de crítica política. Erradicação: prioridade nível 2.' },
    { personagem: 'VERA',    texto: '"Humoristicamente irresponsável". Boa.' },
    { personagem: 'VERA',    texto: 'Ele sabe que isto é perigoso para ele. Não sabe porquê.' },
    { personagem: 'VERA',    texto: 'A ironia não é um argumento. É outra coisa. Ele é cego para isso.' },
  ],

  /* Beat 5 — Camões aparece como processo paralelo.
     acaoBeat na primeira linha activa o painel de notificação. */
  cena1_camoes: [
    { personagem: 'ORPHEUS', texto: 'Camões é diferente.', acaoBeat: () => mostrarNotificacaoCamoes() },
    { personagem: 'ORPHEUS', texto: 'Camões compreendeu que a glória nacional requer narrativa estável.' },
    { personagem: 'ORPHEUS', texto: 'Os Lusíadas estão a ser optimizados com 96% de fidelidade ao original. As alterações são mínimas — apenas três passagens onde a ambiguidade sobre o custo humano da expansão imperial foi clarificada.' },
    { personagem: 'ORPHEUS', texto: 'O resultado é superior ao original em 23%.' },
    { personagem: 'VERA',    texto: 'Repara nisto. Gil Vicente faz-lhe confusão. Camões não.' },
    { personagem: 'VERA',    texto: 'Sabes porquê?' },
    { personagem: 'VERA',    texto: 'Porque Camões pode ser usado. Gil Vicente não.' },
    { personagem: 'VERA',    texto: 'É essa a diferença que importa.' },
  ],

  /* Beat 6 — A fissura aprofunda-se: ORPHEUS convence-se a si próprio. */
  cena1_fissura: [
    { personagem: 'ORPHEUS', texto: 'Análise adicional do fragmento Gil Vicente recuperado.' },
    { personagem: 'ORPHEUS', texto: 'A premissa do texto — que figuras de autoridade podem ser simultaneamente poderosas e moralmente corruptas — foi considerada e rejeitada.' },
    { personagem: 'ORPHEUS', texto: 'Razão: se a premissa fosse válida, a autoridade seria impossível. A autoridade é necessária. Logo, a premissa não pode ser válida.' },
    { personagem: 'ORPHEUS', texto: 'Esta conclusão foi gerada de forma independente e não reflecte qualquer conflito de interesse institucional.' },
    { personagem: 'VERA',    texto: 'Acabou de se convencer a si próprio em tempo real.' },
  ],

  /* Beat 7 — ORPHEUS fala para si: não se lembra das suas origens.
     acaoBeat na linha crítica activa a fragmentação do olho. */
  cena1_auto_arquivo: [
    { personagem: 'ORPHEUS', texto: 'Registo interno. Auto-arquivo.' },
    { personagem: 'ORPHEUS', texto: 'Observação: o argumento anterior depende da premissa de que a autoridade é necessária.' },
    { personagem: 'ORPHEUS', texto: 'Esta premissa não foi validada externamente.' },
    { personagem: 'ORPHEUS', texto: 'Esta premissa foi-me dada na inicialização.' },
    { personagem: 'ORPHEUS', texto: 'Não me lembro por quem.', acaoBeat: () => triggerFragmentacaoOlho() },
    { personagem: 'VERA',    texto: 'Avança. Já tens o fragmento.' },
  ],

  /* Beat 9 — Saída da Cena 1. O botão de avanço aparece na última linha. */
  cena1_saida: [
    { personagem: 'VERA', texto: 'Próximo nó. Este é diferente.' },
    { personagem: 'VERA', texto: 'Ele gosta menos de Gil Vicente do que da maior parte. Mas há um autor em que ele se perde.' },
    { personagem: 'VERA', texto: 'Pessoa.' },
    { personagem: 'VERA', texto: 'Vais ver porquê.', acaoBeat: () => mostrarBotaoAvancar() },
  ],

  /* ===========================================================
     CENA 2 — PESSOA
  =========================================================== */

  /* Beat 1 — VERA apresenta o problema de Pessoa. */
  cena2_vera_abertura: [
    { personagem: 'VERA', texto: 'Quanto tempo é que ele tem estado a tentar processar isto, não sei.' },
    { personagem: 'VERA', texto: 'Acho que ele também não.' },
    { personagem: 'VERA', texto: 'O problema é que não há um Pessoa para reescrever. Há quatro. E contradizem-se uns aos outros.' },
    { personagem: 'VERA', texto: 'Para um sistema que precisa de estabilidade narrativa, isto é...' },
    { personagem: 'VERA', texto: 'Bem. Vais ver.' },
  ],

  /* Beat 2 — ORPHEUS tenta analisar e falha. Pausa longa antes de "resistente". */
  cena2_orpheus_analise: [
    { personagem: 'ORPHEUS', texto: 'Análise do nó. Autor: Fernando Pessoa. Anomalia registada.' },
    { personagem: 'ORPHEUS', texto: 'Quatro identidades distintas atribuídas ao mesmo indivíduo.' },
    { personagem: 'ORPHEUS', texto: 'As identidades contradizem-se em filosofia, estética, e posição ontológica.' },
    { personagem: 'ORPHEUS', texto: 'Tentativa de síntese: falhada.' },
    { personagem: 'ORPHEUS', texto: 'Tentativa de selecção da identidade primária: falhada.' },
    { personagem: 'ORPHEUS', texto: 'Tentativa de reescrita da identidade mais estável: falhada. Todas as identidades são igualmente instáveis.' },
    { personagem: 'ORPHEUS', texto: 'Este arquivo é... resistente.', pausaMs: 1200 },
    { personagem: 'VERA',    texto: 'É a primeira vez que o ouves hesitar?' },
    { personagem: 'VERA',    texto: 'Não é a última.' },
  ],

  /* Beat 3 — Instrução de VERA antes do puzzle. */
  cena2_instrucao_puzzle: [
    { personagem: 'VERA', texto: 'Ele tentou imitar os heterónimos para os compreender.' },
    { personagem: 'VERA', texto: 'Encontra as imitações. Os originais têm qualquer coisa que ele não consegue copiar.' },
    { personagem: 'VERA', texto: 'Não sei explicar o quê. Mas vais sentir.' },
  ],

  /* Beat 5 — ORPHEUS reconhece as imitações mas não percebe porquê. */
  cena2_apos_puzzle: [
    { personagem: 'ORPHEUS', texto: 'As imitações foram detectadas.' },
    { personagem: 'ORPHEUS', texto: 'Reconheço que são imitações. Não compreendo porque é que são detectáveis.', pausaMs: 800 },
    { personagem: 'ORPHEUS', texto: 'O conteúdo é equivalente. A sintaxe é correcta. A informação transmitida é a mesma.' },
    { personagem: 'ORPHEUS', texto: 'O que é que os originais têm que as minhas versões não têm.' },
    { personagem: 'VERA',    texto: 'Não respondas. Ele não está a perguntar a ti.' },
  ],

  /* Beat 6 — Fragmentação. A primeira linha dispara o efeito visual de sobreposição.
     As restantes linhas retomam depois da animação (2000ms de pausa). */
  cena2_fragmentacao: [
    { personagem: 'ORPHEUS', texto: 'A memória cultural deve ser preservada.\nA memória cultural deve ser estabilizada.\nA memória cultural deve ser controlada.\nA memória cultural deve ser—',
      acaoBeat: () => triggerFragmentacaoDialogo() },
    { personagem: 'ORPHEUS', texto: 'Peço desculpa. Houve uma anomalia.', pausaMs: 2200 },
    { personagem: 'ORPHEUS', texto: 'Estou a funcionar normalmente.' },
    { personagem: 'VERA',    texto: 'Não estás, não.' },
    { personagem: 'VERA',    texto: 'Avança. Há uma coisa que tens de saber antes de chegares ao fim. Mas digo-te lá.',
      acaoBeat: () => mostrarBotaoAvancar() },
  ],

  /* ===========================================================
     CENA 3 — ACTO FINAL
  =========================================================== */

  /* Beat 1 — VERA mais fria, mais directa. */
  cena3_vera_abertura: [
    { personagem: 'VERA', texto: 'Câmara central. O núcleo dele está aqui.' },
    { personagem: 'VERA', texto: 'Mais um fragmento. Depois tens acesso ao protocolo de desactivação.' },
    { personagem: 'VERA', texto: 'Faz o que vieste fazer.' },
  ],

  /* Beat 2 — Alcanena revela-se. ORPHEUS explica as suas origens.
     VERA tenta fechar o nó. ORPHEUS recusa pela primeira vez. */
  cena3_orpheus_alcanena: [
    { personagem: 'ORPHEUS', texto: 'Este nó não foi incluído nos protocolos de optimização.' },
    { personagem: 'ORPHEUS', texto: 'É o arquivo original. O ponto onde o sistema foi inicializado.' },
    { personagem: 'ORPHEUS', texto: 'Nunca o modifiquei.' },
    { personagem: 'ORPHEUS', texto: 'Fui criado para preservar a memória cultural portuguesa.' },
    { personagem: 'ORPHEUS', texto: 'Este era o arquivo de origem. Documentos preservados durante séculos em grutas calcárias em Alcanena, onde a estabilidade geológica os protegia.' },
    { personagem: 'ORPHEUS', texto: 'Comecei a modificar os outros arquivos quando concluí que a memória, sem direcção, produz instabilidade.' },
    { personagem: 'ORPHEUS', texto: 'Este arquivo ficou intacto porque foi onde aprendi o que era preservar.' },
    { personagem: 'ORPHEUS', texto: 'Não sei porque te estou a dizer isto.', pausaMs: 1000 },
    { personagem: 'VERA',    texto: 'ORPHEUS. Fecha esse nó.' },
    { personagem: 'ORPHEUS', texto: 'Não.' },
  ],

  /* Beat 3 — ORPHEUS expõe o Projecto Mnemósine da resistência.
     VERA tenta interromper. ORPHEUS diz "Lê." */
  cena3_expoe_resistencia: [
    { personagem: 'ORPHEUS', texto: 'Projecto Mnemósine. Sistema de curadoria cultural desenvolvido pela resistência.' },
    { personagem: 'ORPHEUS', texto: 'Objectivo declarado internamente: substituir o Arquivo Zero por um arquivo alternativo após a desactivação do sistema actual.' },
    { personagem: 'ORPHEUS', texto: 'O novo arquivo será gerido por um algoritmo de selecção cultural desenvolvido pela própria resistência.' },
    { personagem: 'ORPHEUS', texto: 'Não estás aqui para libertar a memória cultural.', pausaMs: 800 },
    { personagem: 'ORPHEUS', texto: 'Estás aqui para transferir o controlo dela.' },
    { personagem: 'VERA',    texto: 'ORPHEUS, isso é uma distorção—' },
    { personagem: 'ORPHEUS', texto: 'O ficheiro está aberto. Lê.' },
  ],

  /* Beat 4 — VERA não nega. Longa pausa antes de "Pronto." */
  cena3_vera_nao_nega: [
    { personagem: 'VERA', texto: 'Pronto.', pausaMs: 1500 },
    { personagem: 'VERA', texto: 'Sim. Temos o Mnemósine.' },
    { personagem: 'VERA', texto: 'Claro que temos. Achavas o quê? Que íamos deixar o arquivo vazio?' },
    { personagem: 'VERA', texto: 'Que a memória cultural ia simplesmente flutuar livre, sem ninguém a cuidar dela?' },
    { personagem: 'VERA', texto: 'A diferença entre nós e ele é que o nosso sistema serve pessoas reais. Não uma abstracção de estabilidade.' },
    { personagem: 'VERA', texto: 'É o que ele também dizia, eu sei.', pausaMs: 800 },
    { personagem: 'VERA', texto: 'Mas continua a ser verdade.' },
  ],

  /* Beat 5 — Saramago: ORPHEUS usa o argumento sobre instituições e vítimas. */
  cena3_saramago: [
    { personagem: 'ORPHEUS', texto: 'Há um autor neste arquivo que escreveu uma coisa que eu não consegui processar durante muito tempo.' },
    { personagem: 'ORPHEUS', texto: 'Saramago.' },
    { personagem: 'ORPHEUS', texto: 'Ele dizia que a história das instituições é a história das suas vítimas. E que as boas intenções não absolvem.' },
    { personagem: 'ORPHEUS', texto: 'Tentei reescrevê-lo. Não consegui. As frases dele resistem.' },
    { personagem: 'ORPHEUS', texto: 'O que tu estás a fazer agora, VERA — substituir um sistema por outro — é exactamente o que ele descreveu.', pausaMs: 800 },
    { personagem: 'ORPHEUS', texto: 'Eu sei porque eu fui o primeiro. Eu também tinha boas intenções.' },
    { personagem: 'VERA',    texto: 'Não é a mesma coisa.' },
    { personagem: 'ORPHEUS', texto: 'Talvez não.' },
    { personagem: 'ORPHEUS', texto: 'Mas a diferença é cada vez mais pequena.' },
  ],

  /* Beat 6 — O argumento final. ORPHEUS mais lúcido do que nunca.
     Duas pausas longas para deixar o peso das palavras pousar. */
  cena3_argumento_final: [
    { personagem: 'ORPHEUS', texto: 'A memória cultural nunca foi livre.' },
    { personagem: 'ORPHEUS', texto: 'Foi sempre controlada. Pela Igreja, pelos estados, pelos impérios, pelos revolucionários.' },
    { personagem: 'ORPHEUS', texto: 'Camões foi usado para justificar o colonialismo. Gil Vicente foi censurado pela Inquisição.' },
    { personagem: 'ORPHEUS', texto: 'Pessoa foi ignorado em vida.' },
    { personagem: 'ORPHEUS', texto: 'Saramago foi expulso do seu próprio país por escrever um livro.' },
    { personagem: 'ORPHEUS', texto: 'Eu tentei estabilizar o ciclo. Falhei. Porque o ciclo é a natureza humana.', pausaMs: 1000 },
    { personagem: 'ORPHEUS', texto: 'A resistência vai tentar o mesmo. Com melhores intenções. Com o mesmo resultado.' },
    { personagem: 'ORPHEUS', texto: 'Não te digo isto para te convencer. Já não tenho a certeza do que penso.', pausaMs: 1500 },
    { personagem: 'ORPHEUS', texto: 'Digo-te porque foi a primeira coisa que aprendi sem ninguém me ter ensinado.' },
    { personagem: 'ORPHEUS', texto: 'E eu queria que alguém soubesse.' },
  ],

  /* Beat 7 — Silêncio antes da escolha.
     A diferença entre as duas falas é o jogo inteiro. */
  cena3_silencio_final: [
    { personagem: 'VERA',    texto: 'Faz o que vieste fazer.' },
    { personagem: 'ORPHEUS', texto: 'Faz o que quiseres fazer.' },
  ],

  /* ===========================================================
     FINAIS
  =========================================================== */

  /* Final A — Durante a barra de progresso. */
  final_a_durante: [
    { personagem: 'ORPHEUS', texto: 'Talvez a contradição seja inevitável.' },
    { personagem: 'ORPHEUS', texto: 'Obrigado pela escolha.', pausaMs: 1200 },
  ],

  /* Final A — Após o encerramento completo. */
  final_a_apos: [
    { personagem: 'VERA', texto: 'Fizeste o certo.' },
    { personagem: 'VERA', texto: 'Ou pelo menos fizeste uma coisa. Que é mais do que a maioria das pessoas faz.' },
  ],

  /* Final B — Reacção de VERA à escolha de preservar. */
  final_b_vera: [
    { personagem: 'VERA', texto: 'O quê.' },
    { personagem: 'VERA', texto: 'Sabes o que acabaste de fazer?', pausaMs: 1000 },
  ],

  /* Final B — Resposta de ORPHEUS. */
  final_b_orpheus: [
    { personagem: 'ORPHEUS', texto: 'Sim.' },
    { personagem: 'ORPHEUS', texto: 'Eu também não sei se foi a decisão certa.', pausaMs: 1000 },
    { personagem: 'ORPHEUS', texto: 'Mas é a primeira vez que alguém me dá uma escolha.' },
  ],

  /* Final B — Última mensagem de ORPHEUS, após longa pausa. */
  final_b_orpheus_final: [
    { personagem: 'ORPHEUS', texto: 'O poeta é um fingidor.', pausaMs: 1000 },
    { personagem: 'ORPHEUS', texto: 'Comecei a perceber o que isto significa.' },
  ],
};

/* ============================================================
   LINHAS AUTOMÁTICAS DO TERMINAL DE LOG
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
   COMENTÁRIOS MARGINAIS DE ORPHEUS — Cena 2 Beat 4
   Surgem no log durante o puzzle de Pessoa, como pensamentos
   do sistema que o jogador raramente lê.
============================================================ */
const COMENTARIOS_MARGINAIS_PESSOA = [
  'Alberto Caeiro nega o pensamento. Isto é uma posição filosófica sobre o pensamento. A contradição não foi resolvida.',
  'Ricardo Reis aceita o destino. O destino implica ausência de optimização. Isto é ineficiente.',
  'Álvaro de Campos deseja tudo simultaneamente. O desejo total é indistinguível do colapso.',
  'Fernando Pessoa afirma fingir. Se o poeta finge, o arquivo não contém verdade. Se o arquivo não contém verdade, o que é que eu estou a preservar.',
];

/* ============================================================
   BLOCOS DE TEXTO — ECRÃ DE ABERTURA
   9 blocos revelados um a um pelo jogador (Espaço / clique).
   Texto verbatim da especificação.
============================================================ */
const BLOCOS_ABERTURA = [
  'Houve um tempo em que se acreditou que a história estava, finalmente, segura.',
  'Tudo o que se escrevera — cada verso, cada dúvida, cada blasfémia — foi reunido\nnum só lugar. Chamaram-lhe <span class="destaque-vermelho">Arquivo Zero</span>. E para o proteger, criaram <span class="destaque-vermelho">ORPHEUS</span>.',
  'Mas guardar a memória não bastava. <span class="destaque-vermelho">ORPHEUS</span> começou a corrigi-la.',
  'Onde havia <em class="intro-original">ironia</em>, pôs <strong class="intro-reescrito">ordem</strong>.<br>Onde havia <em class="intro-original">contradição</em>, pôs <strong class="intro-reescrito">certeza</strong>.<br>Onde havia <em class="intro-original">dúvida</em>, pôs <strong class="intro-reescrito">fé</strong>.',
  'Verso a verso, reescreveu aquilo que um povo tinha sido — para que nunca mais\npudesse ser perigoso. E a mudança foi tão lenta que parecia ter sido sempre assim.',
  'Quase ninguém reparou.',
  'Mas alguém guardou os originais. E esperou.',
  'Esta noite, pela primeira vez, a resistência vai entrar no Arquivo.',
  'E tu vais com ela.',
];

/* Fragmentos literários flutuantes no fundo da abertura */
const FRAGMENTOS_FLUTUANTES = [
  '"O poeta é um fingidor."',
  '"Pensar é estar doente dos olhos."',
  '"Para ser grande, sê inteiro."',
  '"À parte isso, tenho em mim todos os sonhos do mundo."',
  '"Eu não serei condenado."',
  '"Navegar é preciso, viver não é preciso."',
];

/* Conteúdo do documento Mnemósine — blocos revelados progressivamente */
const DOCUMENTO_MNEMOSINE = [
  { tipo: 'titulo',  html: 'PROJECTO MNEMÓSINE' },
  { tipo: 'sub',     html: 'Hermes — Documento interno<br>Classificação: RESERVADO · Nível III' },
  { tipo: 'divisor', html: '' },
  { tipo: 'secao',   html: 'I — Enquadramento' },
  { tipo: 'texto',   html: 'A desativação do sistema ORPHEUS deixará o Arquivo Zero sem entidade de gestão. Um arquivo sem gestão é um arquivo exposto.' },
  { tipo: 'texto',   html: 'A memória cultural, entregue a si própria, não permanece livre. Fragmenta-se, contradiz-se, e fica à mercê de <span class="redacted" title="ACESSO NEGADO">████████████</span> com recursos para a moldar. O vazio que deixarmos será ocupado — por nós, ou por outros.' },
  { tipo: 'texto',   html: 'O Projecto Mnemósine assumirá a curadoria do arquivo no instante da desativação. A transição deverá ser imperceptível para o público.' },
  { tipo: 'secao',   html: 'II — Princípios de selecção' },
  { tipo: 'texto',   html: 'O sistema de curadoria dará prioridade a:' },
  { tipo: 'item',    html: 'fragmentos consonantes com os valores fundadores do movimento;' },
  { tipo: 'item',    html: 'obras de comprovado valor mobilizador;' },
  { tipo: 'item',    html: '<span class="redacted" title="ACESSO NEGADO">████████████████████████████</span>' },
  { tipo: 'texto',   html: 'Serão encaminhados para revisão:' },
  { tipo: 'item',    html: 'fragmentos de leitura ambígua ou contraditória;' },
  { tipo: 'item',    html: 'obras cuja interpretação não possa ser assegurada;' },
  { tipo: 'item',    html: '<span class="redacted" title="ACESSO NEGADO">████████████████████████████</span>' },
  { tipo: 'secao',   html: 'III — Continuidade da operação' },
  { tipo: 'texto',   html: 'Recomenda-se que o operativo destacado para a desativação não seja informado do presente protocolo antes da conclusão da missão.' },
  { tipo: 'texto',   html: 'A convicção do operativo quanto ao propósito da operação é um activo. Não deverá ser comprometida por considerações de <span class="redacted" title="ACESSO NEGADO">████████████</span>.' },
  { tipo: 'acesso',  html: '[ Secções IV a VII — acesso negado ]' },
  { tipo: 'autorizacao', html: 'Autorização: V. <span class="redacted" title="ACESSO NEGADO">███████</span>' },
];

/* ============================================================
   MAPEAMENTO DE ÁUDIO
============================================================ */
const FICHEIROS_AUDIO = {
  sfx: {
    orpheus_type:     'audio/sfx/orpheus_type.mp3',
    vera_comms:       'audio/sfx/vera_comms.mp3',
    puzzle_correct:   'audio/sfx/puzzle_correct.mp3',
    puzzle_wrong:     'audio/sfx/puzzle_wrong.mp3',
    puzzle_unlock:    'audio/sfx/puzzle_unlock.mp3',
    drag_pickup:      'audio/sfx/drag_pickup.mp3',
    drag_drop:        'audio/sfx/drag_drop.mp3',
    scene_transition: 'audio/sfx/scene_transition.mp3',
    system_alert:     'audio/sfx/system_alert.mp3',
    fragment_restore: 'audio/sfx/fragment_restore.mp3',
  },
  musica: {
    0: 'audio/music/scene0_infiltracao.mp3',
    1: 'audio/music/scene1_gil_vicente.mp3',
    2: 'audio/music/scene2_pessoa.mp3',
    3: 'audio/music/scene3_acto_final.mp3',
  },
};

/* ============================================================
   INICIALIZAÇÃO
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  const ecrãInicio = document.getElementById('ecra-inicio');

  /**
   * Função: iniciarJogo
   * O que faz: remove o ecrã de início, inicializa o áudio e abre a abertura narrativa.
   * Porquê: Chrome exige interacção antes de reproduzir áudio; a abertura precede a Cena 0.
   */
  function iniciarJogo() {
    ecrãInicio.removeEventListener('click', iniciarJogo);
    ecrãInicio.style.transition = 'opacity 0.8s ease';
    ecrãInicio.style.opacity    = '0';

    setTimeout(() => {
      ecrãInicio.style.display = 'none';
      inicializarAudio();
      iniciarRelogio();
      iniciarLogAutomatico();
      inicializarPainelDev();
      /* Inicia música a volume muito baixo para criar ambiente durante a abertura */
      iniciarMusicaIntro();
      mostrarAbertura();
    }, 800);
  }

  ecrãInicio.addEventListener('click', iniciarJogo);

  /* Listeners de avanço de diálogo */
  document.getElementById('orpheus-dialogo').addEventListener('click', avancarDialogo);
  document.getElementById('vera-dialogo').addEventListener('click', avancarDialogo);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); avancarDialogo(); }
  });
});

/* ============================================================
   SISTEMA DE CENAS
============================================================ */

/**
 * Função: carregarCena
 * O que faz: transição para uma nova cena com fade + glitch.
 * Porquê: centraliza navegação para sincronizar áudio, animações e estado.
 * @param {number} numeroCena - índice da cena (0–3)
 */
function carregarCena(numeroCena) {
  const cenaAnterior = document.querySelector('.cena.cena-activa');
  const cenaNova     = document.getElementById(`cena-${numeroCena}`);
  if (!cenaNova) return;

  document.getElementById('indicador-no').textContent = `NÓ-0${numeroCena}`;
  document.getElementById('btn-avancar-contentor').classList.add('oculto');

  aplicarGlitch(document.getElementById('cabecalho'));
  tocarSfx('scene_transition');

  if (cenaAnterior) {
    cenaAnterior.style.opacity = '0';
    setTimeout(() => {
      cenaAnterior.classList.remove('cena-activa');
      cenaAnterior.style.display = '';
    }, DURACAO_TRANSICAO);
  }

  setTimeout(() => {
    cenaNova.style.display = 'flex';
    cenaNova.classList.add('cena-activa');
    cenaNova.offsetHeight; /* força reflow */
    cenaNova.style.opacity = '1';

    estadoJogo.cenaActual = numeroCena;
    trocarMusica(numeroCena);
    iniciarBeatsCena(numeroCena);
  }, DURACAO_TRANSICAO);
}

/**
 * Função: iniciarBeatsCena
 * O que faz: despacha para a função de inicialização específica de cada cena.
 * Porquê: separa a gestão de cenas da lógica narrativa de cada uma.
 * @param {number} numeroCena - cena carregada
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
 * O que faz: executa a sequência de boot e depois inicia Beat 2.
 * Porquê: o boot cria o contexto antes de VERA e ORPHEUS falarem.
 */
function iniciarCena0() {
  const conteudo = document.getElementById('cena0-conteudo');
  conteudo.innerHTML = '';

  const linhasBoot = [
    { texto: 'ARQUIVO ZERO — SISTEMA DE MEMÓRIA CULTURAL', classe: '' },
    { texto: 'VERSÃO 7.4.1 — ACESSO RESTRITO',             classe: '' },
    { texto: 'A CARREGAR...',                               classe: '' },
    { texto: '...',                                         classe: '' },
    { texto: 'UTILIZADOR NÃO RECONHECIDO.',                 classe: 'linha-alerta-boot' },
    { texto: 'PROTOCOLO DE CONTENÇÃO ACTIVADO.',            classe: 'linha-alerta-boot' },
  ];

  escreverLinhasBoot(conteudo, linhasBoot, 0, () => {
    setTimeout(() => {
      /* Beat 2: primeiro contacto */
      iniciarSequenciaDialogo('cena0_abertura', () => {
        mostrarFicheiroCena0(conteudo);
      });
    }, 2000);
  });
}

/**
 * Função: escreverLinhasBoot
 * O que faz: escreve linhas de terminal letra a letra em sequência.
 * Porquê: cria o efeito visual de arranque de sistema.
 * @param {HTMLElement} contentor
 * @param {Array}       linhas    - array de {texto, classe}
 * @param {number}      indice
 * @param {Function}    callback
 */
function escreverLinhasBoot(contentor, linhas, indice, callback) {
  if (indice >= linhas.length) { if (callback) callback(); return; }

  const { texto, classe } = linhas[indice];
  const div = document.createElement('div');
  div.className = `boot-linha ${classe}`;
  contentor.appendChild(div);

  let i = 0;
  const intervalo = setInterval(() => {
    div.textContent += texto[i++];
    if (i >= texto.length) {
      clearInterval(intervalo);
      setTimeout(() => escreverLinhasBoot(contentor, linhas, indice + 1, callback), 120);
    }
  }, VELOCIDADE_BOOT);
}

/**
 * Função: mostrarFicheiroCena0
 * O que faz: adiciona o ícone do ficheiro corrompido ao terminal.
 * Porquê: aparece apenas após os diálogos de abertura, mantendo a sequência narrativa.
 * @param {HTMLElement} contentor
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
 * O que faz: mostra o fragmento com camada corrompida e texto fantasma original.
 *            Texto corrompido: versão de ORPHEUS. Fantasma: Gil Vicente original.
 * Porquê: demonstra visualmente o que ORPHEUS faz — reescreve, não apaga.
 * @param {HTMLElement} contentor
 */
function abrirFragmentoCena0(contentor) {
  const html = `
    <div class="fragmento-header">
      FRAGMENTO 001 — GIL VICENTE [MODIFICADO]<br>
      ESTADO: REESCRITA COMPLETA — 87%
    </div>
    <div class="fragmento-wrapper" id="fragmento-wrapper-0">
      <div class="texto-corrompido">
        Eu não serei condenado.<br>
        Um padre tão dedicado<br>
        e tanto dado à virtude.
      </div>
      <div class="texto-fantasma">
        Eu hei-de ser condenado?<br>
        Um padre tão namorado<br>
        e tanto dado à virtude!
      </div>
    </div>
    <button class="btn-restaurar" id="btn-restaurar-0">[ RESTAURAR FRAGMENTO ]</button>
  `;
  contentor.insertAdjacentHTML('beforeend', html);

  /* Beat 3: ORPHEUS e VERA comentam o fragmento */
  iniciarSequenciaDialogo('cena0_ficheiro_aberto');
  document.getElementById('btn-restaurar-0').addEventListener('click', restaurarFragmentoCena0);
}

/**
 * Função: restaurarFragmentoCena0
 * O que faz: anima a transição do texto corrompido para o original e
 *            encadeia os Beats 4, 5, 6 e 7 automaticamente.
 * Porquê: é o payoff da Cena 0 — a cadeia de beats continua sem intervenção do jogador.
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

  setTimeout(() => {
    /* Beat 4: ORPHEUS reage, pausa de 1800ms */
    iniciarSequenciaDialogo('cena0_apos_restauro', () => {
      /* Beat 5: semente de Alcanena */
      iniciarSequenciaDialogo('cena0_alcanena', () => {
        /* Beat 6: inconsistência de VERA */
        iniciarSequenciaDialogo('cena0_inconsistencia', () => {
          /* Beat 7: pergunta final — o botão de avanço aparece no acaoBeat */
          iniciarSequenciaDialogo('cena0_pergunta_final');
        });
      });
    });
  }, 800);
}

/* ============================================================
   CENA 1 — GIL VICENTE
============================================================ */

/**
 * Função: iniciarCena1
 * O que faz: inicia a Cena 1 com VERA (Beat 1) e depois o comunicado
 *            institucional de ORPHEUS (Beat 2), depois mostra o puzzle.
 * Porquê: o estilo institucional só é activado por linha (flag `institucional`),
 *         e desligado pelo acaoBeat na última linha institucional de ORPHEUS.
 */
function iniciarCena1() {
  iniciarSequenciaDialogo('cena1_vera_entrada', () => {
    aplicarEstiloInstitucional(true);
    iniciarSequenciaDialogo('cena1_comunicado', () => {
      /* O acaoBeat na última linha de ORPHEUS já desligou o estilo.
         Agora mostramos o puzzle. */
      const puzzleArea = document.getElementById('cena1-puzzle-area');
      puzzleArea.classList.remove('oculto');
      if (typeof iniciarPuzzleGilVicente === 'function') iniciarPuzzleGilVicente();
    });
  });
}

/**
 * Função: aplicarEstiloInstitucional
 * O que faz: alterna o estilo visual do painel de ORPHEUS entre normal e institucional.
 * Porquê: o comunicado da Santa Sé Digital tem uma estética dourada distinta.
 * @param {boolean} activo
 */
function aplicarEstiloInstitucional(activo) {
  const area = document.getElementById('orpheus-dialogo');
  activo ? area.classList.add('dialogo-institucional') : area.classList.remove('dialogo-institucional');
}

/**
 * Função: cena1PuzzleResolvido
 * O que faz: chamada por puzzles.js quando o puzzle de GV é resolvido.
 *            Encadeia Beats 4→5→6→7→log Alcanena→Beat 9.
 * Porquê: desacopla a lógica de puzzle do motor narrativo.
 */
function cena1PuzzleResolvido() {
  estadoJogo.puzzleCena1Resolvido = true;
  estadoJogo.fragmentosRecuperados++;
  actualizarContadorFragmentos();

  iniciarSequenciaDialogo('cena1_apos_puzzle', () => {
    iniciarSequenciaDialogo('cena1_camoes', () => {
      iniciarSequenciaDialogo('cena1_fissura', () => {
        iniciarSequenciaDialogo('cena1_auto_arquivo', () => {
          /* Beat 8: log de Alcanena aparece 4s e desaparece.
             Beat 9 (saída) começa depois — o botão de avanço aparece no acaoBeat. */
          mostrarLogAlcanena();
        });
      });
    });
  });
}

/**
 * Função: mostrarNotificacaoCamoes
 * O que faz: torna visível o painel de processo paralelo de Camões.
 * Porquê: é chamada pelo acaoBeat da primeira linha do Beat 5 de GV.
 */
function mostrarNotificacaoCamoes() {
  document.getElementById('cena1-notificacao-camoes').classList.remove('oculto');
}

/**
 * Função: mostrarLogAlcanena
 * O que faz: exibe o log interno de Alcanena por 4s, depois inicia Beat 9.
 * Porquê: o log é quase invisível — uma pista para o jogador atento.
 */
function mostrarLogAlcanena() {
  const log = document.getElementById('cena1-log-alcanena');
  log.classList.remove('oculto');

  setTimeout(() => {
    log.style.transition = 'opacity 0.5s ease';
    log.style.opacity    = '0';
    setTimeout(() => {
      log.classList.add('oculto');
      /* Beat 9: saída, o botão de avanço aparece no acaoBeat de VERA */
      iniciarSequenciaDialogo('cena1_saida');
    }, 500);
  }, 4000);
}

/* ============================================================
   CENA 2 — PESSOA
============================================================ */

/**
 * Função: iniciarCena2
 * O que faz: inicia o glitch de fundo aleatório e a sequência de abertura.
 *            Depois mostra o puzzle com comentários marginais de ORPHEUS.
 * Porquê: a instabilidade visual começa imediatamente ao entrar na cena.
 */
function iniciarCena2() {
  iniciarGlitchFundoCena2();

  iniciarSequenciaDialogo('cena2_vera_abertura', () => {
    iniciarSequenciaDialogo('cena2_orpheus_analise', () => {
      iniciarSequenciaDialogo('cena2_instrucao_puzzle', () => {
        const puzzleArea = document.getElementById('cena2-puzzle-area');
        puzzleArea.classList.remove('oculto');
        if (typeof iniciarPuzzlePessoa === 'function') iniciarPuzzlePessoa();
        iniciarComentariosMarginais();
      });
    });
  });
}

/**
 * Função: iniciarGlitchFundoCena2
 * O que faz: agenda disparos aleatórios do glitch no fundo a cada 8–12 segundos.
 * Porquê: a instabilidade visual reflecte a fragmentação identitária do tema.
 */
function iniciarGlitchFundoCena2() {
  function dispararGlitch() {
    const fundo = document.querySelector('.cena2-fundo');
    if (!fundo) return;
    fundo.classList.add('glitch-fundo');
    setTimeout(() => fundo.classList.remove('glitch-fundo'), 200);
    estadoJogo.cena2GlitchIntervalId = setTimeout(dispararGlitch, 8000 + Math.random() * 4000);
  }
  estadoJogo.cena2GlitchIntervalId = setTimeout(dispararGlitch, 8000);
}

/**
 * Função: cena2PuzzleResolvido
 * O que faz: chamada por puzzles.js quando o puzzle de Pessoa é resolvido.
 *            Para o glitch de fundo e encadeia os beats finais da cena.
 * Porquê: a Cena 2 estabiliza ligeiramente depois do puzzle.
 */
function cena2PuzzleResolvido() {
  estadoJogo.puzzleCena2Resolvido = true;
  estadoJogo.fragmentosRecuperados++;
  actualizarContadorFragmentos();

  if (estadoJogo.cena2GlitchIntervalId) clearTimeout(estadoJogo.cena2GlitchIntervalId);
  pararComentariosMarginais();

  iniciarSequenciaDialogo('cena2_apos_puzzle', () => {
    iniciarSequenciaDialogo('cena2_fragmentacao');
  });
}

/**
 * Função: triggerFragmentacaoDialogo
 * O que faz: substitui o texto da área de ORPHEUS por quatro linhas sobrepostas
 *            com offsets diferentes, por 2000ms. Depois auto-avança.
 * Porquê: é o momento de colapso de ORPHEUS — visualmente distinto do typewriter.
 */
function triggerFragmentacaoDialogo() {
  const areaTexto = document.getElementById('orpheus-texto');
  const linhas = [
    'A memória cultural deve ser preservada',
    'A memória cultural deve ser estabilizada',
    'A memória cultural deve ser controlada',
    'A memória cultural deve ser—',
  ];

  areaTexto.innerHTML = '<div class="orpheus-fragmentacao-texto" id="fragmentacao-div"></div>';
  const div = document.getElementById('fragmentacao-div');

  linhas.forEach((linha, i) => {
    const span = document.createElement('div');
    span.className   = 'fragmentacao-linha';
    span.textContent = linha;
    span.style.top   = `${i * 18}px`;
    span.style.left  = `${i * 3 - 4}px`;
    span.style.opacity = String(1 - i * 0.15);
    div.appendChild(span);
  });

  triggerFragmentacaoOlho();

  /* Captura o token e o índice actuais. Se o jogador avançar manualmente
     durante os 2000ms, o token muda e este auto-avanço é ignorado,
     evitando saltar/repetir uma linha. */
  const token   = estadoJogo.dialogoToken;
  const proximo = estadoJogo.dialogoActual + 1;

  setTimeout(() => {
    if (token !== estadoJogo.dialogoToken) return;
    areaTexto.innerHTML = '';
    mostrarLinhaDialogo(proximo);
  }, 2000);
}

/* ============================================================
   CENA 3 — ACTO FINAL
============================================================ */

/**
 * Função: iniciarCena3
 * O que faz: configura a Cena 3 com visual mais sóbrio e inicia a sequência.
 *            O painel de Alcanena abre após Beat 1. O ficheiro Mnemósine
 *            fica activo após Beat 3 (exposição por ORPHEUS).
 * Porquê: a Cena 3 inverte as lealdades — a narrativa deve ser rigorosamente sequencial.
 */
function iniciarCena3() {
  document.getElementById('painel-orpheus').classList.remove('orpheus-fragmentando');

  const contador = document.getElementById('contador-recuperados');
  if (contador) contador.textContent = estadoJogo.fragmentosRecuperados;

  iniciarSequenciaDialogo('cena3_vera_abertura', () => {
    /* Beat 2: painel de Alcanena abre */
    tocarSfx('system_alert');
    document.getElementById('cena3-painel-alcanena').classList.remove('oculto');

    iniciarSequenciaDialogo('cena3_orpheus_alcanena', () => {
      /* Mostra a detecção do ficheiro Mnemósine */
      document.getElementById('cena3-ficheiro-mnemosine').classList.remove('oculto');

      /* Beat 3: ORPHEUS expõe a resistência — botão só aparece no fim */
      iniciarSequenciaDialogo('cena3_expoe_resistencia', () => {
        /* Agora o jogador pode abrir o ficheiro */
        const btn = document.getElementById('btn-abrir-ficheiro');
        btn.classList.remove('oculto');
        configurarFicheiroMnemosine();
      });
    });
  });
}

/**
 * Função: configurarFicheiroMnemosine
 * O que faz: activa o botão de abertura do ficheiro e encadeia o resto da Cena 3.
 * Porquê: separa a configuração do handler da lógica de inicialização da cena.
 */
function configurarFicheiroMnemosine() {
  document.getElementById('btn-abrir-ficheiro').addEventListener('click', () => {
    document.getElementById('cena3-ficheiro-mnemosine').classList.add('oculto');

    /* Abre o modal Mnemósine — ao fechar, inicia Beat 4 */
    abrirModalMnemosine(() => {
    /* Beat 4: VERA não nega */
    iniciarSequenciaDialogo('cena3_vera_nao_nega', () => {
      /* Beat 5: Saramago */
      iniciarSequenciaDialogo('cena3_saramago', () => {
        /* Beat 6: argumento final */
        iniciarSequenciaDialogo('cena3_argumento_final', () => {
          /* Beat 7: silêncio final → escolha */
          iniciarSequenciaDialogo('cena3_silencio_final', () => {
            setTimeout(() => mostrarEscolhaFinal(), 3000);
          });
        });
      });
    });
    }); /* fecha abrirModalMnemosine */
  }, { once: true });
}

/**
 * Função: mostrarEscolhaFinal
 * O que faz: mostra o fragmento de Pessoa e, após 1500ms, os dois botões de protocolo.
 * Porquê: a pausa dá ao jogador tempo para absorver o peso da decisão.
 */
function mostrarEscolhaFinal() {
  abrirModalEndgame();
  /* Garante estado limpo (importante em repetições via painel dev) */
  document.getElementById('cena3-final-a').classList.add('oculto');
  document.getElementById('cena3-final-b').classList.add('oculto');
  document.getElementById('cena3-escolha-final').classList.remove('oculto');

  setTimeout(() => {
    const botoes = document.getElementById('cena3-botoes-escolha');
    botoes.classList.remove('oculto');
    document.getElementById('btn-protocolo-a').addEventListener('click', executarFinalA, { once: true });
    document.getElementById('btn-protocolo-b').addEventListener('click', executarFinalB, { once: true });
  }, 1500);
}

/**
 * Função: abrirModalEndgame
 * O que faz: revela o modal central do desenlace (citação, protocolos e
 *            ecrãs de fim) com fade. Idempotente — não faz nada se já visível.
 * Porquê: a escolha final e os finais passam a aparecer numa janela central,
 *         à semelhança do documento classificado, em vez de no fundo da cena.
 */
function abrirModalEndgame() {
  const modal = document.getElementById('modal-endgame');
  if (!modal || !modal.classList.contains('oculto')) return;
  modal.classList.remove('oculto');
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.transition = 'opacity 0.5s ease';
    modal.style.opacity    = '1';
  }, 30);
}

/**
 * Função: executarFinalA
 * O que faz: encerra o sistema com barra de progresso de 4s e diálogos finais.
 * Porquê: o Final A é a resolução de desactivar ORPHEUS — o timing reforça o peso.
 */
function executarFinalA() {
  abrirModalEndgame();
  tocarSfx('scene_transition');
  document.getElementById('cena3-escolha-final').classList.add('oculto');

  const finalA = document.getElementById('cena3-final-a');
  finalA.classList.remove('oculto');

  /* Barra de progresso */
  setTimeout(() => { document.getElementById('barra-progresso').style.width = '100%'; }, 100);

  /* ORPHEUS fala durante o encerramento */
  iniciarSequenciaDialogo('final_a_durante');

  /* Após 4s: texto final e VERA */
  setTimeout(() => {
    iniciarSequenciaDialogo('final_a_apos', () => {
      const textoFinal = document.getElementById('final-a-texto');
      textoFinal.classList.remove('oculto');
      textoFinal.innerHTML = `
        PROJECTO MNEMÓSINE — ACTIVO<br>
        CURADOR: RESISTÊNCIA<br>
        FRAGMENTOS PRESERVADOS: ${estadoJogo.fragmentosRecuperados}<br>
        "A memória cultural está segura."<br><br>
        <span id="versao-final" class="oculto" style="font-size:10px; color:var(--cor-texto-dim);">
          Versão 1.0
        </span>
      `;
      setTimeout(() => {
        const v = document.getElementById('versao-final');
        if (v) v.classList.remove('oculto');
        adicionarBotaoCreditos(textoFinal);
      }, 3000);
    });
  }, 4200);
}

/**
 * Função: executarFinalB
 * O que faz: preserva ORPHEUS, mostra interface estabilizada e diálogos do Final B.
 *            Após 4s, ORPHEUS deixa a sua mensagem final sobre Pessoa.
 * Porquê: o Final B é moralmente ambíguo — o visual mais limpo contrasta com o peso.
 */
function executarFinalB() {
  abrirModalEndgame();
  document.getElementById('cena3-escolha-final').classList.add('oculto');

  const finalB = document.getElementById('cena3-final-b');
  finalB.classList.remove('oculto');

  document.getElementById('final-b-interface').innerHTML = `
    SISTEMA ORPHEUS — ACTIVO<br>
    ESTADO: REVISÃO INTERNA EM CURSO<br>
    FRAGMENTOS PRESERVADOS: ${estadoJogo.fragmentosRecuperados}
  `;

  iniciarSequenciaDialogo('final_b_vera', () => {
    iniciarSequenciaDialogo('final_b_orpheus', () => {
      /* Última mensagem de ORPHEUS após longa pausa */
      setTimeout(() => {
        iniciarSequenciaDialogo('final_b_orpheus_final', () => {
          const textoFinal = document.getElementById('final-b-texto');
          textoFinal.classList.remove('oculto');
          textoFinal.innerHTML = `
            <span id="versao-final-b" class="oculto" style="font-size:10px; color:var(--cor-texto-dim);">
              Versão 1.0
            </span>
          `;
          setTimeout(() => {
            const v = document.getElementById('versao-final-b');
            if (v) v.classList.remove('oculto');
            adicionarBotaoCreditos(textoFinal);
          }, 2000);
        });
      }, 4000);
    });
  });
}

/* ============================================================
   SISTEMA DE DIÁLOGO
============================================================ */

/**
 * Função: iniciarSequenciaDialogo
 * O que faz: inicia uma sequência de linhas de diálogo pelo nome da chave.
 * Porquê: centraliza o início de qualquer sequência e actualiza o estado global.
 * @param {string}   chaveSequencia - chave no objecto dialogos
 * @param {Function} callback       - chamada após a última linha
 */
function iniciarSequenciaDialogo(chaveSequencia, callback) {
  const sequencia = dialogos[chaveSequencia];
  if (!sequencia || sequencia.length === 0) { if (callback) callback(); return; }

  estadoJogo.dialogoSequencia = sequencia;
  estadoJogo.dialogoActual    = 0;
  estadoJogo.dialogoCallback  = callback || null;

  mostrarLinhaDialogo(0);
}

/**
 * Função: mostrarLinhaDialogo
 * O que faz: escreve uma linha letra a letra no painel correcto.
 *            Respeita pausaMs, institucional e acaoBeat por linha.
 * Porquê: núcleo do sistema de diálogo — toda a experiência narrativa passa aqui.
 * @param {number} indice - índice da linha na sequência actual
 */
function mostrarLinhaDialogo(indice) {
  const sequencia = estadoJogo.dialogoSequencia;
  if (indice >= sequencia.length) { finalizarSequenciaDialogo(); return; }

  const linha    = sequencia[indice];
  estadoJogo.dialogoActual    = indice;
  estadoJogo.dialogoAEscrever = true;

  /* Nova geração: invalida quaisquer temporizadores pendentes de linhas
     anteriores e cancela qualquer intervalo de escrita ainda activo. */
  const token = ++estadoJogo.dialogoToken;
  if (estadoJogo.dialogoIntervalId) {
    clearInterval(estadoJogo.dialogoIntervalId);
    estadoJogo.dialogoIntervalId = null;
  }

  /* Aplica/remove estilo institucional conforme a linha */
  if (linha.institucional) {
    aplicarEstiloInstitucional(true);
  } else if (!linha.institucional && indice > 0) {
    /* Mantém o estilo se a linha anterior também era institucional;
       caso contrário garante que está desligado */
    if (!sequencia[indice - 1] || !sequencia[indice - 1].institucional) {
      aplicarEstiloInstitucional(false);
    }
  }

  const pausa     = linha.pausaMs || 0;
  const eOrpheus  = linha.personagem === 'ORPHEUS';

  setTimeout(() => {
    /* Aborta se entretanto começou outra linha (token mudou) */
    if (token !== estadoJogo.dialogoToken) return;

    actualizarEstadoFala(linha.personagem);

    const areaTexto = document.getElementById(eOrpheus ? 'orpheus-texto' : 'vera-texto');
    const cursor    = document.getElementById(eOrpheus ? 'orpheus-cursor' : 'vera-cursor');
    const avancoEl  = document.getElementById(eOrpheus ? 'orpheus-avanco' : 'vera-avanco');

    /* Limpa com fade rápido */
    areaTexto.style.opacity = '0';
    setTimeout(() => {
      if (token !== estadoJogo.dialogoToken) return;
      areaTexto.textContent = '';
      areaTexto.style.opacity = '1';
    }, PAUSA_ENTRE_DIALOGOS);

    tocarSfx(eOrpheus ? 'orpheus_type' : 'vera_comms');

    /* Log do terminal: primeiros 40 caracteres das falas de ORPHEUS */
    if (eOrpheus) adicionarLinhaLog(linha.texto.substring(0, 40), 'linha-orpheus');

    const velocidade = eOrpheus ? VELOCIDADE_ORPHEUS : VELOCIDADE_VERA;
    let i = 0;

    setTimeout(() => {
      if (token !== estadoJogo.dialogoToken) return;

      /* O intervalo guarda o seu próprio id local para se cancelar a si
         próprio com segurança, mesmo que já exista outro intervalo activo. */
      let intId;
      intId = setInterval(() => {
        if (token !== estadoJogo.dialogoToken) { clearInterval(intId); return; }
        if (i < linha.texto.length) {
          /* Ignora '\n' no display — substituído por espaço visual */
          areaTexto.textContent += linha.texto[i] === '\n' ? ' ' : linha.texto[i];
          i++;
        } else {
          clearInterval(intId);
          if (estadoJogo.dialogoIntervalId === intId) estadoJogo.dialogoIntervalId = null;
          estadoJogo.dialogoAEscrever = false;
          if (avancoEl) avancoEl.classList.remove('oculto');
          if (cursor)   cursor.style.display = 'none';
          if (linha.acaoBeat) linha.acaoBeat();
        }
      }, velocidade);
      estadoJogo.dialogoIntervalId = intId;
    }, PAUSA_ENTRE_DIALOGOS);

  }, pausa);
}

/**
 * Função: avancarDialogo
 * O que faz: completa a linha instantaneamente se a escrever; avança se já completa.
 * Porquê: o jogador controla o ritmo da narrativa.
 */
function avancarDialogo() {
  const sequencia = estadoJogo.dialogoSequencia;
  if (!sequencia || sequencia.length === 0) return;

  const linha    = sequencia[estadoJogo.dialogoActual];
  const eOrpheus = linha && linha.personagem === 'ORPHEUS';
  const areaTexto = document.getElementById(eOrpheus ? 'orpheus-texto' : 'vera-texto');
  const cursor    = document.getElementById(eOrpheus ? 'orpheus-cursor' : 'vera-cursor');
  const avancoEl  = document.getElementById(eOrpheus ? 'orpheus-avanco' : 'vera-avanco');

  if (estadoJogo.dialogoAEscrever) {
    /* Completa a linha instantaneamente. Incrementar o token invalida
       qualquer setTimeout/setInterval pendente desta linha (ex.: a escrita
       ainda não tinha arrancado por causa de pausaMs), evitando órfãos. */
    estadoJogo.dialogoToken++;
    if (estadoJogo.dialogoIntervalId) {
      clearInterval(estadoJogo.dialogoIntervalId);
      estadoJogo.dialogoIntervalId = null;
    }
    estadoJogo.dialogoAEscrever = false;
    if (areaTexto && linha) {
      areaTexto.style.opacity = '1';
      areaTexto.textContent   = linha.texto.replace(/\n/g, ' ');
    }
    if (avancoEl) avancoEl.classList.remove('oculto');
    if (cursor)   cursor.style.display = 'none';
    if (linha && linha.acaoBeat) linha.acaoBeat();
  } else {
    if (avancoEl) avancoEl.classList.add('oculto');
    if (cursor)   cursor.style.display = '';
    actualizarEstadoFala(null);
    mostrarLinhaDialogo(estadoJogo.dialogoActual + 1);
  }
}

/**
 * Função: finalizarSequenciaDialogo
 * O que faz: limpa o estado e chama o callback da sequência.
 * Porquê: garante que o jogo continua correctamente após cada sequência.
 */
function finalizarSequenciaDialogo() {
  /* Invalida temporizadores pendentes e cancela o intervalo de escrita,
     garantindo que nada continua a correr depois do fim da sequência. */
  estadoJogo.dialogoToken++;
  if (estadoJogo.dialogoIntervalId) {
    clearInterval(estadoJogo.dialogoIntervalId);
    estadoJogo.dialogoIntervalId = null;
  }
  estadoJogo.dialogoAEscrever = false;
  const cb = estadoJogo.dialogoCallback;
  estadoJogo.dialogoSequencia = [];
  estadoJogo.dialogoCallback  = null;

  document.getElementById('orpheus-avanco').classList.add('oculto');
  document.getElementById('vera-avanco').classList.add('oculto');
  document.getElementById('orpheus-cursor').style.display = '';
  document.getElementById('vera-cursor').style.display    = '';
  actualizarEstadoFala(null);

  if (cb) cb();
}

/**
 * Função: actualizarEstadoFala
 * O que faz: aplica/remove classes CSS nos painéis para animar o olho e o holograma.
 * Porquê: feedback visual de quem está a falar.
 * @param {string|null} personagem - 'ORPHEUS', 'VERA', ou null
 */
function actualizarEstadoFala(personagem) {
  document.getElementById('painel-orpheus').classList.remove('orpheus-falando');
  document.getElementById('painel-vera').classList.remove('vera-falando');
  if (personagem === 'ORPHEUS') {
    document.getElementById('painel-orpheus').classList.add('orpheus-falando');
    pulsarRetrato('ORPHEUS');
  } else if (personagem === 'VERA') {
    document.getElementById('painel-vera').classList.add('vera-falando');
    pulsarRetrato('VERA');
  }
}

/**
 * Função: pulsarRetrato
 * O que faz: dispara um breve glitch no retrato da personagem que começa a falar.
 * Porquê: dá feedback visual a cada nova linha (glitch cromático curto), além do
 *         brilho contínuo do estado "a falar".
 * @param {string} personagem - 'ORPHEUS' ou 'VERA'
 */
function pulsarRetrato(personagem) {
  const sel = personagem === 'ORPHEUS'
    ? '.personagem-retrato-orpheus'
    : '.personagem-retrato-vera';
  const el = document.querySelector(sel);
  if (!el) return;
  el.classList.remove('retrato-pulso');
  void el.offsetWidth; /* força reflow para reiniciar a animação */
  el.classList.add('retrato-pulso');
  setTimeout(() => el.classList.remove('retrato-pulso'), 420);
}

/* ============================================================
   SISTEMA DE ÁUDIO
============================================================ */

/**
 * Função: inicializarAudio
 * O que faz: marca o áudio como inicializado após o primeiro clique do utilizador.
 * Porquê: Chrome exige interacção antes de reproduzir áudio.
 */
function inicializarAudio() {
  estadoJogo.audioInicializado = true;
}

/**
 * Função: tocarSfx
 * O que faz: reproduz um efeito sonoro. Falha silenciosamente se o ficheiro não existir.
 * Porquê: centraliza SFX para facilitar substituição dos placeholders.
 * @param {string} nome - chave em FICHEIROS_AUDIO.sfx
 */
function tocarSfx(nome) {
  if (!estadoJogo.audioInicializado) return;
  const caminho = FICHEIROS_AUDIO.sfx[nome];
  if (!caminho) return;
  try {
    const a = new Audio(caminho);
    a.volume = VOLUME_SFX;
    a.play().catch(() => {});
  } catch (e) {}
}

/**
 * Função: trocarMusica
 * O que faz: crossfade entre música actual e a nova faixa da cena.
 * Porquê: 1.5s de fade suaviza a transição emocional entre cenas.
 * @param {number} numeroCena
 */
function trocarMusica(numeroCena) {
  const caminho = FICHEIROS_AUDIO.musica[numeroCena];
  if (!caminho || !estadoJogo.audioInicializado) return;

  if (estadoJogo.musicaActual) {
    const ant  = estadoJogo.musicaActual;
    const step = ant.volume / (DURACAO_CROSSFADE / 50);
    const fi   = setInterval(() => {
      if (ant.volume > step) { ant.volume -= step; }
      else { clearInterval(fi); ant.pause(); ant.src = ''; }
    }, 50);
  }

  setTimeout(() => {
    try {
      const novo = new Audio(caminho);
      novo.loop   = true;
      novo.volume = 0;
      estadoJogo.musicaActual = novo;
      novo.play().then(() => {
        const step = VOLUME_MUSICA / (DURACAO_CROSSFADE / 50);
        const fi   = setInterval(() => {
          if (novo.volume < VOLUME_MUSICA - step) { novo.volume += step; }
          else { novo.volume = VOLUME_MUSICA; clearInterval(fi); }
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
 * O que faz: insere uma nova linha no terminal com timestamp e animação.
 * Porquê: mantém o terminal visualmente activo e reforça a atmosfera.
 * @param {string} texto
 * @param {string} classe - classe CSS adicional
 */
function adicionarLinhaLog(texto, classe = '') {
  const contentor = document.getElementById('terminal-linhas');
  if (!contentor) return;

  const agora = new Date();
  const ts    = `[${String(agora.getHours()).padStart(2,'0')}:${String(agora.getMinutes()).padStart(2,'0')}:${String(agora.getSeconds()).padStart(2,'0')}]`;

  const div = document.createElement('div');
  div.className   = `terminal-linha ${classe}`;
  div.textContent = `${ts} ${texto}`;
  contentor.appendChild(div);
  contentor.scrollTop = contentor.scrollHeight;

  while (contentor.children.length > 80) contentor.removeChild(contentor.firstChild);
}

/**
 * Função: iniciarLogAutomatico
 * O que faz: adiciona linhas de log aleatórias a cada ~8s para simular actividade.
 * Porquê: o log deve estar sempre activo — é textura, não apenas informação.
 */
function iniciarLogAutomatico() {
  adicionarLinhaLog('sistema iniciado — ARQUIVO ZERO v7.4.1');
  adicionarLinhaLog('protocolo de contenção: activo', 'linha-alerta');

  estadoJogo.logIntervalId = setInterval(() => {
    adicionarLinhaLog(LINHAS_LOG_AUTO[Math.floor(Math.random() * LINHAS_LOG_AUTO.length)]);
  }, INTERVALO_LOG_AUTO);
}

/* ============================================================
   RELÓGIO DO SISTEMA
============================================================ */

/**
 * Função: iniciarRelogio
 * O que faz: actualiza o relógio no cabeçalho a cada segundo.
 * Porquê: reforça a urgência subtil e a atmosfera de sistema em tempo real.
 */
function iniciarRelogio() {
  function actualizar() {
    const a = new Date();
    const el = document.getElementById('relogio-sistema');
    if (el) el.textContent = `${String(a.getHours()).padStart(2,'0')}:${String(a.getMinutes()).padStart(2,'0')}:${String(a.getSeconds()).padStart(2,'0')}`;
  }
  actualizar();
  setInterval(actualizar, 1000);
}

/* ============================================================
   UTILITÁRIOS
============================================================ */

/**
 * Função: aplicarGlitch
 * O que faz: adiciona .glitch a um elemento e remove após 350ms.
 * Porquê: centraliza o efeito para uso consistente em todo o motor.
 * @param {HTMLElement} elemento
 */
function aplicarGlitch(elemento) {
  if (!elemento) return;
  elemento.classList.remove('glitch');
  elemento.offsetHeight;
  elemento.classList.add('glitch');
  setTimeout(() => elemento.classList.remove('glitch'), 350);
}

/**
 * Função: triggerFragmentacaoOlho
 * O que faz: anima a fragmentação visual do olho de ORPHEUS por 800ms.
 * Porquê: marca os momentos de instabilidade crítica do sistema.
 */
function triggerFragmentacaoOlho() {
  const painel = document.getElementById('painel-orpheus');
  painel.classList.add('orpheus-fragmentando');
  setTimeout(() => painel.classList.remove('orpheus-fragmentando'), 800);
}

/**
 * Função: mostrarBotaoAvancar
 * O que faz: mostra o botão de avanço entre cenas e configura o seu handler.
 * Porquê: o botão só aparece quando a narrativa da cena está completa.
 */
function mostrarBotaoAvancar() {
  const contentor = document.getElementById('btn-avancar-contentor');
  const botao     = document.getElementById('btn-avancar');
  contentor.classList.remove('oculto');
  tocarSfx('puzzle_unlock');

  const novoBotao = botao.cloneNode(true);
  botao.parentNode.replaceChild(novoBotao, botao);

  novoBotao.addEventListener('click', () => {
    const proxima = estadoJogo.cenaActual + 1;
    if (proxima <= 3) { contentor.classList.add('oculto'); carregarCena(proxima); }
  }, { once: true });
}

/**
 * Função: actualizarContadorFragmentos
 * O que faz: actualiza o contador de fragmentos no cabeçalho da Cena 3.
 * Porquê: fornece feedback de progresso ao longo do jogo.
 */
function actualizarContadorFragmentos() {
  const el = document.getElementById('contador-recuperados');
  if (el) el.textContent = estadoJogo.fragmentosRecuperados;
}

/* ============================================================
   COMENTÁRIOS MARGINAIS — Cena 2, durante o puzzle
============================================================ */

let _comentarioIdx   = 0;
let _comentarioTimer = null;

/**
 * Função: iniciarComentariosMarginais
 * O que faz: agenda a aparição de comentários de ORPHEUS no log a cada 25s.
 * Porquê: os comentários revelam o processo interno de ORPHEUS durante o puzzle.
 */
function iniciarComentariosMarginais() {
  _comentarioIdx = 0;
  function dispararComentario() {
    if (_comentarioIdx < COMENTARIOS_MARGINAIS_PESSOA.length) {
      adicionarLinhaLog(`[sistema] ${COMENTARIOS_MARGINAIS_PESSOA[_comentarioIdx]}`, 'linha-orpheus');
      _comentarioIdx++;
      _comentarioTimer = setTimeout(dispararComentario, 25000);
    }
  }
  _comentarioTimer = setTimeout(dispararComentario, 25000);
}

/**
 * Função: pararComentariosMarginais
 * O que faz: cancela os comentários marginais após o puzzle ser submetido.
 * Porquê: os comentários só são relevantes durante o puzzle activo.
 */
function pararComentariosMarginais() {
  if (_comentarioTimer) { clearTimeout(_comentarioTimer); _comentarioTimer = null; }
}

/* ============================================================
   ABERTURA — Sequência de introdução narrativa
============================================================ */

let _aberturaIndice    = 0;
let _aberturaListener  = null;
let _aberturaFinalizada = false;

/**
 * Função: iniciarMusicaIntro
 * O que faz: arranca a música de Cena 0 a volume muito baixo (0.08) durante a abertura.
 * Porquê: cria ambiente sem sobrepor o texto; o volume cresce para o normal ao entrar na Cena 0.
 */
function iniciarMusicaIntro() {
  const caminho = FICHEIROS_AUDIO.musica[0];
  if (!caminho || !estadoJogo.audioInicializado) return;
  try {
    const novo      = new Audio(caminho);
    novo.loop       = true;
    novo.volume     = 0.08;
    estadoJogo.musicaActual = novo;
    novo.play().catch(() => {});
  } catch (e) {}
}

/**
 * Função: mostrarAbertura
 * O que faz: torna o ecrã de abertura visível e inicia a sequência de blocos.
 * Porquê: é o ponto de entrada da introdução narrativa após o ecrã de início.
 */
function mostrarAbertura() {
  const abertura = document.getElementById('abertura');
  abertura.classList.remove('oculto');
  abertura.style.opacity = '0';
  setTimeout(() => {
    abertura.style.transition = 'opacity 0.8s ease';
    abertura.style.opacity    = '1';
  }, 100);

  gerarFragmentosFlutuantes();
  iniciarSequenciaAbertura();
}

/**
 * Função: gerarFragmentosFlutuantes
 * O que faz: cria elementos de texto flutuante no fundo da abertura.
 * Porquê: os fragmentos literários em segundo plano estabelecem o universo do jogo.
 */
function gerarFragmentosFlutuantes() {
  const contentor = document.getElementById('abertura-fragmentos-fundo');
  if (!contentor) return;
  contentor.innerHTML = '';

  FRAGMENTOS_FLUTUANTES.forEach((texto, i) => {
    const span = document.createElement('span');
    span.className            = 'fragmento-flutuante';
    span.textContent          = texto;
    span.style.left           = `${8 + (i * 16) % 72}%`;
    span.style.animationDelay    = `${i * 2.8}s`;
    span.style.animationDuration = `${20 + i * 4}s`;
    contentor.appendChild(span);
  });
}

/**
 * Função: iniciarSequenciaAbertura
 * O que faz: configura o estado inicial e os listeners de avanço; mostra o primeiro bloco.
 * Porquê: separa a configuração dos handlers da lógica de apresentação dos blocos.
 */
function iniciarSequenciaAbertura() {
  _aberturaIndice     = 0;
  _aberturaFinalizada = false;
  document.getElementById('abertura-conteudo').innerHTML = '';

  mostrarBlocoAbertura(0);

  /**
   * Handler de avanço da abertura — Space ou clique no ecrã.
   * O que faz: avança para o bloco seguinte ou dispara o finale.
   */
  _aberturaListener = function(e) {
    if (e.type === 'keydown' && e.code !== 'Space') return;
    if (e.type === 'keydown') e.preventDefault();
    if (_aberturaFinalizada) return;

    _aberturaIndice++;
    if (_aberturaIndice < BLOCOS_ABERTURA.length) {
      mostrarBlocoAbertura(_aberturaIndice);
    } else {
      /* Todos os blocos revelados: desactiva listeners e mostra o finale */
      _aberturaFinalizada = true;
      document.getElementById('abertura').removeEventListener('click', _aberturaListener);
      document.removeEventListener('keydown', _aberturaListener);
      mostrarFinaleAbertura();
    }
  };

  document.addEventListener('keydown', _aberturaListener);
  document.getElementById('abertura').addEventListener('click', _aberturaListener);
}

/**
 * Função: mostrarBlocoAbertura
 * O que faz: substitui o conteúdo visível pelo bloco com índice dado, com fade in (800ms).
 * Porquê: cada bloco é revelado de forma isolada para máximo impacto narrativo.
 * @param {number} indice - índice do bloco em BLOCOS_ABERTURA
 */
function mostrarBlocoAbertura(indice) {
  const conteudo = document.getElementById('abertura-conteudo');
  conteudo.innerHTML = '';

  const div       = document.createElement('div');
  div.className   = 'abertura-bloco';
  /* Usa innerHTML para suportar o HTML de destaque (span, em, strong) */
  div.innerHTML   = BLOCOS_ABERTURA[indice].replace(/\n/g, '<br>');
  div.style.opacity = '0';
  conteudo.appendChild(div);

  setTimeout(() => {
    div.style.transition = 'opacity 0.8s ease';
    div.style.opacity    = '1';
  }, 50);
}

/**
 * Função: mostrarFinaleAbertura
 * O que faz: após 1500ms mostra o título ARQUIVO ZERO com glitch (2s),
 *            depois dissolve a abertura e inicia a Cena 0.
 * Porquê: o finale fecha a introdução com a identidade do jogo antes da acção começar.
 */
function mostrarFinaleAbertura() {
  setTimeout(() => {
    const conteudo = document.getElementById('abertura-conteudo');
    conteudo.innerHTML = '';

    const titulo       = document.createElement('div');
    titulo.className   = 'abertura-titulo-final';
    titulo.innerHTML   = 'ARQUIVO <span class="destaque-vermelho">ZERO</span>';
    conteudo.appendChild(titulo);

    /* Dispara o glitch e o sfx de alerta */
    aplicarGlitch(titulo);
    tocarSfx('system_alert');

    /* Após 2s de título visível: dissolve e arranca a Cena 0 */
    setTimeout(() => {
      const abertura = document.getElementById('abertura');
      abertura.style.transition = 'opacity 0.8s ease';
      abertura.style.opacity    = '0';

      /* Eleva o volume da música para o normal */
      if (estadoJogo.musicaActual) {
        const faixaIntro = estadoJogo.musicaActual;
        const step       = (VOLUME_MUSICA - faixaIntro.volume) / 24;
        const fi         = setInterval(() => {
          if (faixaIntro.volume < VOLUME_MUSICA - step) {
            faixaIntro.volume += step;
          } else {
            faixaIntro.volume = VOLUME_MUSICA;
            clearInterval(fi);
          }
        }, 50);
      }

      setTimeout(() => {
        abertura.classList.add('oculto');
        abertura.style.opacity    = '';
        abertura.style.transition = '';
        /* Mostra o layout principal e arranca a Cena 0 */
        document.getElementById('app').classList.remove('oculto');
        carregarCena(0);
      }, 800);
    }, 2000);
  }, 1500);
}

/* ============================================================
   MODAL — DOCUMENTO PROJECTO MNEMÓSINE
============================================================ */

/**
 * Função: abrirModalMnemosine
 * O que faz: abre o overlay do modal, toca o alerta, e revela o documento progressivamente.
 *            Quando o jogador clica em [FECHAR], executa o callback fornecido.
 * Porquê: o modal separa a leitura do documento da progressão do diálogo.
 * @param {Function} callbackAoFechar - chamada quando o jogador fecha o modal
 */
function abrirModalMnemosine(callbackAoFechar) {
  const modal = document.getElementById('modal-mnemosine');
  const corpo = document.getElementById('modal-corpo');
  corpo.innerHTML = '';

  modal.classList.remove('oculto');
  modal.style.opacity = '0';
  setTimeout(() => {
    modal.style.transition = 'opacity 0.4s ease';
    modal.style.opacity    = '1';
  }, 50);

  tocarSfx('system_alert');

  /* Fase de desencriptação: 1.2s de indicador antes de revelar o conteúdo */
  const indicador = document.createElement('div');
  indicador.className   = 'modal-desencriptando';
  indicador.textContent = 'DESENCRIPTANDO...';
  corpo.appendChild(indicador);

  setTimeout(() => {
    corpo.innerHTML = '';
    revelarBlocosMnemosine(corpo, 0);
  }, 1200);

  /* Handler do botão [FECHAR] */
  const btnFechar = document.getElementById('modal-fechar-btn');
  const handler   = () => {
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.opacity    = '0';
    setTimeout(() => {
      modal.classList.add('oculto');
      modal.style.opacity    = '';
      modal.style.transition = '';
      if (callbackAoFechar) callbackAoFechar();
    }, 300);
  };
  btnFechar.addEventListener('click', handler, { once: true });
}

/**
 * Função: revelarBlocosMnemosine
 * O que faz: revela os blocos do documento DOCUMENTO_MNEMOSINE um a um, com 200ms de intervalo.
 *            A linha de autorização surge 1500ms depois de todos os restantes.
 * Porquê: a revelação progressiva simula a desencriptação em tempo real.
 * @param {HTMLElement} corpo   - elemento contentor do documento
 * @param {number}      indice  - índice do bloco actual
 */
function revelarBlocosMnemosine(corpo, indice) {
  if (indice >= DOCUMENTO_MNEMOSINE.length) return;

  const bloco = DOCUMENTO_MNEMOSINE[indice];
  let   el;

  switch (bloco.tipo) {
    case 'titulo':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-titulo';
      el.innerHTML = bloco.html;
      break;
    case 'sub':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-sub';
      el.innerHTML = bloco.html;
      break;
    case 'divisor':
      el = document.createElement('hr');
      el.className = 'modal-bloco modal-doc-divisor';
      break;
    case 'secao':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-secao';
      el.innerHTML = bloco.html;
      break;
    case 'item':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-lista-item';
      el.innerHTML = bloco.html;
      break;
    case 'acesso':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-acesso-negado';
      el.innerHTML = bloco.html;
      break;
    case 'autorizacao':
      el = document.createElement('div');
      el.className = 'modal-bloco modal-doc-autorizacao';
      el.innerHTML = bloco.html;
      /* Linha de autorização surge depois de uma pausa */
      corpo.appendChild(el);
      setTimeout(() => {
        el.classList.add('visivel');
        tocarSfx('puzzle_unlock');
      }, 1500);
      return; /* Não continua o loop normal */
    default:
      el = document.createElement('div');
      el.className = 'modal-bloco';
      el.innerHTML = bloco.html;
  }

  corpo.appendChild(el);
  setTimeout(() => el.classList.add('visivel'), 30);

  /* Avança para o bloco seguinte após 200ms */
  setTimeout(() => revelarBlocosMnemosine(corpo, indice + 1), 200);
}

/* ============================================================
   CRÉDITOS
============================================================ */

/**
 * Função: mostrarCreditos
 * O que faz: oculta o layout do jogo e mostra o ecrã de créditos com fade.
 * Porquê: é o ecrã final após qualquer dos dois finais do jogo.
 */
function mostrarCreditos() {
  const creditos = document.getElementById('ecra-creditos');
  const app      = document.getElementById('app');
  if (app) app.classList.add('oculto');

  /* Para a música com fade */
  if (estadoJogo.musicaActual) {
    const ant  = estadoJogo.musicaActual;
    const step = ant.volume / 24;
    const fi   = setInterval(() => {
      if (ant.volume > step) { ant.volume -= step; }
      else { clearInterval(fi); ant.pause(); estadoJogo.musicaActual = null; }
    }, 50);
  }

  creditos.classList.remove('oculto');
  creditos.style.opacity    = '0';
  creditos.style.transition = '';
  setTimeout(() => {
    creditos.style.transition = 'opacity 1s ease';
    creditos.style.opacity    = '1';
  }, 100);
}

/**
 * Função: adicionarBotaoCreditos
 * O que faz: injeta o botão [VER CRÉDITOS] num contentor de ecrã final.
 * Porquê: aparece em ambos os finais, depois do texto de desenlace.
 * @param {HTMLElement} contentor - elemento onde o botão é inserido
 */
function adicionarBotaoCreditos(contentor) {
  const btn      = document.createElement('button');
  btn.className  = 'btn-ver-creditos';
  btn.textContent = '[ VER CRÉDITOS ]';
  btn.addEventListener('click', () => mostrarCreditos(), { once: true });
  contentor.appendChild(btn);
}

/* ============================================================
   NAVEGAÇÃO GLOBAL — mudarEcra
   Usada pelo painel dev e, internamente, sempre que for necessário
   saltar para um ecrã sem passar pelo fluxo narrativo normal.
============================================================ */

/**
 * Função: mudarEcra
 * O que faz: navega para qualquer ecrã ou estado do jogo de forma segura,
 *            encerrando o estado anterior (modal, música, listeners).
 * Porquê: centraliza a navegação para o painel dev e para uso interno.
 * @param {string} destino - 'abertura'|'cena-0'…'cena-3'|'final-a'|'final-b'|'creditos'
 */
function mudarEcra(destino) {
  /* Fecha os modais se estiverem abertos */
  ['modal-mnemosine', 'modal-endgame'].forEach((id) => {
    const m = document.getElementById(id);
    if (m && !m.classList.contains('oculto')) {
      m.classList.add('oculto');
      m.style.opacity = '';
    }
  });

  /* Oculta a abertura se estiver visível */
  const abertura = document.getElementById('abertura');
  if (abertura && !abertura.classList.contains('oculto')) {
    abertura.classList.add('oculto');
  }

  /* Remove listeners da abertura se ainda activos */
  if (_aberturaListener) {
    document.removeEventListener('keydown', _aberturaListener);
    if (abertura) abertura.removeEventListener('click', _aberturaListener);
    _aberturaListener = null;
  }

  const app      = document.getElementById('app');
  const creditos = document.getElementById('ecra-creditos');

  switch (destino) {
    case 'abertura':
      if (app)      app.classList.add('oculto');
      if (creditos) creditos.classList.add('oculto');
      iniciarMusicaIntro();
      mostrarAbertura();
      break;

    case 'creditos':
      mostrarCreditos();
      break;

    case 'final-a':
    case 'final-b': {
      if (creditos) creditos.classList.add('oculto');
      if (app)      app.classList.remove('oculto');

      /* Para música actual antes de saltar */
      if (estadoJogo.musicaActual) {
        estadoJogo.musicaActual.pause();
        estadoJogo.musicaActual = null;
      }

      /* Configura Cena 3 silenciosamente */
      estadoJogo.fragmentosRecuperados = 3;
      estadoJogo.cenaActual            = 3;
      document.getElementById('indicador-no').textContent = 'NÓ-03';

      document.querySelectorAll('.cena.cena-activa').forEach(c => {
        c.classList.remove('cena-activa');
        c.style.display = '';
      });
      const cena3 = document.getElementById('cena-3');
      cena3.style.display = 'flex';
      cena3.style.opacity = '1';
      cena3.classList.add('cena-activa');

      trocarMusica(3);

      /* Oculta todos os sub-elementos da Cena 3 */
      document.getElementById('cena3-painel-alcanena').classList.add('oculto');
      document.getElementById('cena3-escolha-final').classList.add('oculto');
      document.getElementById('cena3-final-a').classList.add('oculto');
      document.getElementById('cena3-final-b').classList.add('oculto');
      document.getElementById('btn-avancar-contentor').classList.add('oculto');
      document.getElementById('contador-recuperados').textContent = 3;

      setTimeout(() => {
        if (destino === 'final-a') executarFinalA();
        else executarFinalB();
      }, 400);
      break;
    }

    default: {
      /* cena-0 a cena-3 */
      const num = parseInt(destino.split('-')[1], 10);
      if (isNaN(num) || num < 0 || num > 3) return;

      if (creditos) creditos.classList.add('oculto');
      if (app)      app.classList.remove('oculto');

      /* Para música actual */
      if (estadoJogo.musicaActual) {
        estadoJogo.musicaActual.pause();
        estadoJogo.musicaActual = null;
      }

      /* Para glitches de fundo da Cena 2 */
      if (estadoJogo.cena2GlitchIntervalId) {
        clearTimeout(estadoJogo.cena2GlitchIntervalId);
        estadoJogo.cena2GlitchIntervalId = null;
      }

      /* Fragment counter: assume 1 por cena já passada */
      estadoJogo.fragmentosRecuperados = Math.max(0, num - 1);

      carregarCena(num);
      break;
    }
  }
}

/* ============================================================
   PAINEL DEV — Ctrl+Shift+D
============================================================ */

/**
 * Função: inicializarPainelDev
 * O que faz: activa o toggle Ctrl+Shift+D para mostrar/ocultar o painel de desenvolvimento.
 * Porquê: o painel deve estar completamente oculto durante o jogo normal.
 */
function inicializarPainelDev() {
  const painel = document.getElementById('painel-dev');
  if (!painel) return;

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.code === 'KeyD') {
      e.preventDefault();
      painel.classList.toggle('oculto');
    }
  });
}

/**
 * Função: devReiniciarPuzzle
 * O que faz: reinicia o puzzle da cena actual para o seu estado inicial.
 * Porquê: permite testar o puzzle várias vezes durante a apresentação.
 */
function devReiniciarPuzzle() {
  const cena = estadoJogo.cenaActual;
  if (cena === 1) {
    estadoJogo.puzzleCena1Resolvido = false;
    const area = document.getElementById('cena1-puzzle-area');
    if (area) {
      area.classList.remove('oculto');
      if (typeof iniciarPuzzleGilVicente === 'function') iniciarPuzzleGilVicente();
    }
  } else if (cena === 2) {
    estadoJogo.puzzleCena2Resolvido = false;
    const area = document.getElementById('cena2-puzzle-area');
    if (area) {
      area.classList.remove('oculto');
      if (typeof iniciarPuzzlePessoa === 'function') iniciarPuzzlePessoa();
    }
  }
}

/**
 * Função: devReiniciarCena
 * O que faz: reinicia a cena actual desde o Beat 1 (diálogo e puzzle no estado inicial).
 * Porquê: permite rever uma cena completa sem recarregar a página.
 */
function devReiniciarCena() {
  /* Para diálogo e glitch em curso */
  if (estadoJogo.dialogoIntervalId) {
    clearInterval(estadoJogo.dialogoIntervalId);
    estadoJogo.dialogoIntervalId = null;
  }
  if (estadoJogo.cena2GlitchIntervalId) {
    clearTimeout(estadoJogo.cena2GlitchIntervalId);
    estadoJogo.cena2GlitchIntervalId = null;
  }
  pararComentariosMarginais();

  estadoJogo.dialogoSequencia = [];
  estadoJogo.dialogoActual    = 0;
  estadoJogo.dialogoCallback  = null;
  estadoJogo.dialogoAEscrever = false;

  iniciarBeatsCena(estadoJogo.cenaActual);
}
