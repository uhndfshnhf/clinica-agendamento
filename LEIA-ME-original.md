# Quartier — modelo comercial premium

Landing page em português com hero em vídeo, apresentação editorial, seis procedimentos interativos, três comparadores antes/depois lado a lado no desktop, método, equipe editorial, depoimentos, galeria da clínica, FAQ, CTA, contato e rodapé. Site estático, sem dependências de execução ou formulário de coleta.

## Executar

Abra `dist/index.html` em um navegador ou sirva a pasta `dist` com qualquer servidor estático. Todos os arquivos necessários estão nessa pasta. O vídeo, de oito segundos, toca sem som e em loop; respeita movimentos reduzidos e pausa quando a hero sai da tela. Uma imagem de apoio mantém a composição durante o carregamento.

## Personalizar para o cliente

Edite somente `dist/config.js` para trocar marca, logo, cores, WhatsApp, telefone, Instagram, endereço, horários, Google Maps, profissionais, procedimentos, depoimentos, fotografias e casos antes/depois. Os comentários no arquivo indicam o formato de cada campo.

- `whatsapp`: número REAL, somente dígitos, com país e DDD. Vazio mantém um aviso no lugar de abrir um número fictício. Mensagens são personalizadas por origem e procedimento.
- `phone` e `instagramUrl`: preencher para transformar os textos demonstrativos em links reais.
- `mapEmbedUrl`: URL de incorporação do Google Maps (`https://www.google.com/maps/embed?...`).
- `googleReviewsUrl`: preencher para mostrar o link das avaliações reais.
- `team`: substituir nomes, especialidades, biografias, formação, registro e fotos pelos dados do cliente.
- `results`: inserir fotografias antes/depois autorizadas e comparáveis; definir `placeholder:false` em cada caso real.
- `gallery`: substituir as cinco imagens ilustrativas por fotos da própria clínica; `placeholder:false` já remove a etiqueta de reserva.
- `about.facts`: substituir `+500` pelo número comprovado do cliente.
- `testimonials`: exemplos demonstrativos, substituir por relatos autorizados.
- `legal`: textos de modelo para revisão conforme a operação da clínica.
- `demo:false`: remover as observações demonstrativas somente após a personalização.

Fotografias usam `{src:'assets/foto.webp',alt:'Descrição'}`. Os recortes antigos foram removidos. As dimensões dos 16 WebP estão em `PHOTO_DIMENSIONS` no premium.js. Para fotos próprias de outras dimensões, atualize essa tabela ou informe width e height no objeto da foto. Preserve retratos 4:5 e imagens horizontais 3:2.

## SEO

Title, description, Open Graph, favicon, idioma, viewport e headings configurados. O título e a descrição seguem o nome e a configuração da clínica. O endereço Open Graph no HTML deve ser ajustado quando mudar o domínio. O modelo não cria uma imagem social artificial.

Schema.org é emitido somente com `demo:false` e `seo.streetAddress` preenchido. Configure endereço e tipo do negócio (`LocalBusiness` ou `MedicalBusiness`) conforme a clínica real. Não há avaliações ou estatísticas fictícias em dados estruturados.

## Mídias

- `hero-video.mp4`: vídeo fornecido pelo usuário, otimizado de 3,2 MB para aproximadamente 1,2 MB, sem trilha de áudio, H.264, 1600 × 900, com início rápido. O original não foi alterado.
- `hero-poster.jpg`: quadro de apoio do vídeo, aproximadamente 80 KB.
- `hero.png`: imagem original preservada para uso alternativo.
- 16 WebP individuais: retratos de 1122 × 1402 e ambientes/detalhe de 1536 × 1024. Imagens geradas por IA para demonstração fictícia; a foto de grupo não garante as mesmas identidades dos retratos. Para a clínica real, substituir profissionais e ambientes pelos registros da própria clínica. Os PNG de reserva não foram incluídos.
- SVGs de comparação: espaços reservados geométricos preservados, sem resultados clínicos simulados. Nenhuma foto de procedimento serve como comprovação de resultado.

## Interações e acessibilidade

Header transparente que recebe fundo suave ao rolar, menu móvel, WhatsApp flutuante, tabs navegáveis por setas no desktop, accordions no celular, comparadores independentes com controle arrastável e teclado, carrossel com controles e swipe, galeria horizontal no celular, FAQ, janelas com Escape, foco visível e preferência por movimentos reduzidos. Carrossel de avaliações em loop a cada 5,5 segundos, com pausa manual, na interação e fora da tela. A preferência por movimento reduzido desativa a passagem automática e as animações. Entradas suaves ao rolar, sequência discreta entre cards e efeitos leves em botões, fotos e janelas. Sem bibliotecas pesadas ou autoplay sonoro.

## Entrega

Modelo pronto para apresentação. Antes de divulgar como a clínica real, personalize os dados, os contatos, as credenciais, as fotos, os números de autoridade e os relatos. A hospedagem mantém o acesso privado existente.



WhatsApp e telefone configurados para (11) 91000-6175 (wa.me/5511910006175). O intervalo do carrossel pode ser alterado em testimonialAutoplay no config.js.

