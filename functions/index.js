<<<<<<< HEAD
/* eslint-disable no-fallthrough */
/* eslint-disable max-len */
// 1. Configuração Inicial
/* eslint-disable linebreak-style */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Mercado Pago v2 SDK
const {MercadoPagoConfig, PreApproval} = require("mercadopago");

admin.initializeApp();
const db = admin.firestore();

// Instância do Mercado Pago com token seguro
const mp = new MercadoPagoConfig({
  accessToken: "APP_USR-6736740569035182-072501-a6a4e8e366d892beca95dc594278c49e-308747519",
});
const preapproval = new PreApproval(mp);

// Produtos disponíveis para assinatura
const PRODUCTS = {
  cloud: {
    title: "Κοινή – Armazenamento Online",
    transaction_amount: 4.90,
    frequency: 1,
    frequency_type: "months",
  },
  hero: {
    title: "Κοινή – Apoio dos Heróis",
    transaction_amount: 9.90,
    frequency: 1,
    frequency_type: "months",
  },
};

const app = express();
app.use(cors({origin: true}));
app.use(express.json());

// 2. Criar Assinatura
app.post("/criar-assinatura", async (req, res) => {
  try {
    const {productId, payerEmail, userId} = req.body;

    if (!productId || !payerEmail || !userId) {
      return res.status(400).json({error: "Parâmetros incompletos."});
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(404).json({error: "Produto não encontrado."});
    }

    const startDate = new Date(); // ou a data que você precisa
    const formattedStartDate = startDate.toISOString();
    console.log(formattedStartDate); // Ex: "2025-08-06T02:44:58.123Z"

    const subscriptionData = {
      reason: product.title,
      external_reference: userId,
      payer_email: payerEmail,
      back_url: "https://grego-koine.web.app/",
      notification_url: "https://api-jnggpsogma-uc.a.run.app/webhook",
      auto_recurring: {
        frequency: product.frequency,
        frequency_type: product.frequency_type,
        transaction_amount: product.transaction_amount,
        currency_id: "BRL",
        start_date: formattedStartDate,
      },
    };

    const response = await preapproval.create({body: subscriptionData});

    const statusCode = Number(response.status);

    if (statusCode >= 200 && statusCode < 300) {
      throw new Error("Resposta inválida do Mercado Pago.");
    }

    return res.status(201).json({resposne: response});
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    return res.status(500).json({
      error: "Erro ao criar assinatura.",
      details: error.message,
    });
  }
});

// 3. Webhook
app.post("/webhook", async (req, res) => {
  try {
    const {type, data} = req.body;

    if (type !== "subscription_preapproval" || !data.id) {
      console.warn("Webhook ignorado ou malformado.");
      return res.sendStatus(200);
    }

    const subscription = await preapproval.get({id: data.id});
    console.log("Dados da assinatura recebidos:", subscription);

    const body = subscription;

    const userId = body.external_reference;
    if (!userId) {
      return res.status(400).send("external_reference ausente.");
    }

    const updateData = {
      lastUpdate: admin.firestore.Timestamp.now(),
      subscriptionStatus: body.status,
    };

    switch (body.status) {
      case "authorized":
        updateData.subscribed = true;

        if (body.reason === PRODUCTS.cloud.title) {
          updateData.plan = "cloud";
        } else if (body.reason === PRODUCTS.hero.title) {
          updateData.plan = "cloud"; // Mesma permissão
          updateData.supporter = true;
        }
        break;

      case "cancelled":
        updateData.subscribed = false;
        updateData.plan = "cancelled";
      case "paused":
        updateData.subscribed = false;
        updateData.plan = "paused";
      case "pending":
        updateData.subscribed = false;
        updateData.plan = "pending";
      case "expired":
        updateData.subscribed = false;
        updateData.plan = "expired";
        // updateData.supporter = admin.firestore.FieldValue.delete();
        break;

      default:
        console.log(`Status '${body.status}' sem ação.`);
        return res.sendStatus(200);
    }

    await db.collection("users").doc(userId).update(updateData);
    return res.sendStatus(200);
  } catch (error) {
    console.error("Erro no webhook:", error);
    return res.sendStatus(500);
  }
});

// Exporta como função do Firebase
exports.api = functions.https.onRequest(app);
=======
/* eslint-disable max-len */
// 1. IMPORTAÇÃO DAS BIBLIOTECAS
import express from "express";
import {MercadoPagoConfig, PreApproval} from "mercadopago";

