import pkg from 'blakejs';
const { blake2bHex } = pkg;


export const convertToHash=(hash)=>{

    const extrinsicHex = hash;
    const extrinsicBytes = Buffer.from(extrinsicHex.slice(2), "hex");
    
    const transactionHash = blake2bHex(extrinsicBytes, undefined, 32);
    return `0x${transactionHash}`;
}

