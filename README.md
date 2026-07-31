# 🚗 Sistema de Gestão de Veículos (Microsserviços)

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![RabbitMQ](https://img.shields.io/badge/Rabbitmq-FF6600?style=for-the-badge&logo=rabbitmq&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2CA5E0?style=for-the-badge&logo=docker&logoColor=white)

## 📌 Sobre o Projeto
Este projeto consiste no desenvolvimento do back-end para um sistema de cadastro e listagem de veículos, adotando uma **Arquitetura Orientada a Eventos**. O sistema é dividido em dois microsserviços independentes, garantindo alta flexibilidade, resiliência e escalabilidade. 

A comunicação assíncrona entre os serviços é realizada utilizando o **RabbitMQ** como *Message Broker*, e a persistência de dados é feita no **PostgreSQL**. Toda a infraestrutura está conteinerizada com **Docker**.

## 🏗️ Arquitetura

1. **Microsserviço de Cadastro (Porta 3000):** 
   - Recebe as requisições de novos veículos.
   - Valida os dados antes do armazenamento.
   - Salva no banco de dados e publica um evento `NOVO_VEICULO` na fila do RabbitMQ.
   
2. **Microsserviço de Listagem (Porta 3001):**
   - Consome a fila do RabbitMQ em tempo real.
   - Disponibiliza endpoints para consulta e filtragem dos veículos cadastrados.

## 🚀 Tecnologias Utilizadas
- **Linguagem:** JavaScript / Node.js
- **Framework Web:** Express.js
- **Mensageria:** RabbitMQ (`amqplib`)
- **Banco de Dados:** PostgreSQL (`pg`)
- **Infraestrutura:** Docker & Docker Compose

## ⚙️ Como Executar

**Pré-requisitos:** É necessário ter o [Docker](https://www.docker.com/) instalado na sua máquina.

1. Clone este repositório:
   ```bash
   git clone https://github.com/heltonrsnet-cpu/prova-fase-5.git
   ```
2. Acesse a pasta do projeto:
   ```bash
   cd prova-fase-5
   ```
3. Suba toda a infraestrutura utilizando o Docker Compose:
   ```bash
   docker compose up -d --build
   ```

O comando acima irá baixar as dependências, criar os containers do banco de dados, da fila de mensagens e rodar os dois microsserviços automaticamente.

## 📡 Endpoints da API

### 1. Cadastrar Veículo (POST)
- **URL:** `http://localhost:3000/veiculos`
- **Body (JSON):**
  ```json
  {
    "marca": "Ford",
    "modelo": "Mustang",
    "ano": 2024,
    "placa": "XYZ-1234"
  }
  ```

### 2. Listar Veículos (GET)
- **URL:** `http://localhost:3001/veiculos`
- **Filtros suportados (Query Params):** `?marca=NomeDaMarca`
- **Exemplo de uso:** `http://localhost:3001/veiculos?marca=Ford`

## 👨‍💻 Autor
Desenvolvido por **Helton Rosa da Silva Abadia** como parte da avaliação da Fase 5 (Arquitetura de Microsserviços e Eventos).