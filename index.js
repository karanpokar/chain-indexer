import express from "express";
import axios from "axios";
//import * as WebSocket from "ws";
import { WebSocketServer } from "ws";
import {
  blockHashbyNumber,
  blockInfoByHash,
  getTransactionInfoByHash,
} from "./blockInfo.js";
import { convertToHash } from "./utils.js";
import cors from 'cors'

const RPC_URL = "http://127.0.0.1:9944";
const SERVER_PORT = 3001;
const POLLING_INTERVAL = 3000;

const app = express();
const server = app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
});

app.use(cors())

const wsServer = new WebSocketServer({ server });

let clients = [];
let lastBlockNumber = 0;

wsServer.on("connection", (ws) => {
  console.log("Frontend connected");
  clients.push(ws);

  ws.on("close", () => {
    clients = clients.filter((client) => client !== ws);
  });
});

app.get("/block", async (req, res) => {
  //console.log('Req',req.query)
  const { number } = req.query;
  //console.log('Number',number)
  const hash = await blockHashbyNumber(number);
  //console.log('Hash',hash)
  let blockInfo;
  if (hash) {
    blockInfo = await blockInfoByHash(hash);
  }
  let extrinsic = blockInfo?.block?.extrinsics?.map((item, index) => {
    return convertToHash(item);
  });
  //console.log('Ext',extrinsic)
  if (blockInfo) {
    res.status(200).send({
      ...blockInfo,
      blockHash: hash,
      transaction: extrinsic,
    });
  } else {
    res.status(500).send({
      err: "Internal Server Error",
    });
  }
});

app.get("/tx", async (req, res) => {
  //console.log('Req',req.query)
  const { hash } = req.query;
  //console.log('Number',number)
  const info = await getTransactionInfoByHash(hash);

  //console.log('Ext',extrinsic)
  if (info) {
    res.status(200).send({
      info,
    });
  } else {
    res.status(500).send({
      err: "Internal Server Error",
    });
  }
});

async function fetchLatestBlock() {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "chain_getBlock",
      params: [],
    });

    const block = response.data.result;
    //console.log(block)
    const blockNumber = parseInt(block.block.header.number, 16);
    const blockHash = block.block.header.parentHash;
    const extrinsics = block.block.extrinsics;
    const date = new Date();

    if (blockNumber > lastBlockNumber) {
      lastBlockNumber = blockNumber;

      // Extract transaction details
      const transactions = extrinsics.map((extrinsic, index) => ({
        index,
        hash: extrinsic,
      }));

      const blockData = {
        number: blockNumber,
        hash: blockHash,
        transactions,
        blockInfo: block,
      };

      clients.forEach((client) =>
        client.send(JSON.stringify({ ...block, timestamp: date }))
      );
    }
  } catch (error) {
    console.error("Error fetching block:", error.message);
  }
}

// Start polling for new blocks
setInterval(fetchLatestBlock, POLLING_INTERVAL);
