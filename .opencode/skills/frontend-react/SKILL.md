---
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

- Utilizar TypeScript strict-mode em todos os arquivos (`.ts`, `.tsx`), garantindo tipagem forte em props, retornos e estados.
- Evitar o uso de `any`. Definir interfaces e types claros para contratos e dados.
- Separar lógica de controle de streaming e estado do componente de visualização.
- Utilizar os runtimes e providers nativos do `assistant-ui` para sincronizar o estado das mensagens de forma reativa.
- Priorizar a reutilização de componentes do `assistant-ui-ui` e customizar seu estilo via variáveis CSS ou subcomponentes.

---

## Estrutura Recomendada

```text
src/
├── components/   # Componentes visuais reutilizáveis (botões, cards, renderizadores customizados)
├── hooks/        # Hooks customizados para gerenciar streams e estados
├── styles/       # Arquivos de estilização global e variáveis CSS
├── App.tsx       # Componente principal de configuração do runtime e layout de chat
└── main.tsx      # Ponto de entrada do React
```

---

## Configuração do Runtime e Chat

Para conectar a interface com o FastAPI e alimentar o componente `<Thread />` do assistant-ui, integramos o `useStream` do LangChain com o `useStreamRuntime` do assistant-ui.

### Exemplo Prático de Configuração (`App.tsx`)

```tsx
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
```

---

## Customização da UI (assistant-ui)

- **Variáveis CSS**: Customizar cores, fontes e espaçamentos do chat utilizando Custom Properties CSS definidas no root (ex: `--aui-primary-color`, `--aui-bg-color`).
- **Renderizadores Customizados**: Utilizar props no componente `<Thread />` para definir renderizadores customizados de mensagens (`Message`), avatares (`Avatar`), ferramentas (`ToolInvocations`) e estados de carregamento.

---

## Checklist de Geração de Código

Ao gerar código frontend:

- [ ] Garantir que todas as props e parâmetros estejam devidamente tipados no TypeScript.
- [ ] Configurar corretamente o `AssistantRuntimeProvider` com o runtime do LangChain.
- [ ] Importar os arquivos de estilos padrões do assistant-ui (`@assistant-ui/react-ui/styles/index.css`).
- [ ] Evitar manipulações manuais de array de mensagens para exibição; deixar o `useStream` e `useStreamRuntime` gerenciarem o histórico de streaming de forma transparente.
- [ ] Centralizar chamadas de endpoints e URLs do backend em variáveis de ambiente (`import.meta.env`).
- [ ] Seguir padrões modernos de CSS (preferencialmente Vanilla CSS e Flexbox/Grid) para manter a leveza do projeto.
