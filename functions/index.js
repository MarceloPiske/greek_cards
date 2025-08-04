// 1. Configuração Inicial
/* eslint-disable linebreak-style */
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");

// Mercado Pago v2 SDK
const { MercadoPagoConfig, PreApproval } = require("mercadopago");

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
  apoio: {
    title: "Κοινή – Apoio dos Heróis",
    transaction_amount: 9.90,
    frequency: 1,
    frequency_type: "months",
  },
};

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// 2. Criar Assinatura
app.post("/criar-assinatura", async (req, res) => {
  try {
    const { productId, payerEmail, userId } = req.body;

    if (!productId || !payerEmail || !userId) {
      return res.status(400).json({ error: "Parâmetros incompletos." });
    }

    const product = PRODUCTS[productId];
    if (!product) {
      return res.status(404).json({ error: "Produto não encontrado." });
    }

    const startDate = new Date();
    const formattedStartDate = startDate.toISOString().slice(0, -5) + "-03:00";

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

    const response = await preapproval.create({ body: subscriptionData });

    if (!response || !response.body || !response.body.init_point) {
      throw new Error("Resposta inválida do Mercado Pago.");
    }

    return res.status(200).json({ init_point: response.body.init_point });
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
    const { type, data } = req.body;

    if (type !== "subscription_preapproval" || !data.id) {
      console.warn("Webhook ignorado ou malformado.");
      return res.sendStatus(200);
    }

    const subscription = await preapproval.get({ id: data.id });
    const body = subscription.body;

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
        } else if (body.reason === PRODUCTS.apoio.title) {
          updateData.plan = "cloud"; // Mesma permissão
          updateData.supporter = true;
        }
        break;

      case "cancelled":
      case "paused":
      case "pending":
      case "expired":
        updateData.subscribed = false;
        updateData.plan = "none";
        updateData.supporter = admin.firestore.FieldValue.delete();
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
