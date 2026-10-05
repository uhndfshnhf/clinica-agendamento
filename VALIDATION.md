# Validação da atualização — 05/10/2026

- `npm test`: 19 testes passaram, sem falhas nem testes ignorados.
- `npm run test:e2e`: 14 testes Chromium passaram, sem falhas nem testes ignorados.
- `npm run build`: build de produção passou.
- `node scripts/verify-original.mjs`: 26 arquivos de configuração, estilo e mídia originais permanecem idênticos byte a byte. O renderizador público foi adaptado ao conteúdo do painel.

## Segurança e banco

Testes com Supabase local real validaram contas de clientes sem acesso de equipe, isolamento entre fichas, catálogo sem e-mails/telefones privados, restrição de cadastro a e-mail confirmado, pedidos exclusivamente por função de servidor, limite por conta e telefone, envio idempotente, limites por conexão sob concorrência, aprovação restrita ao administrador e impedimento de aprovar dois pedidos para o mesmo horário. A disponibilidade pública não contém dados de pacientes.

Downloads reais de Storage verificaram: foto privada não liberada é negada, foto liberada só é lida pelo cliente vinculado, outro cliente é bloqueado e a revogação retira o acesso futuro. Evolução clínica e mídia pública usam buckets separados. Observações clínicas não são retornadas pelo portal.

O handler de servidor foi testado contra origem inválida, método incorreto, corpo excessivo, campos extras, falta de consentimento, honeypot, CAPTCHA inválido/hostname incorreto/ação incorreta, falta de configuração, sessão ausente, e-mail não confirmado, repetição e horário indisponível. Dados internos não são devolvidos nos erros. Endereços de conexão são transformados por HMAC para os limites persistidos.

## Navegador

O fluxo novo usa uma conta confirmada criada pela fixture local, completa o cadastro, escolhe um horário, passa pelo handler real com o verificador externo de CAPTCHA substituído somente no teste, salva no banco, aprova no painel e exibe a confirmação ao cliente. Foram validadas a edição da capa, a projeção dos serviços, a retirada de serviços ocultos, upload público real com conversão WebP e exibição da foto no site, além de ausência de erros de JavaScript/overflow nos fluxos testados.

A aparência padrão da capa e da apresentação é comparada em desktop/mobile. A tipografia das demais seções é comparada ao original; comparações pixel a pixel abaixo do catálogo foram substituídas por verificações de estilo porque o conteúdo dinâmico desloca as seções por frações de pixel. Os fluxos administrativos antigos, convites, recuperação de senha, agenda, conflitos, histórico e evolução privada também passaram.

## Limites da verificação

Não houve conexão autenticada ao Supabase/Vercel hospedados. As duas migrações e os segredos de servidor ainda precisam ser aplicados pelo responsável, conforme docs/ATIVAR-SITE-E-CLIENTES.md. O formulário público vem desativado por padrão e pedidos falham de forma fechada sem configuração/verificação válida. A confirmação de cadastro por e-mail/SMTP e o Turnstile reais precisam ser testados no domínio publicado. Estes testes não garantem imunidade a abuso distribuído nem representam teste de carga.
