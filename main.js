// Import the functions you need from the SDKs you need
var admin = require("firebase-admin")
var process = require("process")
const dotenv = require("dotenv")
const puppeteer = require("puppeteer")
var CronJob = require("cron").CronJob
dotenv.config()
const { Client, Intents, MessageEmbed } = require("discord.js")
const { token } = process.env.DISCORD_TOKEN
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_WEBHOOKS,
    ],
    partials: ["MESSAGE", "CHANNEL", "REACTION"],
})

admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
})

const db = admin.firestore()
const usersRef = db.collection("users")
const regRef = db.collection("reg")

const eulaText = `**ーーーーー利用規約ーーーーー**
**このBOTで検温を自動化するにあたって以下の条件をあなたに守ってもらいます。守れない場合、守りたくない場合はこのBOTを使用しないでください。**

1. このBOTを利用したことによって発生した損害、不利益について、このBOTとこのBOTの作成者は一切責任を負いません。
あなたの責任でこのBOTを利用してください。また、このBOTを利用していたことを検温を忘れた口実に利用しないでください。
このBOTは高頻度でメンテ、調整が行われるため、うっかり登録されたアカウントを消したり設定を初期化してしまうことがあると思います。
一応検温が完了したらDMを送るようにはしているので、DMが来なかったら検温ができなかったということになります。その時は手動でやってください。

2. このBOTを使用していることを積極的に他人に伝えることは控えてください。
大人数がこのBOTを利用すると、単に問題につながりやすいだけでなく、Firebaseの利用回数が上限に達してBOTが止まってしまう可能性があります。

3. このBOTを利用するにはあなたのMicrosoftアカウント情報が必要になります。
アカウント情報を教えたくない、個人情報の管理を信頼できないなら、このBOTを使用しないでください。

4. あなたの体温にかかわらず、このBOTは「36.0〜36.9」を送信します。あなたの平熱なんか知りません。
もし熱があってもこのまま送信されます。後から自分で再送信してください。(BOTは6:00付近で送信します)

**個人情報の取り扱いについて**
__管理者は登録されたアカウントのメールアドレス、パスワードを普通に見ることができます。__
このBOTを利用するにあたって使用される全ての個人情報は厳重に管理し、外部に漏れることのないように努めます。悪用しないことを約束します。
信用できなければ使わないでください。お願いします。

**運営妨害について**
このBOTの運営を妨害するような、コマンドの大量送信、脆弱性の悪用などはしないでください。困ります。

以上に同意していただけたら、\`/agree\`、同意しなければ\`/disagree\`と送信してください。
`
const correctRegFormat = "間違ったフォーマットです。\n例) `/reg your@email.com P4ssw0rd`"

const onlyInDM = "DM内でのみ使用可能のコマンドです。DM以外では使用することができません。"

const helpMessage = `コマンド一覧
\`/kennon\`: アカウントが登録されていれば検温をすぐに実行します。 
\`/reg [your_email] [your_password]\`: アカウントを登録/更新します
\`/email [your_email]\`: メールアドレスのみ登録/更新します
\`/password [your_password]\`: パスワードのみ登録/更新します
\`/enable\`: 定期実行を有効にします
\`/disable\`: 定期実行を無効にします(デフォルトは無効です)
\`/eula\`: 利用規約を表示します
\`/agree\`: 利用規約に同意します
\`/disagree\`: 利用規約を拒否します
\`/check\`: 現在の利用規約の同意状況、アカウント情報、定期実行の状況を確認することができます
\`/deleteAccount [your_password]\`: 登録されているアカウント情報、設定を全て削除します

\`/neko\`: 「にゃーん」と返ってきます。返ってこなかったらBOTが死んでます。
`

// ユーザークラス
class User {
    constructor(email, password, isEnable, url) {
        this.email = email
        this.password = password
        this.isEnable = isEnable
        this.url = url
    }
}

// 登録状況
class Reg {
    constructor(eula, email, password) {
        this.eula = eula
        this.email = email
        this.password = password
    }
}

// スリープ
const sleep = (time) => {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve()
        }, time)
    })
}

