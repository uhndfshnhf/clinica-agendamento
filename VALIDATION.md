# Validação da entrega

## Resultado executado

- `bash scripts/cloud-install.sh`: executado com sucesso. Instalou o lockfile sem modificá-lo, verificou o CLI oficial, preservou `.env.local`, reaplicou somente migrações pendentes, reconheceu a demonstração existente sem duplicar registros, iniciou a função local e compilou o projeto.
- `npm test`: **10 testes passaram; 0 falhas; 0 ignorados**. Validação de formulários e fuso, bloqueio de cadastros/leitura anônima, autorização por profissional, impedimento de escalada de função, criação de clientes por profissional, leads e conversão idempotente, limites de envio, autorização do convite e privacidade real do Storage.
- `npm run test:e2e`: **11 testes passaram; 0 falhas; 0 ignorados**. Convite e recuperação de senha por e-mail local; login inválido; cliente e observações; agendamento e conflito de horário; conclusão de atendimento e retorno; upload antes/depois e comparação; todas as oito rotas em 1440, 768 e 390 px; agenda dia/semana/mês; lembretes; procedimentos; envio de contato público e conversão; restrição de acesso de profissional.
- `npm run build`: passou. Entradas pública/administrativa separadas, módulos do painel carregados sob demanda. Os avisos sobre scripts/CSS originais indicam arquivos estáticos copiados para `dist`, não falhas de build.
- Artefato de produção servido com `npm start`: redirecionamento privado, login, lista real do banco, recarga de rota profunda, página pública e formulário de interesse verificados no navegador, sem erros de página.
- Bundle de produção inspecionado: sem service-role key ou senhas de demonstração.

## Preservação do site

`node scripts/verify-original.mjs` confirmou **27 arquivos originais idênticos byte a byte**: configuração, JavaScript público, CSS e mídias. O HTML original recebeu somente a entrada do módulo de integração.

Comparação de screenshots de cada seção, com movimento reduzido, passou em 1440 e 390 px: hero, sobre, procedimentos, resultados, método, equipe, depoimentos, galeria, FAQ e CTA final. Contato e rodapé são os pontos de integração intencionalmente alterados. Todos os botões originais de WhatsApp foram mantidos.

Os testes de rotas não detectaram erros de JavaScript ou overflow horizontal no desktop, tablet ou celular. Tabelas/calendário usam rolagem interna quando necessário.

## Dados e privacidade

Os registros da demonstração são fictícios. Os testes criam e removem seus próprios registros; dados de tentativas interrompidas também foram removidos. Fotos usadas no teste eram uma imagem ilustrativa do ZIP, não resultados clínicos reais. Nenhuma foto de paciente foi publicada.

Foram testados upload e download autenticados reais, leitura anônima negada, bucket não público, acesso negado a cliente não atribuído e impossibilidade de um profissional excluir uma foto clínica existente.

## Ambiente e configuração

Supabase Auth/PostgreSQL/Storage/Mailpit funcionaram localmente em Docker. O convite foi executado no Edge Runtime usando a mesma função de produção, com dependências empacotadas para evitar o bootstrap remoto bloqueado na nuvem. A validação de JWT e função administrativa permanece dentro da função.

O driver Docker `vfs` exigiu consolidar as camadas da imagem PostgreSQL oficial por falta de espaço. O script preserva o conteúdo/configuração da imagem e verifica downloads/digests. Após reinstalar dependências com `npm ci`, reinicie o Vite para reconstruir o cache de módulos.

Os campos `install_script` e `start_skill` foram salvos no rascunho do ambiente. Salvar o rascunho não publica o snapshot nem comprova restauração em uma nova tarefa. Revise e salve as alterações nas configurações do ambiente e publique quando desejar reutilizá-lo.

## O que depende do projeto hospedado

A URL do Supabase hospedado ainda não foi fornecida. Não foram aplicadas migrações, configurado SMTP, criado administrador, publicado site ou implantada função no projeto remoto. Esses passos estão no README. Chaves administrativas devem ser fornecidas somente por configuração segura de servidor, nunca pelo frontend ou pelo chat.

E-mails foram recebidos no Mailpit local; entrega por um provedor SMTP externo não foi testada. Os testes usam Chromium e dados de demonstração; não representam validação de outros navegadores, carga de produção ou revisão jurídica da política de privacidade.
