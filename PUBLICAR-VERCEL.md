# Publicar na Vercel

1. Extraia este ZIP e abra um terminal na pasta do projeto.
2. Execute `npm ci`.
3. Execute `npx vercel login` e entre na sua conta no navegador.
4. Execute `npx vercel --prod` e aceite criar um projeto novo. A configuração de build e as rotas do administrador já estão no arquivo vercel.json.

A Vercel informará o link público ao terminar. O site público pode ser publicado agora. O login administrativo dependerá da configuração do Supabase.

Depois, adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente da Vercel e faça um novo deploy. Use somente a chave pública anon/publishable. As migrações e a configuração do primeiro administrador estão no README.md.
