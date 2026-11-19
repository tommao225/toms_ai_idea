#!/usr/bin/env bash
# 公共文档机检：文档开头的元信息、编号是否重复、是否登记、相对链接、行数。
# 用法：scripts/check-docs.sh [仓库根目录，默认当前目录]
set -uo pipefail

ROOT="${1:-.}"
cd "$ROOT" || { echo "目录不存在: $ROOT" >&2; exit 2; }

DOCS="docs"
MAX_LINES=300
fail=0

if [ ! -d "$DOCS" ]; then
  echo "无 docs/，跳过"
  exit 0
fi

all=()
while IFS= read -r -d '' f; do all+=("$f"); done < <(find "$DOCS" -type f -name '*.md' -print0 2>/dev/null)

doc=()
tmpl=()
for f in "${all[@]}"; do
  case "$f" in
    "$DOCS"/_templates/*) tmpl+=("$f") ;;
    *) doc+=("$f") ;;
  esac
done

is_index() { [ "$(basename "$1")" = "README.md" ]; }

field() {
  printf '%s\n' "$1" | sed -nE "s/^$2:[[:space:]]*//p" | head -n1 | tr -d '\r' | sed -E 's/[[:space:]]+$//'
}

echo "== 1/5 文档开头 =="
for f in "${doc[@]}"; do
  is_index "$f" && continue
  if [ "$(head -n1 "$f" | tr -d '\r')" != "---" ]; then
    echo "缺文档开头的元信息: $f"
    fail=1
    continue
  fi
  fm=$(awk 'NR==1{next} /^---[[:space:]]*$/{exit} {print}' "$f")
  for k in id type status scope created updated; do
    if ! printf '%s\n' "$fm" | grep -qE "^${k}:[[:space:]]*[^[:space:]]"; then
      echo "缺字段 ${k}: $f"
      fail=1
    fi
  done
  type=$(field "$fm" type)
  status=$(field "$fm" status)
  created=$(field "$fm" created)
  updated=$(field "$fm" updated)
  case "$type" in
    adr|issue|plan|review) ;;
    "") ;;
    *) echo "非法 type: $f ($type)"; fail=1 ;;
  esac
  case "$status" in
    draft|accepted|active|done|superseded|wontfix) ;;
    "") ;;
    *) echo "非法 status: $f ($status)"; fail=1 ;;
  esac
  for d in "$created" "$updated"; do
    if [ -n "$d" ] && ! printf '%s' "$d" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'; then
      echo "日期格式应为 YYYY-MM-DD: $f ($d)"
      fail=1
    fi
  done
done
[ "$fail" -eq 0 ] && echo "字段完整"

echo
echo "== 2/5 编号是否重复 =="
ids=()
for f in "${doc[@]}"; do
  is_index "$f" && continue
  fm=$(awk 'NR==1{next} /^---[[:space:]]*$/{exit} {print}' "$f")
  id=$(field "$fm" id)
  [ -n "$id" ] && ids+=("$id")
done
if [ "${#ids[@]}" -gt 0 ]; then
  dups=$(printf '%s\n' "${ids[@]}" | sort | uniq -d)
  if [ -n "$dups" ]; then
    echo "重复编号:"
    printf '  %s\n' "$dups"
    fail=1
  else
    echo "检查 ${#ids[@]} 个编号，无重复"
  fi
else
  echo "未找到编号"
  fail=1
fi

echo
echo "== 3/5 是否登记 =="
missing_index=0
for f in "${doc[@]}"; do
  is_index "$f" && continue
  rel=${f#"$DOCS"/}
  if [[ "$rel" == */* ]]; then
    proj=${rel%%/*}
    if [ "$f" = "$DOCS/$proj/README.md" ]; then
      index_dir="$DOCS"
    else
      index_dir="$DOCS/$proj"
    fi
  else
    index_dir="$DOCS"
  fi
  index="$index_dir/README.md"
  link=${f#"$index_dir"/}
  if [ ! -f "$index" ]; then
    echo "缺文档目录: $index（文档 $f）"
    missing_index=$((missing_index + 1))
    fail=1
    continue
  fi
  if ! grep -qF "$link" "$index"; then
    echo "没有登记: $f（应在 $index 中链接 $link）"
    missing_index=$((missing_index + 1))
    fail=1
  fi
done
[ "$missing_index" -eq 0 ] && echo "全部已登记"

echo
echo "== 4/5 相对链接 =="
checked=0
missing=0
for f in "${doc[@]}"; do
  dir=$(dirname "$f")
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    case "$link" in
      http://*|https://*|mailto:*|\#*) continue ;;
    esac
    target=${link%%#*}
    [ -n "$target" ] || continue
    case "$target" in
      /*) continue ;;
    esac
    checked=$((checked + 1))
    if [ ! -e "$dir/$target" ]; then
      echo "缺失: $f -> $link"
      missing=$((missing + 1))
      fail=1
    fi
  done < <(grep -oE '\]\([^)( ]+\)' "$f" 2>/dev/null | sed -E 's/^\]\(//; s/\)$//' | sort -u)
done
if [ "$missing" -eq 0 ]; then
  echo "检查 $checked 条，全部命中"
else
  echo "检查 $checked 条，缺失 $missing 条"
fi

echo
echo "== 5/5 行数预算（≤ $MAX_LINES）=="
over=0
for f in "${all[@]}"; do
  n=$(wc -l <"$f" | tr -d ' ')
  if [ "$n" -gt "$MAX_LINES" ]; then
    echo "超限 $n 行: $f"
    over=$((over + 1))
    fail=1
  fi
done
[ "$over" -eq 0 ] && echo "全部在预算内"

echo
if [ "$fail" -eq 0 ]; then
  echo "结论：通过"
else
  echo "结论：失败（见上方明细）"
fi
exit "$fail"
