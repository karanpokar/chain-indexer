import axios from "axios";

const RPC_URL = "http://127.0.0.1:9944";

export const blockHashbyNumber = async (number) => {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "chain_getBlockHash",
      params: number ? [number] : [],
    });
    return response.data.result || "";
  } catch (error) {
    console.error("Error fetching block:", error.message);
  }
};

export const blockInfoByHash = async (hash) => {
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "chain_getBlock",
      params: hash ? [hash] : [],
    });

    return response.data.result || "";
  } catch (error) {
    console.error("Error fetching block:", error.message);
  }
};


export const getTransactionInfoByHash=async(extrinsicHash) =>{
  try {
    const response = await axios.post(RPC_URL, {
      jsonrpc: "2.0",
      id: 1,
      method: "author_getExtrinsicByHash",
      params: [extrinsicHash],
    });
    console.log(response?.data)
    return response.data.result; 
  } catch (error) {
    console.error("Error fetching transaction info:", error);
    return null;
  }
}
