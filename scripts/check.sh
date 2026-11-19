#!/usr/bin/env bash
# 三项机检：禁用词、markdown 交叉引用、行数预算（含 docs）。
# 范围：.dsh/、templates/、根 *.md 做三项；docs/ 只做行数。
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

docs=()
while IFS= read -r -d '' f; do docs+=("$f"); done < <(
  find docs -name '*.md' -type f -print0 2>/dev/null
)
all=("${files[@]}")
if [ "${#docs[@]}" -gt 0 ]; then all+=("${docs[@]}"); fi

echo "== 1/3 禁用词 =="
hits=$(grep -nE "$BANNED" "${files[@]}" 2>/dev/null || true)
if [ -n "$hits" ]; then
  printf '%s\n' "$hits"
  echo "命中 $(printf '%s\n' "$hits" | wc -l | tr -d ' ') 处（必须为 0）"
  fail=1
else
  echo "0 命中"
fi

echo
echo "== 2/3 交叉引用 =="
checked=0
missing=0

# markdown 链接：](path)
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file=${hit%%:*}
  target=${hit#*:}
  target=${target:2:${#target}-3}
  case "$target" in
    http://*|https://*|mailto:*|\#*|~*) continue ;;
  esac
  target=${target%%#*}
  [ -n "$target" ] || continue
  checked=$((checked + 1))
  dir=${file%/*}
  [ "$dir" = "$file" ] && dir=.
  if [ ! -e "$dir/$target" ]; then
    echo "缺失: $file -> $target"
    missing=$((missing + 1))
    fail=1
  fi
done < <(grep -roE '\]\([^)( ]+\)' .dsh *.md 2>/dev/null)

# 反引号里的 .md 路径：`path.md`
while IFS= read -r hit; do
  [ -n "$hit" ] || continue
  file=${hit%%:*}
  target=${hit#*:}
  target=${target:1:${#target}-2}
  case "$target" in
    http://*|https://*|mailto:*|\#*|~*|/*) continue ;;
  esac
  target=${target%%#*}
  [ -n "$target" ] || continue
  checked=$((checked + 1))
  dir=${file%/*}
  [ "$dir" = "$file" ] && dir=.
  if [ ! -e "$dir/$target" ]; then
    echo "缺失: $file -> $target"
    missing=$((missing + 1))
    fail=1
  fi
done < <(grep -roE '`[^`]*/[^`]*\.md`' .dsh *.md 2>/dev/null)

if [ "$missing" -eq 0 ]; then
  echo "检查 $checked 条，全部命中"
else
  echo "检查 $checked 条，缺失 $missing 条"
fi

echo
echo "== 3/3 行数预算（含 docs，≤ $MAX_LINES）=="
over=0
while read -r n f; do
  [ -n "$f" ] || continue
  [ "$f" = "total" ] && continue
  if [ "$n" -gt "$MAX_LINES" ]; then
    echo "超限 $n 行: $f"
    over=$((over + 1))
    fail=1
  fi
done < <(wc -l "${all[@]}" 2>/dev/null)
if [ "$over" -eq 0 ]; then
  echo "全部在预算内"
fi

echo
if [ "$fail" -eq 0 ]; then
  echo "结论：通过"
else
  echo "结论：失败（见上方明细）"
fi
exit "$fail"
