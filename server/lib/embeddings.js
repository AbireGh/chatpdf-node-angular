//const FormData  = require("form-data");
global.FormData = class FormData {}; // or jest.fn()

const { OpenAIApi, Configuration } = require("openai-edge");


const config = new Configuration({
  apiKey: "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",
});

const openai = new OpenAIApi(config);

async function getEmbeddings(text) {
  try {
    const response = await openai.createEmbedding({
      model: "text-embedding-ada-002",
      input: text.replace(/\n/g, " "),
    });
    const result = await response.json();
    return result.data[0].embedding;
  } catch (error) {
    console.log("error calling openai embeddings api", error);
    throw error;
  }
}


module.exports = getEmbeddings;