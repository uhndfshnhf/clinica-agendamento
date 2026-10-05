# Quartier · site público e gestão da clínica

Evolução do site original fornecido em ZIP: HTML/CSS/JavaScript nativos, com Vite para módulos e build. O painel usa Supabase Auth, PostgreSQL com RLS e Storage privado. Clientes podem criar contas com confirmação de e-mail e CAPTCHA; o acesso da equipe é concedido separadamente. Não há banco simulado ou autenticação em memória.

## Estrutura

- `index.html`, `public/`: site original. As mídias e os estilos originais foram preservados. O renderizador agora recebe conteúdo público do painel. O módulo público busca o conteúdo aprovado antes de renderizar as seções.
- `src/public.js`: conteúdo público do painel, contatos configuráveis e formulário de interesse. Todos os CTAs de WhatsApp continuam funcionando. A hero e as seções existentes são preservadas.
- `cliente/index.html`, `src/customer.js`: área privada de clientes, pedidos de horário, confirmação e acompanhamento liberado.
- `api/booking.js`: função de servidor Vercel com CAPTCHA, autenticação e limites persistentes.
- `admin/index.html`, `src/admin/`: aplicação administrativa com rotas reais, módulos carregados sob demanda, componentes de formulário e tabelas reutilizados.
- `supabase/migrations/`: banco, relacionamentos, índices, permissões e operações transacionais.
- `supabase/functions/invite-team/`: convite de equipe, autorizado no servidor; service role nunca é enviado ao navegador.
- `scripts/`: instalação local, contas administrativas, demonstração e servidor de produção.
- `tests/`: testes de validação, isolamento de dados, navegador e preservação visual.

## Ambiente local

Requisitos: Node.js 22+ e Docker em execução. Este checkout já pertence a uma tarefa isolada: use-o diretamente, sem criar worktrees, a menos que o usuário solicite.

```sh
cd /workspace/clinica-agendamento
npm ci
npm run db:start
npm run local:env
npm run demo:seed
npm run dev
```

`local:env` grava `.env.local` com permissão 0600, sem imprimir chaves, e preserva um arquivo existente. Credenciais fictícias são geradas aleatoriamente, sem senha padrão no código. O e-mail e a senha locais ficam nas variáveis `DEMO_ADMIN_EMAIL` / `DEMO_ADMIN_PASSWORD` desse arquivo privado. Não publique ou compartilhe o arquivo.

O servidor de desenvolvimento usa a porta 5173. A rota privada é `/admin`; sem sessão, redireciona para `/admin/login`. Banco, Auth e Storage usam a porta local 54321. O horário da clínica é `America/Sao_Paulo`, independentemente do fuso do navegador.

Neste ambiente de nuvem, use `bash scripts/cloud-install.sh` para reproduzir a instalação com downloads verificados. O script usa o Docker Hub oficial quando o registro ECR é bloqueado. Em Docker com driver `vfs`, importa uma camada consolidada do PostgreSQL oficial, preservando o sistema de arquivos e a configuração da imagem; o digest é registrado em `.local/postgres-image-digest.txt`. Isso evita a duplicação de camadas que excede o espaço da máquina. Em instalações Docker normais, `npm ci` e `npm run db:start` são suficientes.

Para testar os convites localmente, mantenha também em execução:

```sh
npm run functions:local
```

O comando local empacota a mesma função de produção com as dependências fixadas e inicia o Edge Runtime na rede privada do Supabase, sem downloads de módulos externos em execução.

O Mailpit local recebe e-mails de recuperação e convite; nenhum e-mail de teste é enviado a destinatários reais. Processos precisam ser reiniciados depois de restaurar o ambiente. Dependências e volumes do banco são persistentes.

## Seu projeto Supabase

