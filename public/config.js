/* CONFIGURAÇÃO DO CLIENTE. Todo dado comercial e mídia ficam neste arquivo.
   Substitua os exemplos por dados reais e defina demo:false.
   whatsapp vazio impede qualquer encaminhamento a um número fictício.
   Fotos: {src:'assets/foto.webp',alt:'Descrição'}. */
window.CLINIC_CONFIG = {
  demo:true, name:'Quartier Estética', logo:'', logoWord:'QUARTIER', tagline:'ESTÉTICA E BEM-ESTAR',
  colors:{ink:'#303c44',nude:'#b59888',peach:'#f1b38f',cream:'#f7f3ef'},
  whatsapp:'5511910006175', // Somente dígitos: 55 + DDD + telefone REAL.
  whatsappMessage:'Olá! Gostaria de agendar uma avaliação.',
  floatingMessage:'Olá! Vim pelo site e gostaria de agendar uma avaliação.',
  phone:'5511910006175', phoneDisplay:'(11) 91000-6175', instagram:'@nomedaclinica', instagramUrl:'',
  address:'São Paulo — SP', hours:['Segunda a sexta','09:00 às 19:00'],
  mapEmbedUrl:'', // https://www.google.com/maps/embed?...
  googleReviewsUrl:'',
  hero:{video:'assets/hero-video.mp4',poster:'assets/hero-poster.jpg',image:'assets/hero.png'},
  seo:{description:'Tratamentos de estética facial, harmonização, toxina botulínica, preenchimento e cuidados personalizados. Agende sua avaliação.',businessType:'LocalBusiness',addressLocality:'São Paulo',addressRegion:'SP',postalCode:'',streetAddress:''},
  about:{title:'Estética com propósito.',description:'Cada rosto possui características únicas. Por isso, nossos tratamentos são planejados de forma individual, buscando equilíbrio, naturalidade e resultados que respeitem a identidade de cada paciente.',
    facts:['+500 pacientes atendidos','Tratamentos personalizados','Atendimento individualizado'], // NÚMERO DEMONSTRATIVO, editar.
    mainPhoto:{src:'assets/sobre-principal.webp',alt:'Mulher com os olhos fechados e a mão no rosto'},
    detailPhoto:{src:'assets/sobre-detalhe.webp',alt:'Toalha, tigela e frasco em bancada de cuidado'}},
  procedures:[
    {id:'harmonizacao',name:'Harmonização Facial',description:'Um olhar para o conjunto. Planejamento individualizado que considera a anatomia, as proporções e os objetivos de cada pessoa.',photo:{src:'assets/procedimento-harmonizacao.webp',alt:'Retrato de mulher com cabelos presos'}},
    {id:'toxina',name:'Toxina Botulínica',description:'Cuidado com as linhas de expressão, com indicação e planejamento definidos em uma avaliação profissional individual.',photo:{src:'assets/procedimento-toxina.webp',alt:'Mulher sorrindo com o rosto apoiado na mão'}},
    {id:'preenchimento',name:'Preenchimento Facial',description:'Proporções, contorno e volume considerados com atenção à sua identidade. A avaliação orienta as possibilidades de tratamento.',photo:{src:'assets/procedimento-preenchimento.webp',alt:'Mulher de perfil com cabelos cacheados'}},
    {id:'bioestimuladores',name:'Bioestimuladores',description:'Uma possibilidade de cuidado com a qualidade da pele. A escolha depende das características e necessidades de cada paciente.',photo:{src:'assets/procedimento-bioestimuladores.webp',alt:'Retrato de mulher com cabelos curtos'}},
    {id:'skinbooster',name:'Skinbooster',description:'Um cuidado voltado à pele, pensado dentro de um plano personalizado. Conheça as possibilidades durante sua avaliação.',photo:{src:'assets/procedimento-skinbooster.webp',alt:'Mulher olhando por cima do ombro'}},
    {id:'pele',name:'Cuidados com a Pele',description:'Tratamentos faciais personalizados e uma rotina de cuidado que considera sua pele, seus objetivos e seu momento.',photo:{src:'assets/procedimento-pele.webp',alt:'Cuidado facial ilustrativo com luvas e algodão'}}],
  results:[
    {label:'Caso 01 · Harmonização facial',before:'assets/before-placeholder.svg',after:'assets/after-placeholder.svg',placeholder:true},
    {label:'Caso 02 · Qualidade da pele',before:'assets/before-placeholder.svg',after:'assets/after-placeholder.svg',placeholder:true},
    {label:'Caso 03 · Contorno facial',before:'assets/before-placeholder.svg',after:'assets/after-placeholder.svg',placeholder:true}],
  method:[
    {title:'Avaliação',description:'Entendemos suas características, expectativas e objetivos.'},
    {title:'Planejamento',description:'Criamos uma estratégia personalizada para alcançar um resultado equilibrado.'},
    {title:'Procedimento',description:'Aplicação precisa com técnicas e protocolos adequados.'},
    {title:'Acompanhamento',description:'Acompanhamos sua evolução e os cuidados após o procedimento.'}],
  team:[
    {name:'Dra. Nome Sobrenome',specialty:'Especialista em Estética Facial',bio:'Cada tratamento é planejado de forma individual, considerando anatomia, proporções e objetivos pessoais.',education:'Formação e instituição — preencher',registration:'CRM / CRO / Registro — preencher',photo:{src:'assets/profissional-principal.webp',alt:'Profissional fictícia de cabelos escuros e jaleco branco'}},
    {name:'Dra. Nome Sobrenome',specialty:'Área de atuação — preencher',bio:'Apresentação profissional — preencher.',education:'Formação — preencher',registration:'Registro — preencher',photo:{src:'assets/profissional-02.webp',alt:'Profissional fictícia de cabelos cacheados e jaleco branco'}},
    {name:'Dr. Nome Sobrenome',specialty:'Área de atuação — preencher',bio:'Apresentação profissional — preencher.',education:'Formação — preencher',registration:'Registro — preencher',photo:{src:'assets/profissional-03.webp',alt:'Profissional fictício de cabelos grisalhos e jaleco branco'}}],
  testimonialAutoplay:{enabled:true,interval:5500},
  testimonials:[
    {quote:'Eu queria melhorar alguns pontos sem perder minhas características. O resultado ficou exatamente como eu esperava.',name:'M. A.',procedure:'Harmonização facial',stars:5},
    {quote:'Desde a primeira avaliação me senti segura. Tudo foi explicado com muita atenção.',name:'L. S.',procedure:'Avaliação personalizada',stars:5},
    {quote:'O atendimento foi excelente e o resultado ficou muito natural.',name:'C. R.',procedure:'Cuidados com a pele',stars:5}],
  gallery:[
    {title:'Recepção',photo:{src:'assets/clinica-recepcao.webp',alt:'Recepção ilustrativa com poltronas e balcão de pedra'},placeholder:false},
    {title:'Sala de atendimento',photo:{src:'assets/clinica-sala.webp',alt:'Sala ilustrativa com cadeira de atendimento e armários'},placeholder:false},
    {title:'Detalhes do ambiente',photo:{src:'assets/clinica-detalhes.webp',alt:'Ambiente ilustrativo com madeira, plantas e poltrona'},placeholder:false},
    {title:'Equipamentos',photo:{src:'assets/clinica-equipamentos.webp',alt:'Maca e equipamentos em sala ilustrativa'},placeholder:false},
    {title:'Equipe',photo:{src:'assets/clinica-equipe.webp',alt:'Grupo ilustrativo de três profissionais com um tablet'},placeholder:false}],
  faq:[
    {question:'Como funciona a primeira avaliação?',answer:'É um momento de escuta e planejamento. O profissional conhece suas expectativas, avalia suas características e explica as possibilidades de cuidado, a indicação dos procedimentos e os próximos passos.'},
    {question:'Quanto tempo dura o procedimento?',answer:'A duração depende do tratamento e do plano individual. Na avaliação, a clínica informa o tempo previsto e as orientações para sua visita.'},
    {question:'Quando começo a perceber os resultados?',answer:'O prazo varia conforme o procedimento e cada pessoa. O profissional explica a evolução esperada durante a avaliação e o acompanhamento.'},
    {question:'Os resultados são permanentes?',answer:'A duração e a necessidade de manutenção variam conforme o tratamento. Essas informações são conversadas individualmente com o profissional responsável.'},
    {question:'Existe tempo de recuperação?',answer:'Os cuidados e o período de recuperação dependem do procedimento. Você receberá orientações específicas antes de decidir pelo tratamento.'},
    {question:'Como saber qual tratamento é indicado para mim?',answer:'A avaliação profissional é o primeiro passo. O plano considera suas características, seu histórico e seus objetivos; a indicação não é definida somente por uma fotografia ou por uma conversa no site.'}],
  legal:{privacy:'Este é um modelo de apresentação. A página não possui formulário de coleta de dados, cadastro ou armazenamento de informações de pacientes. Os links de WhatsApp, Instagram e Google Maps, quando configurados, direcionam a serviços externos sujeitos às respectivas políticas. Substitua este texto pela política da clínica, incluindo responsável, contato e práticas efetivas de tratamento de dados, antes da divulgação comercial.',terms:'Este é um modelo de apresentação, com conteúdo demonstrativo. As informações da página não substituem uma avaliação profissional e não representam garantia de resultado. Substitua este texto pelos termos da clínica, revisados para seu serviço e sua operação, antes da divulgação comercial.'}
};

