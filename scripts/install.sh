#!/usr/bin/env bash
# 把通用规则库铺到目标项目：只补齐、不覆盖；--force 才覆盖库文件，AGENTS.md 永不覆盖。
# 用法：scripts/install.sh <目标目录> [--dry-run] [--force]
set -euo pipefail

usage() {
  cat <<'EOF'
用法: scripts/install.sh <目标目录> [--dry-run] [--force]

  目标目录            必须已存在（先 mkdir -p）
  --dry-run           只打印将写入/跳过的文件，不写盘
  --force             覆盖已存在的库文件（先列出将被覆盖的清单）

行为：
  - 复制 .dsh/ 下的 markdown 文件（rules、conventions、checklists、agents、lessons、索引）
  - AGENTS.md 仅当目标不存在时从 templates/AGENTS.template.md 渲染；--force 也不覆盖
  - 默认只补齐不覆盖；不删除目标任何文件；任一写盘失败即非零退出
EOF
}

DRY=0
FORCE=0
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    --force) FORCE=1 ;;
    -h|--help) usage; exit 0 ;;
    -*) echo "未知参数: $arg" >&2; usage; exit 2 ;;
    *)
      if [ -n "$TARGET" ]; then echo "只能指定一个目标目录" >&2; exit 2; fi
      TARGET="$arg"
      ;;
  esac
done

if [ -z "$TARGET" ]; then usage; exit 2; fi
if [ ! -d "$TARGET" ]; then
  echo "目标目录不存在: $TARGET（先 mkdir -p）" >&2
  exit 2
fi

SRC="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$(cd "$TARGET" && pwd)"
PROJECT_NAME="$(basename "$TARGET")"
TMPL="$SRC/templates/AGENTS.template.md"

if [ ! -f "$TMPL" ]; then
  echo "模板缺失: $TMPL" >&2
  exit 1
fi

written=0
overwritten=0
skipped=0

say() {
  if [ "$DRY" -eq 1 ]; then printf '[dry-run] %s\n' "$1"; else printf '%s\n' "$1"; fi
}

files=()
while IFS= read -r -d '' f; do files+=("$f"); done < <(
  find "$SRC/.dsh" -type f -name '*.md' -print0 2>/dev/null
)

if [ "${#files[@]}" -eq 0 ]; then
  echo "库内容缺失: $SRC/.dsh 下没有 markdown 文件" >&2
  exit 1
fi

if [ "$FORCE" -eq 1 ]; then
  replaced=()
  for src in "${files[@]}"; do
    rel="${src#"$SRC"/}"
    if [ -e "$TARGET/$rel" ]; then replaced+=("$rel"); fi
  done
  if [ "${#replaced[@]}" -gt 0 ]; then
    echo "以下文件将被覆盖（--force）："
    printf '  %s\n' "${replaced[@]}"
    echo
  fi
fi

for src in "${files[@]}"; do
  rel="${src#"$SRC"/}"
  dst="$TARGET/$rel"
  if [ -e "$dst" ] && [ "$FORCE" -ne 1 ]; then
    say "跳过（已存在）: $rel"
    skipped=$((skipped + 1))
    continue
  fi
  if [ -e "$dst" ]; then
    say "覆盖: $rel"
    overwritten=$((overwritten + 1))
  else
    say "写入: $rel"
    written=$((written + 1))
  fi
  if [ "$DRY" -eq 0 ]; then
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
done

agents_dst="$TARGET/AGENTS.md"
if [ -e "$agents_dst" ]; then
  say "跳过（已存在）: AGENTS.md（--force 也不覆盖；需重建请先备份后手动删除）"
  skipped=$((skipped + 1))
else
  say "从模板渲染: AGENTS.md（PROJECT_NAME=$PROJECT_NAME）"
  written=$((written + 1))
  if [ "$DRY" -eq 0 ]; then
    esc_name=${PROJECT_NAME//\\/\\\\}
    esc_name=${esc_name//&/\\&}
    esc_name=${esc_name//|/\\|}
    sed "s|{{PROJECT_NAME}}|$esc_name|g" "$TMPL" |
      perl -pe 's/\{\{([A-Z0-9_]+)\}\}/TODO($1)/g; s/\{\{([^{}]+)\}\}/TODO：$1/g' >"$agents_dst"
  fi
fi

echo
echo "写入 $written 项，覆盖 $overwritten 项，跳过 $skipped 项。"
if [ "$DRY" -eq 1 ]; then
  echo "这是干跑，未改动任何文件。"
else
  cat <<EOF

需要人工填的位置：
  1. $TARGET/AGENTS.md 第 1 节：项目定位、技术栈、事实源、运行命令
  2. $TARGET/AGENTS.md 第 2 节：本项目取值后的硬约束
  3. $TARGET/AGENTS.md 第 4 节：本项目的最小验证门命令
  4. $TARGET/.dsh/conventions/verification.md：命令模板换成真实路径与端口
  5. $TARGET/.dsh/conventions/module-layout.md：目录职责换成项目真实目录
此外各文件里的 <占位> 按项目替换；填完把残留的 TODO(...) / TODO： 清干净。
EOF
fi
