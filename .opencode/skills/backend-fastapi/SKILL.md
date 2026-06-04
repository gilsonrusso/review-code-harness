---
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
- Priorizar programação assíncrona (`async`/`await`) para todas as chamadas de rede, I/O e invocações de modelos/grafos.
- Separar regras de negócios e fluxos de agentes das rotas HTTP.
- Manter lógica de grafos auto-contida em classes/funções utilitárias de agentes.
- Garantir segurança e tratamento de erros adequado (retornos limpos mesmo quando LLMs falharem).

---

## Estrutura Recomendada

```text
app/
├── api/          # Rotas, dependências HTTP e controladores de stream
├── agents/       # Definições de grafos (LangGraph), nodes, edges e chains (LangChain)
├── schemas/      # Modelos Pydantic para requisições, respostas e estados do grafo
├── core/         # Configurações do projeto e inicialização dos clientes LLM
└── main.py       # Ponto de entrada da aplicação FastAPI
```

---

## Rotas e Streaming

As rotas FastAPI devem apenas receber as requisições, instanciar/chamar os agentes e retornar as respostas (ou streams de respostas).

Para conectar com o hook `useStream` do `@langchain/react` ou runtime do `@assistant-ui/react`, o backend deve retornar um fluxo SSE (Server-Sent Events) utilizando `StreamingResponse`.

### Exemplo de Endpoint de Streaming SSE

```python
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
            yield f"event: updates\n"
            yield f"data: {json.dumps(chunk)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

## Agentes (LangGraph)

Toda lógica de conversação e ferramentas (tools) deve ser modelada preferencialmente usando o LangGraph para permitir controle do fluxo.

- Definir o estado do grafo utilizando schemas do Pydantic (`BaseModel`) ou herdar de `TypedDict`.
- Definir os nós do grafo (`Nodes`) como funções ou métodos assíncronos.
- Utilizar `MemorySaver` ou adaptadores de banco de dados do LangGraph para gerenciar a persistência de threads e históricos.

### Exemplo de Configuração de Agente

```python
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
```

---

## Tratamento de Erros

Em chamadas a LLMs e execuções de ferramentas, capture exceções apropriadamente para evitar falhas silenciosas ou vazamento de chaves internas no log. Retorne mensagens amigáveis de erro ou estados alternativos no stream.

```python
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
```

---

## Checklist de Geração de Código

Ao gerar código backend:

- [ ] Utilizar type hints em todos os parâmetros e retornos.
- [ ] Criar schemas Pydantic para validação e tipagem do estado de entrada/saída.
- [ ] Priorizar métodos assíncronos (`ainvoke`, `astream`, `astream_events`) nas chamadas do LangChain.
- [ ] Retornar respostas em formato SSE (`text/event-stream`) estruturado para endpoints de chat.
- [ ] Separar a lógica do agente do código HTTP da API.
- [ ] Utilizar variáveis de ambiente via `pydantic-settings` ou `dotenv` para chaves de API e configurações.
