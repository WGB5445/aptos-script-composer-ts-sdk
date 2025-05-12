import {
  AptosConfig,
  Network,
  MoveModuleBytecode,
  TransactionPayloadScript,
  fetchModuleAbi,
  AccountAddress,
  getAptosFullNode,
  Account,
  Aptos,
  generateRawTransaction,
  SimpleTransaction,
} from '@aptos-labs/ts-sdk';
import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CallArgument } from '@wgb5445/aptos-dynamic-transaction-composer';
import { AptosScriptComposer, InputBatchedFunctionData } from '../src';

async function loadWasmModule(wasmPath: string): Promise<Uint8Array> {
  const resolvedPath = path.resolve(__dirname, wasmPath);
  return fs.readFileSync(resolvedPath)
}

async function getModule(
  moduleAddress: string,
  moduleName: string,
  aptosConfig: AptosConfig,
  options?: { ledgerVersion?: string },
): Promise<MoveModuleBytecode | undefined> {
  const { data } = await getAptosFullNode<{}, MoveModuleBytecode>({
    aptosConfig,
    originMethod: 'getModule',
    path: `accounts/${AccountAddress.from(moduleAddress).toString()}/module/${moduleName}`,
    params: { ledger_version: options?.ledgerVersion },
  });
  return data;
}

describe('AptosScriptComposer Tests', async () => {
  const aptosConfig = new AptosConfig({
    network: Network.DEVNET,
    clientConfig: { API_KEY: process.env.APTOS_API_KEY },
  });

  const aptos = new Aptos(aptosConfig);
  const wasmPath =
    '../node_modules/@wgb5445/aptos-dynamic-transaction-composer/aptos_dynamic_transaction_composer_bg.wasm';
  const wasmModule = await loadWasmModule(wasmPath);

  const account = Account.generate();
  await aptos.faucet.fundAccount({
    accountAddress: account.accountAddress,
    amount: 1_000_000,
  });

  test('Should initialize AptosScriptComposer correctly', () => {
    const composer = new AptosScriptComposer({url_or_wasmModule:wasmModule});
    expect(composer).toBeDefined();
  });

  test('Should build a script transaction payload', async () => {
    const composer = new AptosScriptComposer({url_or_wasmModule:wasmModule});

    const moduleBytecode = await getModule('0x1', 'aptos_account', aptosConfig);

    composer.storeModule([moduleBytecode!]);

    const moduleAbi = await fetchModuleAbi('0x1', 'aptos_account', aptosConfig);

    const mockBatchedFunctionData: InputBatchedFunctionData = {
      function: '0x1::aptos_account::transfer',
      typeArguments: [],
      functionArguments: [CallArgument.newSigner(0), '0x1', 100n],
      moduleAbi: moduleAbi!,
    };

    await composer.addBatchedCalls(mockBatchedFunctionData);

    const scriptPayload = composer.build();

    expect(scriptPayload).toBeInstanceOf(TransactionPayloadScript);
    expect(scriptPayload.script.bytecode).toBeDefined();
  });

  test('Should send a transaction', async () => {
    const composer = new AptosScriptComposer({url_or_wasmModule:wasmModule});

    const moduleBytecode = await getModule('0x1', 'aptos_account', aptosConfig);

    composer.storeModule([moduleBytecode!]);

    const moduleAbi = await fetchModuleAbi('0x1', 'aptos_account', aptosConfig);

    const mockBatchedFunctionData: InputBatchedFunctionData = {
      function: '0x1::aptos_account::transfer',
      typeArguments: [],
      functionArguments: [CallArgument.newSigner(0), '0x1', 100],
      moduleAbi: moduleAbi!,
    };

    await composer.addBatchedCalls(mockBatchedFunctionData);

    const scriptPayload = composer.build();

    const rawTransaction = await generateRawTransaction({
      aptosConfig,
      sender: account.accountAddress,
      payload: scriptPayload,
      options: {
        maxGasAmount: 1500,
        gasUnitPrice: 100,
        expireTimestamp: Math.floor(Date.now() / 1000 + 60),
      },
    });
    const simpleTransaction = new SimpleTransaction(rawTransaction);
    const authenticator = account.signTransactionWithAuthenticator(simpleTransaction);
    const response = await aptos.transaction.submit.simple({
      transaction: simpleTransaction,
      senderAuthenticator: authenticator,
    });
    expect(response).toBeDefined();
    const transactionInfo = await aptos.transaction.waitForTransaction({
      transactionHash: response.hash,
    });
    expect(transactionInfo.success).toBe(true);
  });

  /*


  // 测试多个函数调用的组合
  test('Should handle multiple function calls correctly', async () => {
    const composer = new AptosScriptComposer();
    
    try {
      // 模拟第一个Move模块ABI
      const mockModuleAbi1 = {
        address: "0x1",
        name: "coin",
        exposed_functions: [
          {
            name: "balance",
            visibility: "public" as const,
            is_entry: false,
            generic_type_params: [
              { constraints: [] }
            ],
            params: [
              "address"
            ],
            return: ["u64"]
          }
        ],
        structs: []
      };

      // 模拟第二个Move模块ABI (与第一个相同，简化测试)
      const mockModuleAbi2 = mockModuleAbi1;

      // 第一个函数调用
      const firstCall: InputBatchedFunctionData = {
        function: "0x1::coin::balance",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [
          "0x123456" // 地址参数
        ],
        moduleAbi: mockModuleAbi1
      };

      // 添加第一个调用并获取返回值
      const returnValues = await composer.addBatchedCalls(firstCall);
      
      // 验证返回值
      expect(returnValues).toBeDefined();
      expect(returnValues.length).toBeGreaterThan(0);
      
      // 使用第一个调用的返回值作为第二个调用的参数
      const secondCall: InputBatchedFunctionData = {
        function: "0x1::coin::balance",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [
          "0x654321",  // 新地址
          returnValues[0]  // 使用上一个调用的返回值
        ],
        moduleAbi: mockModuleAbi2
      };

      // 添加第二个调用
      await composer.addBatchedCalls(secondCall);
      
      // 构建最终脚本
      const scriptPayload = composer.build();
      expect(scriptPayload).toBeInstanceOf(TransactionPayloadScript);

    } catch (error) {
      console.log("Note: This test demonstrates how to chain function calls");
    } finally {
      // 清理资源
      composer.dispose();
    }
  });

  // 测试CallArgument类型
  test('Should handle CallArgument correctly', async () => {
    const composer = new AptosScriptComposer();
    
    try {
      // 创建一个CallArgument实例
      const callArg = CallArgument.newU64(1000n);
      
      // 模拟Move模块ABI
      const mockModuleAbi = {
        address: "0x1",
        name: "test",
        exposed_functions: [
          {
            name: "test_function",
            visibility: "public" as const,
            is_entry: true,
            generic_type_params: [],
            params: ["u64"],
            return: []
          }
        ],
        structs: []
      };

      // 使用CallArgument作为函数参数
      const functionData: InputBatchedFunctionData = {
        function: "0x1::test::test_function",
        typeArguments: [],
        functionArguments: [callArg],
        moduleAbi: mockModuleAbi
      };

      // 添加调用
      await composer.addBatchedCalls(functionData);
      const scriptPayload = composer.build();
      
      // 验证生成的payload
      expect(scriptPayload).toBeInstanceOf(TransactionPayloadScript);

    } finally {
      // 清理资源
      composer.dispose();
    }
  });
  */
});
