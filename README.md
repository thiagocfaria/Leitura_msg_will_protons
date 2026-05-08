# Digisac Viewer

Visualizador estatico para exportacao de conversas Digisac.

## Como usar localmente

```bat
npm run dev
```

Depois acesse o endereco exibido no terminal.

Login:

```text
wilderson@protonsconsultoria.com
```

Senha:

```text
Protons1
```

## Como regenerar os dados

```bat
node scripts\prepare-data.js
```

O script le `..\tmp\chats-exports`, gera `data\index.json` e cria um arquivo JSON separado para cada conversa em `data\chats`.

## Vercel

Publique a pasta `digisac-viewer` como um site estatico. Nao ha etapa de build obrigatoria.

O arquivo `middleware.ts` protege todas as rotas com Basic Auth, incluindo os arquivos `data/index.json` e `data/chats/*.json`.

Credenciais padrao:

```text
AUTH_USER=wilderson@protonsconsultoria.com
AUTH_PASS=Protons1
```

Para maior seguranca, configure `AUTH_USER` e `AUTH_PASS` nas variaveis de ambiente da Vercel e troque a senha se este projeto for enviado para um repositorio publico.

Importante: os arquivos contem conversas, telefones e possiveis dados sensiveis. Publique em projeto privado e limite quem tem acesso ao painel da Vercel.
