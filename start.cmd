rem set /p TAMALOU_HTTP_PORT=Port HTTP:
rem set /p TAMALOU_WS_PORT=Port WS:
set TAMALOU_HTTP_PORT=8080
set TAMALOU_WS_PORT=8081
for /F "tokens=16" %%i in ('"ipconfig | findstr IPv4"') do set LOCAL_IP=%%i
start "Server HTTP" python -m http.server %TAMALOU_HTTP_PORT% --bind %LOCAL_IP%
start "Server WS" /D server server.py %LOCAL_IP% %TAMALOU_WS_PORT%