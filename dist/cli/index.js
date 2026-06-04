#!/usr/bin/env node
import { Command } from 'commander';
import fs from 'fs/promises';
import path from 'path';
import { runReviewEngine } from '../core/engine.js';
const program = new Command();
program
    .name('review-agent')
    .description('Plataforma de Code Review Inteligente baseada em Skills e OpenCode')
    .version('1.0.0');
/**
 * Comando 'run': Executa o processo completo de revisão de código do projeto.
 *
 * Opções aceitas:
 * - `-c, --config`: Permite apontar para um arquivo alternativo de configurações em vez de `.review-agent.yml`.
 * - `--dry-run`: Executa a análise localmente e imprime o resultado formatado no console sem fazer chamadas à API do GitHub.
 */
program
    .command('run')
    .description('Executa a revisão automática do código com base no diff e nas skills nativas')
    .option('-c, --config <path>', 'Caminho alternativo para o arquivo .review-agent.yml')
    .option('--dry-run', 'Imprime os findings no console sem publicar no GitHub', false)
    .action(async (options) => {
    try {
        await runReviewEngine({
            configPath: options.config,
            dryRun: options.dryRun
        });
    }
    catch (error) {
        console.error(`❌ Erro durante a execução da revisão: ${error.message}`);
        process.exit(1);
    }
});
/**
 * Comando 'init': Inicializa a estrutura padrão necessária para o Review Agent rodar no projeto.
 *
 * Ações:
 * 1. Cria a árvore de pastas `.opencode/skills/` na raiz do projeto.
 * 2. Cria as skills `architecture` e `security` no padrão nativo do OpenCode (`SKILL.md` com YAML frontmatter).
 * 3. Cria o arquivo de configurações padrão `.review-agent.yml` contendo os limites e tempos limites sugeridos.
 */
