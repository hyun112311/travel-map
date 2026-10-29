import http.server
import socketserver
import socket
import os
import sys

PORT = 8080

def get_local_ip():
    try:
        # 외부 통신용 소켓을 열어 실제 사용 중인 로컬 IP 확인
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # 모바일 캐시 방지 및 UTF-8 지원
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

def run():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    local_ip = get_local_ip()

    print("=" * 60)
    print("   🌍 My Travel Log & Trip Planner - 모바일 연동 서버")
    print("=" * 60)
    print(f"\n[PC 접속 주소]")
    print(f"👉 http://localhost:{PORT}")
    print(f"\n[스마트폰 접속 주소 (같은 Wi-Fi 연결 시)]")
    print(f"👉 http://{local_ip}:{PORT}")
    print("\n※ 스마트폰의 크롬/사파리 브라우저 주소창에 위 주소를 입력하세요!")
    print("※ 팁: 스마트폰 브라우저 메뉴에서 '홈 화면에 추가'를 누르면")
    print("      진짜 스마트폰 앱처럼 전체화면으로 실행됩니다.")
    print("=" * 60)
    print("\n서버가 실행 중입니다. (종료하려면 이 창을 닫거나 Ctrl + C 를 누르세요)\n")

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n서버가 종료되었습니다.")
            sys.exit(0)

if __name__ == "__main__":
    run()
