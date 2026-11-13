# Norte API — Backend (Spring Boot)

API RESTful do **Norte**, responsável pela autenticação stateless via JWT, regras de negócio de gestão financeira pessoal (transações avulsas, categorias, indicadores consolidados, motor de recorrências e parcelamentos), geração automática de lembretes de vencimento e caderno de anotações pessoais.

---

## Tecnologias Utilizadas

- **Linguagem**: Java 25
- **Framework**: Spring Boot 4.1.2 (`spring-boot-starter-webmvc`, `spring-boot-starter-data-jpa`, `spring-boot-starter-security`, `spring-boot-starter-validation`)
- **Banco de Dados**: PostgreSQL
- **Migrações de Schema**: Flyway (`spring-boot-starter-flyway`, `flyway-database-postgresql` — versões `V1` a `V6`)
- **Autenticação & Segurança**: Spring Security + JSON Web Token (`jjwt 0.12.6`) + BCrypt
- **Documentação da API (OpenAPI 3 / Swagger)**: `springdoc-openapi-starter-webmvc-ui 3.2.0` (habilitada exclusivamente no perfil `dev`)
- **Testes Automatizados**: JUnit 5, Spring Boot Test, MockMvc e Spring Security Test
- **Containerização**: Docker (build multi-stage com `eclipse-temurin:25-jdk-alpine` e `eclipse-temurin:25-jre-alpine`)

---

## Estrutura de Pacotes

```text
backend/src/main/java/com/norte/norte_api/
├── config/          # Configurações de segurança (SecurityConfig, CORS), OpenAPI e relógio/timezone
├── controller/      # Endpoints REST (Auth, Transaction, Category, Financial, RecurringTransaction, Notification, Note)
├── dto/             # Records imutáveis de entrada e saída com Jakarta Bean Validation
├── exception/       # Hierarquia de exceções de domínio e GlobalExceptionHandler padronizado (ApiErrorResponse)
├── models/          # Entidades JPA e Enums de domínio
├── repository/      # Repositórios Spring Data JPA e Specifications dinâmicas
├── security/        # Filtro JWT (JwtAuthenticationFilter), JwtService e UserPrincipal
├── service/         # Regras de negócio, motor de recorrências e agendador de lembretes (NotificationScheduler)
└── validation/      # Validadores customizados (@PasswordMatches, @MaxUtf8Bytes)
```

---

## Variáveis de Ambiente

O backend lê automaticamente um arquivo `.env` na raiz da pasta `backend/` (via `spring.config.import=optional:file:.env[.properties]`) ou variáveis de ambiente injetadas pela plataforma de nuvem/container.

Copie o arquivo `env.example` para `.env` antes de executar localmente:

```bash
cp env.example .env
```

| Variável | Obrigatória | Exemplo (Desenvolvimento Local) | Descrição |
| :--- | :---: | :--- | :--- |
| `DB_URL` | Sim | `jdbc:postgresql://localhost:5432/norte` | URL JDBC de conexão com o banco PostgreSQL. |
| `DB_USER` | Sim | `postgres` | Usuário do banco de dados PostgreSQL. |
| `DB_PASSWORD` | Sim | `postgres` | Senha do banco de dados PostgreSQL. |
| `JWT_SECRET` | Sim | `chave-secreta-com-pelo-menos-32-caracteres-hmac-sha256` | Segredo HMAC-SHA para assinatura e validação dos tokens JWT (mínimo 256 bits / 32 caracteres). |
| `JWT_EXPIRATION_MS` | Sim | `86400000` | Tempo de expiração do token JWT em milissegundos (ex.: `86400000` = 24h). |
| `APP_TIMEZONE` | Sim | `America/Sao_Paulo` | Fuso horário padrão de referência da aplicação. |
| `CORS_ALLOWED_ORIGINS` | Sim | `http://localhost:4200` | Origens permitidas no CORS (separadas por vírgula se houver mais de uma). |
| `NOTIFICATION_REMINDER_CRON` | Sim | `0 0 6 * * *` | Expressão cron do agendador diário de lembretes (ex.: todos os dias às 06:00). |
| `NOTIFICATION_REMINDER_ZONE` | Sim | `America/Sao_Paulo` | Fuso horário utilizado pelo agendador de lembretes. |
| `NOTIFICATION_REMINDER_RUN_ON_STARTUP` | Sim | `true` | Define se a verificação de lembretes deve rodar também ao iniciar a aplicação (`true` ou `false`). |
| `PORT` | Não | `8080` | Porta HTTP no container Docker (padrão `8080`). |

---

## Como Executar Localmente

### Pré-requisitos
- **JDK 25** instalado e configurado no `PATH` (`java -version`)
- **PostgreSQL 15+** em execução com um banco criado (ex.: `CREATE DATABASE norte;`)

