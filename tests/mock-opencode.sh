#!/bin/bash
echo '{
  "findings": [
    {
      "severity": "critical",
      "file": "src/service.ts",
      "line": 4,
      "title": "Chave Exposta",
      "description": "Hardcoded secret encontrada.",
      "suggestion": "Mova a chave para variáveis de ambiente."
    }
  ]
}'