#/bin/sh

TAMALOU_HOST='0.0.0.0'
TAMALOU_HTTP_PORT="${1:-8080}"
TAMALOU_WS_PORT="${2:-8081}"
TAMALOU_PID='instance/tamalou.pid'
TAMALOU_BIN='instance/venv/bin'

cd "$(dirname -- "$0")"
pwd

if ! [ -e "$TAMALOU_BIN" ]; then
	mkdir 'instance'
	echo "Create venv"
	python3 -m 'venv' 'instance/venv'
	$TAMALOU_BIN/pip install -r 'server/requirements.txt'

elif [ -e "$TAMALOU_PID" ]; then
	echo "Kill old instance:"
	while read -r pid; do
		echo "${pid}"
		kill "$pid"
	done <"$TAMALOU_PID"
	rm "$TAMALOU_PID"

	if [[ "$1" == 'stop' ]]; then
		exit
	fi

fi &&

(
	echo "Launch servers:"
	echo -n > "$TAMALOU_PID"
	$TAMALOU_BIN/python 'server/main.py' "$TAMALOU_HOST" "$TAMALOU_WS_PORT" & echo $! >> "$TAMALOU_PID"
	$TAMALOU_BIN/python -m 'http.server' "$TAMALOU_HTTP_PORT" --bind "$TAMALOU_HOST" --directory 'client' & echo $! >> "$TAMALOU_PID"
)