### 1. Configurar variáveis de ambiente
Crie o arquivo `backend/.env` a partir de `backend/env.example` e preencha os valores do seu ambiente local.

### 2. Executar em modo de desenvolvimento (com Swagger UI habilitado)
```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```
- A API estará disponível em: `http://localhost:8080`
- As migrações do Flyway (`V1` a `V6`) serão aplicadas automaticamente na inicialização.
- No perfil `dev`, a documentação interativa OpenAPI/Swagger pode ser acessada em:
  - **Swagger UI**: `http://localhost:8080/swagger-ui.html`
  - **OpenAPI JSON**: `http://localhost:8080/api-docs`

### 3. Executar a suíte de testes automatizados
```bash
cd backend
./mvnw test
```

### 4. Gerar o pacote de produção (JAR)
```bash
cd backend
./mvnw clean package -DskipTests
```

---

## Execução e Deploy com Docker

O `Dockerfile` na raiz de `backend/` utiliza build **multi-stage** para compilar o projeto com Maven + JDK 25 e gerar uma imagem final leve baseada em `eclipse-temurin:25-jre-alpine` rodando com usuário não-root.

### Construir a imagem Docker
```bash
cd backend
docker build -t norte-api:latest .
```

### Executar o container
```bash
docker run --rm -p 8080:8080 --env-file .env norte-api:latest
```

---

## Principais Endpoints da API

| Módulo | Método & Rota | Descrição |
| :--- | :--- | :--- |
| **Autenticação** | `POST /auth/register` | Cria conta de usuário e retorna token JWT + dados do usuário. |
| | `POST /auth/login` | Autentica credenciais e retorna token JWT + dados do usuário. |
| | `GET /auth/me` | Retorna os dados do usuário autenticado. |
| **Transações** | `GET /transactions` | Lista transações com filtros (`type`, `status`, `categoryId`, `recurringTransactionId`, `startDate`, `endDate`). |
| | `POST /transactions` | Cria transação genérica (com suporte a `categoryId` ou criação inline via `categoryName`). |
| | `POST /transactions/income` | Cria entrada (status padrão `PENDING` quando omitido). |
| | `POST /transactions/expense` | Cria despesa (status padrão `COMPLETED` quando omitido). |
| | `PUT /transactions/{id}` | Atualiza dados de uma transação existente. |
| | `PATCH /transactions/{id}/complete` | Efetiva um lançamento pendente (permite informar `realizedAmount` opcional). |
| | `PATCH /transactions/{id}/cancel` | Cancela um lançamento. |
| | `DELETE /transactions/{id}` | Remove permanentemente um lançamento avulso. |
| **Categorias** | `GET /categories` | Lista categorias do usuário (filtro opcional `active=true\|false`). |
| | `POST /categories` | Cria uma nova categoria. |
| | `PUT /categories/{id}` | Renomeia uma categoria existente. |
| | `DELETE /categories/{id}` | Exclui fisicamente se não houver vínculos ou inativa (`active=false`) preservando o histórico. |
| **Visão Financeira** | `GET /financial/summary` | Retorna saldos (`currentBalance`, `projectedBalance`) e resultados do período. |
| | `GET /financial/by-category` | Agrupa valores realizados e pendentes por categoria no período. |
| | `GET /financial/by-category/{categoryId}` | Detalha indicadores e transações de uma categoria específica. |
| **Recorrências e Parcelamentos** | `GET /recurring-transactions` | Lista séries recorrentes e parcelamentos (`active`, `type`, `categoryId`). |
| | `POST /recurring-transactions` | Cria recorrência fixa (`occurrences = null`) ou parcelamento (`occurrences >= 1`). |
| | `GET /recurring-transactions/{id}/transactions` | Lista todas as ocorrências geradas pela série em ordem cronológica. |
| | `PUT /recurring-transactions/{id}?scope=FUTURE\|ALL` | Atualiza série preservando ocorrências já realizadas/canceladas. |
| | `DELETE /recurring-transactions/{id}?scope=FUTURE\|ALL` | Encerra ou remove série conforme escopo e histórico. |
| **Lembretes** | `GET /notifications` | Lista lembretes do usuário (`status=UNREAD\|READ`). |
| | `GET /notifications/unread-count` | Retorna a contagem de lembretes não lidos. |
| | `PATCH /notifications/{id}/read` | Marca um lembrete específico como lido. |
| | `PATCH /notifications/read-all` | Marca todos os lembretes do usuário como lidos. |
| **Anotações** | `GET /notes?search=` | Lista anotações ordenadas por atualização, com busca textual em título e conteúdo. |
| | `POST /notes` | Cria uma nova anotação pessoal. |
| | `PUT /notes/{id}` | Atualiza título e conteúdo de uma anotação. |
| | `DELETE /notes/{id}` | Exclui permanentemente uma anotação. |
