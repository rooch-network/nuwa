import { bcs, RoochAddress } from "@roochnetwork/rooch-sdk";

export interface TaskArgument {
    name: string;
    type_desc: string;
    description: string;
    required: boolean;
}

export interface TaskSpecification {
    name: string;
    description: string;
    arguments: TaskArgument[];
    resolver: string;
    on_chain: boolean;
    price: string;  // DecimalValue represented as string
}

export const TaskArgumentSchema = bcs.struct('TaskArgument', {
    name: bcs.string(),
    type_desc: bcs.string(),
    description: bcs.string(),
    required: bcs.bool(),
});

export const DecimalValueSchema = bcs.struct('DecimalValue', {
    value: bcs.u64(),
    decimals: bcs.u8(),
});


export const TaskSpecificationSchema = bcs.struct('TaskSpecification', {
    name: bcs.string(),
    description: bcs.string(),
    arguments: bcs.vector(TaskArgumentSchema),
    resolver: bcs.Address,
    on_chain: bcs.bool(),
    price: DecimalValueSchema,
});

export const TaskSpecificationsSchema = bcs.struct('TaskSpecifications', {
    task_specs: bcs.vector(TaskSpecificationSchema),
});


export function deserializeTaskSpecifications(hexValue: string): TaskSpecification[] {
    const cleanHexValue = hexValue.startsWith('0x') ? hexValue.slice(2) : hexValue;
    const bytes = new Uint8Array(
        cleanHexValue.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
    );
    
    console.log('bytes', bytes);

    const decoded = TaskSpecificationsSchema.parse(bytes);
    return decoded.task_specs.map(spec => ({
        ...spec,
        resolver: new RoochAddress(spec.resolver).toBech32Address(),
        price: Number(BigInt(spec.price.value) / BigInt(10 ** spec.price.decimals)).toString(),
    }));
}