// --- CONFIGURAÇÃO INICIAL ---

// 2. INICIALIZAÇÃO DO SERVIDOR EXPRESS
const app = express();
// Configura o Express para interpretar o corpo das requisições como JSON
app.use(express.json());

// 3. CONFIGURAÇÃO DO MERCADO PAGO
// **IMPORTANTE**: Substitua 'SEU_ACCESS_TOKEN_AQUI' pelo seu Access Token.
// Em um projeto real, use variáveis de ambiente: const accessToken = process.env.MP_ACCESS_TOKEN;
const accessToken = "TEST-6736740569035182-072501-13523b04148279b3dacf30e7cf98815a-308747519";

const client = new MercadoPagoConfig({accessToken: accessToken, options: {timeout: 5000}});
const preapproval = new PreApproval(client);

// 4. ESTRUTURA DE PRODUTOS
const PRODUCTS = {
  cloud: {
    title: "Assinatura Cloud",
    price: 4.99,
  },
  apoio: {
    title: "Apoio Hall dos Heróis",
    price: 9.90,
  },
};

// --- ROTAS DA APLICAÇÃO ---

/**
 * Rota para verificar se o servidor está funcionando.
 * Acesse http://localhost:3000 no navegador.
 */
app.get("/", (req, res) => {
  res.send("Servidor de assinaturas está no ar!");
});

/**
 * Rota para criar um link de assinatura.
 * Exemplo de corpo da requisição (body):
 * {
 * "productId": "apoio", // ou "cloud"
 * "payerEmail": "email.do.cliente@exemplo.com"
 * }
 */
app.post("/criar-assinatura", async (req, res) => {
  const {productId, payerEmail} = req.body;

  // Valida se o produto solicitado existe na nossa lista
  const product = PRODUCTS[productId];
  if (!product) {
    return res.status(404).json({error: "Produto não encontrado."});
  }

  // Dados da assinatura a serem enviados para a API do Mercado Pago
  const subscriptionData = {
    reason: product.title,
    auto_recurring: {
      frequency: 1, // Frequência da cobrança (1 = a cada X 'frequency_type')
      frequency_type: "months", // Tipo de frequência: 'days' ou 'months'
      transaction_amount: product.price,
      currency_id: "BRL", // Moeda: Real Brasileiro
    },
    payer_email: payerEmail,
    back_url: "https://grego-koine.web.app/", // URL para redirecionar o cliente após o pagamento
    // URL para a qual o Mercado Pago enviará notificações sobre esta assinatura
    notification_url: "https://grego-koine.web.app//webhook",
  };

  try {
    // Cria a assinatura no Mercado Pago
    const result = await preapproval.create({body: subscriptionData});

    console.log("Link de assinatura gerado:", result);

    // Retorna o ID da assinatura e o link de checkout para o frontend
    return res.status(201).json({
      subscriptionId: result.id,
      init_point: result.init_point, // URL que o cliente deve acessar para pagar
    });
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    return res.status(500).json({error: "Falha ao se comunicar com a API do Mercado Pago."});
  }
});

/**
 * Rota de Webhook para receber notificações do Mercado Pago.
 */
app.post("/webhook", (req, res) => {
  // As notificações podem vir no 'query' ou no 'body', dependendo da versão da API
  console.log("--- Notificação de Webhook Recebida ---");
  console.log("Query:", req.query);
  console.log("Body:", req.body);

  if (req.body.type === "preapproval") {
    const subscriptionId = req.body.data.id;
    console.log(`Recebida notificação para a assinatura: ${subscriptionId}`);

    // LÓGICA DE NEGÓCIO:
    // 1. Use o 'subscriptionId' para consultar o status mais recente da assinatura na API do Mercado Pago.
    //    const subscriptionDetails = await preapproval.get({ id: subscriptionId });
    // 2. Atualize o status da assinatura no seu banco de dados (ex: 'liberar acesso', 'bloquear acesso').
  }

  // Responde ao Mercado Pago com status 200 para confirmar que a notificação foi recebida.
  res.status(200).send("OK");
});


// --- INICIALIZAÇÃO DO SERVIDOR ---
/* const PORT = process.env.PORT || 3000; */
/* app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 Para testar, envie um POST para http://localhost:${PORT}/criar-assinatura`);
}); */
>>>>>>> 485a7111651673321d36bac1405974bd151865fc
