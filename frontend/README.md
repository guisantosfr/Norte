# Norte Web — Frontend (Angular)

Interface web responsiva do **Norte**, construída com **Angular 22** (*Standalone Components*, *Signals* e *Lazy-Loaded Routes*) e **Tailwind CSS v4**, oferecendo suporte nativo a temas **Claro e Escuro** e integração completa com a API REST do Norte.

---

## Tecnologias Utilizadas

- **Framework**: Angular 22.2 (`@angular/core`, `@angular/router`, `@angular/forms`, `@angular/common/http`)
- **Linguagem**: TypeScript 6.0 (modo estrito habilitado)
- **Estilização & Design System**: Tailwind CSS 4.2 (`@tailwindcss/postcss`) com tokens semânticos em CSS Variables (`--primary`, `--support`, `--income`, `--expense`, `--pending`, `--cancelled`, `--info`) e suporte a modo Claro/Escuro
- **Gerenciamento de Estado**: Angular Signals (`signal`, `computed`) + RxJS (`7.8`)
- **Testes Unitários**: Vitest 5.0 + `@angular/build:unit-test` (`HttpTestingController` e `TestBed`)
- **Configuração de Ambiente**: Script Node (`scripts/set-env.mjs`) que sincroniza variáveis do arquivo `.env` ou do ambiente de CI/CD para os arquivos `src/environments/`

---

## Estrutura de Diretórios

```text
frontend/
├── env.example                        # Modelo de variáveis de ambiente
├── scripts/
│   └── set-env.mjs                    # Gerador automático de environment.ts a partir do .env
└── src/
    ├── styles.css                     # Tokens de tema Claro/Escuro e configuração Tailwind CSS v4
    └── app/
        ├── core/
        │   ├── auth/                  # AuthService (sessão, refresh single-flight, logout), authInterceptor, authGuard e guestGuard
        │   ├── http/                  # errorInterceptor global (401/429/5xx) e parser de ApiErrorResponse
        │   ├── models/                # Interfaces e tipos espelhando os DTOs do backend
        │   └── services/              # Serviços HTTP de domínio (Transactions, Categories, Financial, Recurrences, Notifications, Notes, Theme)
        ├── shared/
        │   ├── components/            # Componentes reutilizáveis (ToastContainer, ConfirmDialog, ThemeToggle)
        │   ├── services/              # ToastService
        │   └── validators/            # Validadores customizados (passwordMatchValidator, maxUtf8BytesValidator)
        ├── layout/
        │   ├── main-layout.component.ts           # Shell autenticado (Sidebar responsiva + Topbar)
        │   └── components/
        │       └── notification-bell.component.ts # Sino de lembretes com badge reativo e popover
        └── features/
            ├── auth/                  # Telas de Login (/login) e Criação de Conta (/register)
            ├── dashboard/             # Painel centralizado com perspectiva mensal padrão e seletor temporal (/dashboard)
            ├── transactions/          # Gestão de entradas e despesas avulsas (/transactions)
            ├── categories/            # Gestão de categorias (/categories)
            ├── financial/             # Indicadores consolidados e detalhamento por categoria (/financial)
            ├── recurrences/           # Administração de recorrências fixas e parcelamentos (/recurrences)
            ├── notifications/         # Central de lembretes (/notifications)
            └── notes/                 # Caderno de anotações pessoais com busca instantânea (/notes)
```

---

## Variáveis de Ambiente

O frontend utiliza o arquivo `.env` na raiz de `frontend/` (ou variáveis de ambiente do sistema de deploy como Vercel, Netlify ou Cloudflare Pages) para gerar automaticamente os arquivos `src/environments/environment.ts` e `src/environments/environment.development.ts` antes de cada comando (`prestart`, `prebuild`, `prewatch`, `pretest`).

1. Copie o arquivo `env.example` para `.env`:
   ```bash
   cp env.example .env
   ```
