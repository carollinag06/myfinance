# MyFinance Android

Aplicativo Android em React Native CLI. As telas e a API foram portadas do
aplicativo anterior; esta pasta não usa Expo.

## Executar

1. Inicie a API na raiz do repositório com `npm start` e mantenha o ngrok ativo.
2. Ajuste `API_BASE_URL` em `src/config.ts` se o endereço do túnel mudar.
3. Instale as dependências com `npm install` nesta pasta.
4. Abra um emulador Android ou conecte um celular com depuração USB.
5. Rode `npm start` em um terminal e `npm run android` em outro.

O `applicationId` Android é `com.myfinance.finapp`. Para instalar um build
local, o computador precisa do Android SDK e de um JDK compatível com a
versão do React Native usada neste projeto.

## Login Google

O cliente Android criado no Google Cloud usa o pacote `com.myfinance.finapp`
e o SHA-1 do certificado que assina o APK instalado. O SDK nativo também
precisa de um cliente OAuth do tipo **Aplicativo da Web** para receber o ID
token. Crie esse cliente no mesmo projeto Google Cloud e coloque o ID em
`GOOGLE_WEB_CLIENT_ID` em `src/config.ts`. Para esse uso nativo, os campos de
origem JavaScript e URI de redirecionamento do cliente Web podem ficar vazios.

Inclua o mesmo ID Web na lista `GOOGLE_CLIENT_IDS` do `.env` da API, separado
por vírgula do ID Android. Reinicie a API após editar o arquivo. Enquanto a
tela de consentimento estiver em modo de teste, inclua a conta Google que
fará o login na lista de usuários de teste.
