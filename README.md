# Gestor de Gastos

Webapp pessoal com interface PWA, proxy na Vercel e dados no Google Planilhas por meio do Apps Script.

- [Mapa do código e funções principais](MAPA_DO_CODIGO.md): onde editar cada recurso e como os módulos são incorporados.
- [Identidade visual](IDENTIDADE_VISUAL.md): ícones reservados e significado das cores em todo o webapp.
- [Mensal pelo calendário](MENSAL_MES_VIGENTE_20261028.md): entrada no mês atual, consultas manuais e remoção do avanço por quitação.
- [Pacote de continuidade de 28/10/2026](PACOTE_CONTINUIDADE_ANUAL_20261028.md): checklist, instalação, organização anual, PDFs e limites.
- [Correção da ativação anual e estados](AJUSTE_ATIVACAO_ESTADOS_20261028.md): validação do resumo, indicações explícitas e ícones.
- [Testes](tests/README.md): execução das regressões com dados fictícios.
- [Segurança da implantação](SEGURANCA_VERCEL.md): configuração do proxy e proteção de acesso.

Os demais relatórios com datas descrevem versões anteriores. Para instalar este pacote, seguir o guia de continuidade com a correção da ativação, protocolo 15 e cache v51. A Mensal agora abre no mês do calendário, sem opção de avanço por quitação.

## Desenvolvimento local

```powershell
npm test
npm run build
```

O build incorpora os módulos, compila estilos, sincroniza os HTMLs e prepara `dist/`. Não publica a Vercel nem o Apps Script. Evitar executar dois builds simultâneos sobre a mesma pasta.

Teste primeiro em **Cópia de Gestor de Gastos**. A base de uso definitivo é **Gestor de Gastos**. Cada projeto aponta para seu próprio ID; não substituir a base definitiva por uma restauração de testes.
