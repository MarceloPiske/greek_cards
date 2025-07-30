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
