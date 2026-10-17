# Testes de integridade

Estes testes usam dados fictícios. Não precisam de token, conta Vercel ou acesso à planilha.

Com o Node.js instalado, execute o comando abaixo na pasta do projeto:

```powershell
node --test
```

Os testes verificam regras financeiras, reenvios, recuperação após falhas, identidade dos registros, filtros e validação do proxy. Uma mensagem de falha deve ser investigada antes de publicar uma mudança.

Ao editar `index.html`, atualize também suas cópias com `node scripts/sincronizar-interface.cjs`. Um teste confere se os três arquivos continuam iguais, para evitar publicar uma interface antiga por engano.

Os testes locais não confirmam as permissões da implantação nem o comportamento da rede no celular. Depois de atualizar a cópia de teste, confira também os fluxos no PWA instalado.
