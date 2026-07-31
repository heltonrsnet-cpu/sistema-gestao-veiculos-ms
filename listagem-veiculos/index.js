require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Cria a tabela específica para a listagem
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS veiculos_listagem (
      id SERIAL PRIMARY KEY,
      marca VARCHAR(100) NOT NULL,
      modelo VARCHAR(100) NOT NULL,
      ano INTEGER NOT NULL,
      placa VARCHAR(20) UNIQUE NOT NULL
    )
  `);
  console.log('📦 Tabela "veiculos_listagem" pronta.');
}

// REQUISITO: Receber eventos de novos cadastros e armazenar os dados
async function consumeRabbitMQ() {
  const connection = await amqp.connect(process.env.RABBITMQ_URL);
  const canal = await connection.createChannel();
  await canal.assertQueue('veiculos_cadastrados');

  console.log('🐇 Aguardando eventos na fila "veiculos_cadastrados"...');

  canal.consume('veiculos_cadastrados', async (mensagem) => {
    if (mensagem !== null) {
      const evento = JSON.parse(mensagem.content.toString());
      
      if (evento.tipo === 'NOVO_VEICULO') {
        const { marca, modelo, ano, placa } = evento.dados;
        try {
          // Armazena no banco de dados de leitura
          await pool.query(
            'INSERT INTO veiculos_listagem (marca, modelo, ano, placa) VALUES ($1, $2, $3, $4) ON CONFLICT (placa) DO NOTHING',
            [marca, modelo, ano, placa]
          );
          console.log(`✅ Novo veículo sincronizado via evento: ${placa}`);
        } catch (error) {
          console.error('Erro ao sincronizar veículo:', error);
        }
      }
      // Confirma ao RabbitMQ que a mensagem foi processada
      canal.ack(mensagem);
    }
  });
}

// REQUISITO: Expor endpoints para listar veículos e implementar filtros
app.get('/veiculos', async (req, res) => {
  try {
    const { marca, ano } = req.query;
    let query = 'SELECT * FROM veiculos_listagem WHERE 1=1';
    const values = [];
    let contadorParams = 1;

    if (marca) {
      query += ` AND marca ILIKE $${contadorParams}`;
      values.push(`%${marca}%`);
      contadorParams++;
    }
    if (ano) {
      query += ` AND ano = $${contadorParams}`;
      values.push(ano);
      contadorParams++;
    }

    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao buscar veículos.' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`🚀 Microsserviço de Listagem rodando na porta ${PORT}`);
  await initDB();
  await consumeRabbitMQ();
});