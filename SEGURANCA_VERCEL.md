# Segurança gratuita do Gestor Financeiro no Vercel

Este roteiro mantém GitHub, Vercel, Apps Script e a instalação como PWA. A proteção gratuita do Vercel cobre endereços de Preview; no plano Hobby o domínio de produção continua público. Por isso, o app instalado deve usar o endereço de Preview protegido. A API do domínio de produção será bloqueada pelo código.

## Antes de começar

1. Confira no Vercel qual branch está marcada como **Production Branch**. A branch que usaremos para o app protegido precisa ser outra. Se `New` estiver como Production Branch, crie ou escolha uma branch de teste diferente e use-a nos passos abaixo.
2. Mantenha o Apps Script e a propriedade de ID da planilha apontando para a cópia de teste. Não use ainda a planilha original.
3. Faça commit e envie para o GitHub as mudanças deste projeto. O Vercel criará uma implantação de Preview.

## 1. Gere o segredo de acesso

No PowerShell do Windows, rode este comando. Ele mostra um código aleatório de 32 bytes; copie-o para usar nos dois lugares abaixo. Não o coloque no código, no GitHub nem nesta conversa.

```powershell
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

## 2. Configure o Apps Script de teste

1. Abra o projeto Apps Script ligado à cópia da planilha.
2. No projeto local do GitHub, abra `Backend/Code.gs`, copie o arquivo inteiro e cole por cima do conteúdo de `Código.gs` no editor Apps Script. Salve.
3. Abra **Configurações do projeto → Propriedades do script**.
4. Adicione `GESTOR_API_TOKEN` e cole o segredo gerado.
5. Remova `GESTOR_API_BRIDGE_ENABLED` caso exista, ou defina como `false`. Isso desliga a página antiga de prévia do Apps Script; a interface será aberta pelo endereço protegido do Vercel.
6. Confira que a propriedade com o ID da planilha ainda aponta para a cópia de teste.
7. Clique em **Implantar → Gerenciar implantações** e edite a implantação de teste como uma nova versão. Configure **Executar como: Eu** e **Quem tem acesso: Qualquer pessoa**. O endereço `/exec` pode ser acessado publicamente, mas operações sem o segredo não serão aceitas.
8. Copie o endereço `/exec` dessa implantação. Não use `/dev`.

## 3. Configure os segredos no Vercel

1. No painel do Vercel, abra o projeto do Gestor Financeiro.
2. Em **Settings → Environment Variables**, crie:
   - `GESTOR_API_URL`: o endereço `/exec` da implantação Apps Script de teste.
   - `GESTOR_API_TOKEN`: o mesmo segredo criado no passo 1.
3. Marque **Preview** como ambiente para as duas variáveis. Deixe **Production** desmarcado.
4. Salve. O Vercel precisa de uma nova implantação após alterar variáveis. Faça um novo commit na branch de teste ou use **Redeploy** nessa implantação.

## 4. Ative o login do Vercel no Preview

1. No painel do projeto Vercel, abra **Settings → Deployment Protection**.
2. Ative **Vercel Authentication** para as implantações de **Preview**. A configuração exata pode variar um pouco conforme a tela do painel.
3. Deixe a Production sem variáveis da API e confirme que o teste pede login ao abrir o endereço Preview.
4. Abra **Deployments**, selecione a implantação da branch de teste e copie seu endereço de branch/Preview. Esse endereço acompanha as novas implantações daquela branch; o domínio de produção não serve para este uso.

## 5. Teste e instale o PWA

1. Abra o endereço Preview em uma janela normal e entre com sua conta Vercel.
2. Confirme que carregam Painel, Histórico, Mensal, Anual, Categorias e Ferramentas.
3. Faça um lançamento pequeno na planilha de teste, confira que apareceu uma única vez e exclua-o.
4. Repita uma operação de leitura e teste também a mensagem de erro ao sair da conta ou abrir o Preview em uma janela sem autenticação.
5. Instale o PWA usando esse endereço Preview. Se já havia instalado o PWA a partir do domínio de produção, remova esse atalho antigo e instale novamente a partir do Preview autenticado.

## Como fica depois

- O endereço Preview pede login Vercel e usa os segredos de Preview para acessar somente a planilha de teste.
- O domínio público de produção continua podendo mostrar os arquivos estáticos, mas a função da API responde como indisponível e não possui segredo de acesso à planilha.
- O Apps Script não aceita chamadas de gravação sem o token. O token não está no HTML nem no repositório.
- O PWA continua sendo um app web instalável. Seu endereço instalado deve ser o Preview protegido, que exige conexão à internet para autenticar e acessar a planilha.

## Referências oficiais

- [Proteção de implantações no Vercel](https://vercel.com/docs/deployment-protection)
- [Autenticação Vercel](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [Funções Vercel](https://vercel.com/docs/functions)
- [Propriedades e variáveis de ambiente no Vercel](https://vercel.com/docs/environment-variables)
