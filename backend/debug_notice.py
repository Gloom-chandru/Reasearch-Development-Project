"""Debug script — trace the 5-minute notice timing bug."""
import requests, datetime as dt, time, json

r = requests.post('http://localhost:8000/api/auth/login',
                  json={'username': 'admin', 'password': 'admin123'})
token = r.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

now         = dt.datetime.utcnow()
valid_until = now + dt.timedelta(minutes=5)

print(f"Client UTC now:        {now.isoformat()}")
print(f"Client valid_until:    {valid_until.isoformat()}")
print(f"Duration should be:    5 minutes = {(valid_until - now).total_seconds()} seconds")

resp = requests.post(
    'http://localhost:8000/api/notices',
    json={
        'title':       'DEBUG 5-minute notice',
        'body':        'Should last exactly 5 minutes',
        'priority':    1,
        'classroom_id': None,
        'valid_from':  now.isoformat(),
        'valid_until': valid_until.isoformat(),
    },
    headers=headers,
)
data = resp.json()
print(f"\nServer returned:")
print(f"  id:          {data.get('id')}")
print(f"  valid_from:  {data.get('valid_from')}")
print(f"  valid_until: {data.get('valid_until')}")

# Parse what the server stored
srv_from  = data.get('valid_from')
srv_until = data.get('valid_until')

if srv_from and srv_until:
    # Try parsing both with and without timezone
    for fmt in ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%dT%H:%M:%S.%fZ']:
        try:
            t_from  = dt.datetime.strptime(srv_from[:26],  fmt[:len(fmt)])
            t_until = dt.datetime.strptime(srv_until[:26], fmt[:len(fmt)])
            diff_secs = (t_until - t_from).total_seconds()
            print(f"\n  Duration stored: {diff_secs} seconds ({diff_secs/60:.1f} minutes)")
            break
        except:
            pass

# Check active notices immediately
time.sleep(1)
r2 = requests.get('http://localhost:8000/api/notices/active', headers=headers)
notices = r2.json().get('notices', [])
print(f"\nActive notices after 1s: {len(notices)}")

# Check the notice service filter logic
print("\n--- Checking server-side filter ---")
r3 = requests.get('http://localhost:8000/api/notices', headers=headers)
all_notices = r3.json().get('notices', [])
for n in all_notices:
    if n.get('title') == 'DEBUG 5-minute notice':
        print(f"  is_active:   {n.get('is_active')}")
        print(f"  valid_from:  {n.get('valid_from')}")
        print(f"  valid_until: {n.get('valid_until')}")

# Clean up
if data.get('id'):
    requests.delete(f"http://localhost:8000/api/notices/{data['id']}", headers=headers)
    print(f"\nCleaned up notice {data['id']}")
