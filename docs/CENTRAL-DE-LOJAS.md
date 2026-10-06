# Central de lojas: um painel, um Supabase por clínica

A central cadastra conexões de sites compatíveis com este projeto. Cada clínica conserva o próprio Supabase, as contas da equipe, os pacientes, fotos e configurações. A lista de conexões pertence ao administrador que a cadastrou. O JSON contém apenas dados públicos e nunca concede acesso administrativo por si só.

## Fluxo de conexão

1. No painel do site da clínica, abra **Conectar ao painel**. Confira o endereço público e clique em **Baixar JSON de conexão**.
2. Entre na central e abra **Minhas lojas → Adicionar sua loja**. Importe o JSON, confira os dados e salve. Também é possível preencher os campos manualmente.
3. Clique em **Abrir painel** e entre com uma conta da equipe daquela clínica. A permissão é conferida no Supabase da clínica.
4. Os menus Clientes, Agenda, Equipe, Procedimentos, Configurações e Personalizar site passam a usar o projeto selecionado. **Visitar o site** abre o endereço associado à loja.
5. **Minhas lojas** volta à central. Remover uma conexão não exclui o site, o banco ou os pacientes.

Projetos diferentes exigem contas de equipe próprias. A central conserva a sessão de cada projeto por administrador no navegador, para facilitar a troca após o primeiro acesso. Sair da central pela interface encerra as sessões abertas por ela. Uma pessoa cadastrada apenas como cliente não ganha acesso ao painel administrativo.

## Ativar no Supabase da central

O projeto atual pode ser usado como a primeira central. Aplique a migração `supabase/migrations/202610060001_store_connections.sql` uma vez, ou execute o instalador atualizado `docs/ATUALIZAR-BANCO.sql` no banco da clínica já instalado. O instalador verifica as etapas existentes. Para equipes que usam a CLI, use as migrações e concilie seu histórico; não misture instalações sem conferir esse histórico.

Para um Supabase novo, aplique primeiro as migrações completas do projeto. Crie a conta administrativa com o procedimento de provisionamento do README. O cadastro de cliente pelo site não cria administradores. A chave de serviço é usada somente no provisionamento administrativo, de forma segura, fora do navegador.

A tabela `store_connections` guarda configurações públicas, sob RLS: cada administrador só lê e altera suas próprias conexões. O banco rejeita chaves `service_role` e `sb_secret_`. Os dados de pacientes continuam no projeto original e seguem suas políticas existentes.

## Publicar a central em outro domínio

Crie um **segundo projeto Vercel**, conectado ao mesmo repositório. Configure:

- `VITE_APP_MODE=panel`
- `VITE_SUPABASE_URL`: URL do Supabase que guarda a central.
- `VITE_SUPABASE_ANON_KEY`: chave pública desse projeto.

Use `npm run build` e saída `dist`, como no projeto existente. Nesse modo, o build publica o painel administrativo na raiz; a tela inicial autenticada mostra **Minhas lojas**. Configure o domínio desejado nas configurações desse projeto Vercel. O domínio depende da conta Vercel e do DNS do proprietário.

No projeto Vercel de cada clínica, mantenha `VITE_APP_MODE=clinic` (ou ausente), as duas variáveis públicas do Supabase próprio e, opcionalmente, `VITE_SITE_URL=https://dominio-da-clinica`. O endereço também pode ser ajustado antes de exportar o JSON.

Configure as URLs de redirecionamento de confirmação, recuperação e convites no Auth de cada projeto. Convites e recuperação da equipe de uma clínica conectada apontam para `/admin/login` no domínio do site daquela clínica. A recuperação da conta central aponta para `/admin/login` no domínio da central. Configure SMTP em cada projeto onde o envio de e-mails for utilizado.

Para gerar os dois artefatos localmente: `npm run build` produz o site em `dist`; `npm run build:panel` produz a central em `dist-panel`. Somente as chaves públicas entram nesses builds.

## Modelo comercial

Ofereça um site com identidade da clínica, área do cliente, agendamento sujeito à aprovação e painel de gestão. Cobre implantação e mensalidade por clínica, definindo o que inclui em manutenção, hospedagem e suporte. Um Supabase por clínica facilita entregar ou transferir o projeto ao cliente e evita compartilhar dados clínicos entre empresas.

Adicionar uma loja conecta uma instalação já preparada; não cria automaticamente um Supabase, compra domínio, publica outro site ou instala funções e migrações. Para uma nova venda, duplique o modelo, configure o novo projeto e o domínio, provisione a equipe e depois importe a conexão na central. Sites de terceiros que não usem esta plataforma precisam de uma integração específica; um JSON sozinho não permite editar seu HTML, pagamentos ou sistema de pedidos.

## Verificação local

`npm test` verifica o JSON e as políticas da central. `npm run test:e2e` verifica exportação, importação, navegação e remoção de conexões. O teste entre clínicas usa bancos e serviços Auth separados: defina em `.env.test.local` `SECOND_SUPABASE_URL`, `SECOND_SUPABASE_ANON_KEY`, `SECOND_SUPABASE_SERVICE_ROLE_KEY` e `SECOND_SITE_URL`, apontando para uma segunda instalação local com as migrações aplicadas e o site em execução. Sem esse segundo ambiente, esse cenário é marcado como não executado. A chave de serviço fica apenas no arquivo local ignorado pelo Git, para criar e limpar os dados de teste.
