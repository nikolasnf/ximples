# Ximples Backend API

API REST para o SaaS Ximples — automação de marketing baseada em chat com IA.

## Stack

- Laravel 12 / PHP 8.3
- PostgreSQL
- Redis (queues)
- Laravel Sanctum (auth)

## Instalação

```bash
composer install
cp .env.example .env
php artisan key:generate

# Configurar banco PostgreSQL no .env

php artisan migrate
php artisan db:seed
php artisan serve
```

## Endpoints

### Auth
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | /api/v1/auth/signup | Cadastro |
| POST | /api/v1/auth/login | Login |
| POST | /api/v1/auth/logout | Logout |
| GET | /api/v1/auth/me | Usuário autenticado |

### Chat
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/v1/chat | Listar chats |
| GET | /api/v1/chat/{id} | Detalhe do chat |
| POST | /api/v1/chat/send | Enviar mensagem |

### Milestones & Assets
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/v1/milestones/{chatId} | Listar marcos |
| GET | /api/v1/assets/{chatId} | Listar ativos |

## Usuário de teste

- Email: admin@ximples.com.br
- Senha: password

## Filas

```bash
php artisan queue:work
```
