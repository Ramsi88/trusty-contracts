const { expect } = require("chai");
const { decodeCalldata } = require('../utils/calldata.js')

describe("Utils tests", async () => {
    it("Decode calldata test", async () => {
        const test0 = "0x30"
        const test = "0x095ea7b3000000000000000000000000dfc860f2c68eb0c245a7485c1c0c6e7e9a759b580000000000000000000000000000000000000000000000000de0b6b3a7640000"
        const test2 = "0xa9059cbb000000000000000000000000dfc860f2c68eb0c245a7485c1c0c6e7e9a759b580000000000000000000000000000000000000000000000000de0b6b3a7640000"

        decodeCalldata(test0)
        decodeCalldata(test)
        decodeCalldata(test2)        
        decodeCalldata("Testing the decoding... 👽")
    })
});