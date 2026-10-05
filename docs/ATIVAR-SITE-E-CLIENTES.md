# Site, perfil do cliente e agendamentos — fluxo simplificado

## 1. Atualizar o banco

No SQL Editor do Supabase brvquonwboylfugueahp, execute docs/ATUALIZAR-BANCO.sql. Ele instala somente as etapas ainda ausentes e não apaga fichas, fotos ou agendamentos. Requer que o banco original da clínica já esteja instalado. Toda a atualização ocorre em uma transação. Se houver erro, envie a mensagem; não apague tabelas para tentar corrigir.

Se você utiliza migrações pela CLI, aplique os arquivos novos por esse mecanismo e não use o pacote manual sem conciliar o histórico.

## 2. Configurar contas no Supabase

Em Authentication, habilite cadastros por e-mail e desative CAPTCHA/Bot and Abuse Protection, caso esteja habilitado. Cloudflare e Turnstile não são utilizados nesta versão.

A confirmação de e-mail segue a configuração do seu Supabase. Com confirmação habilitada, o cliente recebe o link e entra após confirmar. Com confirmação desabilitada, o cliente entra diretamente após cadastrar. Para confirmação e recuperação, configure SMTP.

Redirect URLs: https://clinica-estetica-demo-ruddy.vercel.app/cliente. Inclua também https://clinica-estetica-demo-ruddy.vercel.app/cliente/agendar e https://clinica-estetica-demo-ruddy.vercel.app/admin/login. Site URL: https://clinica-estetica-demo-ruddy.vercel.app.

## 3. Vercel

Mantenha apenas as duas variáveis públicas já configuradas: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY. O envio de pedidos não exige funções Vercel, TURNSTILE_SECRET_KEY, PUBLIC_SITE_URL nem SUPABASE_SERVICE_ROLE_KEY no servidor. A chave administrativa continua sendo necessária somente para scripts administrativos externos que você escolha executar, nunca no navegador.

O push na main inicia o deploy do repositório conectado. Aguarde Ready.

## 4. Fluxo do cliente

O cabeçalho mostra Agendar avaliação e, à direita, Entrar. O agendamento abre /cliente/agendar; sem sessão, essa página mostra o login e preserva a intenção de agendar após a entrada. O WhatsApp flutuante tem somente o ícone e usa o número configurado em Configurações. O cadastro pede nome, WhatsApp, e-mail, senha e consentimento. O banco cria imediatamente a ficha em Clientes no painel e uma conta privada vinculada, sem dar permissões de equipe. Depois do login, o cabeçalho muda para Meu perfil e a página mostra os dados do cliente, pedidos, agendamentos e fotos liberadas.

Contas antigas que ainda não tenham ficha precisam concluir o cadastro na primeira entrada. Clientes já cadastrados pela clínica podem ser vinculados a uma conta confirmada pelo administrador usando Clientes > Vincular conta do cliente, após verificar a identidade.

Clientes cadastrados podem solicitar horários. A equipe continua aprovando ou recusando em Pedidos pelo site. Pedidos não ocupam a agenda antes da aprovação. O banco verifica conflitos novamente e só confirma um atendimento por profissional/horário. O estado aparece na área do cliente.

## 5. Preparar serviços e equipe

Em Procedimentos, marque Exibir no site, mantenha o serviço ativo e associe os profissionais responsáveis. Em Equipe, marque Exibir no site e aceitar pedidos online nos profissionais adequados. Em Configurações, defina dias e horários; a atualização habilita os pedidos online e a equipe pode desativá-los quando necessário.

A disponibilidade cobre os próximos 30 dias em intervalos de 30 minutos, com duas horas de antecedência mínima. Permanecem validação no banco, autenticação, limite de duas consultas por semana de segunda a domingo no fuso de São Paulo e proteção contra envio duplicado. Pedidos pendentes e consultas não canceladas consomem o limite; pedidos recusados e consultas canceladas ou com falta liberam a cota. Pedidos aprovados são contados uma única vez. A regra também vale para consultas novas ou reagendadas pelo painel, considerando fichas com o mesmo WhatsApp e serializando envios simultâneos. Não há desafio CAPTCHA nem envio automático de WhatsApp/SMS.

## 6. Site editável e fotos

Personalizar site continua controlando textos, capa, cores, galeria, resultados autorizados, perguntas e depoimentos. Procedimentos e Equipe fornecem os dados comerciais públicos. Fichas e observações clínicas não são publicadas.

Fotos do bucket evolution continuam privadas. Liberar para o cliente permite somente que a conta vinculada veja a foto; fotos de outros clientes são negadas. Fotos enviadas pelo editor público ficam no bucket separado site-media e exigem autorização de publicação quando forem resultados clínicos.
