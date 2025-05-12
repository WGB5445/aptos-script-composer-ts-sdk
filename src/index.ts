import {
  convertArgument,
  Deserializer,
  EntryFunctionArgumentTypes,
  getFunctionParts,
  Hex,
  MoveFunctionId,
  MoveModule,
  MoveModuleBytecode,
  SimpleEntryFunctionArgumentTypes,
  standardizeTypeTags,
  TransactionPayloadScript,
  TypeArgument,
} from '@aptos-labs/ts-sdk';
import {
  CallArgument,
  InitInput,
  initSync,
  TransactionComposer,
} from '@wgb5445/aptos-dynamic-transaction-composer';

import init from '@wgb5445/aptos-dynamic-transaction-composer';
/**
 * The data needed to generate a batched function payload
 */
export type InputBatchedFunctionData = {
  function: MoveFunctionId;
  typeArguments?: Array<TypeArgument>;
  functionArguments: Array<
    EntryFunctionArgumentTypes | CallArgument | SimpleEntryFunctionArgumentTypes
  >;
  moduleAbi: MoveModule;
};

/**
 * A wrapper class around TransactionComposer, which is a WASM library compiled
 * from aptos-core/aptos-move/script-composer.
 * This class allows the SDK caller to build a transaction that invokes multiple Move functions
 * and allow for arguments to be passed around.
 * */
export class AptosScriptComposer {
  private builder: TransactionComposer;

  constructor(options?: { url_or_wasmModule?: string | Uint8Array | WebAssembly.Module }) {
    if (options?.url_or_wasmModule) {
        if( typeof options.url_or_wasmModule === 'string') {
            init(options?.url_or_wasmModule);
        }else {
            initSync(options?.url_or_wasmModule);
        }
    }else {
        init();
    }
    
    this.builder = TransactionComposer.single_signer();
  }

  async storeModule(modules: MoveModuleBytecode[]): Promise<string[]> {
    const moduleBytes = modules.map(module => module);
    return moduleBytes.map(module =>
      this.builder.store_module(Hex.fromHexInput(module.bytecode).toUint8Array()),
    );
  }

  // Add a move function invocation to the TransactionComposer.
  //
  // Similar to how to create an entry function, the difference is that input arguments could
  // either be a `CallArgument` which represents an abstract value returned from a previous Move call
  // or the regular entry function arguments.
  //
  // The function would also return a list of `CallArgument` that can be passed on to future calls.
  async addBatchedCalls(input: InputBatchedFunctionData): Promise<CallArgument[]> {
    const { moduleAddress, moduleName, functionName } = getFunctionParts(input.function);

    const typeArguments = standardizeTypeTags(input.typeArguments);
    if (!input.moduleAbi) {
      throw new Error(`Could not find module ABI for '${moduleAddress}::${moduleName}'`);
    }

    // Check the type argument count against the ABI
    const functionAbi = input.moduleAbi.exposed_functions.find(func => func.name === functionName);
    if (!functionAbi) {
      throw new Error(
        `Could not find function ABI for '${moduleAddress}::${moduleName}::${functionName}'`,
      );
    }

    if (typeArguments.length !== functionAbi.generic_type_params.length) {
      throw new Error(
        `Type argument count mismatch, expected ${functionAbi.generic_type_params.length}, received ${typeArguments.length}`,
      );
    }

    const functionArguments: CallArgument[] = input.functionArguments.map((arg, i) =>
      arg instanceof CallArgument
        ? arg
        : CallArgument.newBytes(
            convertArgument(functionName, input.moduleAbi, arg, i, typeArguments, {
              allowUnknownStructs: true,
            }).bcsToBytes(),
          ),
    );

    return this.builder.add_batched_call(
      `${moduleAddress}::${moduleName}`,
      functionName,
      typeArguments.map(arg => arg.toString()),
      functionArguments,
    );
  }

  build_bytes(): Uint8Array {
    return this.builder.generate_batched_calls(true);
  }

  build(): TransactionPayloadScript {
    const script = TransactionPayloadScript.load(new Deserializer(this.build_bytes()));
    return script;
  }
}