2. Configure a variável disponível:

| Variável | Obrigatória | Valor Padrão (Local) | Descrição |
| :--- | :---: | :--- | :--- |
| `API_URL` | Sim | `http://localhost:8080` | URL base da API Spring Boot do Norte (sem barra no final). |

---

## Como Executar Localmente

### Pré-requisitos
- **Node.js 20+** e **npm 10+** instalados

### 1. Instalar dependências
```bash
cd frontend
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp env.example .env
```

### 3. Iniciar servidor de desenvolvimento
```bash
npm start
```
- O script `prestart` executará `npm run config:env` automaticamente e subirá o servidor em `http://localhost:4200`.
- Certifique-se de que o backend esteja em execução em `http://localhost:8080` e com `CORS_ALLOWED_ORIGINS=http://localhost:4200`.

---

## Scripts Disponíveis (`package.json`)

| Comando | Descrição |
| :--- | :--- |
| `npm run config:env` | Gera `src/environments/environment.ts` e `environment.development.ts` a partir do `.env` ou variáveis do ambiente. |
| `npm start` | Inicia o servidor de desenvolvimento Angular em `http://localhost:4200` com live-reload. |
| `npm run build` | Compila e otimiza o bundle de produção em `dist/norte-frontend/browser`. |
| `npm test` | Executa a suíte de testes unitários com Vitest (`ng test`). |
| `npm test -- --watch=false` | Executa todos os testes unitários em modo headless/CI (execução única). |

---

## Autenticação, Refresh Token e Rate Limiting

- **Persistência de Sessão (`AuthService`)**: Armazena o `token` (Access JWT), o `refreshToken` e os dados públicos do usuário no `localStorage`. Na inicialização da aplicação (`initializeSession`), se o token de acesso estiver expirado ou ausente mas houver `refreshToken`, a sessão é renovada automaticamente antes de deslogar o usuário.
- **Renovação Transparente & Fila de Concorrência (`authInterceptor`)**:
  - Ao receber `HTTP 401` em rotas protegidas, o `authInterceptor` (executado internamente após o `errorInterceptor` no fluxo de resposta) solicita um novo par de tokens via `POST /auth/refresh` usando mecanismo *single-flight* (`shareReplay`).
  - Requisições paralelas que falhem simultaneamente aguardam a mesma chamada de renovação em voo (ou reaproveitam o token já rotacionado), evitando falso-positivo de reutilização de refresh token no backend.
  - Cada requisição é retentada no máximo uma vez (`IS_RETRY_AFTER_REFRESH`). Se a renovação falhar, o `errorInterceptor` limpa a sessão, exibe um aviso e redireciona para `/login`.
- **Logout com Revogação**: Ao sair, o `AuthService.logout()` envia `POST /auth/logout` com o `refreshToken` para invalidar toda a família de sessão no servidor e limpa o estado local imediatamente.
- **Rate Limiting (`429 Too Many Requests`)**: Nas telas de Login e Cadastro, alertas inline exibem a mensagem retornada pela API quando o limite de tentativas é excedido; em outras rotas, o `errorInterceptor` notifica o usuário via toast.

---

## Deploy em Produção

O frontend foi projetado como uma **Single Page Application (SPA)** estática que pode ser publicada em plataformas como **Vercel**, **Netlify**, **Cloudflare Pages** ou **Render Static Sites**:

1. **Diretório raiz do projeto na plataforma**: `frontend`
2. **Comando de build**: `npm run build`
3. **Diretório de saída (Output/Publish directory)**: `dist/norte-frontend/browser`
4. **Variável de ambiente na plataforma**:
   - `API_URL`: URL pública do seu backend publicado (ex.: `https://norte-api.seudominio.com`).
5. **Regra de Rewrite para SPA**: Configure o redirecionamento de todas as rotas (`/*`) para `/index.html` com status `200` para suportar o roteamento do Angular (`PathLocationStrategy`).
