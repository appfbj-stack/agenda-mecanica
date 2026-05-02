# Oficina+ — Sistema de Gestão para Oficinas Mecânicas

PWA multi-tenant com backend FastAPI + PostgreSQL.

## Stack
- **Frontend**: React 19 + TypeScript + Vite (PWA)
- **Backend**: FastAPI + SQLAlchemy + PostgreSQL
- **Deploy**: Docker / Coolify

---

## Estrutura do Projeto

```
agenda-mecanica/
├── backend/                    # FastAPI
│   ├── app/
│   │   ├── main.py             # App entry, startup, CORS
│   │   ├── models.py           # Tabelas: Tenant, User, TenantModule,
│   │   │                       #  Customer, Vehicle, ServiceOrder, Lead
│   │   ├── schemas.py          # Pydantic I/O schemas
│   │   ├── deps.py             # Auth dependencies + require_module()
│   │   ├── core/
│   │   │   ├── config.py       # Settings via env vars
│   │   │   ├── database.py     # SQLAlchemy engine + get_db
│   │   │   └── security.py     # JWT + bcrypt + reset token
│   │   └── routes/
│   │       ├── auth.py         # /auth/*
│   │       ├── admin.py        # /admin/* (super_admin only)
│   │       ├── workshop.py     # /workshop/* (clientes, veículos, OS)
│   │       └── crm.py          # /crm/* (leads — módulo opcional)
│   ├── requirements.txt
│   └── Dockerfile
├── src/
│   ├── api.ts                  # HTTP client + todas as funções de API
│   └── AuthScreen.tsx          # Tela de login / cadastro / reset senha
├── App.tsx                     # App principal (adaptado para auth)
├── index.tsx                   # Root com auth guard
├── Dockerfile.frontend         # nginx para servir o build
├── docker-compose.yml          # backend + frontend + postgres
├── nginx.conf                  # SPA routing + proxy /api
└── .env.example                # Variáveis necessárias
```

---

## Deploy Coolify (passo a passo)

### 1. Variáveis de ambiente no Coolify

```env
DATABASE_URL=postgresql://postgres:SENHA@db:5432/oficina
SECRET_KEY=chave-aleatoria-segura-aqui
ADMIN_EMAIL=admin@suaoficina.com
ADMIN_PASSWORD=senha-do-super-admin
VITE_API_URL=https://api.suaoficina.com
```

### 2. Deploy do backend

- Repositório: este repo
- Build context: `./backend`
- Dockerfile: `./backend/Dockerfile`
- Porta: `8000`
- Adicionar variáveis acima

### 3. Deploy do frontend

- Build context: `.` (raiz)
- Dockerfile: `./Dockerfile.frontend`
- Build arg: `VITE_API_URL=https://api.suaoficina.com`
- Porta: `80`

### 4. PostgreSQL

- Use o addon PostgreSQL do Coolify ou external DB
- Passe a `DATABASE_URL` para o backend

---

## Desenvolvimento local

```bash
# Backend
cd backend
pip install -r requirements.txt
DATABASE_URL=postgresql://postgres:postgres@localhost/oficina uvicorn app.main:app --reload

# Frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

---

## Endpoints principais

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/auth/register` | Cadastro (cria tenant + user admin) |
| POST | `/auth/login` | Login — retorna JWT |
| GET  | `/auth/me` | Usuário atual |
| POST | `/auth/reset-password` | Solicitar reset de senha |
| POST | `/auth/reset-password/confirm` | Confirmar nova senha |

### Admin (super_admin only)
| Método | Rota | Descrição |
|--------|------|-----------|
| GET  | `/admin/tenants` | Listar todos os tenants |
| PATCH | `/admin/tenants/{id}` | Ativar/desativar tenant |
| GET  | `/admin/tenants/{id}/modules` | Ver módulos |
| PUT  | `/admin/tenants/{id}/modules` | Definir todos os módulos |
| PATCH | `/admin/tenants/{id}/modules` | Toggle módulo individual |

### Oficina
| Método | Rota | Descrição |
|--------|------|-----------|
| CRUD | `/workshop/customers` | Clientes |
| CRUD | `/workshop/vehicles` | Veículos |
| CRUD | `/workshop/service-orders` | Ordens de serviço |
| PATCH | `/workshop/service-orders/{id}/status` | Atualizar status |
| GET/PUT | `/workshop/settings` | Configurações da oficina |

### CRM (módulo `crm` deve estar ativo)
| Método | Rota | Descrição |
|--------|------|-----------|
| CRUD | `/crm/leads` | Leads comerciais |

---

## Módulos disponíveis

| Módulo | Descrição |
|--------|-----------|
| `crm` | CRM de leads |
| `agenda` | Agenda e lembretes |
| `kanban` | Board Kanban |
| `whatsapp` | Integração WhatsApp |
| `followup` | Follow-ups automáticos |
| `hermes` | IA Hermes (opcional) |
| `instagram` | Integração Instagram |
| `youtube` | Integração YouTube |

Ativar/desativar via painel admin: `PUT /admin/tenants/{id}/modules`

---

## Roles

| Role | Acesso |
|------|--------|
| `super_admin` | Tudo — painel admin, todos os tenants |
| `admin` | Tenant próprio — configurações, usuários |
| `client` | Funcionalidades liberadas pelo tenant |
