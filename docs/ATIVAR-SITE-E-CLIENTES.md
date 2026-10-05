# Ativar o site editável, contas de clientes e pedidos de horário

O código usa as variáveis públicas do Supabase já configuradas na Vercel. A agenda pública fica desativada por padrão e o servidor recusa pedidos se faltarem os segredos de proteção. Nenhum CAPTCHA garante ausência de abuso. Os limites reduzem spam e a revisão da equipe evita que pedidos ocupem a agenda automaticamente.

## 1. Atualização do banco existente

No SQL Editor do projeto `brvquonwboylfugueahp`, execute **uma vez** `docs/ATUALIZAR-BANCO.sql`. Esse arquivo reúne somente as duas novas migrações em uma transação. Não execute novamente o SQL de instalação inicial. Nenhuma tabela clínica é apagada. Se ocorrer erro, a transação desfaz a atualização; envie a mensagem para diagnóstico. Quem já aplica migrações pela CLI deve aplicar os dois arquivos novos por esse mecanismo, em vez de executar o pacote manualmente. Não misture os mecanismos sem conciliar o histórico de migrações.

## 2. Turnstile no Cloudflare

Entre no Cloudflare, abra Turnstile e crie um widget do tipo **Managed** para o hostname `clinica-estetica-demo-ruddy.vercel.app`. Copie a **Site Key** e a **Secret Key**.

No administrador da clínica, em **Configurações**, coloque somente a **Site Key** no campo de chave pública antispam. A chave secreta fica exclusivamente nas configurações de servidor abaixo. Para domínio próprio, atualize também os hostnames do widget e a URL do servidor.

## 3. Segredos de servidor na Vercel

Em Settings > Environment Variables, configure em Production:

- `SUPABASE_SERVICE_ROLE_KEY`: chave administrativa do Supabase (service_role ou secret), somente no servidor.
- `TURNSTILE_SECRET_KEY`: Secret Key do widget Cloudflare.
- `PUBLIC_SITE_URL`: `https://clinica-estetica-demo-ruddy.vercel.app`

Mantenha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` como já estavam. Nunca prefixe segredos com `VITE_`. Não envie essas chaves pelo chat e não salve no Git. Faça Redeploy na Vercel depois de alterar variáveis. O endpoint `/api/booking` precisa do deploy Vercel com funções; um upload de HTML estático isolado não fornece esse endpoint. Pedidos são aceitos somente a partir do domínio exato de `PUBLIC_SITE_URL`.

## 4. Cadastro e confirmação de e-mail no Supabase

Em Authentication, habilite novos cadastros por e-mail e **exija confirmação de e-mail**. Novas contas não ganham permissão de equipe: ficam separadas em `customer_accounts`. Não habilite contas anônimas.

Em Authentication > Bot and Abuse Protection, ative CAPTCHA com provedor **Turnstile**, usando a Secret Key desse widget. Ajuste também os limites de autenticação. Configure SMTP real para confirmação e recuperação de senha; o SMTP de demonstração do Supabase possui restrições de destinatários e envio.

Em URL Configuration:

- Site URL: `https://clinica-estetica-demo-ruddy.vercel.app`
- Redirect URLs: `https://clinica-estetica-demo-ruddy.vercel.app/cliente` e `https://clinica-estetica-demo-ruddy.vercel.app/admin/login`.

## 5. Conteúdo e horários

- **Personalizar site**: capa, apresentação, títulos das seções, cores, galeria, resultados, etapas do atendimento, perguntas frequentes, depoimentos e textos legais. Salvar publica a seção; visitantes recebem a versão nova ao atualizar a página.
- **Procedimentos**: o nome e descrição são usados no site. Escolha Exibir no site e envie a foto pública. Serviços inativos ou ocultos não aparecem nem podem receber novos pedidos. Os preços permanecem no painel.
- **Equipe**: escolha Exibir no site e aceitar pedidos online para os profissionais que atenderão pedidos. Fotos, apresentação, formação e registro são públicos; telefones, e-mails e contas da equipe não fazem parte da projeção pública.
- Associe os profissionais aos procedimentos, como na agenda existente.
- **Configurações**: defina dias e horários online, coloque a Site Key e ative Receber pedidos. Disponibilidade: próximos 30 dias, intervalos de 30 minutos, antecedência mínima de duas horas, respeitando duração e conflitos de agenda. Para outra política de agenda, ajuste antes de ativar.

## 6. Fluxo do cliente e da equipe

O cliente acessa `/cliente`, cria a conta, confirma o e-mail, entra e completa nome/WhatsApp. Depois escolhe serviço, profissional, dia e horário e conclui o CAPTCHA. Não são aceitos pedidos anônimos. O horário fica pendente até a equipe aprovar em **Pedidos pelo site**. Na aprovação, o banco verifica disponibilidade novamente e confirma o agendamento em uma transação. Pedidos pendentes não bloqueiam horários; se outro atendimento ocupar o horário, a equipe deve combinar um novo horário. A aprovação ou recusa aparece na conta do cliente. Não há envio automático de WhatsApp nem SMS nesta versão.

Limites: oito tentativas por conexão/hora, no máximo três pedidos por conta/telefone em 24 horas e um pedido pendente recente por conta/telefone. A chave de idempotência evita duplicação por repetição do envio. Falhas de configuração ou de verificação antispam bloqueiam o pedido. Os limites por conexão usam HMAC, sem persistir o IP bruto no banco. O CAPTCHA impede reutilização de tokens, e o servidor verifica resultado, hostname e ação.

## 7. Fichas existentes e fotos

Um telefone informado no cadastro nunca dá acesso a uma ficha antiga. Para um cliente já cadastrado pela clínica, abra sua ficha em **Clientes > Vincular conta do cliente**, verifique a identidade da pessoa e use o e-mail confirmado da conta. O banco impede vincular contas da equipe ou trocar uma conta que já tenha pedidos/histórico em outra ficha sem revisão.

Fotos de evolução continuam no bucket privado. Em **Evolução**, use **Liberar para o cliente** para tornar uma foto acessível exclusivamente à conta vinculada à ficha. Observações clínicas e documentos internos não são expostos no portal. O cliente não acessa fotos não liberadas nem fotos de outras pessoas.

Fotos do site ficam em outro bucket, `site-media`, público. Imagens são convertidas para WebP e seus metadados removidos. Resultados e depoimentos exigem confirmação da autorização para publicação no editor. Não copie fotos clínicas para a galeria sem a autorização adequada. Retirar uma foto da seção remove sua exibição; arquivos públicos já compartilhados podem continuar em cache ou ter sido copiados por terceiros.

## Verificação de produção

Antes de ativar, teste uma conta real: confirmar e-mail, completar cadastro, enviar pedido, aprovar no painel, verificar o horário na agenda e na conta do cliente. Teste também uma foto liberada e uma não liberada. O Cloudflare real, SMTP e a rede de produção exigem essa verificação; os testes locais usam um substituto controlado somente para o serviço externo de CAPTCHA.
