#!/usr/bin/env bash
# 四项机检：禁用词、markdown 交叉引用、文件行数预算、公共文档。
# 范围：.dsh/、templates/、根目录 *.md；docs/ 不做禁用词，另由 check-docs.sh 检查。
# 用法：scripts/check.sh [仓库根目录，默认当前目录]
set -uo pipefail

ROOT="${1:-.}"
cd "$ROOT" || { echo "目录不存在: $ROOT" >&2; exit 2; }

BANNED='us_love|reps_calculator|toms_ai_idea|countPhotos|matchesWho|sortEvents|transportLabel|routeCoords|jsonfmt|Leaflet|timeline_server|calc\.js|app\.js|data\.json|daily\.json|admin\.html|showcase|:1314|力量举|旅程|回忆|子事件|事件卡|照片|地图|经纬度|RPE|1RM|Wilks|DOTS|X-Auth-Token'
MAX_LINES=300
fail=0

files=()
while IFS= read -r -d '' f; do files+=("$f"); done < <(
  find .dsh templates -name '*.md' -type f -print0 2>/dev/null
)
while IFS= read -r -d '' f; do files+=("$f"); done < <(
  find . -maxdepth 1 -name '*.md' -type f -print0 2>/dev/null
)

if [ "${#files[@]}" -eq 0 ]; then
  echo "未找到待检文件（应从仓库根目录运行）" >&2
  exit 2
fi

echo "== 1/4 禁用词 =="
hits=$(grep -nE "$BANNED" "${files[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "命中 $(printf '%s\n' "$hits" | wc -l | tr -d ' ') 处（必须为 0）"
  fail=1
else
  echo "0 命中"
fi

echo
echo "== 2/4 交叉引用 =="
# 认三种写法：markdown 链接、反引号里的 .md 路径、裸的相对路径。
# templates/ 跳过：那里的路径按「装到目标项目后」的位置书写，在本仓库里不成立。
checked=0
missing=0
for file in "${files[@]}"; do
  case "$file" in
    ./templates/*|templates/*) continue ;;
  esac
  dir=$(dirname "$file")
  while IFS= read -r link; do
    [ -n "$link" ] || continue
    case "$link" in
      http://*|https://*|mailto:*|\#*|~*) continue ;;
    esac
    target=${link%%#*}
    [ -n "$target" ] || continue
    checked=$((checked + 1))
    if [ ! -e "$dir/$target" ]; then
      echo "缺失: $file -> $link"
      missing=$((missing + 1))
      fail=1
    fi
  done < <(
    {
      grep -oE '\]\([^)( ]+\)' "$file" 2>/dev/null | sed -E 's/^\]\(//; s/\)$//'
      grep -oE '`[^`]*/[^`]*\.md`' "$file" 2>/dev/null | sed -E 's/^`//; s/`$//'
      grep -oE '(\.\.?/[A-Za-z0-9_./-]+\.md)' "$file" 2>/dev/null
    } | sort -u
  )
done

if [ "$missing" -eq 0 ]; then
  echo "检查 $checked 条，全部命中"
else
  echo "检查 $checked 条，缺失 $missing 条"
fi

echo
echo "== 3/4 行数预算（≤ $MAX_LINES）=="
over=0
for file in "${files[@]}"; do
  n=$(wc -l <"$file" | tr -d ' ')
  if [ "$n" -gt "$MAX_LINES" ]; then
    echo "超限 $n 行: $file"
    over=$((over + 1))
    fail=1
  fi
done

if [ "$over" -eq 0 ]; then
  echo "全部在预算内"
fi

echo
echo "== 4/4 公共文档 =="
if [ -f scripts/check-docs.sh ] && [ -d docs ]; then
  if ! bash scripts/check-docs.sh .; then
    fail=1
  fi
else
  echo "跳过（无 docs/ 或 scripts/check-docs.sh）"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "结论：通过"
else
  echo "结论：失败（见上方明细）"
fi
exit "$fail"
