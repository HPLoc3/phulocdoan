import asyncio
import httpx
import uuid
from collections import Counter
import time

API_URL = "http://127.0.0.1:8000/api/v1/bookings/"

async def make_booking(client: httpx.AsyncClient, req_id: int):
    # Mỗi request sinh ra 1 uuid khác nhau để bypass idempotency check
    payload = {
        "event_id": 1,
        "idempotency_key": str(uuid.uuid4()),
        "items": [
            {
                "ticket_category_id": 1, # VIP Ticket
                "quantity": 1            # Mỗi người mua 1 vé
            }
        ]
    }
    
    try:
        response = await client.post(API_URL, json=payload, timeout=30.0)
        return response.status_code, response.json()
    except Exception as e:
        return 500, str(e)

async def main():
    print("🚀 Bắt đầu giả lập Flash Sale: Bắn 100 request cùng lúc!")
    
    # Số lượng request đồng thời
    TOTAL_REQUESTS = 100
    
    # Dùng AsyncClient để tạo connection pool
    async with httpx.AsyncClient(limits=httpx.Limits(max_connections=200, max_keepalive_connections=200)) as client:
        start_time = time.time()
        
        # Tạo ra 100 coroutines
        tasks = [make_booking(client, i) for i in range(TOTAL_REQUESTS)]
        
        # Thực thi song song toàn bộ cùng 1 lúc (bắn pháo loạt)
        results = await asyncio.gather(*tasks)
        
        duration = time.time() - start_time
        
        # Phân tích kết quả
        status_codes = Counter([r[0] for r in results])
        
        print(f"\n⏱ Thời gian xử lý 100 requests: {duration:.2f} giây")
        print("\n📊 THỐNG KÊ MÃ LỖI:")
        for code, count in status_codes.items():
            if code == 201:
                print(f"✅ Thành công (HTTP 201): {count} requests đã giành được vé")
            elif code == 400:
                print(f"❌ Hết vé (HTTP 400): {count} requests bị từ chối do hết vé")
            elif code == 503:
                print(f"⏳ Server bận (HTTP 503): {count} requests bị Redis block vì tranh chấp lock")
            else:
                print(f"⚠️ Khác (HTTP {code}): {count} requests")

if __name__ == "__main__":
    asyncio.run(main())
