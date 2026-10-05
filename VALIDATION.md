# Validação — acesso pelo cabeçalho e cadastro simplificado

- npm test: 12 testes locais passaram.
- npm run test:e2e: 14 testes de navegador passaram.
- npm run build: build de produção aprovado.

O cadastro com metadados cria uma ficha visível ao administrador e uma conta privada vinculada. Mesmo fornecendo role=admin nos metadados, o cliente não recebe acesso de equipe. O cliente autenticado envia o pedido diretamente por RPC; a chamada anônima é negada. São mantidos os limites básicos por conta/telefone, o envio idempotente, a aprovação exclusiva da equipe e a proteção contra conflitos concorrentes de horários.

No navegador, foram testados login, acesso ao perfil pelo cabeçalho, conclusão de cadastro de contas antigas, envio do pedido sem CAPTCHA/servidor intermediário, aprovação no painel e confirmação na área do cliente. Também passaram edição de conteúdo, ocultação de serviços, upload de fotos, estilos, navegação desktop/mobile e todos os fluxos administrativos anteriores.

As fotos clínicas continuam privadas, com acesso exclusivo à conta vinculada após liberação. As observações clínicas não aparecem na área do cliente. Uploads públicos ficam separados.

Cloudflare/Turnstile foram retirados do fluxo e não há mais endpoint Vercel nem segredos extras para pedir horários. O banco original deve estar instalado e a atualização docs/ATUALIZAR-BANCO.sql deve ser aplicada no Supabase hospedado. O pacote identifica etapas já instaladas antes de aplicar as ausentes. Ele foi executado localmente após as migrações para verificar que a repetição não gera erro.

Não foi feita conexão autenticada ao Supabase/Vercel hospedados. Se CAPTCHA estiver ativado no painel Supabase, é necessário desativá-lo. A confirmação de e-mail segue a configuração do projeto. SMTP/entrega de confirmação de cadastro de produção ainda precisam ser verificados; os testes usam contas locais controladas.
