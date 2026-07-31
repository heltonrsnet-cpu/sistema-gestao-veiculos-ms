require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

// 1. Configuração do PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Cria a tabela automaticamente se não existir
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS veiculos (
      id SERIAL PRIMARY KEY,
      marca VARCHAR(100) NOT NULL,
      modelo VARCHAR(100) NOT NULL,
      ano INTEGER NOT NULL,
      placa VARCHAR(20) UNIQUE NOT NULL
    )
  `);
  console.log('📦 Tabela "veiculos" verificada/criada com sucesso.');
}

// 2. Configuração do RabbitMQ (Message Broker)
let canalRabbitMQ;
async function connectRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  canalRabbitMQ = await connection.createChannel();
  // Cria a "fila" onde as mensagens serão deixadas
  await canalRabbitMQ.assertQueue('veiculos_cadastrados'); 
  console.log('🐇 Fila "veiculos_cadastrados" pronta no RabbitMQ!');
}

// 3. Rota principal: Cadastrar Veículo
app.post('/veiculos', async (req, res) => {
  const { marca, modelo, ano, placa } = req.body;

  // REQUISITO: Validar os dados antes de armazená-los
  if (!marca || !modelo || !ano || !placa) {
    return res.status(400).json({ erro: 'Todos os campos (marca, modelo, ano, placa) são obrigatórios.' });
  }
  if (typeof ano !== 'number' || ano < 1886) {
    return res.status(400).json({ erro: 'Ano inválido.' });
  }

  try {
    // REQUISITO: Armazenar os dados
    const result = await pool.query(
      'INSERT INTO veiculos (marca, modelo, ano, placa) VALUES ($1, $2, $3, $4) RETURNING *',
      [marca, modelo, ano, placa]
    );
    const novoVeiculo = result.rows[0];

    // REQUISITO: Publicar um evento informando que um novo veículo foi cadastrado
    const evento = {
      tipo: 'NOVO_VEICULO',
      dados: novoVeiculo
    };
    canalRabbitMQ.sendToQueue('veiculos_cadastrados', Buffer.from(JSON.stringify(evento)));

    res.status(201).json({
      mensagem: 'Veículo cadastrado e evento publicado com sucesso!',
      veiculo: novoVeiculo
    });

  } catch (error) {
    console.error(error);
    // Erro 23505 é o código do Postgres para violação de campo UNIQUE (placa repetida)
    if (error.code === '23505') {
      return res.status(409).json({ erro: 'Já existe um veículo cadastrado com esta placa.' });
    }
    res.status(500).json({ erro: 'Erro interno ao cadastrar veículo.' });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`🚀 Microsserviço de Cadastro rodando na porta ${PORT}`);
  await initDB();
  await connectRabbitMQ();
});