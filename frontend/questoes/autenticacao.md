```
baseando-se neste esquema

// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  ADMIN
  USER
}

model User {
  id                    String                 @id @default(cuid())
  name                  String?
  email                 String?                @unique
  emailVerified         DateTime?
  image                 String?
  password              String?
  role                  UserRole               @default(USER)
  accounts              Account[]
  isTwoFactorEnabled    Boolean                @default(false)
  twoFactorConfirmation TwoFactorConfirmation?
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model VerificationToken {
  id      String   @id @default(cuid())
  email   String
  token   String   @unique
  expires DateTime

  @@unique([email, token])
}

model PasswordResetToken {
  id      String   @id @default(cuid())
  email   String
  token   String   @unique
  expires DateTime

  @@unique([email, token])
}

model TwoFactorToken {
  id      String   @id @default(cuid())
  email   String
  token   String   @unique
  expires DateTime

  @@unique([email, token])
}

model TwoFactorConfirmation {
  id String @id @default(cuid())

  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId])
}


crie um sistema de autenticacao(com autenticacao de dois factores) next com typescritp com as seguintes rotas, usando o resend para enviar email na autenticacao de dois factores

  "/login", // Página de entrar
  "/register", // Página de criar conta
  "/error", // Página de erro, caso dê treta no login
  "/reset", // Onde o pessoal reseta a senha
  "/new-password", // Onde definem uma senha nova
  "/new-verification"

  

  "/api/login", // Página de entrar via api
  "/api/register", // Página de criar conta via api
  "/api/error", // Página de erro, caso dê treta no login via api
  "/api/reset", // Onde o pessoal reseta a senha via api
  "/api/new-password", // Onde definem uma senha nova via api
  "/new-verification" //  via api

rotas publicas como
"/contaco"

rotas publicas da api como
"/api/contaco"

rota protegida como
"/home"
"/profile"

rota protegida da api como
"/api/home"
"/api/profile"

obs:nao ignore nem uma informacao
```