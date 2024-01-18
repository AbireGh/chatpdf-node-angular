//import { Pinecone, PineconeRecord } from "@pinecone-database/pinecone";
//import { downloadFromS3 } from "./s3-server";
//import { PDFLoader } from "langchain/document_loaders/fs/pdf";

global.ReadableStream = require('web-streams-polyfill').ReadableStream;

// 
const {  Pinecone, PineconeRecord } = require("@pinecone-database/pinecone");
const {  Document, RecursiveCharacterTextSplitter } = require("@pinecone-database/doc-splitter");
const {  PDFLoader } = require("langchain/document_loaders/fs/pdf");
const fs = require('fs');
const PDFParser = require('pdf-parse');
const md5 = require("md5")
// import md5 from "md5";
// import {
//   Document,
//   RecursiveCharacterTextSplitter,
// } from "@pinecone-database/doc-splitter";
const  getEmbeddings  = require("./embeddings.js");
const  convertToAscii  = require("./utils");

 const getPineconeClient = () => {
  return new Pinecone({
    //environment: process.env.PINECONE_ENVIRONMENT!,
    //apiKey: process.env.PINECONE_API_KEY!,
    environment: "gcp-starter",
    apiKey: "98116399-d3aa-4247-bf54-7be74cedbe49",
  });
};

// type PDFPage = {
//   pageContent: string;
//   metadata: {
//     loc: { pageNumber: number };
//   };
// };
// problemeee f import d had fucntion f server.js :'(
const loadfileIntoPinecone = async (fileKey) => {
  // 1. obtain the pdf -> downlaod and read from pdf
  console.log("");
  console.log(fileKey);
 //const file_name = await downloadFromS3(fileKey);
 const file_name = "../server/resources/static/assets/uploads/"+fileKey
  if (!file_name) {
    throw new Error("could not get file");
  }
  console.log("loading pdf into memory" + file_name);
  const loader = new PDFLoader(file_name);
  const pages = (await loader.load()) ;

 // // const dataBuffer = fs.readFileSync("C:/Users/abire/Desktop/Projects/openai-chatbot-angular-express/server/resources/static/assets/uploads/chatpdf_test.pdf");

// //PDFParser(dataBuffer).then(data => {
//   //console.log(data.text);
// //});

 //// const pages = (await loader.load()) as PDFPage[];
 //console.log(pages)




  // 2. split and segment the pdf
  const documents = await Promise.all(pages.map(prepareDocument));

  // 3. vectorise and embed individual documents
  const vectors = await Promise.all(documents.flat().map(embedDocument));

  // 4. upload to pinecone
  const client = await getPineconeClient();
  const pineconeIndex = await client.index("chatpdf-yt");
  const namespace = pineconeIndex.namespace(fileKey);

  console.log("inserting vectors into pinecone");
  await namespace.upsert(vectors);
  console.log(fileKey+"insert")

 // return documents[0];
}

async function embedDocument(doc) {
  try {
    const embeddings = await getEmbeddings(doc.pageContent);
    const hash = md5(doc.pageContent);

    console.log(doc.metadata.pageNumber)

    return {
      id: hash,
      values: embeddings,
      metadata: {
        text: doc.metadata.text,
        pageNumber: doc.metadata.pageNumber,
      },
    }
  } catch (error) {
    console.log("error embedding document", error);
    throw error;
  }
}

 const truncateStringByBytes = (str, bytes) => {
  const enc = new TextEncoder();
  return new TextDecoder("utf-8").decode(enc.encode(str).slice(0, bytes));
};

async function prepareDocument(page) {
  let { pageContent, metadata } = page;
  pageContent = pageContent.replace(/\n/g, "");
  // split the docs
  const splitter = new RecursiveCharacterTextSplitter();
  const docs = await splitter.splitDocuments([
    new Document({
      pageContent,
      metadata: {
        pageNumber: metadata.loc.pageNumber,
        text: truncateStringByBytes(pageContent, 36000),
      },
    }),
  ]);
  return docs;
}

module.exports = loadfileIntoPinecone;