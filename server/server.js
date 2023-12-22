import {loadfileIntoPinecone}  from "./lib/pinecone";

require('dotenv').config();
const express = require("express");
const { Configuration, OpenAIApi } = require("openai");
const cors = require("cors"); 



const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error("OPENAI_API_KEY is missing in the environment variables.");
  process.exit(1);
}

const app = express();
const port = 3000;

const configuration = new Configuration({
  apiKey: "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",
});
const openai = new OpenAIApi(configuration);

app.use(express.json());
app.use(cors());


//chat with normal chatgpt
app.post("/chat", async (req, res) => {
  const { message } = req.body;
  console.log(apiKey)
  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: message }],
    });

    const reply = completion.data.choices[0].message.content;

    res.json({ reply });
  } catch (error) {
    console.error("Error during chat completion:", error.response.data.error.message);
  
    res.status(500).json(error.response.data.error);
  }

});

//chat with pdf 
app.get("/chatwithpdf", async (req, res) => {
 // await loadfileIntoPinecone("chatpdf_test.pdf")
});


//upload pdf

const uploadFile = require("./middleware/upload");

app.post("/upload", async (req, res) => {
 
  try {
    await uploadFile(req, res);

    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }

    console.log(req.file)

    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file,
    });
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file}. ${err}`,
    });
  }

});


app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
