#!/bin/bash

# 进入项目根目录
cd "$(dirname "$0")/.."

# 确保环境变量已设置
if [ ! -f ".env" ]; then
  if [ -f ".env.local" ]; then
    echo "Using .env.local for environment variables"
    export $(grep -v '^#' .env.local | xargs)
  else
    echo "Error: No .env or .env.local file found"
    exit 1
  fi
else
  echo "Using .env for environment variables"
  export $(grep -v '^#' .env | xargs)
fi

# 编译并运行测试脚本
echo "Compiling and running vector search test..."
npx tsx scripts/test-vector-search.ts

# 检查测试结果
if [ $? -eq 0 ]; then
  echo "✅ Vector search test completed successfully"
else
  echo "❌ Vector search test failed"
  exit 1
fi 