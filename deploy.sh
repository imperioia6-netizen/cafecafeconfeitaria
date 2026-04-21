#!/bin/bash
# Deploy evolution-webhook edge function to Supabase
# Execute este script na raiz do projeto:
#   chmod +x deploy.sh && ./deploy.sh

set -e

PROJECT_REF="osewboiklhfiunetoxzo"
FUNCTION_NAME="evolution-webhook"

echo "🚀 Deploying $FUNCTION_NAME to Supabase..."
echo ""

# Check if supabase CLI is available
if ! command -v npx &> /dev/null && ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI não encontrado."
    echo "Instale com: npm install -g supabase"
    exit 1
fi

# Try direct supabase command first, then npx
if command -v supabase &> /dev/null; then
    supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF" --no-verify-jwt
else
    npx supabase functions deploy "$FUNCTION_NAME" --project-ref "$PROJECT_REF" --no-verify-jwt
fi

echo ""
echo "✅ Deploy concluído!"
echo "📌 Função: $FUNCTION_NAME"
echo "📌 Projeto: $PROJECT_REF"