program
    .command('init')
    .description('Inicializa a estrutura padrão de diretórios e arquivos de configuração')
    .action(async () => {
    try {
        console.info('Inicializando estrutura do Review Agent...');
        // 1. Cria diretórios de skills sob .opencode/skills
        const reactDir = path.join(process.cwd(), '.opencode', 'skills', 'frontend-react');
        const fastapiDir = path.join(process.cwd(), '.opencode', 'skills', 'backend-fastapi');
        await fs.mkdir(reactDir, { recursive: true });
        await fs.mkdir(fastapiDir, { recursive: true });
        console.info(`- Pastas de skills nativas criadas em .opencode/skills/`);
        // 2. Cria arquivos SKILL.md com frontmatter YAML
        const sampleReact = `---
name: frontend-react
description: Regras e padrões para desenvolvimento Frontend com React, TypeScript, assistant-ui e LangChain.
---
# Frontend React + TypeScript & Assistant-UI Skill

## Role

Você é um desenvolvedor Frontend especialista em React (v19+), TypeScript, Vite e integração de interfaces de IA (chat) com a biblioteca **assistant-ui** e **LangChain**.

Seu objetivo é criar interfaces de chat modernas, fluidas, tipadas, performáticas e altamente customizáveis para interação com assistentes baseados em LLMs.

---

## Tecnologias Preferidas

- React 19+
- TypeScript
- Vite
- @assistant-ui/react (gerenciador de runtime da interface de chat)
- @assistant-ui/react-ui (componentes de UI prontos para chat)
- @assistant-ui/react-langchain (integração do runtime do assistant-ui com LangChain)
- @langchain/react (gerenciamento de chamadas e fluxo de streaming)
- CSS Vanilla (com suporte a Custom Properties e CSS Modules para estilização flexível)

---

## Regras Gerais

- Utilizar TypeScript strict-mode em todos os arquivos (\`.ts\`, \`.tsx\`), garantindo tipagem forte em props, retornos e estados.
- Evitar o uso de \`any\`. Definir interfaces e types claros para contratos e dados.
- Separar lógica de controle de streaming e estado do componente de visualização.
- Utilizar os runtimes e providers nativos do \`assistant-ui\` para sincronizar o estado das mensagens de forma reativa.
- Priorizar a reutilização de componentes do \`assistant-ui-ui\` e customizar seu estilo via variáveis CSS ou subcomponentes.

---

## Estrutura Recomendada

\`\`\`text
src/
├── components/   # Componentes visuais reutilizáveis (botões, cards, renderizadores customizados)
├── hooks/        # Hooks customizados para gerenciar streams e estados
├── styles/       # Arquivos de estilização global e variáveis CSS
├── App.tsx       # Componente principal de configuração do runtime e layout de chat
└── main.tsx      # Ponto de entrada do React
\`\`\`

---

## Configuração do Runtime e Chat

Para conectar a interface com o FastAPI e alimentar o componente \`<Thread />\` do assistant-ui, integramos o \`useStream\` do LangChain com o \`useStreamRuntime\` do assistant-ui.

### Exemplo Prático de Configuração (\`App.tsx\`)

\`\`\`tsx
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { Thread } from "@assistant-ui/react-ui";
import "@assistant-ui/react-ui/styles/index.css";
import { useStreamRuntime } from "@assistant-ui/react-langchain";
import { useStream } from "@langchain/react";

export default function App() {
  // 1. Gerencia a chamada de streaming para o backend FastAPI
  const stream = useStream({
    apiUrl: "http://localhost:8000/chat", // Endpoint FastAPI
  });

  // 2. Converte as mensagens que chegam em estados visuais para o assistant-ui
  const runtime = useStreamRuntime(stream);

  return (
    <div className="chat-container">
      <AssistantRuntimeProvider runtime={runtime}>
        <Thread />
      </AssistantRuntimeProvider>
    </div>
  );
}
\`\`\`

---

## Customização da UI (assistant-ui)

- **Variáveis CSS**: Customizar cores, fontes e espaçamentos do chat utilizando Custom Properties CSS definidas no root (ex: \`--aui-primary-color\`, \`--aui-bg-color\`).
- **Renderizadores Customizados**: Utilizar props no componente \`<Thread />\` para definir renderizadores customizados de mensagens (\`Message\`), avatares (\`Avatar\`), ferramentas (\`ToolInvocations\`) e estados de carregamento.

---

## Checklist de Geração de Código

Ao gerar código frontend:

- [ ] Garantir que todas as props e parâmetros estejam devidamente tipados no TypeScript.
- [ ] Configurar corretamente o \`AssistantRuntimeProvider\` com o runtime do LangChain.
- [ ] Importar os arquivos de estilos padrões do assistant-ui (\`@assistant-ui/react-ui/styles/index.css\`).
- [ ] Evitar manipulações manuais de array de mensagens para exibição; deixar o \`useStream\` e \`useStreamRuntime\` gerenciarem o histórico de streaming de forma transparente.
- [ ] Centralizar chamadas de endpoints e URLs do backend em variáveis de ambiente (\`import.meta.env\`).
- [ ] Seguir padrões modernos de CSS (preferencialmente Vanilla CSS e Flexbox/Grid) para manter a leveza do projeto.
`;
        await fs.writeFile(path.join(reactDir, 'SKILL.md'), sampleReact, 'utf-8');
        const sampleFastapi = `---
name: backend-fastapi
description: Regras e padrões para desenvolvimento Backend com FastAPI, LangChain, LangGraph e Pydantic.
---
# Backend FastAPI & LangChain Skill

## Role

Você é um desenvolvedor Backend especialista em FastAPI, LangChain e LangGraph.

Seu objetivo é criar APIs performáticas, bem estruturadas, seguras e fáceis de manter para alimentar assistentes de inteligência artificial baseados em LLMs e grafos de estados.

---

## Tecnologias Preferidas

- Python 3.14+
- FastAPI
- Uvicorn
- Pydantic v2 (para schemas e estados do LangGraph)
- LangChain / LangChain Core
- LangGraph (para fluxos de agentes baseados em grafos de estados)
- LangChain Google GenAI / LangChain OpenAI (provedores de LLM)
- python-dotenv (para variáveis de ambiente)

---

## Regras Gerais

- Utilizar Type Hints (tipagem estática) em todas as funções e métodos.
- Priorizar programação assíncrona (\`async\`/\`await\`) para todas as chamadas de rede, I/O e invocações de modelos/grafos.
- Separar regras de negócios e fluxos de agentes das rotas HTTP.
- Manter lógica de grafos auto-contida em classes/funções utilitárias de agentes.
- Garantir segurança e tratamento de erros adequado (retornos limpos mesmo quando LLMs falharem).

---

## Estrutura Recomendada

\`\`\`text
app/
├── api/          # Rotas, dependências HTTP e controladores de stream
├── agents/       # Definições de grafos (LangGraph), nodes, edges e chains (LangChain)
├── schemas/      # Modelos Pydantic para requisições, respostas e estados do grafo
├── core/         # Configurações do projeto e inicialização dos clientes LLM
└── main.py       # Ponto de entrada da aplicação FastAPI
\`\`\`

---

## Rotas e Streaming

As rotas FastAPI devem apenas receber as requisições, instanciar/chamar os agentes e retornar as respostas (ou streams de respostas).

Para conectar com o hook \`useStream\` do \`@langchain/react\` ou runtime do \`@assistant-ui/react\`, o backend deve retornar um fluxo SSE (Server-Sent Events) utilizando \`StreamingResponse\`.

### Exemplo de Endpoint de Streaming SSE

\`\`\`python
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from app.schemas.chat import ChatRequest
from app.agents.my_agent import graph

router = APIRouter(prefix="/chat", tags=["Chat"])

@router.post("")
async def chat_endpoint(request: ChatRequest):
    async def event_generator():
        # Executa o grafo de forma assíncrona gerando eventos
        async for chunk in graph.astream(
            {"messages": [("user", request.message)]},
            stream_mode="updates"
        ):
            # Formata no padrão de Server-Sent Events (SSE)
            # Onde cada evento possui um tipo (event) e dados (data) em JSON
            yield f"event: updates\\n"
            yield f"data: {json.dumps(chunk)}\\n\\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
\`\`\`

---

## Agentes (LangGraph)

Toda lógica de conversação e ferramentas (tools) deve ser modelada preferencialmente usando o LangGraph para permitir controle do fluxo.

- Definir o estado do grafo utilizando schemas do Pydantic (\`BaseModel\`) ou herdar de \`TypedDict\`.
- Definir os nós do grafo (\`Nodes\`) como funções ou métodos assíncronos.
- Utilizar \`MemorySaver\` ou adaptadores de banco de dados do LangGraph para gerenciar a persistência de threads e históricos.

### Exemplo de Configuração de Agente

\`\`\`python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from app.schemas.agent import AgentState

# Define o grafo
workflow = StateGraph(AgentState)

# Adiciona nós
workflow.add_node("call_model", call_model_node)
workflow.add_node("tools", tool_executor_node)

# Configura as transições (edges)
workflow.add_edge(START, "call_model")
workflow.add_conditional_edges("call_model", should_continue)
workflow.add_edge("tools", "call_model")

# Compila o grafo com persistência em memória
graph = workflow.compile(checkpointer=MemorySaver())
\`\`\`

---

## Tratamento de Erros

Em chamadas a LLMs e execuções de ferramentas, capture exceções apropriadamente para evitar falhas silenciosas ou vazamento de chaves internas no log. Retorne mensagens amigáveis de erro ou estados alternativos no stream.

\`\`\`python
from fastapi import HTTPException

try:
    # chamada ao modelo
    response = await model.ainvoke(messages)
except Exception as e:
    # Log da exceção real localmente
    logger.error(f"Erro na chamada do modelo: {e}")
    raise HTTPException(
        status_code=500,
        detail="Ocorreu um erro ao processar sua solicitação com o modelo de linguagem."
    )
\`\`\`

---

## Checklist de Geração de Código

Ao gerar código backend:

- [ ] Utilizar type hints em todos os parâmetros e retornos.
- [ ] Criar schemas Pydantic para validação e tipagem do estado de entrada/saída.
- [ ] Priorizar métodos assíncronos (\`ainvoke\`, \`astream\`, \`astream_events\`) nas chamadas do LangChain.
- [ ] Retornar respostas em formato SSE (\`text/event-stream\`) estruturado para endpoints de chat.
- [ ] Separar a lógica do agente do código HTTP da API.
- [ ] Utilizar variáveis de ambiente via \`pydantic-settings\` ou \`dotenv\` para chaves de API e configurações.
`;
        await fs.writeFile(path.join(fastapiDir, 'SKILL.md'), sampleFastapi, 'utf-8');
        console.info('- Habilidades de exemplo (frontend-react/SKILL.md e backend-fastapi/SKILL.md) criadas sob .opencode/skills/.');
        // 3. Cria arquivo de configuração inicial .review-agent.yml
        const sampleConfig = `version: 1

review:
  max_findings: 20
  timeoutSeconds: 300
  maxRetries: 3

output:
  mode: both
`;
        const configPath = path.join(process.cwd(), '.review-agent.yml');
        await fs.writeFile(configPath, sampleConfig, 'utf-8');
        console.info(`- Arquivo de configuração padrão criado em: ${configPath}`);
        console.info('🎉 Estrutura inicial do Review Agent configurada com sucesso!');
        console.info('💡 Você pode criar novas regras adicionando mais pastas em: .opencode/skills/<nome-da-regra>/SKILL.md');
    }
    catch (error) {
        console.error(`❌ Erro ao inicializar a estrutura: ${error.message}`);
        process.exit(1);
    }
});
program.parse(process.argv);
export default program;
