# Plano de Testes - Sistema de Pagamentos VistorIA

## Testes de Planos Mensais
1. Testar criação de assinatura com PIX
2. Testar criação de assinatura com Boleto
3. Testar criação de assinatura com Cartão de Crédito
4. Verificar webhook de confirmação de pagamento
5. Verificar ativação da assinatura no banco

## Testes de Pay-per-use (Créditos)
1. Testar compra de créditos com PIX
2. Testar compra de créditos com Boleto
3. Testar compra de créditos com Cartão
4. Verificar webhook de confirmação
5. Verificar adição de créditos na conta do usuário

## Pontos Críticos para Testar
- API Key do Asaas funcionando
- Integração com Supabase
- Funções RPC do banco
- Processamento de webhooks
- Tratamento de erros
