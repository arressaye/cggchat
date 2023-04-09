import { config } from "dotenv";
config()
import Discord, { GatewayIntentBits, Partials } from 'discord.js'
import { Configuration, OpenAIApi } from 'openai'
import { runLangchain } from "./langchain.js";
import { aiContext, aiMood } from "./constants.js";

// Configure OpenAI
const openaiconfig = new Configuration({
    "apiKey": process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(openaiconfig)
//////////

// Configure Discord
const Client = new Discord.Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildEmojisAndStickers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
})

Client.login(process.env.DISCORD_TOKEN)
//////////

// Configure Discord Events
Client.on('ready', () => {
    console.log(`Logged in as ${Client.user.tag}!`)
})

Client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'ggchat') {
        const userpromt = interaction.options.getString('prompt')
        interaction.channel.send(`${interaction.user} said to me: ${userpromt}`)
        await interaction.deferReply()
        try {
            const botresponse = await AIChat(userpromt)
            console.log(botresponse)
            if (botresponse) await interaction.editReply(botresponse)
        } catch (e) {
            console.log(e)
        }
    }
})
//////////

async function AIChat(userpromt) {
    const addedprompt = await runLangchain(userpromt).catch(e => console.log(e))
    // const addedprompt = ""
    const completion = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages: [
            {role: "system", content: aiContext + addedprompt + aiMood},
            {role: "user", content: userpromt}
        ],
        max_tokens: 150
    });
    return completion.data.choices[0].message.content
}