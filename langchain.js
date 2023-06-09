import { config } from "dotenv";
config()
import { OpenAI } from 'langchain/llms' 
import { TextLoader } from 'langchain/document_loaders'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from 'langchain/embeddings'
import { HNSWLib } from 'langchain/vectorstores'
import { initializeAgentExecutor } from 'langchain/agents'
import { ChainTool } from 'langchain/tools'
import { VectorDBQAChain } from 'langchain/chains'

const model = new OpenAI({temperature: 0.5, maxTokens: 150, topP: 1, frequencyPenalty: 0, presencePenalty: 0, bestOf: 1, n: 1, stream: false})
let agent

const load = async(filename) => {
    const loader = new TextLoader(filename)
    const rawDocs = await loader.load()
    console.log("Loader created")

    const textSplitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
    })
    const docs = await textSplitter.splitDocuments(rawDocs)
    console.log("Docs split")
    console.log("Creating vector store")
    const vectorStore = await HNSWLib.fromDocuments(docs, new OpenAIEmbeddings())
    if (vectorStore) return vectorStore
}

const init = async() => {
    const genVectorStore = await load("./knowledge/cgg-general.md")
    const bgVectorStore = await load("./knowledge/cgg-background.md")
    const raggiesVectorStore = await load("./knowledge/cgg-cryptoraggies.md")
    const generalQA = new ChainTool({
        name: "cgg-general-qa",
        description: "general information about CGG including founding member details, mission, vision and aims",
        chain: VectorDBQAChain.fromLLM(model, genVectorStore)
    })
    const backgroundQA = new ChainTool({
        name: "cgg-background-qa",
        description: "background information about CGG explaining circumstances around its founding and lack of support from Cardano Foundation currently",
        chain: VectorDBQAChain.fromLLM(model, bgVectorStore)
    })
    const raggiesQA = new ChainTool({
        name: "cgg-cryptoraggies-qa",
        description: "information about the Cryptoraggies project, including the ecosystem and the NFTs",
        chain: VectorDBQAChain.fromLLM(model, raggiesVectorStore)
    })
    const tools = [generalQA, backgroundQA, raggiesQA]
    agent = await initializeAgentExecutor(
        tools,
        model,
        "zero-shot-react-description"
      );
    console.log("Agent loaded")
}

await init()

const runLangchain = async(input) => {
    return new Promise(async(resolve, reject) => {
        if (!agent) await init()
        try {
            console.log("Asking: " + input)
            const result = await agent.call({input: input})
            if (result) resolve(result.output)
            console.log("Result: " + result.output)
            console.log(`Got intermediate steps ${JSON.stringify(result.intermediateSteps, null, 2)}`)   
        } catch(e) {
            reject(e)
        }
    })    
}

export { runLangchain }