/// 検温をする
async function doKennon(url, email, password) {
    console.log("start doKennon")

    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })
    const page = await browser.newPage()

    /// 状況
    var progress = "before-start"
    console.log(progress)

    /// エラーメッセージ
    var errorMessage = ""

    try {
        await page.goto(url)

        progress = "before-enter-email"
        console.log(progress)

        // メールの入力
        await page.waitForNavigation({ waitUntil: "networkidle2" })
        await page.type("#i0116", email)
        await page.click("#idSIButton9")

        progress = "before-enter-password"
        console.log(progress)

        // パスワードの入力
        await page.waitForNavigation({ waitUntil: "networkidle0" })
        await page.type("#i0118", password)
        await page.click("#idSIButton9")

        progress = "before-signin"
        console.log(progress)

        // サインインの記録
        await page.waitForSelector("#KmsiCheckboxField")
        await page.click("#idSIButton9")

        progress = "before-select-temp"
        console.log(progress)

        // 体温を選択
        await page.waitForSelector('input[value="36.0〜36.9"]')
        await page.click('input[value="36.0〜36.9"]')

        progress = "before-send"
        console.log(progress)

        // 送信
        await page.click(".__submit-button__")
        await page.waitForSelector(".thank-you-page-comfirm-text")

        progress = "before-check"
        console.log(progress)

        // ありがとうメッセージの取得
        const thanksMessage = await page.$eval(".thank-you-page-comfirm-text", (element) => element.innerHTML)

        console.log(`thanks: ${thanksMessage}`)
        console.log(`type: ${typeof thanksMessage}`)

        if (typeof thanksMessage == "undefined") {
            progress = "undefined"
            console.log(progress)
        } else {
            progress = "success"
            console.log(progress)
        }

        console.log("成功")
    } catch (err) {
        // エラーが起きた際の処理
        console.log(`エラー: ${err}`)
        errorMessage = err
    } finally {
        await browser.close()

        console.log("終了")

        return [progress, errorMessage]
    }
}

/// ユーザーの登録状況をチェック
function checkUserRegistered(reg) {
    if ((reg.email == "OK") & (reg.password == "OK")) {
        return "OK"
    } else {
        if (reg.eula != "OK") {
            return "not-agreed"
        } else {
            return "not-finished-registering"
        }
    }
}

/// ユーザーのデータの修復をする
async function fixUserData(uid) {
    const regData = await regRef.doc(uid).get()
    const reg = new Reg(regData.get("eula"), regData.get("email"), regData.get("password"))

    for (key in reg) {
        if (typeof regData.get(key) == "undefined") {
            await regRef.doc(uid).update({
                [key]: "",
            })
        }
    }

    const userData = await usersRef.doc(uid).get()
    const user = new User(
        userData.get("email"),
        userData.get("password"),
        userData.get("isEnable"),
        userData.get("url")
    )

    for (key in user) {
        if (typeof userData.get(key) == "undefined") {
            await usersRef.doc(uid).update({
                [key]: "",
            })
        }
    }
}

/// ユーザーの情報を取得する
async function getUserData(uid) {
    await fixUserData(uid)

    const regData = await regRef.doc(uid).get()
    const reg = new Reg(regData.get("eula"), regData.get("email"), regData.get("password"))

    const userData = await usersRef.doc(uid).get()
    const user = new User(
        userData.get("email"),
        userData.get("password"),
        userData.get("isEnable"),
        userData.get("url")
    )

    return [reg, user]
}

/// 利用規約を変更
async function updateStateEula(uid, state) {
    const updateRegRef = regRef.doc(uid)

    updateRegRef.update({
        eula: state,
    })
}

/// 定期実行の更新
async function updateCron(uid, state) {
    const updateUserRef = usersRef.doc(uid)

    updateUserRef.update({
        isEnable: state,
    })
}

/// メアドの検証
function verifyEmail(email) {
    // まずは@で分ける
    const split1 = email.split("@")
    if (split1.length != 2) {
        return false
    }

    const split2 = split1[1].split(".")
    if (split2.length == 1) {
        return false
    }

    return true
}

/// URLの検証
function verifyURL(url) {
    if (!url.startsWith("https://")) {
        return false
    }

    if (!url.includes("form")) {
        return false
    }

    return true
}

/// メールアドレスの登録
async function registerEmail(uid, email) {
    const regUserRef = regRef.doc(uid)
    const newUserRef = usersRef.doc(uid)

    regUserRef.update({
        email: "OK",
    })

    newUserRef.update({
        email: email,
    })
}

