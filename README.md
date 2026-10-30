# Gestor de Gastos

Webapp pessoal com interface PWA, proxy na Vercel e dados no Google Planilhas por meio do Apps Script.

- [Conclusão das pendências — 30/10](CORRECOES_PENDENCIAS_20261030.md): fixos sem infinito, Atividade sem atalho de fatura, competências, formulário protegido, janela de pagamento e redução de cálculos redundantes.
- [Mensagens para WhatsApp em blocos — 30/10](WHATSAPP_BLOCOS_20261030.md): Empréstimos, Histórico e Simulação com informações separadas, parcelas claras e totais preservados.
- [Revisão antes da versão definitiva — 30/10](VISTORIA_PRE_DEFINITIVA_20261030.md): três falhas novas reproduzidas, dois helpers sem referências e medição com mil registros; diagnóstico sem mudanças nas regras do app.
- [Correções dos seis achados](CORRECOES_NOVOS_CASOS_20261029.md): correções implementadas e atualização do backend/interface.
- [Nova revisão de casos não cobertos](VISTORIA_NOVOS_CASOS_20261029.md): seis falhas reproduzidas, candidatos a limpeza e prioridades antes da versão definitiva; etapa de diagnóstico.
- [Revisão do Histórico e preparação definitiva](VISTORIA_HISTORICO_PRE_DEFINITIVA_20261029.md): correções, limpeza comprovada e verificações pendentes no ambiente real.
- [Conferência de fatura, Painel e nome do app](CONFERENCIA_PAINEL_IDENTIDADE_20261029.md): resumo mais leve, comparação com banco, lembretes e limite opcional.
- [Mapa do código e funções principais](MAPA_DO_CODIGO.md): onde editar cada recurso e como os módulos são incorporados.
- [Identidade visual](IDENTIDADE_VISUAL.md): ícones reservados e significado das cores em todo o webapp.
- [Pacote visual de 29/10/2026](PACOTE_VISUAL_20261029.md): menu uniforme, ícones, cores, filtros e validação.
- [Ajustes de empréstimos e navegação de 29/10/2026](AJUSTES_EMPRESTIMOS_NAVEGACAO_20261029.md): seleção, Voltar do celular, Pix compacto e atualização da identidade instalada.
- [Símbolos e alcance das parcelas](ESCOPO_PARCELAS_20261029.md): À vista, Parcelado, Fixo e menus de valor/data com prévia.
- [Mensal pelo calendário](MENSAL_MES_VIGENTE_20261028.md): entrada no mês atual, consultas manuais e remoção do avanço por quitação.
- [Correção de HTTP 504 na ativação](ATIVACAO_ANUAL_504_20261028.md): agendamento, andamento e retomada protegida.
- [Correção de competência anual inválida](COMPETENCIA_ANUAL_DATAS_20261028.md): meses guardados como datas, retomada da ativação e JSON anual restaurável.
- [Gravação de datas e transferência pendente](TRANSFERENCIA_ANUAL_TIPOS_20261028.md): prevenção de conversões automáticas, retomada conferida e consulta de backup independente.
- [Pacote de continuidade de 28/10/2026](PACOTE_CONTINUIDADE_ANUAL_20261028.md): checklist, instalação, organização anual, PDFs e limites.
- [Correção da ativação anual e estados](AJUSTE_ATIVACAO_ESTADOS_20261028.md): validação do resumo, indicações explícitas e ícones.
- [Testes](tests/README.md): execução das regressões com dados fictícios.
- [Segurança da implantação](SEGURANCA_VERCEL.md): configuração do proxy e proteção de acesso.

Os demais relatórios com datas descrevem versões anteriores. Para instalar este pacote, seguir o guia de continuidade e o ajuste de escopo das parcelas, protocolo 17 e cache v63. O editor de empréstimos exige o Backend/Code.gs atualizado. O ícone próprio do app está descrito na identidade visual. A Mensal abre no mês do calendário, sem opção de avanço por quitação. Ao reabrir a Central, a página ou ferramenta atual fica destacada em azul.

## Desenvolvimento local

```powershell
npm test
npm run build
```

O build incorpora os módulos, compila estilos, sincroniza os HTMLs e prepara `dist/`. Não publica a Vercel nem o Apps Script. Evitar executar dois builds simultâneos sobre a mesma pasta.

Teste primeiro em **Cópia de Gestor de Gastos**. A base de uso definitivo é **Gestor de Gastos**. Cada projeto aponta para seu próprio ID; não substituir a base definitiva por uma restauração de testes.
