# tchecker.js

これは、Microsoft forms で作られた検温フォームを自動で実行する Discord BOT です。

## 注意

完全に自分用に作ってるのでFormsの選択する内容とかは自分で書き換えてください。

## 特徴

- 複数ユーザーからの自動送信に対応
- Cronを使用して毎朝定期実行
- 送信時間をランダム化
- Discord BOTを利用してどこでも一瞬で検温

## 悪いところ

- アカウント情報(メアド、パスワード)を平文で管理してる

## 使用方法

### 前提

- Discord BOT
- Firebase Firestore

Firebaseの`プロジェクトの設定 > サービスアカウント > Firebase Admin SDK`からサービスアカウントを取得して、その情報を使います。

`.env`ファイルを作成して、以下のようにしてください
```env
DISCORD_TOKEN=ディスコのBOTのトークン
FIREBASE_PROJECT_ID=firebaseのprojectId
FIREBASE_CLIENT_EMAIL=firebaseのサービスアカウントのメアドっぽいやつ
FIREBASE_PRIVATE_KEY=サービスアカウントを生成したらダウンロードされるjsonに入ってるkeyっぽいやつ
```

必要な情報がセットできたら

```bash
npm install
```
を実行して、

```bash
node ./main.js
```
を実行するとDiscord BOTが起動します。

##  Discord BOTコマンド
```
/kennon
```
で検温します。
(なんで`kennonn(けんおん)`ではなく`kennon(けんおn)`なのかというと、単純にミスです。気づいたときにはいろんなところで使ってたのでこのままです。)

## 自分のForm用にクリックする対象を変更する

`doKennon`関数内の以下の部分を変更してください

```js
        // 体温を選択
        await page.waitForSelector('input[value="36.0〜36.9"]')
        await page.click('input[value="36.0〜36.9"]')
```
`"36.0〜36.9"`がクリックする選択肢です。

例えば`平熱です`という選択肢をクリックしたい場合は
```js
        // 体温を選択
        await page.waitForSelector('input[value="平熱です"]')
        await page.click('input[value="平熱です"]')
```
というような感じにします。

他にも、inputに入力したい場合などは[Puppeteerのドキュメント](https://github.com/puppeteer/puppeteer/blob/v13.0.1/docs/api.md)を参考にやってください。

文字を入力するときに使う↓
https://github.com/puppeteer/puppeteer/blob/v13.0.1/docs/api.md#pagetypeselector-text-options

