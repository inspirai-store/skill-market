#!/bin/bash

# 生成任务执行计划
wxm_planning_generate() {
  local task_type=$1
  local task_desc=$2

  cat <<EOF
📋 执行计划：$task_type

🎯 目标：$task_desc

📝 执行步骤：
  1. 截图记录当前状态
  2. 分析需求并定位目标文件
  3. 修改代码
  4. 编译项目
  5. 等待热更新完成
  6. 截图验证结果
  7. AI 对比分析效果

⏱️  预估耗时：15-30 秒
🔄 最大重试：3 次

EOF
}

# 显示执行计划并等待确认
wxm_planning_confirm() {
  local plan=$1

  echo "$plan"
  echo ""
  read -p "是否继续？[Y/n] " -n 1 -r
  echo

  if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo "❌ 任务已取消"
    return 1
  fi

  echo "✅ 开始执行..."
  return 0
}

# 任务执行步骤跟踪
wxm_planning_step() {
  local step_num=$1
  local total_steps=$2
  local step_desc=$3

  echo ""
  echo "⏳ 正在执行 [$step_num/$total_steps]：$step_desc..."
}

# 任务完成
wxm_planning_complete() {
  local success=$1
  local message=$2

  echo ""
  if [[ $success -eq 0 ]]; then
    echo "✅ 任务完成：$message"
  else
    echo "❌ 任务失败：$message"
  fi
}