1. Configure `.env.local` a partir de `.env.example`, usando a URL e a chave **pública anon/publishable** do seu projeto nas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
2. Aplique as migrações, na ordem, no projeto correto. Com CLI autenticada: `npx supabase link --project-ref SEU_PROJECT_REF` e `npx supabase db push`. Isso altera o projeto de destino; confira-o antes de executar.
3. Em Auth, habilite o provedor de e-mail e habilite cadastros de clientes com confirmação de e-mail e CAPTCHA Turnstile; contas da equipe continuam sendo criadas por convite ou pela administração. Configure Site URL e redirect allowlist para `https://SEU_DOMINIO/admin/login`. Ative política de senha de pelo menos 12 caracteres.
4. Configure SMTP de produção para recuperação e convites. Publique a função com `npx supabase functions deploy invite-team`. A função usa as variáveis de servidor fornecidas pelo Supabase.
5. Crie o primeiro administrador com `npm run user:create`, passando `ADMIN_EMAIL`, `ADMIN_NAME` e `ADMIN_PASSWORD` pelo ambiente seguro. Esse script requer `SUPABASE_SERVICE_ROLE_KEY` somente no processo servidor. Não use prefixo `VITE_` para segredos.
6. Cadastre os profissionais e procedimentos. Associe profissionais aos procedimentos e clientes; contas de profissional só enxergam seus vínculos. Na tela Equipe, envie convites privados para novas contas.
7. Compile com `npm run build`. Sirva `dist` com `npm start` ou configure seu host para enviar `/admin` e `/admin/*` a `/admin/index.html`. Não use a página pública como fallback administrativo. O servidor incluído fornece fallback, tipos MIME, headers básicos e suporte a range para o vídeo.

Não aplicamos migrações nem enviamos convites ao seu projeto hospedado sem a conexão e o destino disponíveis. A chave administrativa nunca deve entrar no bundle ou no Git.

## Fluxos e permissões

- Administrador: clientes, equipe, procedimentos, configurações, leads, agenda e acompanhamento.
- Profissional: clientes atribuídos, próprios agendamentos, tratamentos e lembretes; fotos dos clientes atribuídos. Sem acesso aos contatos do site, permissões da equipe ou edição de configurações.
- Agendamentos respeitam sobreposição por profissional; duração e valor são copiados do procedimento, preservando o valor histórico. Finalizar usa uma transação que cria o atendimento e, quando solicitado, o lembrete de retorno.
- Procedimentos são desativados, sem exclusão definitiva de históricos. A equipe não pode desativar o próprio acesso administrativo por engano.
- Fotos ficam no bucket privado `evolution`, passam por conversão WebP e remoção de metadados, e são baixadas via autenticação para URLs `blob:` locais. Acesso anônimo e upload para clientes não atribuídos são bloqueados no banco e Storage. Ao sair da tela, URLs locais são revogadas. A comparação associa mesmo cliente/procedimento e datas em ordem; confirme enquadramento compatível.
- Leads são enviados por uma função restrita, com validação, consentimento, honeypot e limite de três pedidos por WhatsApp/hora. Não há leitura anônima de contatos. A conversão em cliente é transacional e idempotente.
- Configurações públicas expõem apenas dados comerciais por RPC. Contatos/rodapé mudam sem reescrever o layout nem a hero. Campos vazios mantêm os dados originais.

Antes de usar dados reais, configure domínio, SMTP, backups, política de retenção e texto de privacidade da clínica. Para exposição pública de grande volume, acrescente proteção de borda/CAPTCHA ao formulário; o limite por telefone não substitui proteção contra tráfego automatizado distribuído.

## Demonstração

```sh
npm run demo:seed   # idempotente: não duplica uma demonstração existente
npm run demo:reset  # remove somente registros clínicos marcados demo
```

Os scripts são restritos a Supabase local. O reset preserva registros não demonstrativos e contas da equipe; não é um comando para apagar produção. São criados oito clientes fictícios, três profissionais, seis procedimentos, agendamentos, históricos, lembretes e contatos. Endereços de e-mail usam domínios reservados e telefones são fictícios. Não são fabricadas fotos de resultado clínico: o upload/comparador pode ser demonstrado com imagens autorizadas. A mídia original do site continua identificada como ilustrativa.

## Validação

```sh
npm test
npm run test:e2e
npm run build
node scripts/verify-original.mjs /caminho/do/ZIP-extraido/dist
```

Os testes de banco e navegador precisam do Supabase local, `.env.local` e seed. Sem credenciais locais, os testes de segurança são explicitamente marcados como não executados; isso não valida permissões. O teste visual compara a hero e cada seção original em desktop/mobile quando o ZIP original está disponível. Os testes funcionais criam registros fictícios isolados; não execute contra produção.

Consulte `VALIDATION.md` para os resultados executados nesta entrega e as limitações verificadas.

## Site editável e área do cliente

Consulte [o guia de ativação](docs/ATIVAR-SITE-E-CLIENTES.md) para aplicar as duas novas migrações, configurar CAPTCHA/segredos de servidor e ativar os pedidos sujeitos à aprovação. A área privada fica em `/cliente`, separada do acesso administrativo. Use `vercel dev` para testar localmente o endpoint `/api/booking`; o Vite e o servidor estático não executam funções Vercel.
