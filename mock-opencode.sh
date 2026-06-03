#!/bin/bash
# Mock script para simular o comportamento do OpenCode CLI e retornar findings em formato JSON estruturado

echo '{
  "findings": [
    {
      "severity": "high",
      "file": "src/cli/index.ts",
      "line": 15,
      "title": "Função muito extensa",
      "description": "A função action do comando run ultrapassou o limite recomendado pelas regras de arquitetura.",
      "suggestion": "Extraia a lógica interna para uma função auxiliar ou método na classe engine."
    },
    {
      "severity": "critical",
      "file": "src/cli/index.ts",
      "line": 2,
      "title": "Importação insegura ou não utilizada",
      "description": "Detectou-se uma dependência importada diretamente sem sanitização.",
      "suggestion": "Certifique-se de que os inputs da CLI sejam estritamente validados com zod."
    }
  ]
}'
