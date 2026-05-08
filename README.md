# Digisac Viewer

Visualizador estatico para exportacao de conversas Digisac.

## Como usar localmente

```bat
npm run dev
```

Depois acesse o endereco exibido no terminal.

Configure as variaveis antes de iniciar:

```bat
set AUTH_USER=seu_usuario
set AUTH_PASS=sua_senha
npm run dev
```

## Como regenerar os dados

```bat
node scripts\prepare-data.js
```

O script le `..\tmp\chats-exports`, gera `public\data\index.json` e cria um arquivo JSON separado para cada conversa em `public\data\chats`.

## Vercel

Publique a pasta `digisac-viewer` como um site estatico. Nao ha etapa de build obrigatoria.

O arquivo `middleware.js` protege todas as rotas com Basic Auth, incluindo os arquivos `data/index.json` e `data/chats/*.json`.

Configure `AUTH_USER` e `AUTH_PASS` nas variaveis de ambiente da Vercel. Nao publique credenciais no repositorio.

Importante: os arquivos contem conversas, telefones e possiveis dados sensiveis. Publique em projeto privado e limite quem tem acesso ao painel da Vercel.
