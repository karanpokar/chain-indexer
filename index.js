import 'dotenv/config';
import express from "express";
import axios from "axios";
import { WebSocketServer } from "ws";
import {
  blockHashbyNumber,
  blockInfoByHash,
  getTransactionInfoByHash,
} from "./blockInfo.js";
import { convertToHash } from "./utils.js";
import cors from "cors";

const RPC_URL = process.env.RPC_URL;
const SERVER_PORT = process.env.SERVER_PORT;
const POLLING_INTERVAL = process.env.POLLING_INTERVAL;

const app = express();
const server = app.listen(SERVER_PORT, () => {
  console.log(`Server running on http://localhost:${SERVER_PORT}`);
});

app.use(cors());

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
  const { number } = req.query;
  const hash = await blockHashbyNumber(number);
  let blockInfo;
  if (hash) {
    blockInfo = await blockInfoByHash(hash);
  }
  let extrinsic = blockInfo?.block?.extrinsics?.map((item, index) => {
    return convertToHash(item);
  });
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
  const { hash } = req.query;
  const info = await getTransactionInfoByHash(hash);
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

    const blockNumber = parseInt(block.block.header.number, 16);
    const blockHash = block.block.header.parentHash;
    const extrinsics = block.block.extrinsics;
    const date = new Date();

    if (blockNumber > lastBlockNumber) {
      lastBlockNumber = blockNumber;

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

setInterval(fetchLatestBlock, POLLING_INTERVAL);