/// パスワードの登録
async function registerPassword(uid, password) {
    const regUserRef = regRef.doc(uid)
    const newUserRef = usersRef.doc(uid)

    regUserRef.update({
        password: "OK",
    })

    newUserRef.update({
        password: password,
    })
}

/// URLのアップデート
async function updateURL(uid, url) {
    const newUserRef = usersRef.doc(uid)
    newUserRef.update({
        url: url,
    })
}

/// ユーザーの登録
async function registerUser(uid, email, password) {
    const regUserRef = regRef.doc(uid)
    const newUserRef = usersRef.doc(uid)

    regUserRef.update({
        email: "OK",
        password: "OK",
    })

    newUserRef.update({
        email: email,
        password: password,
    })
}

/// ユーザーの削除
async function deleteUser(uid) {
    const deleteRegRef = regRef.doc(uid)
    const deleteUserRef = usersRef.doc(uid)

    deleteRegRef.update({
        email: "NO",
        password: "NO",
        eula: "NO",
    })

    deleteUserRef.update({
        email: "未登録",
        password: "未登録",
        isEnable: false,
    })
}

/// 検温リンクを獲得
const kennonURL = async () => {
    const data = await db.collection("data").doc("default").get()
    const url = data.get("url")

    return url
}

/// 検温結果をジャッジ
function judgeKennonStatus(status, author) {
    switch (status) {
        case "success": {
            const embed = new MessageEmbed()
                .setColor("GREEN")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":white_check_mark:成功", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [true, embed]
        }

        case "before-start": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "検温を開始できなかった", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "before-enter-email": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "メールアドレスの入力", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "before-enter-password": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "パスワードの入力", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "before-enter-signin": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "サインイン", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "before-enter-select-temp": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "体温の選択", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "before-enter-check": {
            const embed = new MessageEmbed()
                .setColor("RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":x:失敗", inline: false })
                .setFields({ name: "失敗箇所", value: "フォームの送信", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        case "undefined": {
            const embed = new MessageEmbed()
                .setColor("DARK_RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":question:不明", inline: false })
                .setFields({ name: "状況", value: "おそらく送信が完了したが、確実ではない", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
        }

        default:
            const embed = new MessageEmbed()
                .setColor("DARK_RED")
                .setTitle("検温結果")
                .setFields({ name: "ステータス", value: ":question:例外的エラー", inline: false })
                .setFields({ name: "状況", value: "起きるはずのないエラー", inline: false })
                .setAuthor(author.username, author.avatarURL())
                .setTimestamp()
            return [false, embed]
    }
}

/// 検温をする
async function kennonDM(uid, user) {
    const url = user.url != "" ? user.url : await kennonURL()
    const discoUser = await client.users.fetch(uid)
    // 5回
    var successFlag = false
    for (var i = 0; i < 5; i++) {
        const [status, err] = await doKennon(url, user.email, user.password)
        const author = await client.users.fetch(uid)
        const [isSuccess, embed] = judgeKennonStatus(status, author)
        discoUser.send({ embeds: [embed] })

        if (isSuccess) {
            successFlag = true
            break
        }
    }
    if (!successFlag) {
        // 5回やっても失敗
        const embed = new MessageEmbed()
            .setColor("RED")
            .setTitle("検温に失敗")
            .setDescription("手動で検温をしてください。このメッセージをクリックすることで検温フォームに飛びます。")
            .setURL(url)
            .setTimestamp()

        discoUser.send({ embeds: [embed] })
    }
}

/// その場で検温
async function kennonNow(channel, user, author) {
    const url = user.url != "" ? user.url : await kennonURL()
    console.log(`url: ${url}`)
    // 5回
    var successFlag = false
    for (var i = 0; i < 5; i++) {
        console.log(`${i}回目`)
        const [status, err] = await doKennon(url, user.email, user.password)
        const [isSuccess, embed] = judgeKennonStatus(status, author)
        channel.send({ embeds: [embed] })

        if (isSuccess) {
            successFlag = true
            break
        }
    }

    if (!successFlag) {
        // 5回やっても失敗
        const embed = new MessageEmbed()
            .setColor("RED")
            .setTitle("検温に失敗")
            .setDescription("手動で検温をしてください。このメッセージをクリックすることで検温フォームに飛びます。")
            .setURL(url)
            .setAuthor(author.username, author.avatarURL())
            .setTimestamp()

        channel.send({ embeds: [embed] })
    }
}

/// 検温できるユーザーを取得
async function fetchKennonableUsers() {
    console.log("fetching users...")
    const availableUsers = await usersRef.where("isEnable", "==", true).get()
    var users = []

    const ids = availableUsers.docs.map((doc) => {
        return doc.id
    })
    for await (id of ids) {
        const [reg, user] = await getUserData(id)
        if ((reg.eula == "OK") & (reg.email == "OK") & (reg.password == "OK")) {
            users.push(id)
        }
    }

    console.log(`fetchedUsers: ${users}`)

    return users
}

/// 一斉検温
async function allUserKennon() {
    try {
        console.log("検温開始")

        const users = await fetchKennonableUsers()

        for (const uid of users) {
            const [reg, user] = await getUserData(uid)
            await kennonDM(uid, user)
            console.log(`検温完了: ${uid}`)
        }

        console.log(`全ての検温完了`)
    } catch (err) {
        console.log(`一斉検温エラー: ${err}`)
    } finally {
        console.log("定期実行終了")
    }
}

// Discord
client.once("ready", () => {
    console.log("準備完了！")
    client.user.setActivity("/help", { type: "PLAYING" })
})

client.on("messageCreate", async (message) => {
    function reply(text) {
        message.channel.send(text)
    }

    // メッセージの内容
    const args = message.content.split(" ")
    // 発言ユーザー
    const author = message.author
    // 発言したユーザーid
    const uid = message.author.id
    // チャンネルがDMカ
    const isDM = message.channel.type == "DM"

    // 先頭のコマンドを判定する
    if (args[0][0] == "/") {
        console.log(args)

        // データを取得
        const [reg, user] = await getUserData(uid)

        switch (args[0]) {
            case "/neko": {
                reply("にゃーん")
                break
            }

            case "/help": {
                reply(helpMessage)
                break
            }

            case "/eula": {
                reply(eulaText)
                break
            }

            case "/agree": {
                reply("利用規約に同意しました。定期実行を有効にする場合は、`/enable`と送信してください")
                await updateStateEula(uid, "OK")
                break
            }

            case "/disagree": {
                reply("利用規約を拒否しました。同意するまでこのBOTの機能を使うことはできなくなります。")
                await updateStateEula(uid, "NO")
                break
            }

            case "/enable": {
                reply("定期実行を有効にしました。")
                await updateCron(uid, true)
                break
            }

            case "/disable": {
                reply("定期実行を無効にしました。")
                await updateCron(uid, false)
                break
            }

            case "/url": {
                if (args.length != 2) {
                    reply("検温URLが入力されませんでした。すでにURLが登録されていた場合、初期化されます。")
                    await updateURL(uid, "")
                    break
                }

                const url = args[1]

                if (!verifyURL(url)) {
                    reply("URLの形式が正しくありません")
                    break
                }

                await updateURL(uid, url)
                reply("検温URLを登録/更新しました。")

                break
            }

            case "/email": {
                if (!isDM) {
                    reply(onlyInDM)
                    break
                }

                if (args.length != 2) {
                    reply("メールアドレスを入力してください。\n例) `/email your@email.com`")
                    break
                }

                const email = args[1]

                // メールを検証
                if (!verifyEmail(email)) {
                    reply("メールアドレスの形式が正しくありません")
                    break
                }

                await registerEmail(uid, email)
                reply("メールアドレスを登録/更新しました。")

                break
            }

            case "/password": {
                if (!isDM) {
                    reply(onlyInDM)
                    break
                }
                if (args.length != 2) {
                    reply("パスワードを入力してください。\n例) `/password P4ssw0rd`")
                    break
                }
                const password = args[1]

                await registerPassword(uid, password)
                reply("パスワードを登録/更新しました。")

                break
            }

            case "/reg": {
                if (!isDM) {
                    reply(onlyInDM)
                    break
                }
                //argがあるか検証
                if (args.length != 3) {
                    reply(correctRegFormat)
                    break
                }

                //メールとパスワードを検証
                const email = args[1]
                const password = args[2]

                if (!verifyEmail(email)) {
                    reply("メールアドレスの形式が正しくありません")
                    break
                }

                //オッケーなら登録
                reply("アカウントを登録します...")

                await registerUser(uid, email, password)

                reply("アカウントが登録されました！")

                break
            }

            case "/kennon": {
                // ユーザーが登録されているか検証する
                const registerProgress = checkUserRegistered(reg)

                switch (registerProgress) {
                    case "OK":
                        reply("ユーザーが見つかりました。登録されたユーザーで検温を開始します。")

                        // URL取得
                        if (user.url != "") {
                            reply("カスタム検温URLを利用します。")
                        }

                        var speed = false

                        if (args.length == 2) {
                            if (args[1] == "-speed") {
                                reply("検温の実行時間を計測します。")
                                speed = true
                            }
                        }

                        var start = new Date()

                        await kennonNow(message.channel, user, author)

                        var time = new Date() - start

                        reply("検温が終了しました")

                        if (speed) {
                            reply(`検温にかかった時間は ${time}ms です`)
                        }

                        break

                    case "not-agreed":
                        reply(
                            "利用規約に同意していません。\n利用規約を表示するには`/eula`と送信してください。\n利用規約に同意するには`/agree`と送信してください。\n利用規約に同意しない場合は`/disagree`と送信してください。"
                        )
                        break

                    default:
                        reply("ユーザーが登録されていませんん。DMで`/reg`と送信してユーザー登録を完了させてください")
                        author.send("ユーザー登録を始めるには`/reg`と送信してください")
                        break
                }

                break
            }

            case "/check": {
                const embed = new MessageEmbed()
                    .setColor("BLUE")
                    .setTitle("現在登録されているユーザー情報")
                    .setFields(
                        { name: "利用規約への同意", value: reg.eula == "OK" ? "同意" : "拒否", inline: false },
                        { name: "メールアドレス", value: `||${user.email}||`, inline: false },
                        { name: "パスワード", value: `||${user.password}||`, inline: false },
                        { name: "定期実行", value: user.isEnable ? "有効" : "無効", inline: false },
                        { name: "カスタム検温URL", value: user.url == "" ? "無効" : user.url, inline: false }
                    )
                    .setTimestamp()

                if (!isDM) {
                    reply("個人情報保護のため、DMに送信しました。")
                }

                author.send({ embeds: [embed] })
                break
            }

            case "/deleteAccount": {
                if (!isDM) {
                    reply(onlyInDM)
                    break
                }

                if (args.length != 2) {
                    reply(
                        "フォーマットが間違っています。\n例)`/deleteAccount [P4ssw0rd]`\n誤操作防止のため、登録されているパスワードが必要になります。"
                    )
                    break
                }

                const enteredPassword = args[1]

                // 入力されたパスワードが違ったら
                if (enteredPassword != user.password) {
                    reply(
                        "パスワードが間違っています。パスワードを忘れた、間違って設定してしまった場合は、`/password`コマンドで再設定することができます。"
                    )
                    break
                }

                // アカウントを削除
                reply(
                    "アカウントを削除します。登録に使用されたデータ、設定は全て削除されます。\nアカウント削除後はいつでもアカウントを登録し直すことができます。"
                )
                deleteUser(uid)
                reply("アカウントの削除が完了しました。`/check`から登録状況を確認することができます。")
            }

            default:
                break
        }
    } else {
    }
})

// 定期実行 秒 分 時 日 月 曜日
new CronJob({
    cronTime: "0 45 5 * * *",
    onTick: async () => {
        console.log("定期実行開始")
        //ランダム時間待つ(秒)
        const randomWaitSeconds = Math.abs(Math.floor(Math.random() * (0 - 600)))
        console.log(`待機時間: ${Math.round(randomWaitSeconds / 60)}分${randomWaitSeconds % 60}秒`)
        await sleep(randomWaitSeconds * 1000)
        await allUserKennon()
    },
    start: true,
    timeZone: "Asia/Tokyo",
})

// botを起動
client.login(token).catch((err) => {
    console.log(`BOTログインエラー: ${err}`)
    console.log(process.version)
})

// 以下は検温のテスト

// console.log("検温開始")

// const test = async () => {
//     console.info("テスト開始")
//     var start = new Date()

//     await doKennon("https://forms.office.com/r/yourform", "your@email.com", "P4ssw0rd")

//     var end = new Date() - start
//     console.info("完了: %dms", end)
// }

// test()
