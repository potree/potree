export function unpackDual(att) {
	const distFlag = att & 0b11;
	const intenFlag = (att >> 2) & 0b11;

    // Flag values: 00 -> unmapped, 01 -> low, 10 -> high, 11 -> single return
    if (distFlag == 0 || intenFlag == 0) {
        throw new Error("Unexpected flag values;" + 
                (distFlag == 0) ? " distFlag: " + distFlag : "" + 
                (intenFlag == 0) ? " intenFlag: " + intenFlag : "");
    }
    
    return {
        // distance/intensity flags (mapped from [-1, 1] to [0, 2])
        distFlag: [NaN, 0, 2, 1][distFlag],
        intenFlag: [NaN, 0, 2, 1][intenFlag]
    }
}

export function unpackConfidence(att) {
    return {
        confidence: (att >> 4) & 0b111,
        sunLevel: (att >> 7) & 0b11,
        interference: (att >> 9) & 0b11,
        isRetroGhost: (att >> 11) & 0b1,
        isRangeLimited: (att >> 12) & 0b1,
        isRetroShadow: (att >> 13) & 0b1,
        isRecommendedDrop: (att >> 15) & 0b1
    }
}
