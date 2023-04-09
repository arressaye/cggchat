import { config } from "dotenv";
config()
import { OpenAI } from 'langchain/llms' 
import { ChatOpenAI } from 'langchain/chat_models'
import { TextLoader } from 'langchain/document_loaders'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { OpenAIEmbeddings } from 'langchain/embeddings'
import { HNSWLib } from 'langchain/vectorstores'
import { VectorStoreToolkit, createVectorStoreAgent, initializeAgentExecutor } from 'langchain/agents'
import { ChainTool } from 'langchain/tools'
import { VectorDBQAChain } from 'langchain/chains'

// const model = new ChatOpenAI({temperature: 0})
const model = new OpenAI({temperature: 0.5, maxTokens: 150, topP: 1, frequencyPenalty: 0, presencePenalty: 0, bestOf: 1, n: 1, stream: false})
let agent

//Load Pinecone
// const pinecone = new PineconeClient();
// await pinecone.init({
// apiKey: process.env.PINECONE_API_KEY,
// environment: process.env.PINECONE_ENVIRONMENT,
// });
////////////////////////////////////////////////////////////////

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
    // const vectorStore = await PineconeStore.fromDocuments(docs, new OpenAIEmbeddings(), {"pineconeIndex": pinecone.Index(process.env.PINECONE_INDEX)})
    if (vectorStore) return vectorStore
}

const init = async() => {
    const genVectorStore = await load("./cgg-general.md")
    const bgVectorStore = await load("./cgg-background.md")
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
    const tools = [generalQA, backgroundQA]
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