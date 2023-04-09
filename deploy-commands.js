import { config } from "dotenv";
config()
import { SlashCommandBuilder, REST, Routes } from "discord.js";
const clientId = process.env.CLIENT_ID
const guildID = process.env.GUILD_ID
const token = process.env.DISCORD_TOKEN

const commands = [
    new SlashCommandBuilder()
        .setName("ggchat")
        .setDescription("Chat with our AI bot!")
        .addStringOption(option =>
            option
                .setName("prompt")
                .setDescription("What do you want to say to the bot?")
                .setRequired(true)
        )
]
.map(command => command.toJSON());

const rest = new REST({ version: "9" }).setToken(token);
rest.put(Routes.applicationGuildCommands(clientId, guildID), { body: commands })
    .then(() => console.log("Successfully registered application commands."))
    .catch(console.error);
