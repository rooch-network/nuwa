import { bcs, objectId } from "@roochnetwork/rooch-sdk";

export const ObjectIDSchema = bcs.struct('ObjectID', {
    id: bcs.vector(bcs.Address),
});


export function deserializeObjectIDVec(hexValue: string): objectId[] {
    console.log('hexValue', hexValue);
    const cleanHexValue = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
    const bytes = new Uint8Array(
        cleanHexValue.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    const parsed = bcs.vector(ObjectIDSchema).parse(bytes);
    return parsed.map(id => 
        // Join the address array into a single string
        //TODO fixme
        Array.isArray(id.id) ? id.id.join('') :
        id.id
    );
}