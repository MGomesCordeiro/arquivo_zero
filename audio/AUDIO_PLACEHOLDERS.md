# ARQUIVO ZERO — Ficheiros de Áudio Necessários

Todos os ficheiros abaixo estão em falta. Substituir antes da apresentação.
O jogo corre sem eles (falhas silenciosas), mas a experiência fica incompleta.

---

## SFX (Efeitos Sonoros) — pasta `sfx/`

| Ficheiro                  | Evento                              | Duração sugerida | Notas |
|---------------------------|-------------------------------------|------------------|-------|
| `orpheus_type.mp3`        | ORPHEUS começa a falar              | 0.5–1s           | Tom mecânico, metálico |
| `vera_comms.mp3`          | VERA começa a falar                 | 0.5–1s           | Tom de comunicações, limpo |
| `puzzle_correct.mp3`      | Puzzle resolvido correctamente      | 1–2s             | Positivo mas subtil |
| `puzzle_wrong.mp3`        | Puzzle submetido com erros          | 0.5–1s           | Erro discreto, não irritante |
| `puzzle_unlock.mp3`       | Botão de avanço desbloqueado        | 0.5–1s           | Click/unlock suave |
| `drag_pickup.mp3`         | Fragmento apanhado ao arrastar      | 0.1–0.3s         | Muito curto |
| `drag_drop.mp3`           | Fragmento largado numa zona         | 0.1–0.3s         | Muito curto |
| `scene_transition.mp3`    | Transição entre cenas               | 1–2s             | Glitch/sweep electrónico |
| `system_alert.mp3`        | Alerta do sistema (Cena 3)          | 1–2s             | Tom de aviso, não agressivo |
| `fragment_restore.mp3`    | Fragmento restaurado (Cena 0)       | 1–2s             | Tom de revelação, positivo |

---

## Música de Fundo — pasta `music/`

| Ficheiro                      | Cena                     | Tom sugerido                                         |
|-------------------------------|--------------------------|------------------------------------------------------|
| `scene0_infiltracao.mp3`      | Cena 0 — Infiltração     | Tensão, electrónico, cyberpunk discreto              |
| `scene1_gil_vicente.mp3`      | Cena 1 — Gil Vicente     | Opressivo, dourado/sombrio, quase religioso-corrupto |
| `scene2_pessoa.mp3`           | Cena 2 — Pessoa          | Fragmentado, instável, múltiplos temas               |
| `scene3_acto_final.mp3`       | Cena 3 — Acto Final      | Frio, etéreo, geológico — mais lento                 |

Volume de reprodução: 0.35 (definido em engine.js `VOLUME_MUSICA`).
Todas as faixas em loop contínuo. Crossfade de 1.5s entre cenas.

---

## Como criar placeholders silenciosos (se necessário)

Com FFmpeg instalado:
```
ffmpeg -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -q:a 9 -acodec libmp3lame audio/sfx/orpheus_type.mp3
```
Repetir para cada ficheiro com o nome e duração adequados.
