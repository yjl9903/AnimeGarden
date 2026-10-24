# /// script
# dependencies = [
#   "requests",
# ]
# ///

import requests

url = "https://api.animes.garden/resources"
params = {
    'subject': 543360,
    'fansub': '喵萌奶茶屋',
    'keyword': '简日'
}

response = requests.get(url, params=params, timeout=30)
response.raise_for_status()
result = response.json()

print(result['resources'])
