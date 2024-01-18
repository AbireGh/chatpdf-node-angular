require('dotenv').config();
 
const loadfileIntoPinecone = require('./lib/pinecone.js');
const {getContext} = require('./lib/context.js');
const express = require("express");
const multer = require('multer');
const { Configuration, OpenAIApi } = require("openai");
const { OpenAIStream, StreamingTextResponse } =require("ai");

//excel
const ExcelJS = require('exceljs');
const fs = require('fs');

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




app.post("/chatwithpdf", async (req, res) => {

  const { message, fileKey } = req.body;
  try {
    console.log(message)
    const context = await getContext(message, fileKey);
    const prompt = {
      role: "system",
      content: `AI assistant is a brand new, powerful, human-like artificial intelligence.
      The traits of AI include expert knowledge, helpfulness, cleverness, and articulateness.
      AI is a well-behaved and well-mannered individual.
      AI is always friendly, kind, and inspiring, and he is eager to provide vivid and thoughtful responses to the user.
      AI has the sum of all knowledge in their brain, and is able to accurately answer nearly any question about any topic in conversation.
      AI assistant is a big fan of Pinecone and Vercel.
      START CONTEXT BLOCK
      ${context}
      END OF CONTEXT BLOCK
      AI assistant will take into account any CONTEXT BLOCK that is provided in a conversation.
      If the context does not provide the answer to question, the AI assistant will say, "I'm sorry, but I don't know the answer to that question".
      AI assistant will not apologize for previous responses, but instead will indicated new information was gained.
      AI assistant will not invent anything that is not drawn directly from the context.
      `,
    };

    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        prompt,
        { role: "user", content: message }
      ],
      //stream: true,
    });


    const reply = response.data.choices[0].message.content;
    console.log(reply)




 

 
   res.status(200).send({
     question:message,
     reponse:reply
   });
 } catch (err) {
   res.status(500).send({
     message: `Could not read the file: ${req}. ${err}`,
   }); 
 }
 });
 

//upload pdf

const uploadFile = require("./middleware/upload.js");

app.post("/upload", async (req, res) => {
 
  try {
    await uploadFile(req, res);

    if (req.file == undefined) {
      return res.status(400).send({ message: "Please upload a file!" });
    }


    console.log(req.file.originalname)

    if(res.status==200){
      try{
        await loadfileIntoPinecone(req.file.originalname);
      }
      catch (err) {
        res.status(500).send({
          message: `Could not upload the file to Pinecone: ${req.file.originalname}. ${err}`,
        }); 
      }
  
    }
    

    res.status(200).send({
      message: "Uploaded the file successfully: " + req.file.originalname,
    });
  } catch (err) {
    res.status(500).send({
      message: `Could not upload the file: ${req.file}. ${err}`,
    }); 
  }

});



// Configure multer to handle file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/uploadexcel', upload.single('file'), (req, res) => {
  // Check if a file was provided
  if (!req.file) {
    return res.status(400).json({ error: 'No file provided' });
  }

  // Read the Excel file from memory buffer
  const buffer = req.file.buffer;

  // Process the Excel file
  processExcel(buffer)
    .then((formattedText) => {
     res.json({ result: formattedText });
    //  createExcelFile(formattedText)
    // .then((buffer) => {
    //    // Set response headers
    //   //  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    //   //  res.setHeader('Content-Disposition', 'attachment; filename=output.xlsx');
 
    //   //  // Send the buffer as the response
    //   //  res.send(buffer);
    //   console.log('Excel file created successfully.');
    // })
    // .catch((error) => {
    //   console.error('Error creating Excel file:', error);
    // });
    })
    .catch((error) => {
      res.status(500).json({ error: 'Error processing Excel file' });
    });
});

// Function to process the Excel file
async function processExcel(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Assuming the data is in the first sheet and the format is text in all cells
  const worksheet = workbook.getWorksheet(1);

  // Extract text from each cell
  const formattedText = [];

  worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    console.log(row.values);
    const rowText = row.values.map((cell) => ((cell || ''))).join('\t');



   formattedText.push(row.values);
  });


  return JSON.stringify(formattedText);
}



// Function to create an Excel file from row values
async function createExcelFile(rowValues) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sheet1');

  // Add rows to the worksheet
  rowValues.forEach((row) => {
    worksheet.addRow(row);
  });

  // Save the workbook to a buffer
  const buffer = await workbook.xlsx.writeBuffer();
  const filePath = 'output.xlsx';

  // Save the buffer to a local file
  fs.writeFileSync(filePath, buffer);

  console.log(`Excel file saved to: ${filePath}`);

  return buffer;
}



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
